import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { riderApi, errorStatus, type Rider } from '../lib/api'

interface RiderContextValue {
  firebaseUser: FirebaseUser | null
  rider: Rider | null
  /** True until we know both who is signed in and whether they have a rider profile. */
  loading: boolean
  /** Signed in with Firebase but no rider profile yet — signup was interrupted. */
  needsRegistration: boolean
  refresh: () => Promise<void>
  setRider: (rider: Rider | null) => void
  logout: () => Promise<void>
}

const RiderContext = createContext<RiderContextValue>({
  firebaseUser: null,
  rider: null,
  loading: true,
  needsRegistration: false,
  refresh: async () => {},
  setRider: () => {},
  logout: async () => {},
})

export function RiderProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [rider, setRider] = useState<Rider | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsRegistration, setNeedsRegistration] = useState(false)

  const load = useCallback(async () => {
    try {
      const { rider: profile } = await riderApi.me()
      setRider(profile)
      setNeedsRegistration(false)
    } catch (error) {
      // A signed-in user with no rider document is not an error state — it is
      // somebody who closed the tab between creating their account and
      // finishing signup. They get routed back into it rather than being
      // shown a failure they cannot act on.
      if (errorStatus(error) === 403) {
        setRider(null)
        setNeedsRegistration(true)
      } else {
        setRider(null)
      }
    }
  }, [])

  useEffect(() => {
    // A hard stop on the loading state.
    //
    // onAuthStateChanged normally fires within milliseconds, including when
    // signed out. But if Firebase is unreachable — a captive campus portal, a
    // blocked domain, a dead connection — it can simply never fire, and every
    // screen that waits on `loading` then shows a splash with no way out.
    // After this, the app renders as signed-out, which is both the truth and
    // recoverable.
    const timeout = window.setTimeout(() => setLoading(false), 6000)

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      window.clearTimeout(timeout)
      setFirebaseUser(user)
      if (user) {
        await load()
      } else {
        setRider(null)
        setNeedsRegistration(false)
      }
      setLoading(false)
    })

    return () => {
      window.clearTimeout(timeout)
      unsubscribe()
    }
  }, [load])

  const value = useMemo<RiderContextValue>(
    () => ({
      firebaseUser,
      rider,
      loading,
      needsRegistration,
      refresh: load,
      setRider,
      logout: async () => {
        await signOut(auth)
        setRider(null)
      },
    }),
    [firebaseUser, rider, loading, needsRegistration, load],
  )

  return <RiderContext.Provider value={value}>{children}</RiderContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useRider = () => useContext(RiderContext)
