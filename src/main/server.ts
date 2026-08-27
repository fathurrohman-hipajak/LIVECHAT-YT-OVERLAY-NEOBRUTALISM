import { createServer, IncomingMessage, ServerResponse } from 'http'
import { readFile, stat } from 'fs/promises'
import { join, extname, normalize } from 'path'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2'
}

function mimeFor(p: string): string {
  return MIME[extname(p)] ?? 'application/octet-stream'
}

/**
 * Starts a static server serving dist/renderer (prod) or src/renderer (dev fallback).
 * Returns { url, port, close }.
 */
export async function startOverlayServer(
  getState: () => { opacity: number; width: number; height: number }
): Promise<{ url: string; port: number; close: () => void }> {
  const candidates = [
    join(process.cwd(), 'dist/renderer'),
    join(process.cwd(), 'out/renderer'),
    join(process.cwd(), 'src/renderer')
  ]

  let root = candidates[0]!
  for (const c of candidates) {
    try {
      const s = await stat(c)
      if (s.isDirectory()) {
        root = c
        break
      }
    } catch {}
  }

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)

    // state endpoint for OBS Browser Source to sync opacity/size without IPC
    if (url.pathname === '/overlay-state') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      })
      res.end(JSON.stringify(getState()))
      return
    }

    // CORS for overlay fetch
    res.setHeader('Access-Control-Allow-Origin', '*')

    let filePath = url.pathname === '/' ? '/index.html' : url.pathname
    // prevent directory traversal
    filePath = normalize(filePath).replace(/^(\.\.[\/\\])+/, '')
    const full = join(root, filePath)

    try {
      const data = await readFile(full)
      res.writeHead(200, { 'Content-Type': mimeFor(full), 'Cache-Control': 'no-cache' })
      res.end(data)
    } catch {
      // SPA fallback to index.html
      try {
        const data = await readFile(join(root, 'index.html'))
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
        res.end(data)
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not found')
      }
    }
  })

  // dynamic port: try env PORT, then 13415 upwards
  const preferred = Number(process.env.OVERLAY_PORT || 13415)
  let port = preferred
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, '127.0.0.1', () => {
          server.off('error', reject)
          resolve()
        })
      })
      break
    } catch (e: unknown) {
      const msg = String((e as Error)?.message || '')
      if (msg.includes('EADDRINUSE')) {
        port++
        continue
      }
      throw e
    }
  }

  return {
    url: `http://localhost:${port}`,
    port,
    close: () => server.close()
  }
}
