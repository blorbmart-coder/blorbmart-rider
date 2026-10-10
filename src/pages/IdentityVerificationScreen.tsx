import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Loader2, ScanFace } from 'lucide-react'
import { riderApi, errorMessage, errorStatus, type Rider } from '../lib/api'
import { Button, Card, Row } from '../components/ui'
import { supportWhatsAppUrl } from '../components/LegalViewer'

export type IdentityVerificationStatus = 'not_started' | 'pending' | 'approved' | 'declined' | 'needs_review'

const STATUS_LABEL: Record<IdentityVerificationStatus, string> = {
  not_started: 'Not verified',
  pending: 'Pending',
  approved: 'Verified',
  needs_review: 'In review',
  declined: 'Declined',
}

type RiderWithIdentity = Rider & {
  riderVerification?: { status?: IdentityVerificationStatus | string | null } | null
}

const statusOf = (rider: Rider): IdentityVerificationStatus => {
  const status = (rider as RiderWithIdentity).riderVerification?.status
  return status && status in STATUS_LABEL ? (status as IdentityVerificationStatus) : 'not_started'
}

async function readIdentityStatus() {
  const { rider } = await riderApi.me()
  return statusOf(rider)
}

export function IdentityVerificationRow() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<IdentityVerificationStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    void readIdentityStatus()
      .then((next) => {
        if (!cancelled) setStatus(next)
      })
      .catch(() => {
        // The account row remains a normal row when status cannot be loaded.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Row
      icon={BadgeCheck}
      label="Identity verification"
      value={status ? STATUS_LABEL[status] : undefined}
      onClick={() => navigate('/account/identity-verification')}
    />
  )
}

export function isIdentityVerificationRefusal(error: unknown) {
  const response = (error as { response?: { data?: { code?: unknown } } })?.response
  return errorStatus(error) === 403 && response?.data?.code === 'RIDER_NOT_VERIFIED'
}

export function showIdentityVerificationPrompt(
  navigate: (path: string) => void,
  error: unknown,
) {
  toast.custom((toastItem) => (
    <div className="w-[min(360px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-4 shadow-2xl">
      <p className="font-bold text-ink">Identity verification needed</p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
        {errorMessage(error, 'Complete identity verification before taking jobs.')}
      </p>
      <Button
        variant="volt"
        size="sm"
        className="mt-3"
        onClick={() => {
          toast.dismiss(toastItem.id)
          navigate('/account/identity-verification')
        }}
      >
        Verify identity
      </Button>
    </div>
  ))
}

export default function IdentityVerificationScreen() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<IdentityVerificationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollTimedOut, setPollTimedOut] = useState(false)

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setRefreshing(true)
    try {
      const next = await readIdentityStatus()
      setStatus(next)
      setError(null)
      if (next !== 'pending') setPollTimedOut(false)
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not load your verification status.'))
    } finally {
      setLoading(false)
      if (showLoading) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onFocus = () => void refresh(false)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  useEffect(() => {
    if (status !== 'pending' || pollTimedOut) return
    const deadline = Date.now() + 2 * 60 * 1000
    const interval = window.setInterval(() => {
      if (Date.now() >= deadline) {
        setPollTimedOut(true)
        window.clearInterval(interval)
        return
      }
      void refresh(false)
    }, 4000)
    return () => window.clearInterval(interval)
  }, [pollTimedOut, refresh, status])

  const start = async () => {
    setStarting(true)
    setError(null)
    try {
      const result = await riderApi.startIdentityVerification()
      const opened = window.open(result.url, '_blank', 'noopener,noreferrer')
      if (!opened) {
        setError('Your browser blocked the verification page. Allow pop-ups and try again.')
        return
      }
      setStatus('pending')
      setPollTimedOut(false)
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not start verification. Please try again.'))
    } finally {
      setStarting(false)
    }
  }

  const content = () => {
    if (loading) {
      return <Loader2 className="mx-auto h-7 w-7 animate-spin text-volt" aria-label="Loading" />
    }
    if (error && !status) {
      return (
        <>
          <p className="text-[14px] leading-relaxed text-ink-soft">{error}</p>
          <Button variant="outline" fullWidth className="mt-5" loading={refreshing} onClick={() => void refresh()}>
            Try again
          </Button>
        </>
      )
    }
    if (status === 'approved') {
      return (
        <>
          <p className="text-[15px] leading-relaxed text-ink-soft">Your identity has been verified. You can take jobs.</p>
          <Button variant="volt" fullWidth className="mt-5" onClick={() => navigate('/')}>
            Back to jobs
          </Button>
        </>
      )
    }
    if (status === 'pending') {
      return (
        <>
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Your verification is being checked. You can use the app while we wait for the result.
          </p>
          {pollTimedOut && <p className="mt-3 text-[13px] text-ink-faint">Still checking, we&apos;ll update you.</p>}
          <Button variant="outline" fullWidth className="mt-5" loading={refreshing} onClick={() => void refresh()}>
            Refresh
          </Button>
        </>
      )
    }
    if (status === 'needs_review') {
      return <p className="text-[15px] leading-relaxed text-ink-soft">Your verification is being reviewed by our team. This can take a while.</p>
    }
    if (status === 'declined') {
      return (
        <>
          <p className="text-[15px] leading-relaxed text-ink-soft">We couldn&apos;t verify your identity.</p>
          <Button
            variant="outline"
            fullWidth
            className="mt-5"
            onClick={() => window.open(supportWhatsAppUrl('Hello Blorbmart, I need help with identity verification.'), '_blank', 'noopener,noreferrer')}
          >
            Contact support
          </Button>
        </>
      )
    }
    return (
      <>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          You&apos;ll enter your NIN and take a selfie on a secure verification page. Blorbmart never sees your NIN or photo.
        </p>
        <Button variant="volt" fullWidth className="mt-5" icon={ScanFace} loading={starting} onClick={() => void start()}>
          Start verification
        </Button>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-void px-5 py-6 pad-top-safe">
      <div className="mx-auto max-w-lg">
        <button className="mb-7 text-[14px] font-bold text-ink-soft" onClick={() => navigate('/account')}>
          ← Account
        </button>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.03em]">Identity verification</h1>
        <Card variant="solid" className="mt-5 p-5">
          {error && status !== 'not_started' && <p className="mb-4 rounded-2xl border border-rose/30 bg-rose/10 p-3 text-[13px] text-rose">{error}</p>}
          {content()}
        </Card>
      </div>
    </div>
  )
}
