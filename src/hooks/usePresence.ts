import { useEffect, useRef, useState } from 'react'
import { riderApi } from '../lib/api'

const HEARTBEAT_MS = 90_000

/**
 * The cadence while a rider is actually carrying an order.
 *
 * The customer is watching an ETA that only moves when a beat lands, so the
 * idle 90s would show them a number a minute and a half stale. Each beat is
 * one small request; the backend decides on its own when a beat is worth a
 * billed route lookup, so raising this rate does not raise the routing bill.
 */
export const TRIP_HEARTBEAT_MS = 20_000

/**
 * Keeps an online rider reachable by dispatch.
 *
 * The backend only offers work to riders whose last heartbeat is recent. That
 * is deliberate: a rider whose phone died at noon is still flagged
 * "available" in the database, and routing lunchtime orders to a dead handset
 * is how a queue silently stops delivering food while every dashboard says
 * everything is fine.
 *
 * The cost of that rule is that the app must actually beat. It does so on a
 * timer, and again the moment the tab is brought back to the foreground — a
 * phone that was locked in a pocket for ten minutes has had its timers
 * throttled or frozen by the browser, so the visibility change is often the
 * only beat that lands.
 *
 * Location is best-effort. A rider who declines the permission still gets
 * work; they simply cannot be sorted by distance.
 */
export function usePresence({
  online,
  intervalMs = HEARTBEAT_MS,
}: {
  online: boolean
  intervalMs?: number
}) {
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null)
  const [locationDenied, setLocationDenied] = useState(false)
  const coordsRef = useRef<GeolocationCoordinates | null>(null)

  useEffect(() => {
    coordsRef.current = coords
  }, [coords])

  useEffect(() => {
    if (!online || !('geolocation' in navigator)) return

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoords(position.coords)
        setLocationDenied(false)
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) setLocationDenied(true)
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [online])

  useEffect(() => {
    if (!online) return

    const beat = () => {
      riderApi.heartbeat(coordsRef.current).catch(() => {
        // A missed beat is recoverable — the next one restores presence.
        // Surfacing it would put an error toast in front of a rider for
        // something they cannot fix and that fixes itself.
      })
    }

    beat()
    const interval = window.setInterval(beat, intervalMs)

    const onVisible = () => {
      if (document.visibilityState === 'visible') beat()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [online, intervalMs])

  return { coords, locationDenied }
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari does not implement display-mode, so it needs its own flag.
  (window.navigator as { standalone?: boolean }).standalone === true

/** Whether the app is running installed rather than in a browser tab. */
export function useInstalled() {
  // Read once during the initial render rather than setting state from an
  // effect — the answer is already knowable, and the effect version renders
  // the "not installed" branch first and corrects itself, which flashes the
  // install prompt at riders who have already installed.
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const listener = () => setInstalled(isStandalone())
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  return installed
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const up = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return isOnline
}
