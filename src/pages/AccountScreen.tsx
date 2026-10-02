import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Bike,
  Camera,
  Download,
  FileText,
  GraduationCap,
  HandCoins,
  Hourglass,
  LifeBuoy,
  Lock,
  LogOut,
  MessageCircle,
  ShieldAlert,
  Siren,
  Star,
  UserX,
  Wallet,
} from 'lucide-react'
import { riderApi, type Rider } from '../lib/api'
import { useRider } from '../contexts/RiderContext'
import { useInstalled } from '../hooks/usePresence'
import { Button, Card, Chip, IconBadge, Money, ProgressBar, Row } from '../components/ui'
import { BrandMark, GlowField } from '../components/art'
import { initials, money } from '../lib/format'
import { EmergencyContactSheet, SosSheet, VerificationSheet } from '../components/Safety'
import { LegalViewer, supportEmailUrl, supportWhatsAppUrl, type LegalDoc } from '../components/LegalViewer'

const VEHICLE_LABEL: Record<string, string> = {
  foot: 'On foot',
  bicycle: 'Bicycle',
  bike: 'Motorcycle',
  car: 'Car',
}

export default function AccountScreen() {
  const navigate = useNavigate()
  const { rider, logout, setRider } = useRider()

  // Back from Didit (?kyc=done): read the result now rather than wait for
  // the webhook, then drop the marker so a reload does not ask again.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('kyc') !== 'done') return
    window.history.replaceState(window.history.state, '', window.location.pathname)
    riderApi
      .syncDidit()
      .then((updated) => {
        setRider(updated)
        if (updated.verified) toast.success('Your ID passed. You are verified.')
        else if (updated.verificationStatus === 'pending') toast.success('Your ID check is in. We will let you know.')
      })
      .catch(() => {})
  }, [setRider])
  const installed = useInstalled()
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [sosOpen, setSosOpen] = useState(false)
  const [legal, setLegal] = useState<LegalDoc | null>(null)
  const closeLegal = useCallback(() => setLegal(null), [])

  const { data: earnings } = useQuery({ queryKey: ['earnings'], queryFn: riderApi.earnings })
  const sourcing = rider?.sourcing

  return (
    <div>
      <header className="relative overflow-hidden pad-top-safe px-5 pt-6 pb-7 grain">
        <GlowField tone="iris" />
        <div className="absolute inset-0 dotfield opacity-50" aria-hidden />

        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-[68px] h-[68px] overflow-hidden rounded-[22px] bg-raised border border-line flex items-center justify-center font-display text-[22px] font-bold">
              {rider?.photoUrl ? (
                <img src={rider.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(rider?.displayName)
              )}
            </div>
            {rider?.status === 'active' && (
              <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-surface flex items-center justify-center border-[3px] border-void">
                <BrandMark className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[24px] leading-tight font-bold tracking-[-0.03em] truncate">
              {rider?.displayName || 'Rider'}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[13px] font-bold text-ink-soft">
                <Star className="w-3.5 h-3.5 fill-gold text-gold" aria-hidden />
                {(rider?.rating ?? 5).toFixed(1)}
              </span>
              {/* "Verified" means campus ops matched the face to an ID — not
                  merely that signup finished. */}
              {rider?.verified ? (
                <Chip tone="volt" icon={BadgeCheck}>
                  Verified
                </Chip>
              ) : rider?.verificationStatus === 'pending' ? (
                <Chip tone="gold" icon={Hourglass}>
                  Being checked
                </Chip>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card variant="raised" className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint mb-2">Deliveries</p>
            <p className="font-display tnum text-[26px] leading-none font-bold">
              {earnings?.lifetimeDeliveries ?? 0}
            </p>
          </Card>
          <Card variant="raised" className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint mb-2">Earned</p>
            <Money amount={earnings?.totalEarned ?? 0} size="lg" tone="volt" />
          </Card>
        </div>

        {/* The trust ladder, stated plainly. A limit a rider understands is a
            goal; a limit they only discover as a rejection is a bug report. */}
        {sourcing && (
          <Card variant="solid" className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <IconBadge icon={HandCoins} tone="ember" size="sm" />
              <p className="font-display font-bold text-[16px] tracking-[-0.02em]">Cash-front limit</p>
            </div>

            {sourcing.unlocked ? (
              <>
                <Money amount={sourcing.limit} size="xl" tone="ember" />
                <p className="text-[13px] text-ink-soft leading-relaxed mt-3">
                  You can cover orders up to this amount when a restaurant does not respond. Every naira comes
                  back on delivery, plus a bonus.
                </p>
                {sourcing.nextLimit && sourcing.deliveriesToNextTier !== null && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-[12px] font-bold text-ink-faint mb-2">
                      <span>Next: {money(sourcing.nextLimit)}</span>
                      <span className="tnum">{sourcing.deliveriesToNextTier} to go</span>
                    </div>
                    <ProgressBar
                      value={sourcing.deliveriesCompleted}
                      max={sourcing.deliveriesCompleted + sourcing.deliveriesToNextTier}
                      tone="ember"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-[13px] text-ink-soft leading-relaxed">
                  Complete {sourcing.deliveriesToNextTier ?? 3} more deliver
                  {(sourcing.deliveriesToNextTier ?? 3) === 1 ? 'y' : 'ies'} to unlock covering orders yourself —
                  it pays a bonus on top of the delivery fee.
                </p>
                {sourcing.deliveriesToNextTier !== null && (
                  <div className="mt-4">
                    <ProgressBar
                      value={sourcing.deliveriesCompleted}
                      max={sourcing.deliveriesCompleted + sourcing.deliveriesToNextTier}
                      tone="ember"
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {rider && !rider.verified && <VerifyCard rider={rider} onOpen={() => setVerifyOpen(true)} />}

        <Card variant="solid" className="py-1.5 overflow-hidden">
          <Row icon={Wallet} label="Wallet and cashouts" tone="volt" onClick={() => navigate('/earnings')} />
          <div className="h-px bg-line-soft mx-4" />
          <Row icon={Bike} label="Vehicle" value={VEHICLE_LABEL[rider?.vehicleType ?? ''] ?? 'Not set'} />
          <div className="h-px bg-line-soft mx-4" />
          <Row icon={GraduationCap} label="School" value={rider?.campus?.school ?? 'Not set'} />
        </Card>

        {/* Installing is what makes push notifications work on iOS at all —
            a Safari tab gets none, so a rider who never installs is a rider
            who only sees jobs when the app happens to be open. */}
        {!installed && (
          <Card variant="solid" glow="iris" className="p-4">
            <div className="flex items-start gap-3">
              <IconBadge icon={Download} tone="iris" />
              <div className="min-w-0">
                <p className="font-bold text-[15px]">Install the app</p>
                <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
                  Add Blorbmart Rider to your home screen so job alerts reach you when the app is closed. On
                  iPhone: Share, then <span className="font-bold text-ink">Add to Home Screen</span>. On Android:
                  menu, then <span className="font-bold text-ink">Install app</span>.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card variant="solid" className="py-1.5 overflow-hidden">
          <Row icon={Siren} label="SOS — get help now" danger onClick={() => setSosOpen(true)} />
          <div className="h-px bg-line-soft mx-4" />
          <Row icon={ShieldAlert} label="Emergency contact" danger onClick={() => setContactOpen(true)} />
          <div className="h-px bg-line-soft mx-4" />
          <Row
            icon={MessageCircle}
            label="Chat with support"
            value="WhatsApp"
            tone="neutral"
            onClick={() => window.open(supportWhatsAppUrl('Hello Blorbmart, I am a rider and I need help'), '_blank', 'noopener,noreferrer')}
          />
          <div className="h-px bg-line-soft mx-4" />
          <Row
            icon={LifeBuoy}
            label="Email us"
            tone="neutral"
            onClick={() => {
              window.location.href = supportEmailUrl('Rider support')
            }}
          />
        </Card>

        {/* Terms, privacy and deletion, read inside the app. */}
        <Card variant="solid" className="py-1.5 overflow-hidden">
          <Row icon={FileText} label="Terms and conditions" tone="neutral" onClick={() => setLegal('terms')} />
          <div className="h-px bg-line-soft mx-4" />
          <Row icon={Lock} label="Privacy policy" tone="neutral" onClick={() => setLegal('privacy')} />
          <div className="h-px bg-line-soft mx-4" />
          <Row icon={UserX} label="Delete my account" tone="neutral" onClick={() => setLegal('delete-account')} />
        </Card>

        <Button
          variant="outline"
          size="lg"
          fullWidth
          icon={LogOut}
          onClick={async () => {
            await logout()
            navigate('/join', { replace: true })
          }}
        >
          Sign out
        </Button>

        <div className="flex items-center justify-center gap-2 pt-3 pb-4 text-ink-faint">
          <BrandMark className="w-3.5 h-3.5" />
          <p className="text-[12px] font-semibold">Blorbmart · Powering students</p>
        </div>
      </main>

      {rider && <VerificationSheet open={verifyOpen} onClose={() => setVerifyOpen(false)} rider={rider} />}
      <EmergencyContactSheet open={contactOpen} onClose={() => setContactOpen(false)} />
      <SosSheet open={sosOpen} onClose={() => setSosOpen(false)} coords={null} />
      <LegalViewer doc={legal} onClose={closeLegal} />
    </div>
  )
}

/** The photo check, until it is done: what state it is in and what to do. */
function VerifyCard({ rider, onOpen }: { rider: Rider; onOpen: () => void }) {
  const status = rider.verificationStatus ?? 'unverified'
  const copy =
    status === 'pending'
      ? {
          title: rider.identityCheck === 'didit' ? 'Your ID is being checked' : 'Your photos are being checked',
          body:
            rider.identityCheck === 'didit'
              ? 'Didit is reviewing your ID and selfie. You will get a notification when it is done.'
              : 'Campus ops is matching your selfie to your ID. You will get a notification when it is done.',
          tone: 'gold' as const,
        }
      : status === 'rejected'
        ? {
            title: rider.identityCheck === 'didit' ? 'Your ID check did not pass' : 'Your photos need another look',
            body: rider.verification?.reason ?? 'Campus ops could not verify them. Send a clearer selfie and ID photo.',
            tone: 'ember' as const,
          }
        : {
            title: 'Get verified',
            body: rider.verificationRequired
              ? `You need to be verified to take jobs. ${rider.identityCheck === 'didit' ? 'Scan your ID and take a video selfie.' : 'Send a selfie and a photo of your ID.'}`
              : `Customers see your photo and a verified mark when you are on the way. ${rider.identityCheck === 'didit' ? 'Scan your ID and take a video selfie.' : 'Send a selfie and a photo of your ID.'}`,
            tone: 'iris' as const,
          }
  return (
    <Card variant="solid" className="p-4">
      <div className="flex items-center gap-2.5">
        <IconBadge icon={BadgeCheck} tone={copy.tone} size="sm" />
        <p className="font-display text-[16px] font-bold tracking-[-0.02em]">{copy.title}</p>
      </div>
      <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">{copy.body}</p>
      {status !== 'pending' && (
        <div className="mt-4">
          <Button variant="volt" fullWidth icon={Camera} onClick={onOpen}>
            {status === 'rejected' ? (rider.identityCheck === 'didit' ? 'Try again' : 'Send new photos') : 'Get verified'}
          </Button>
        </div>
      )}
    </Card>
  )
}
