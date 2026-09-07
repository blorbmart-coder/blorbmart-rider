import { app } from './firebase'
import { riderApi } from './api'

/**
 * Web push, so a job reaches a rider whose phone is in their pocket.
 *
 * The Firestore listener covers the app being open. This covers the other 95%
 * of a rider's day — and on iOS it works ONLY when the app has been installed
 * to the home screen, which is why the account screen nags about installing.
 *
 * Everything here is best-effort and silent on failure. A rider who declines
 * the notification permission still gets every job the moment they open the
 * app; turning that into an error would be punishing them for a choice the
 * browser explicitly offers.
 *
 * Requires VITE_FIREBASE_VAPID_KEY. Without it this is a no-op, because
 * getToken with no VAPID key throws rather than degrading, and a thrown
 * exception during startup is far worse than quietly having no push.
 */
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

export async function enablePush(): Promise<{ enabled: boolean; reason?: string }> {
  if (!VAPID_KEY) return { enabled: false, reason: 'not_configured' }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { enabled: false, reason: 'unsupported' }
  }

  try {
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging')
    if (!(await isSupported())) return { enabled: false, reason: 'unsupported' }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { enabled: false, reason: 'denied' }

    // Reuse the service worker vite-plugin-pwa already registered rather than
    // registering a second one — two service workers on one scope fight over
    // control and the loser silently stops receiving pushes.
    const registration = await navigator.serviceWorker.ready

    const token = await getToken(getMessaging(app), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return { enabled: false, reason: 'no_token' }

    const platform = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? 'ios-pwa'
      : /Android/i.test(navigator.userAgent)
        ? 'android-pwa'
        : 'web'

    await riderApi.registerDevice(token, platform)
    return { enabled: true }
  } catch (error) {
    console.warn('Push setup skipped:', error)
    return { enabled: false, reason: 'error' }
  }
}

/** Whether it is even worth offering — asking twice after a refusal annoys. */
export const canOfferPush = () =>
  Boolean(VAPID_KEY) && 'Notification' in window && Notification.permission === 'default'
