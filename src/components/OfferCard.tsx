import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Bike, Clock, MapPin, Package, Sparkles, Store, Timer } from 'lucide-react'
import { Button, Card, Chip, Money } from './ui'
import { countdown, distance, secondsUntil, travelTime } from '../lib/format'
import type { Offer, VehicleType } from '../lib/api'

/**
 * One job on the board.
 *
 * The money is the largest thing on the card and it is the first thing read,
 * because it is the only question a rider is actually asking. Everything else
 * — the restaurant, the area, the distance — exists to let them judge whether
 * that number is worth it, and is sized accordingly.
 *
 * The card shows two figures when fronting the cash is possible: what the
 * delivery pays on its own, and what it pays if they cover the order. Showing
 * only the higher number would be a bait, and showing only the lower one
 * hides the reason the feature exists.
 */
export default function OfferCard({
  offer,
  vehicle,
  onAccept,
  onSkip,
  accepting,
}: {
  offer: Offer
  vehicle: VehicleType | null | undefined
  onAccept: () => void
  onSkip: () => void
  accepting: boolean
}) {
  const [unlockIn, setUnlockIn] = useState(() => secondsUntil(offer.sourcingUnlocksAt))

  // A live countdown on the restaurant's window. Without it a rider stares at
  // a disabled button with no idea whether to wait ten seconds or walk away.
  useEffect(() => {
    if (unlockIn <= 0) return
    const timer = window.setInterval(() => setUnlockIn(secondsUntil(offer.sourcingUnlocksAt)), 1000)
    return () => window.clearInterval(timer)
  }, [offer.sourcingUnlocksAt, unlockIn])

  const eligibility = offer.eligibility
  const canSourceSoon = !offer.vendorAccepted && eligibility?.blockedReason !== 'limit_too_low'
  const sourcingLive = Boolean(eligibility?.canSource)
  const km = distance(offer.distanceKm)
  const eta = travelTime(offer.distanceKm, vehicle)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
    >
      <Card className="overflow-hidden">
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-ink-faint mb-1">
                <Store className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <p className="text-[13px] font-bold truncate">{offer.pickup.storeName}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-action shrink-0" aria-hidden />
                <p className="font-extrabold text-[17px] truncate">{offer.dropoff.area}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <Money amount={offer.payout.deliveryEarning} size="xl" tone="ink" />
              <p className="text-[11px] font-bold text-ink-faint uppercase tracking-wide mt-0.5">You earn</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {km && (
              <Chip icon={Bike}>
                {km}
                {eta ? ` · ${eta}` : ''}
              </Chip>
            )}
            <Chip icon={Package}>
              {offer.itemCount} item{offer.itemCount === 1 ? '' : 's'}
            </Chip>
            {offer.vendorAccepted && (
              <Chip tone="cash" icon={Clock}>
                Kitchen is on it
              </Chip>
            )}
          </div>

          {offer.itemSummary?.length > 0 && (
            <p className="mt-2.5 text-[13px] text-ink-faint truncate">{offer.itemSummary.join(' · ')}</p>
          )}
        </div>

        {/* The upgrade. Present whenever fronting cash is possible for this
            order, with its state spelled out rather than left as a greyed
            button. */}
        {canSourceSoon && offer.payout.potentialSourcingBonus > 0 && (
          <div className="mx-4 mb-3 rounded-2xl bg-action-tint px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-action-deep shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-action-deep">
                  Make{' '}
                  <Money
                    amount={offer.payout.deliveryEarning + offer.payout.potentialSourcingBonus}
                    size="sm"
                    tone="action"
                  />{' '}
                  if you cover it
                </p>
                <p className="text-[12px] text-ink-soft leading-snug mt-0.5">
                  {sourcingLive ? (
                    <>
                      The kitchen hasn&rsquo;t responded. Pay{' '}
                      <Money amount={offer.payout.cashToPay} size="sm" tone="ink" className="!text-[12px]" /> at the
                      counter and get it straight back on delivery.
                    </>
                  ) : eligibility?.blockedReason === 'restaurant_window' ? (
                    <span className="inline-flex items-center gap-1">
                      <Timer className="w-3 h-3" aria-hidden />
                      Unlocks in {countdown(unlockIn)} if the kitchen stays quiet
                    </span>
                  ) : eligibility?.blockedReason === 'restaurant_accepted' ? (
                    'The kitchen already accepted — just collect and go.'
                  ) : (
                    'Complete more deliveries to raise your limit for orders this size.'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 pb-4">
          <Button variant="ghost" size="md" onClick={onSkip} className="px-4">
            Skip
          </Button>
          <Button variant="action" size="md" fullWidth loading={accepting} icon={ArrowRight} onClick={onAccept}>
            Take it
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
