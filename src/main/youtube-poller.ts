export type ChatMessage = {
  id: string
  snippet: {
    type: string
    displayMessage?: string
    publishedAt: string
    authorChannelId?: string
    textMessageDetails?: { messageText?: string }
  }
  authorDetails?: {
    displayName?: string
    profileImageUrl?: string
    isChatOwner?: boolean
    isChatModerator?: boolean
    isChatSponsor?: boolean
  }
}

export type PollerHandle = { start: () => void; stop: () => void }

type Opts = {
  liveChatId: string
  apiKey: string
  onMessages: (items: ChatMessage[]) => void
  onError: (msg: string) => void
}

/**
 * YouTube liveChatMessages.list polling loop.
 * - Persists nextPageToken, chains on each response.
 * - Adaptive schedule via response.pollingIntervalMillis (fallback 5000ms).
 * - Dedupe via caller; handles 403/404/429 with backoff.
 */
export function createPoller(opts: Opts): PollerHandle {
  let nextPageToken: string | undefined
  let timer: NodeJS.Timeout | null = null
  let stopped = false
  let backoffMs = 0

  const baseUrl = 'https://www.googleapis.com/youtube/v3/liveChat/messages'

  async function tick(): Promise<void> {
    if (stopped) return
    try {
      const params = new URLSearchParams({
        liveChatId: opts.liveChatId,
        part: 'id,snippet,authorDetails',
        maxResults: '200',
        key: opts.apiKey
      })
      if (nextPageToken) params.set('pageToken', nextPageToken)

      const res = await fetch(`${baseUrl}?${params.toString()}`)
      const json = (await res.json()) as {
        error?: { code: number; message: string; errors?: { reason: string }[] }
        nextPageToken?: string
        pollingIntervalMillis?: number
        offlineAt?: string
        items?: ChatMessage[]
      }

      if (!res.ok || json.error) {
        const reason = json.error?.errors?.[0]?.reason || json.error?.message || `HTTP ${res.status}`
        if (reason === 'rateLimitExceeded' || res.status === 429) {
          backoffMs = Math.min(30000, (backoffMs || 2000) * 2)
          opts.onError(`rateLimitExceeded — retry in ${backoffMs}ms`)
          timer = setTimeout(tick, backoffMs)
          return
        }
        if (reason === 'quotaExceeded' || reason === 'quotaExceeded') {
          opts.onError('quotaExceeded — stop polling')
          stopped = true
          return
        }
        if (reason === 'liveChatEnded' || reason === 'liveChatNotFound' || reason === 'liveChatDisabled') {
          opts.onError(reason)
          stopped = true
          return
        }
        opts.onError(reason)
        backoffMs = Math.min(30000, (backoffMs || 3000) * 1.5)
        timer = setTimeout(tick, backoffMs)
        return
      }

      backoffMs = 0
      if (json.nextPageToken) nextPageToken = json.nextPageToken
      if (json.items?.length) opts.onMessages(json.items)

      const interval = json.pollingIntervalMillis ?? 5000
      timer = setTimeout(tick, interval)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      opts.onError(msg)
      backoffMs = Math.min(30000, (backoffMs || 3000) * 1.5)
      timer = setTimeout(tick, backoffMs)
    }
  }

  return {
    start() {
      stopped = false
      nextPageToken = undefined
      tick()
    },
    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
      timer = null
    }
  }
}
