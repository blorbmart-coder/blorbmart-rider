import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Bike, Clock } from 'lucide-react'
import { lazy, Suspense, type ReactNode } from 'react'
import { RiderProvider, useRider } from './contexts/RiderContext'
import AppShell from './components/AppShell'
import { Button } from './components/ui'

/*
 * Routes are split so the first paint downloads one screen, not nine.
 *
 * This matters more here than in most apps. The recruitment page is what a
 * student opens from a WhatsApp link on campus data, and it has no reason to
 * carry the delivery flow, the wallet, or the charting of anything. Shipping
 * them together puts a megabyte between a shared link and a headline.
 */
const JoinScreen = lazy(() => import('./pages/JoinScreen'))
const LoginScreen = lazy(() => import('./pages/LoginScreen'))
const SignupScreen = lazy(() => import('./pages/SignupScreen'))
const OnboardingScreen = lazy(() => import('./pages/OnboardingScreen'))
const DashboardScreen = lazy(() => import('./pages/DashboardScreen'))
const DeliveryScreen = lazy(() => import('./pages/DeliveryScreen'))
const EarningsScreen = lazy(() => import('./pages/EarningsScreen'))
const HistoryScreen = lazy(() => import('./pages/HistoryScreen'))
const AccountScreen = lazy(() => import('./pages/AccountScreen'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // Campus data is patchy. One retry rides out a dropped request without
      // making a genuinely broken endpoint take four times as long to fail.
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

function Splash() {
  return (
    <div className="min-h-screen bg-brand flex items-center justify-center">
      <div className="w-16 h-16 rounded-3xl bg-white/15 flex items-center justify-center animate-pulse">
        <Bike className="w-8 h-8 text-white" aria-hidden />
      </div>
    </div>
  )
}

function AwaitingApproval() {
  const { logout } = useRider()
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-warn-tint flex items-center justify-center mb-5">
        <Clock className="w-8 h-8 text-[#8A5B00]" aria-hidden />
      </div>
      <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Almost there</h1>
      <p className="mt-3 text-ink-soft leading-relaxed max-w-xs">
        Your account is being reviewed. We will let you know the moment you can start taking jobs — usually
        within a few hours.
      </p>
      <div className="mt-8">
        <Button variant="outline" onClick={logout}>
          Sign out
        </Button>
      </div>
    </div>
  )
}

/**
 * Routing by rider state, not just by "signed in".
 *
 * Four states exist between creating an account and taking a job, and each
 * has exactly one screen that is useful:
 *
 *   not signed in     the recruitment page
 *   no rider profile  signup, which they abandoned partway
 *   onboarding        the step they stopped on
 *   pending           an honest waiting screen
 *
 * The failure this prevents is the common one: dropping a half-registered
 * rider onto an empty dashboard with a disabled button and no explanation of
 * what is missing.
 */
function Guarded({ children }: { children: ReactNode }) {
  const { firebaseUser, rider, loading, needsRegistration } = useRider()
  const location = useLocation()

  if (loading) return <Splash />
  if (!firebaseUser) return <Navigate to="/join" replace state={{ from: location }} />
  if (needsRegistration) return <Navigate to="/signup" replace />
  if (!rider) return <Splash />
  if (!rider.onboardingComplete) return <Navigate to="/onboarding" replace />
  if (rider.status === 'pending') return <AwaitingApproval />
  if (rider.status === 'suspended' || rider.status === 'rejected') return <AwaitingApproval />

  return <AppShell>{children}</AppShell>
}

/**
 * Signed-in riders never see the marketing page or the login form again.
 *
 * Note what this deliberately does NOT do: block on `loading`. These are the
 * only pages a first-time visitor can reach, they are what a shared WhatsApp
 * link opens, and almost nobody who opens them is signed in. Holding them
 * behind a Firebase round trip means a student on bad campus data stares at a
 * blue splash — and if Firebase is slow or blocked, stares at it forever.
 *
 * So the page renders immediately and the redirect lands a moment later for
 * the rare visitor who turns out to be signed in. A signed-in rider seeing
 * one frame of the landing page is a far cheaper mistake than a prospective
 * rider seeing nothing at all.
 */
function PublicOnly({ children }: { children: ReactNode }) {
  const { firebaseUser, rider, loading } = useRider()
  if (!loading && firebaseUser && rider?.onboardingComplete) return <Navigate to="/" replace />
  return <>{children}</>
}

function OnboardingRoute() {
  const { firebaseUser, rider, loading, needsRegistration } = useRider()
  if (loading) return <Splash />
  if (!firebaseUser) return <Navigate to="/join" replace />
  if (needsRegistration) return <Navigate to="/signup" replace />
  if (rider?.onboardingComplete) return <Navigate to="/" replace />
  return <OnboardingScreen />
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/join"
        element={
          <PublicOnly>
            <JoinScreen />
          </PublicOnly>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginScreen />
          </PublicOnly>
        }
      />
      <Route path="/signup" element={<SignupScreen />} />
      <Route path="/onboarding" element={<OnboardingRoute />} />

      <Route
        path="/"
        element={
          <Guarded>
            <DashboardScreen />
          </Guarded>
        }
      />
      <Route
        path="/earnings"
        element={
          <Guarded>
            <EarningsScreen />
          </Guarded>
        }
      />
      <Route
        path="/history"
        element={
          <Guarded>
            <HistoryScreen />
          </Guarded>
        }
      />
      <Route
        path="/account"
        element={
          <Guarded>
            <AccountScreen />
          </Guarded>
        }
      />
      {/* The delivery screen sits outside AppShell: a rider mid-job has one
          task, and a bottom bar inviting them elsewhere is a distraction at
          the exact moment they are handling someone's money. */}
      <Route
        path="/delivery/:id"
        element={
          <GuardedBare>
            <DeliveryScreen />
          </GuardedBare>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function GuardedBare({ children }: { children: ReactNode }) {
  const { firebaseUser, rider, loading } = useRider()
  if (loading) return <Splash />
  if (!firebaseUser) return <Navigate to="/join" replace />
  if (!rider?.onboardingComplete) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RiderProvider>
        <BrowserRouter>
          <Suspense fallback={<Splash />}>
            <AppRoutes />
          </Suspense>
        </BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3200,
            style: {
              borderRadius: '14px',
              background: '#0B1B2B',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              // Clears the notch on an installed PWA, where there is no
              // browser chrome to push it down.
              marginTop: 'env(safe-area-inset-top)',
            },
          }}
        />
      </RiderProvider>
    </QueryClientProvider>
  )
}
