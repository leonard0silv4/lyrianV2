import { useEffect, useRef } from 'react'
import { EventSourcePolyfill, type Event as SseEvent } from 'event-source-polyfill'
import { TOKEN_KEY } from '../api/client'

const RECONNECT_DELAYS_MS = [2000, 5000, 10000, 15000]

interface UseSseOptions<T> {
  eventName: string
  onEvent: (data: T) => void
  enabled?: boolean
}

export function useSse<T>({ eventName, onEvent, enabled = true }: UseSseOptions<T>) {
  const callback = useRef(onEvent)
  useEffect(() => {
    callback.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (!enabled) return

    let eventSource: EventSourcePolyfill | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0
    let stopped = false

    const handleEvent = (event: SseEvent) => {
      try {
        const parsedData: T = JSON.parse((event as unknown as { data: string }).data)
        callback.current(parsedData)
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    function connect() {
      if (stopped) return
      const token = localStorage.getItem(TOKEN_KEY) || ''
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001').replace(/\/+$/, '')
      eventSource = new EventSourcePolyfill(`${baseUrl}/events`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      eventSource.addEventListener(eventName, handleEvent)

      eventSource.onopen = () => {
        attempt = 0
      }

      eventSource.onerror = () => {
        eventSource?.close()
        if (stopped) return
        const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)]
        attempt += 1
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      eventSource?.removeEventListener(eventName, handleEvent)
      eventSource?.close()
    }
  }, [eventName, enabled])
}
