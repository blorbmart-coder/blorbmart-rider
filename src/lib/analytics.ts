import { app } from './firebase'

/**
 * Firebase Analytics, loaded after the app is interactive.
 *
 * Three things this deliberately does not do:
 *
 * IT DOES NOT LOAD AT MODULE SCOPE. Analytics pulls gtag.js from Google, and
 * the page that would pay for it is the recruitment landing — the one opened
 * from a WhatsApp link on campus data by someone deciding whether to bother.
 * Measuring that page must not be what makes it slow.
 *
 * IT DOES NOT CALL getAnalytics DIRECTLY. `getAnalytics(app)` throws where
 * the environment cannot support it — a webview with cookies blocked, some
 * private modes, anything without IndexedDB. Unguarded, that turns an
 * analytics failure into a blank screen, which is a spectacular trade for a
 * pageview. `isSupported()` is the guard.
 *
 * IT NEVER THROWS. Every path resolves. Nothing in this file is allowed to
 * affect whether a rider can work.
 */

type AnalyticsInstance = Awaited<ReturnType<typeof loadAnalytics>>

let instance: AnalyticsInstance = null

async function loadAnalytics() {
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics')
    if (!(await isSupported())) return null
    return getAnalytics(app)
  } catch {
    return null
  }
}

/**
 * Starts analytics once the browser is idle, so it competes with nothing on
 * first paint. Safe to call more than once.
 */
export function initAnalytics() {
  if (instance) return

  const start = () => {
    void loadAnalytics().then((loaded) => {
      instance = loaded
    })
  }

  // Read off the object rather than using `in`, which narrows `window` itself
  // to `never` in the else branch and takes setTimeout with it.
  const idle = (window as Window & { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback

  if (typeof idle === 'function') {
    idle(start, { timeout: 4000 })
  } else {
    // Safari has no requestIdleCallback. A timeout is the honest fallback.
    window.setTimeout(start, 2500)
  }
}

/**
 * Records one event, if analytics ever finished loading.
 *
 * Events fired before then are dropped rather than queued. A recruitment
 * funnel is read in aggregate, and a queue that replays on a flaky connection
 * would trade a few lost events for double-counted ones — worse data, more
 * code.
 */
export async function track(event: string, params?: Record<string, unknown>) {
  if (!instance) return
  try {
    const { logEvent } = await import('firebase/analytics')
    logEvent(instance, event, params)
  } catch {
    /* Measurement must never be able to break the app. */
  }
}
