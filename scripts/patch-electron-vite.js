import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const chunks = [
  'node_modules/electron-vite/dist/chunks/lib-q6ns0vZr.js',
  'node_modules/electron-vite/dist/chunks/lib-7y7CgM8M.js',
  'node_modules/electron-vite/dist/chunks/lib-BkLsMF4i.js'
]

for (const rel of chunks) {
  const p = join(process.cwd(), rel)
  if (!existsSync(p)) continue
  let t = readFileSync(p, 'utf-8')
  const a = 'config.ssr = { ...config.ssr, ...{ noExternal: true } };'
  const b = "config.ssr = { ...config.ssr, ...{ noExternal: [] } }; config.ssr.external = ['electron', 'electron/*'];"
  const c = 'config.ssr.noExternal = true;'
  const d = "config.ssr.noExternal = []; config.ssr.external = ['electron', 'electron/*'];"
  let changed = false
  if (t.includes(a)) { t = t.replaceAll(a, b); changed = true }
  if (t.includes(c)) { t = t.replaceAll(c, d); changed = true }
  if (changed) {
    writeFileSync(p, t)
    console.log(`patched ${rel}`)
  }
}
