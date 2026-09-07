import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Bike, ChefHat, Package, Timer, Zap } from 'lucide-react'
import { Button, Card, Chip, Money, cn } from './ui'
import { countdown, distance, secondsUntil, toDate, travelTime } from '../lib/format'
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
  const [expiresIn, setExpiresIn] = useState(() => secondsUntil(offer.expiresAt))

  // A live countdown on the restaurant's window. Without it a rider stares at
  // a disabled button with no idea whether to wait ten seconds or walk away.
  useEffect(() => {
    const tick = () => {
      setUnlockIn(secondsUntil(offer.sourcingUnlocksAt))
      setExpiresIn(secondsUntil(offer.expiresAt))
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [offer.sourcingUnlocksAt, offer.expiresAt])

  const eligibility = offer.eligibility
  const canSourceSoon = !offer.vendorAccepted && eligibility?.blockedReason !== 'limit_too_low'
  const sourcingLive = Boolean(eligibility?.canSource)
  const km = distance(offer.distanceKm)
  const eta = travelTime(offer.distanceKm, vehicle)

  /*
   * The life left in the offer, drawn as a bar across the top.
   *
   * The full window is whatever the server set between creating the offer and
   * expiring it, so the bar is honest about pace rather than assuming a fixed
   * two minutes. If either timestamp is missing the bar simply does not draw
   * — an urgency cue invented from a guess is worse than none.
   */
  const created = toDate(offer.createdAt)
  const expires = toDate(offer.expiresAt)
  const windowSeconds = created && expires ? Math.max(1, (expires.getTime() - created.getTime()) / 1000) : null
  const lifeLeft = windowSeconds ? Math.max(0, Math.min(1, expiresIn / windowSeconds)) : null
  const urgent = expiresIn > 0 && expiresIn <= 20

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
    >
      <Card
        variant="solid"
        glow={urgent ? 'ember' : undefined}
        className="overflow-hidden transition-shadow duration-500"
      >
        {lifeLeft !== null && (
          <div className="h-[3px] bg-line" aria-hidden>
            <div
              className={cn(
                'h-full transition-[width] duration-1000 ease-linear',
                urgent ? 'bg-ember' : 'bg-volt',
              )}
              style={{ width: `${lifeLeft * 100}%` }}
            />
          </div>
        )}

        {/* ── Money, then route ───────────────────────────────────────────
            Two columns split at the fold of the card: what it pays on the
            left where the eye lands first, where it goes on the right. */}
        <div className="flex gap-4 p-4 pb-3.5">
          <div className="shrink-0">
            <Money amount={offer.payout.deliveryEarning} size="xl" tone="volt" className="aura-volt" />
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint mt-1.5">You earn</p>
          </div>

          <div className="flex-1 min-w-0 flex gap-2.5">
            <div className="flex flex-col items-center pt-[7px] shrink-0" aria-hidden>
              <span className="w-2 h-2 rounded-full ring-2 ring-iris/40 bg-iris" />
              <span className="w-px flex-1 my-1 bg-line" />
              <span className="w-2 h-2 rounded-full ring-2 ring-ember/40 bg-ember" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-[13px] font-semibold text-ink-soft truncate leading-tight">
                {offer.pickup.storeName}
              </p>
              <p className="font-bold text-[15px] truncate leading-tight">{offer.dropoff.area}</p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-3.5 flex flex-wrap items-center gap-1.5">
          {km && (
            <Chip icon={Bike} tone="outline">
              {km}
              {eta ? ` · ${eta}` : ''}
            </Chip>
          )}
          <Chip icon={Package} tone="outline">
            {offer.itemCount} item{offer.itemCount === 1 ? '' : 's'}
          </Chip>
          {offer.vendorAccepted && (
            <Chip tone="volt" icon={ChefHat}>
              Cooking
            </Chip>
          )}
          {urgent && (
            <Chip tone="ember" icon={Timer} className="breathe">
              {countdown(expiresIn)} left
            </Chip>
          )}
        </div>

        {offer.itemSummary?.length > 0 && (
          <p className="px-4 pb-3.5 -mt-1 text-[13px] text-ink-faint truncate">{offer.itemSummary.join(' · ')}</p>
        )}

        {/* ── The upgrade ─────────────────────────────────────────────────
            Present whenever fronting cash is possible for this order, with
            its state spelled out rather than left as a greyed button. */}
        {canSourceSoon && offer.payout.potentialSourcingBonus > 0 && (
          <div className="mx-3 mb-3 rounded-2xl bg-ember/10 border border-ember/20 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-ember shrink-0 mt-0.5" strokeWidth={2.5} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-ember-light">
                  Make{' '}
                  <Money
                    amount={offer.payout.deliveryEarning + offer.payout.potentialSourcingBonus}
                    size="xs"
                    tone="ember"
                  />{' '}
                  if you cover it
                </p>
                <p className="text-[12px] text-ink-soft leading-snug mt-1">
                  {sourcingLive ? (
                    <>
                      The kitchen hasn&rsquo;t responded. Pay{' '}
                      <Money amount={offer.payout.cashToPay} size="xs" tone="ink" className="!text-[12px]" /> at the
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

        <div className="flex items-center gap-2 px-3 pb-3">
          <Button variant="ghost" size="md" onClick={onSkip} className="px-5">
            Skip
          </Button>
          <Button variant="volt" size="md" fullWidth loading={accepting} iconRight={ArrowRight} onClick={onAccept}>
            Take it
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
