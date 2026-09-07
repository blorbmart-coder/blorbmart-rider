import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

/**
 * The rider app's own web-app registration inside the shared Blorbmart
 * project (`blorbmart-b29b7`).
 *
 * Same project as the buyer and vendor apps — one set of users, one database,
 * one set of rules — but a distinct `appId`, which is what lets this app have
 * its own Web Push certificate and its own analytics stream. That pairing
 * matters: the VAPID key in .env is issued per web app, so it must come from
 * this registration or push silently returns no token.
 *
 * Firestore is deliberately NOT imported here. Only the live job board needs
 * it, and pulling it in at module scope would put the whole Firestore SDK in
 * front of the recruitment page — the one screen most people ever see, opened
 * from a shared link on campus data. It is loaded on demand by
 * `lib/firestore.ts` instead. Analytics is deferred for the same reason, in
 * `lib/analytics.ts`.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyDUbeJLXOoUmTMEktvYDvv4Piqs3vAWh2k',
  authDomain: 'blorbmart-b29b7.firebaseapp.com',
  projectId: 'blorbmart-b29b7',
  storageBucket: 'blorbmart-b29b7.firebasestorage.app',
  messagingSenderId: '840596799490',
  appId: '1:840596799490:web:5f16531b8bf6533ee6671b',
  measurementId: 'G-2E0MD8SJF0',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
