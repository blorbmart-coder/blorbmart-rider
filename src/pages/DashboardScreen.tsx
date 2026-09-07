import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  Flame,
  Inbox,
  MapPinOff,
  Moon,
  Navigation,
  Package,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { riderApi, errorMessage, type Offer } from '../lib/api'
import { useRider } from '../contexts/RiderContext'
import { useLiveOffers } from '../hooks/useLiveOffers'
import { usePresence } from '../hooks/usePresence'
import { canOfferPush, enablePush } from '../lib/push'
import { Button, Card, Chip, EmptyState, Money, ProgressBar, Skeleton, cn, tap } from '../components/ui'
import OfferCard from '../components/OfferCard'
import { initials } from '../lib/format'

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
      <header className="bg-brand text-white pad-top-safe px-5 pt-3 pb-6 rounded-b-[28px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/18 flex items-center justify-center font-extrabold shrink-0">
              {initials(rider?.displayName)}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] text-white/65 font-semibold">
                {online ? 'You are online' : 'Ready when you are'}
              </p>
              <p className="font-extrabold truncate">{rider?.firstName || 'Rider'}</p>
            </div>
          </div>

          {(earnings?.streakDays ?? 0) > 1 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-xs font-extrabold shrink-0">
              <Flame className="w-3.5 h-3.5 text-warn" aria-hidden />
              {earnings?.streakDays} day streak
            </span>
          )}
        </div>

        {/*
          The online switch is the single most important control in the app,
          so it is a full-width target rather than a toggle in a corner — the
          difference between working and not working should not be a 20px tap.
        */}
        <button
          onClick={toggleOnline}
          disabled={toggling}
          aria-pressed={online}
          className={cn(
            'mt-5 w-full min-h-[68px] rounded-[22px] px-5 flex items-center justify-between gap-4 cursor-pointer',
            'transition-all duration-200 active:scale-[0.99] disabled:opacity-70',
            online ? 'bg-white text-ink' : 'bg-white/12 text-white border border-white/20',
          )}
        >
          <span className="flex items-center gap-3">
            <span
              className={cn(
                'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
                online ? 'bg-cash-tint text-cash-deep pulse-online' : 'bg-white/12 text-white/80',
              )}
            >
              {online ? <Navigation className="w-5 h-5" aria-hidden /> : <Moon className="w-5 h-5" aria-hidden />}
            </span>
            <span className="text-left">
              <span className="block font-extrabold text-[17px]">{online ? 'Online' : 'Go online'}</span>
              <span className={cn('block text-[13px] font-semibold', online ? 'text-ink-soft' : 'text-white/60')}>
                {online ? 'Receiving jobs' : 'Tap to start earning'}
              </span>
            </span>
          </span>

          <span
            className={cn(
              'w-14 h-8 rounded-full p-1 flex shrink-0 transition-colors duration-200',
              online ? 'bg-cash justify-end' : 'bg-white/25 justify-start',
            )}
          >
            <motion.span layout transition={{ type: 'spring', damping: 24, stiffness: 420 }} className="w-6 h-6 rounded-full bg-white" />
          </span>
        </button>
      </header>

      <main className="px-5 -mt-3 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-4 h-4 text-cash" aria-hidden />
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">Today</p>
            </div>
            {earnings ? (
              <>
                <Money amount={earnings.earningsToday} size="lg" tone="ink" />
                <p className="text-[12px] text-ink-faint font-semibold mt-1">
                  {earnings.deliveriesToday} deliver{earnings.deliveriesToday === 1 ? 'y' : 'ies'}
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </Card>

          <Card className="p-4" onClick={() => navigate('/earnings')}>
            <div className="flex items-center gap-1.5 mb-2">
              <Wallet className="w-4 h-4 text-brand" aria-hidden />
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">Wallet</p>
            </div>
            {earnings ? (
              <>
                <Money amount={earnings.availableBalance} size="lg" tone="cash" />
                <p className="text-[12px] text-brand font-bold mt-1 inline-flex items-center gap-1">
                  Cash out <ArrowRight className="w-3 h-3" aria-hidden />
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </Card>
        </div>

        {/* The trust ladder as a goal rather than a restriction. A rider who
            understands the limit is climbing something; one who only meets it
            as a blocked button concludes the app is broken. */}
        {sourcing && !sourcing.unlocked && sourcing.deliveriesToNextTier !== null && (
          <Card className="p-4 bg-action-tint border-action/20">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="font-extrabold text-[15px] text-action-deep">Unlock bigger earnings</p>
              <span className="tnum text-[13px] font-extrabold text-action-deep">
                {sourcing.deliveriesCompleted}/{sourcing.deliveriesCompleted + sourcing.deliveriesToNextTier}
              </span>
            </div>
            <ProgressBar
              value={sourcing.deliveriesCompleted}
              max={sourcing.deliveriesCompleted + sourcing.deliveriesToNextTier}
            />
            <p className="text-[13px] text-ink-soft leading-snug mt-2.5">
              {sourcing.deliveriesToNextTier} more deliver
              {sourcing.deliveriesToNextTier === 1 ? 'y' : 'ies'} and you can start covering orders the kitchen
              misses — worth an extra bonus every time.
            </p>
          </Card>
        )}

        {locationDenied && online && (
          <Card className="p-4 flex gap-3">
            <MapPinOff className="w-5 h-5 text-warn shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-bold text-[14px]">Location is off</p>
              <p className="text-[13px] text-ink-soft leading-snug">
                You will still get jobs, but we cannot sort them by how close they are to you.
              </p>
            </div>
          </Card>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-extrabold tracking-[-0.01em]">
              {online ? 'Jobs near you' : 'Jobs'}
            </h2>
            {online && offers.length > 0 && <Chip tone="cash">{offers.length} available</Chip>}
          </div>

          {!online ? (
            <Card>
              <EmptyState
                icon={Moon}
                title="You're offline"
                message="Flip the switch above and paid orders will appear here the moment they come in — at the same time the restaurant sees them."
                action={
                  <Button variant="action" onClick={toggleOnline} loading={toggling} icon={Navigation}>
                    Go online
                  </Button>
                }
              />
            </Card>
          ) : offersLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 rounded-[var(--radius-card)]" />
              <Skeleton className="h-40 rounded-[var(--radius-card)]" />
            </div>
          ) : offers.length === 0 ? (
            <Card>
              <EmptyState
                icon={Inbox}
                title="Quiet right now"
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
          <Card className="p-4 flex items-center gap-3" onClick={() => navigate('/history')}>
            <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-brand" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px]">{earnings?.lifetimeDeliveries} deliveries done</p>
              <p className="text-[13px] text-ink-soft">See your history</p>
            </div>
            <ArrowRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden />
          </Card>
        )}
      </main>
    </div>
  )
}
