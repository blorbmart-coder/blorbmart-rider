import { app } from './firebase'

/**
 * Firestore, loaded on demand.
 *
 * The live job board is the only thing in this app that reads Firestore
 * directly, and it only runs once a rider is signed in and online. Importing
 * the SDK at module scope would ship roughly 250 KB to every visitor who
 * opens the recruitment page and never signs up — the exact opposite of who
 * should be paying for it.
 *
 * The module cache makes repeat calls free, so callers can just await it.
 */
export const firestore = async () => {
  const sdk = await import('firebase/firestore')
  return { db: sdk.getFirestore(app), sdk }
}
