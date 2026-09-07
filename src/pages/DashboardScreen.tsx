import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  ChevronRight,
  Flame,
  MapPinOff,
  Package,
  Power,
  Radio,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { riderApi, errorMessage, type Offer } from '../lib/api'
import { useRider } from '../contexts/RiderContext'
import { useLiveOffers } from '../hooks/useLiveOffers'
import { usePresence } from '../hooks/usePresence'
import { canOfferPush, enablePush } from '../lib/push'
import { Button, Card, Chip, EmptyState, IconBadge, Money, ProgressBar, SectionTitle, Skeleton, cn, tap } from '../components/ui'
import { GlowField, NightScene, RadarScene } from '../components/art'
import OfferCard from '../components/OfferCard'
import { initials } from '../lib/format'

/** Nobody is "good morning"-ed at 2am. The greeting tracks the shift. */
const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 22) return 'Good evening'
  return 'Late shift'
}

export default function DashboardScreen() {
  const navigate = useNavigate()
  const { rider, setRider } = useRider()
  const [toggling, setToggling] = useState(false)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const online = Boolean(rider?.isAvailable)
  const { coords, locationDenied } = usePresence({ online })
  const { offers, loading: offersLoading } = useLiveOffers({ enabled: online })

  const { data: earnings } = useQuery({
    queryKey: ['earnings'],
    queryFn: riderApi.earnings,
    refetchInterval: 60_000,
  })

  const { data: active, refetch: refetchActive } = useQuery({
    queryKey: ['active-delivery'],
    queryFn: riderApi.activeDelivery,
    refetchInterval: 30_000,
  })

  // A rider with a delivery in progress has exactly one thing to do, and it
  // is not browsing the board. Sending them straight there also means a
  // reopened app resumes mid-job rather than losing their place.
  useEffect(() => {
    if (active?.id) navigate(`/delivery/${active.id}`, { replace: true })
  }, [active?.id, navigate])

  const toggleOnline = async () => {
    setToggling(true)
    tap([14, 40, 14])
    try {
      const updated = await riderApi.setAvailability(!online, coords)
      setRider(updated)
      toast.success(updated.isAvailable ? "You're online — jobs incoming" : "You're offline")

      // Ask for notifications here and nowhere else. A rider who has just
      // said "send me work" understands exactly what the permission is for;
      // the same prompt on first launch, before they know what the app does,
      // gets denied — and on iOS a denial is effectively permanent.
      if (updated.isAvailable && canOfferPush()) {
        void enablePush()
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Could not change your status.'))
    } finally {
      setToggling(false)
    }
  }

  const accept = async (offer: Offer) => {
    setAcceptingId(offer.id)
    try {
      const delivery = await riderApi.acceptOffer(offer.id)
      tap([18, 50, 18])
      toast.success('Job is yours')
      navigate(`/delivery/${delivery.id}`)
    } catch (error) {
      toast.error(errorMessage(error, 'Could not take that job.'))
      await refetchActive()
    } finally {
      setAcceptingId(null)
    }
  }

  const skip = async (offer: Offer) => {
    try {
      await riderApi.declineOffer(offer.id)
    } catch {
      /* Skipping is a preference, not a transaction. A failure costs nothing. */
    }
  }

  const sourcing = rider?.sourcing

  return (
    <div>
      {/* ── The cockpit ───────────────────────────────────────────────────
          Ambient light rather than a flat brand-coloured slab. It also
          recolours with state: iris while parked, volt once the rider is
          live, so the top of the screen answers "am I working?" from across
          a room. */}
      <header className="relative overflow-hidden pad-top-safe px-5 pt-3 pb-16 grain">
        <GlowField tone={online ? 'volt' : 'iris'} />
        <div className="absolute inset-0 dotfield opacity-60" aria-hidden />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-raised border border-line flex items-center justify-center font-display font-bold text-[15px] shrink-0">
                {initials(rider?.displayName)}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] text-ink-faint font-semibold">{greeting()}</p>
                <p className="font-display font-bold text-[17px] tracking-[-0.02em] truncate">
                  {rider?.firstName || 'Rider'}
                </p>
              </div>
            </div>

            {(earnings?.streakDays ?? 0) > 1 && (
              <Chip tone="gold" icon={Flame}>
                {earnings?.streakDays} day streak
              </Chip>
            )}
          </div>

          {/*
            The online switch is the single most important control in the app,
            so it is a full-width target rather than a toggle in a corner —
            the difference between working and not working should not be a
            20px tap.

            It also changes character rather than just colour. Offline it is a
            solid volt call to action, because going online is the only thing
            worth doing on this screen. Online it becomes a quiet instrument
            readout with a broadcast pulse: the job is done, stop shouting.
          */}
          <button
            onClick={toggleOnline}
            disabled={toggling}
            aria-pressed={online}
            className={cn(
              'mt-6 w-full min-h-[76px] rounded-[24px] px-5 flex items-center justify-between gap-4 cursor-pointer',
              'transition-all duration-300 ease-[var(--ease-out-soft)] active:scale-[0.985] disabled:opacity-70',
              online
                ? 'bg-surface border border-volt/30 shadow-[0_16px_50px_-22px_rgba(175,255,0,0.8)]'
                : 'bg-volt text-void shadow-[0_16px_50px_-18px_rgba(175,255,0,0.9)]',
            )}
          >
            <span className="flex items-center gap-3.5 min-w-0">
              <span className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                {online && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-volt/40 radar-ring" aria-hidden />
                    <span className="absolute inset-0 rounded-full bg-volt/40 radar-ring-delayed" aria-hidden />
                  </>
                )}
                <span
                  className={cn(
                    'relative w-12 h-12 rounded-full flex items-center justify-center',
                    online ? 'bg-volt text-void' : 'bg-void/12 text-void',
                  )}
                >
                  {online ? (
                    <Radio className="w-[22px] h-[22px]" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <Power className="w-[22px] h-[22px]" strokeWidth={2.6} aria-hidden />
                  )}
                </span>
              </span>

              <span className="text-left min-w-0">
                <span
                  className={cn(
                    'block font-display font-bold text-[19px] tracking-[-0.02em] leading-none',
                    online ? 'text-volt' : 'text-void',
                  )}
                >
                  {online ? 'Online' : 'Go online'}
                </span>
                <span
                  className={cn(
                    'block text-[13px] font-semibold mt-1.5 truncate',
                    online ? 'text-ink-soft' : 'text-void/65',
                  )}
                >
                  {online
                    ? offers.length > 0
                      ? `${offers.length} job${offers.length === 1 ? '' : 's'} on the board`
                      : 'Listening for jobs'
                    : 'Tap to start earning'}
                </span>
              </span>
            </span>

            <span
              className={cn(
                'w-[52px] h-8 rounded-full p-1 flex shrink-0 transition-colors duration-300',
                online ? 'bg-volt justify-end' : 'bg-void/15 justify-start',
              )}
            >
              <motion.span
                layout
                transition={{ type: 'spring', damping: 24, stiffness: 420 }}
                className={cn('w-6 h-6 rounded-full', online ? 'bg-void' : 'bg-void/50')}
              />
            </span>
          </button>
        </div>
      </header>

      <main className="px-5 -mt-10 relative space-y-5">
        {/* ── Money, at a glance ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Card variant="raised" className="p-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <TrendingUp className="w-4 h-4 text-ink-faint" strokeWidth={2.4} aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Today</p>
            </div>
            {earnings ? (
              <>
                <Money amount={earnings.earningsToday} size="lg" tone="ink" />
                <p className="text-[12px] text-ink-faint font-semibold mt-1.5">
                  {earnings.deliveriesToday} deliver{earnings.deliveriesToday === 1 ? 'y' : 'ies'}
                </p>
              </>
            ) : (
              <Skeleton className="h-7 w-24" />
            )}
          </Card>

          <Card variant="raised" className="p-4" onClick={() => navigate('/earnings')}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Wallet className="w-4 h-4 text-volt" strokeWidth={2.4} aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Wallet</p>
            </div>
            {earnings ? (
              <>
                <Money amount={earnings.availableBalance} size="lg" tone="volt" />
                <p className="text-[12px] text-volt font-bold mt-1.5 inline-flex items-center gap-1">
                  Cash out <ArrowRight className="w-3 h-3" aria-hidden />
                </p>
              </>
            ) : (
              <Skeleton className="h-7 w-24" />
            )}
          </Card>
        </div>

        {/* The trust ladder as a goal rather than a restriction. A rider who
            understands the limit is climbing something; one who only meets it
            as a blocked button concludes the app is broken. */}
        {sourcing && !sourcing.unlocked && sourcing.deliveriesToNextTier !== null && (
          <Card variant="solid" glow="ember" className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="font-display font-bold text-[15px] text-ember-light inline-flex items-center gap-2">
                <Zap className="w-4 h-4" strokeWidth={2.6} aria-hidden />
                Unlock bigger earnings
              </p>
              <span className="font-display tnum text-[14px] font-bold text-ember-light">
                {sourcing.deliveriesCompleted}/{sourcing.deliveriesCompleted + sourcing.deliveriesToNextTier}
              </span>
            </div>
            <ProgressBar
              tone="ember"
              value={sourcing.deliveriesCompleted}
              max={sourcing.deliveriesCompleted + sourcing.deliveriesToNextTier}
            />
            <p className="text-[13px] text-ink-soft leading-snug mt-3">
              {sourcing.deliveriesToNextTier} more deliver
              {sourcing.deliveriesToNextTier === 1 ? 'y' : 'ies'} and you can start covering orders the kitchen
              misses — worth an extra bonus every time.
            </p>
          </Card>
        )}

        {locationDenied && online && (
          <Card variant="solid" className="p-4 flex gap-3 border-gold/25">
            <IconBadge icon={MapPinOff} tone="gold" size="sm" />
            <div>
              <p className="font-bold text-[14px]">Location is off</p>
              <p className="text-[13px] text-ink-soft leading-snug mt-0.5">
                You will still get jobs, but we cannot sort them by how close they are to you.
              </p>
            </div>
          </Card>
        )}

        {/* ── The board ─────────────────────────────────────────────────── */}
        <section>
          <SectionTitle
            trailing={
              online && offers.length > 0 ? (
                <Chip tone="volt" className="breathe">
                  Live
                </Chip>
              ) : undefined
            }
          >
            {online ? 'Jobs near you' : 'The board'}
          </SectionTitle>

          {!online ? (
            <Card variant="solid" className="overflow-hidden">
              <EmptyState
                art={<NightScene className="w-full" />}
                title="You're off the clock"
                message="Flip the switch above and paid orders appear here the moment they come in — at the same time the restaurant sees them."
                action={
                  <Button variant="volt" onClick={toggleOnline} loading={toggling} icon={Power}>
                    Go online
                  </Button>
                }
              />
            </Card>
          ) : offersLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-44 rounded-[var(--radius-card)]" />
              <Skeleton className="h-44 rounded-[var(--radius-card)]" />
            </div>
          ) : offers.length === 0 ? (
            <Card variant="solid">
              <EmptyState
                art={<RadarScene className="w-full" />}
                title="Scanning"
                message="Stay online and the next paid order lands here automatically. Lunchtime and evenings are busiest."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    vehicle={rider?.vehicleType}
                    accepting={acceptingId === offer.id}
                    onAccept={() => accept(offer)}
                    onSkip={() => skip(offer)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {(earnings?.lifetimeDeliveries ?? 0) > 0 && (
          <Card variant="raised" className="p-3.5 flex items-center gap-3" onClick={() => navigate('/history')}>
            <IconBadge icon={Package} tone="iris" size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px]">{earnings?.lifetimeDeliveries} deliveries done</p>
              <p className="text-[13px] text-ink-faint">See your history</p>
            </div>
            <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden />
          </Card>
        )}
      </main>
    </div>
  )
}
