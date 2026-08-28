import { useEffect, useState } from 'react'
import type { SseEvent } from './types'

/** Live SSE feed from /events/stream. Keeps the last `maxEvents` events. */
export function useSseFeed(maxEvents = 50): { events: SseEvent[]; connected: boolean } {
  const [events, setEvents] = useState<SseEvent[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const src = new EventSource('/events/stream')
    src.onopen = () => setConnected(true)
    src.onerror = () => setConnected(false)
    src.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as SseEvent
        setEvents((prev) => [...prev.slice(-(maxEvents - 1)), ev])
      } catch {
        // ignore malformed frames
      }
    }
    return () => src.close()
  }, [maxEvents])

  return { events, connected }
}
