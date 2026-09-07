import { useCallback, useEffect, useRef, useState } from 'react'
import { firestore } from '../lib/firestore'
import { riderApi, type Offer } from '../lib/api'

/**
 * The live job board.
 *
 * ── Why a Firestore listener and not polling ───────────────────────────────
 *
 * The whole promise to a rider is that they see an order at the same moment
 * the restaurant does. A five-second poll makes that promise false five
 * seconds at a time, and the rider who happens to poll first wins jobs the
 * others never saw. A snapshot listener pushes the same document to every
 * open app within one round trip of the write.
 *
 * ── Why the API still runs alongside it ────────────────────────────────────
 *
 * Firestore can tell a rider an offer exists. It cannot tell them whether
 * *they* are allowed to pay for it — that depends on their trust ceiling and
 * on how long the restaurant has been silent, and both are decided on the
 * server precisely so a modified client cannot decide them for itself.
 *
 * So the listener supplies speed and the API supplies eligibility: the
 * snapshot fires immediately, and the enriched list arrives a moment later. A
 * rider never waits on a poll interval to learn that work exists.
 */
export function useLiveOffers({ enabled }: { enabled: boolean }) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const enrichTimer = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    const result = await riderApi.offers()
    setOffers(result.offers)
    return result
  }, [])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let unsubscribe: (() => void) | null = null

    const enrich = async () => {
      try {
        const result = await riderApi.offers()
        if (!cancelled) {
          setOffers(result.offers)
          setError(null)
        }
      } catch {
        // The board is still usable from the previous fetch. A failed
        // enrichment costs the rider the cash-front button, not the job list,
        // so it does not warrant an error screen.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const start = async () => {
      void enrich()

      const { db, sdk } = await firestore()
      if (cancelled) return

      const q = sdk.query(
        sdk.collection(db, 'deliveryOffers'),
        sdk.where('status', '==', 'open'),
        sdk.orderBy('createdAt', 'desc'),
      )

      unsubscribe = sdk.onSnapshot(
        q,
        () => {
          // Debounced: a lunchtime burst would otherwise fire one API call
          // per document written.
          if (enrichTimer.current) window.clearTimeout(enrichTimer.current)
          enrichTimer.current = window.setTimeout(() => void enrich(), 250)
        },
        (err) => {
          if (!cancelled) setError(err.message)
        },
      )
    }

    void start()

    return () => {
      cancelled = true
      if (enrichTimer.current) window.clearTimeout(enrichTimer.current)
      unsubscribe?.()
    }
  }, [enabled])

  // Offline is a derived state, not a stored one. Clearing the list from an
  // effect would render one frame of stale jobs to a rider who has just gone
  // offline — jobs they can no longer take.
  if (!enabled) return { offers: [] as Offer[], loading: false, error: null, refresh }

  return { offers, loading, error, refresh }
}
