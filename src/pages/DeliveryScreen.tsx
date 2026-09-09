import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  BadgeCheck,
  Bike,
  Check,
  CheckCircle2,
  HandCoins,
  Navigation,
  Phone,
  ShieldCheck,
  Store,
  Timer,
  Utensils,
} from 'lucide-react'
import { riderApi, errorMessage, type Delivery } from '../lib/api'
import { usePresence, TRIP_HEARTBEAT_MS } from '../hooks/usePresence'
import { Button, Card, Chip, IconBadge, Money, Sheet, Skeleton, cn, tap } from '../components/ui'
import { BurstScene, GlowField } from '../components/art'
import { countdown, directionsUrl, secondsUntil, telUrl } from '../lib/format'

/**
 * The active delivery.
 *
 * One job, one screen, one obvious next action. A rider reads this at a
 * counter with somebody waiting or at a gate in the rain, so at any moment
 * exactly one button is primary and everything else is smaller — and that
 * button is pinned to the bottom of the viewport rather than sitting wherever
 * the content happens to end. Scrolling to find the next step while holding
 * a bag of food is the exact failure this layout exists to prevent.
 *
 * The screen's real job is the cash decision. When a restaurant has not
 * touched a paid order, the rider standing in front of it can pay for the
 * food and be reimbursed — but only if the amount, the reason and the
 * guarantee are all on screen at the moment they decide. Money handed over on
 * a vague promise is money a student will not hand over twice.
 */

type Step = { key: string; label: string }

const STEPS: Step[] = [
  { key: 'assigned', label: 'Head over' },
  { key: 'at_store', label: 'Collect' },
  { key: 'picked_up', label: 'Deliver' },
  { key: 'delivered', label: 'Done' },
]

const stepIndexFor = (status: Delivery['status']) => {
  if (status === 'assigned') return 0
  if (status === 'at_store' || status === 'paid_vendor') return 1
  if (status === 'picked_up' || status === 'on_the_way') return 2
  return 3
}

/** The four steps as a rail of connected dots. */
function StepRail({ active }: { active: number }) {
  return (
    <ol className="flex items-start">
      {STEPS.map((step, index) => {
        const done = index < active
        const here = index === active
        return (
          <li key={step.key} className="flex-1 flex flex-col items-center gap-2 relative">
            {index > 0 && (
              <span
                className={cn(
                  'absolute top-[11px] right-1/2 left-[-50%] h-[2px] rounded-full transition-colors duration-500',
                  index <= active ? 'bg-volt' : 'bg-line',
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative w-[23px] h-[23px] rounded-full flex items-center justify-center transition-all duration-300',
                done && 'bg-volt text-void',
                here && 'bg-volt text-void scale-110 shadow-[0_0_18px_-2px_rgba(175,255,0,0.75)]',
                !done && !here && 'bg-raised border-2 border-line',
              )}
            >
              {done ? (
                <Check className="w-3 h-3" strokeWidth={3.5} aria-hidden />
              ) : here ? (
                <span className="w-2 h-2 rounded-full bg-void" aria-hidden />
              ) : null}
            </span>
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-[0.06em] transition-colors text-center',
                index <= active ? 'text-ink' : 'text-ink-faint',
              )}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function PinEntry({ onSubmit, busy }: { onSubmit: (pin: string) => void; busy: boolean }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = clean
    setDigits(next)
    if (clean && index < 3) refs.current[index + 1]?.focus()
    if (next.every((digit) => digit)) onSubmit(next.join(''))
  }

  return (
    <div>
      <div className="flex gap-3 justify-center" role="group" aria-label="Delivery PIN">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element
            }}
            value={digit}
            onChange={(event) => setDigit(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !digits[index] && index > 0) {
                refs.current[index - 1]?.focus()
              }
            }}
            // A numeric keypad, not a full keyboard — four digits typed with
            // one thumb while holding a bag of food.
            inputMode="numeric"
            type="tel"
            maxLength={1}
            aria-label={`Digit ${index + 1}`}
            className={cn(
              'w-[68px] h-[76px] rounded-2xl border-2 bg-raised text-center font-display text-[32px] font-bold tnum',
              'outline-none transition-colors',
              digit ? 'border-volt text-volt' : 'border-line text-ink',
              'focus:border-volt focus:ring-4 focus:ring-volt/15',
            )}
          />
        ))}
      </div>
      <Button
        variant="volt"
        size="lg"
        fullWidth
        className="mt-6"
        loading={busy}
        disabled={digits.some((digit) => !digit)}
        onClick={() => onSubmit(digits.join(''))}
      >
        Confirm delivery
      </Button>
    </div>
  )
}

export default function DeliveryScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [busy, setBusy] = useState<string | null>(null)
  const [showPin, setShowPin] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showSourcing, setShowSourcing] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [payout, setPayout] = useState<{ earnings: number; reimbursement: number; totalCredited: number } | null>(null)

  const { data: delivery, isLoading, refetch } = useQuery({
    queryKey: ['delivery', id],
    queryFn: () => riderApi.delivery(id),
    refetchInterval: 20_000,
    enabled: Boolean(id),
  })

  /**
   * The beat that drives the customer's live ETA.
   *
   * The dashboard's presence beat stops mattering here — a rider on a job
   * spends the whole trip on this screen, and without a beat of its own the
   * customer's ETA would freeze at whatever it was when the rider opened it.
   * It runs only from pickup onward, which is the same window the backend
   * publishes tracking for.
   */
  const carrying = delivery?.status === 'picked_up' || delivery?.status === 'on_the_way'
  const { coords } = usePresence({ online: carrying, intervalMs: TRIP_HEARTBEAT_MS })

  const [unlockIn, setUnlockIn] = useState(0)
  useEffect(() => {
    if (!delivery) return
    const update = () => setUnlockIn(secondsUntil(delivery.sourcingUnlocksAt))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [delivery])

  const run = async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key)
    try {
      await action()
      if (success) toast.success(success)
      await refetch()
    } catch (error) {
      toast.error(errorMessage(error))
      await refetch()
    } finally {
      setBusy(null)
    }
  }

  const confirmDelivery = async (pin: string) => {
    setBusy('deliver')
    try {
      const result = await riderApi.deliver(id, pin)
      tap([20, 60, 20, 60, 40])
      setShowPin(false)
      setPayout(result.settlement)
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
      queryClient.invalidateQueries({ queryKey: ['active-delivery'] })
    } catch (error) {
      toast.error(errorMessage(error, 'That PIN did not work.'))
    } finally {
      setBusy(null)
    }
  }

  if (isLoading || !delivery) {
    return (
      <div className="px-5 pad-top-safe pt-6 space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-36 rounded-[var(--radius-card)]" />
        <Skeleton className="h-52 rounded-[var(--radius-card)]" />
      </div>
    )
  }

  const sourcing = delivery.mode === 'sourcing'
  const paid = Number(delivery.cashPaidAmount || 0) > 0
  const activeStep = stepIndexFor(delivery.status)
  const storeDirections = directionsUrl(delivery.pickup.latitude, delivery.pickup.longitude, delivery.pickup.storeName)
  const dropDirections = directionsUrl(delivery.dropoff.latitude, delivery.dropoff.longitude, delivery.dropoff.name)

  // Only offered once the restaurant's window has genuinely lapsed. The
  // server re-checks this anyway; hiding it early keeps the rider from
  // tapping into a refusal.
  const canOfferSourcing =
    !sourcing && ['assigned', 'at_store'].includes(delivery.status) && unlockIn <= 0 && delivery.cashToPay > 0

  /*
   * The one primary action, resolved once and rendered in one place.
   *
   * Previously each status rendered its own button inline. Collapsing them to
   * a single description means the pinned action bar below cannot drift out
   * of step with the body, and adding a status later is one entry rather than
   * one more nearly-identical block.
   */
  const primary = (() => {
    switch (delivery.status) {
      case 'assigned':
        return {
          label: "I'm at the restaurant",
          icon: Store,
          variant: 'iris' as const,
          run: () => run('arrived', () => riderApi.arrived(id)),
          key: 'arrived',
        }
      case 'at_store':
      case 'paid_vendor':
        return {
          label: 'I have the order',
          icon: CheckCircle2,
          variant: 'iris' as const,
          run: () => run('pickup', () => riderApi.pickup(id), 'Order collected'),
          key: 'pickup',
        }
      case 'picked_up':
        return {
          label: 'On my way',
          icon: Navigation,
          variant: 'iris' as const,
          run: () => run('otw', () => riderApi.onTheWay(id, coords)),
          key: 'otw',
        }
      case 'on_the_way':
        return {
          label: "I've arrived — enter PIN",
          icon: BadgeCheck,
          variant: 'volt' as const,
          run: () => setShowPin(true),
          key: 'pin',
        }
      default:
        return null
    }
  })()

  return (
    <div className="min-h-screen pb-[calc(112px+env(safe-area-inset-bottom))]">
      {/* ── Header ────────────────────────────────────────────────────────
          Ember when the rider's own money is in this job, iris otherwise.
          The colour of the screen tells them whose cash is at stake before
          they have read a word. */}
      <header className="relative overflow-hidden pad-top-safe px-5 pt-3 pb-7 grain">
        <GlowField tone={sourcing ? 'ember' : 'iris'} />
        <div className="absolute inset-0 dotfield opacity-50" aria-hidden />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate('/')}
              aria-label="Back to jobs"
              className="w-11 h-11 -ml-2.5 rounded-2xl flex items-center justify-center cursor-pointer active:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2.4} aria-hidden />
            </button>
            {sourcing && (
              <Chip tone="ember" icon={HandCoins}>
                You&rsquo;re covering this
              </Chip>
            )}
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Order <span className="selectable tnum">{delivery.orderId}</span>
            </p>
            <div className="flex items-end justify-between gap-4 mt-2">
              <h1 className="font-display text-[28px] leading-[1.05] font-bold tracking-[-0.03em] min-w-0">
                {delivery.pickup.storeName}
              </h1>
              <div className="text-right shrink-0">
                <Money amount={delivery.payout.earnings} size="lg" tone="volt" />
                <p className="text-[10px] font-bold text-ink-faint uppercase tracking-[0.12em] mt-1">You earn</p>
              </div>
            </div>
          </div>

          <div className="mt-7">
            <StepRail active={activeStep} />
          </div>
        </div>
      </header>

      <main className="px-5 space-y-4">
        {/* ── The cash offer ────────────────────────────────────────────── */}
        {canOfferSourcing && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card variant="solid" glow="ember" className="p-4">
              <div className="flex items-start gap-3">
                <IconBadge icon={HandCoins} tone="ember" />
                <div className="min-w-0">
                  <p className="font-display font-bold text-[16px] text-ember-light tracking-[-0.02em]">
                    The kitchen hasn&rsquo;t responded
                  </p>
                  <p className="text-[13px] text-ink-soft leading-relaxed mt-1.5">
                    Pay for the food yourself and earn an extra{' '}
                    <Money
                      amount={delivery.payout.potentialSourcingBonus}
                      size="xs"
                      tone="ember"
                    />{' '}
                    on top. Every naira comes back to your wallet when you deliver.
                  </p>
                </div>
              </div>
              <Button
                variant="ember"
                size="md"
                fullWidth
                className="mt-4"
                icon={HandCoins}
                onClick={() => setShowSourcing(true)}
              >
                Cover this order
              </Button>
            </Card>
          </motion.div>
        )}

        {/* ── The pay instruction ───────────────────────────────────────── */}
        {sourcing && !paid && (
          <Card variant="solid" glow="ember" className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint mb-2">
              Pay this at the counter
            </p>
            <Money amount={delivery.cashToPay} size="hero" tone="ember" />
            <p className="text-[13px] text-ink-soft leading-relaxed mt-4">
              Show the restaurant order <span className="font-bold text-ink selectable">{delivery.orderId}</span>.
              This is exactly what Blorbmart would have paid them, so it is the amount they expect.
            </p>
            <div className="mt-4 rounded-2xl bg-volt/8 border border-volt/20 p-3.5 flex gap-2.5">
              <ShieldCheck className="w-[18px] h-[18px] text-volt shrink-0 mt-0.5" strokeWidth={2.4} aria-hidden />
              <p className="text-[13px] text-ink-soft leading-snug">
                <span className="font-bold text-volt">You get all of it back.</span> The moment the customer gives
                you their PIN, <Money amount={delivery.cashToPay} size="xs" className="!text-[13px]" /> returns to
                your wallet along with your earnings.
              </p>
            </div>
            <Button
              variant="volt"
              size="lg"
              fullWidth
              className="mt-4"
              loading={busy === 'paid'}
              icon={Banknote}
              onClick={() => run('paid', () => riderApi.confirmPaid(id), 'Cash recorded — it is on its way back')}
            >
              I&rsquo;ve paid
            </Button>
          </Card>
        )}

        {sourcing && paid && delivery.status !== 'delivered' && (
          <Card variant="solid" className="p-4 border-volt/25 flex gap-3">
            <IconBadge icon={CheckCircle2} tone="volt" size="sm" />
            <div>
              <p className="font-bold text-[15px] text-volt">
                <Money amount={delivery.cashPaidAmount} size="xs" tone="volt" className="!text-[15px]" /> logged
              </p>
              <p className="text-[13px] text-ink-soft leading-snug mt-0.5">
                Deliver the order and it comes straight back with your earnings.
              </p>
            </div>
          </Card>
        )}

        {/* ── Route ─────────────────────────────────────────────────────── */}
        <Card variant="solid" className="p-4">
          <div className="flex gap-3.5">
            <div className="flex flex-col items-center pt-1.5 shrink-0" aria-hidden>
              <span className="w-9 h-9 rounded-2xl bg-iris/15 flex items-center justify-center">
                <Store className="w-[17px] h-[17px] text-iris-light" strokeWidth={2.3} />
              </span>
              <span className="w-[2px] flex-1 my-2 rounded-full bg-gradient-to-b from-iris/50 to-ember/50" />
              <span className="w-9 h-9 rounded-2xl bg-ember/15 flex items-center justify-center">
                <Navigation className="w-[17px] h-[17px] text-ember-light" strokeWidth={2.3} />
              </span>
            </div>

            <div className="flex-1 min-w-0 space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Pick up</p>
                <p className="font-bold text-[15px] truncate mt-0.5">{delivery.pickup.storeName}</p>
                {delivery.pickup.address && (
                  <p className="text-[13px] text-ink-soft selectable leading-snug">{delivery.pickup.address}</p>
                )}
                <div className="flex gap-2 mt-2.5">
                  {storeDirections && (
                    <a href={storeDirections} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" icon={Bike}>
                        Directions
                      </Button>
                    </a>
                  )}
                  {telUrl(delivery.pickup.phone) && (
                    <a href={telUrl(delivery.pickup.phone)!}>
                      <Button variant="outline" size="sm" icon={Phone}>
                        Call
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Drop off</p>
                <p className="font-bold text-[15px] truncate mt-0.5">{delivery.dropoff.name}</p>
                <p className="text-[13px] text-ink-soft selectable leading-snug">
                  {delivery.dropoff.addressLine1}
                  {delivery.dropoff.landmark ? ` · ${delivery.dropoff.landmark}` : ''}
                </p>
                {delivery.dropoff.notes && (
                  <p className="text-[13px] text-gold font-semibold mt-1.5 leading-snug">
                    Note: {delivery.dropoff.notes}
                  </p>
                )}
                <div className="flex gap-2 mt-2.5">
                  {dropDirections && (
                    <a href={dropDirections} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" icon={Navigation}>
                        Directions
                      </Button>
                    </a>
                  )}
                  {telUrl(delivery.dropoff.phone) && (
                    <a href={telUrl(delivery.dropoff.phone)!}>
                      <Button variant="outline" size="sm" icon={Phone}>
                        Call
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Items ─────────────────────────────────────────────────────── */}
        {delivery.items?.length > 0 && (
          <Card variant="solid" className="p-4">
            <div className="flex items-center gap-2 mb-3.5">
              <Utensils className="w-4 h-4 text-ink-faint" strokeWidth={2.4} aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Check the bag</p>
            </div>
            <ul className="space-y-2.5">
              {delivery.items.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex items-start gap-3">
                  <span className="font-display tnum w-7 h-7 rounded-lg bg-raised border border-line flex items-center justify-center text-[13px] font-bold shrink-0">
                    {item.quantity}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-semibold text-[14px]">{item.name}</p>
                    {item.note && <p className="text-[12px] text-ink-faint">{item.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ── Waiting on the kitchen ────────────────────────────────────── */}
        {!sourcing && unlockIn > 0 && ['assigned', 'at_store'].includes(delivery.status) && (
          <Card variant="solid" className="p-4 flex gap-3">
            <IconBadge icon={Timer} tone="neutral" size="sm" />
            <div>
              <p className="font-bold text-[14px]">
                Kitchen has <span className="font-display tnum text-gold">{countdown(unlockIn)}</span> to respond
              </p>
              <p className="text-[13px] text-ink-soft leading-snug mt-0.5">
                If they still haven&rsquo;t accepted after that, you can pay for the order yourself and earn extra.
              </p>
            </div>
          </Card>
        )}

        <button
          onClick={() => setShowCancel(true)}
          className="w-full min-h-[44px] text-[13px] font-bold text-ink-faint cursor-pointer active:text-ink-soft transition-colors"
        >
          I can&rsquo;t complete this delivery
        </button>
      </main>

      {/* ── The one primary action, pinned ─────────────────────────────────
          A rider at a counter should never have to scroll to find the next
          step. It sits above the home indicator and over a blur so the list
          scrolling beneath it stays readable. */}
      {primary && (
        <div className="fixed bottom-0 inset-x-0 z-30 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] glass border-t border-white/8">
          <Button
            variant={primary.variant}
            size="lg"
            fullWidth
            icon={primary.icon}
            loading={busy === primary.key}
            onClick={primary.run}
          >
            {primary.label}
          </Button>
        </div>
      )}

      {/* ── Sourcing confirmation ───────────────────────────────────────── */}
      <Sheet open={showSourcing} onClose={() => setShowSourcing(false)} title="Cover this order?">
        <p className="text-[15px] text-ink-soft leading-relaxed">
          You&rsquo;ll pay <Money amount={delivery.cashToPay} size="xs" className="!text-[15px]" /> at the counter
          out of your own pocket. It returns to your wallet in full the second the customer confirms delivery —
          plus a bonus for covering it.
        </p>
        <div className="mt-5 rounded-2xl bg-raised border border-line p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-ink-soft">You pay now</span>
            <Money amount={delivery.cashToPay} size="sm" tone="ember" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-ink-soft">Comes back on delivery</span>
            <Money amount={delivery.cashToPay} size="sm" tone="volt" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-line">
            <span className="text-[14px] font-bold">You keep</span>
            <Money
              amount={delivery.payout.deliveryEarning + delivery.payout.potentialSourcingBonus}
              size="md"
              tone="volt"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2.5">
          <Button variant="outline" size="lg" onClick={() => setShowSourcing(false)} className="flex-1">
            Not now
          </Button>
          <Button
            variant="ember"
            size="lg"
            className="flex-1"
            loading={busy === 'claim'}
            onClick={async () => {
              await run('claim', () => riderApi.claimSourcing(id), 'This one is yours to cover')
              setShowSourcing(false)
            }}
          >
            Yes, cover it
          </Button>
        </div>
      </Sheet>

      {/* ── PIN ─────────────────────────────────────────────────────────── */}
      <Sheet open={showPin} onClose={() => setShowPin(false)} title="Ask for the 4-digit PIN">
        <p className="text-[15px] text-ink-soft leading-relaxed mb-7">
          The customer has it in their Blorbmart app. It is how you both prove this order arrived.
        </p>
        <PinEntry onSubmit={confirmDelivery} busy={busy === 'deliver'} />
      </Sheet>

      {/* ── Cancel ──────────────────────────────────────────────────────── */}
      <Sheet open={showCancel} onClose={() => setShowCancel(false)} title="Release this delivery?">
        {paid ? (
          <div className="rounded-2xl bg-gold/10 border border-gold/25 p-4 flex gap-3 mb-5">
            <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" strokeWidth={2.4} aria-hidden />
            <p className="text-[13px] text-ink-soft leading-relaxed">
              You already paid <Money amount={delivery.cashPaidAmount} size="xs" className="!text-[13px]" /> for
              this order. Release it and support will return that to your wallet within 24 hours — you will not be
              out of pocket.
            </p>
          </div>
        ) : (
          <p className="text-[15px] text-ink-soft leading-relaxed mb-5">
            It goes back on the board for another rider. Frequent cancellations affect the jobs you get offered.
          </p>
        )}
        <textarea
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder="What happened? (optional)"
          rows={3}
          className="w-full rounded-2xl border border-line bg-raised p-4 text-[16px] text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20 selectable placeholder:text-ink-faint"
        />
        <div className="mt-5 flex gap-2.5">
          <Button variant="outline" size="lg" className="flex-1" onClick={() => setShowCancel(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            loading={busy === 'cancel'}
            onClick={async () => {
              setBusy('cancel')
              try {
                const result = await riderApi.cancel(id, cancelReason)
                toast.success(
                  result.needsCashReview
                    ? 'Released. Support will refund your cash within 24 hours.'
                    : 'Released.',
                )
                navigate('/', { replace: true })
              } catch (error) {
                toast.error(errorMessage(error))
              } finally {
                setBusy(null)
              }
            }}
          >
            Release
          </Button>
        </div>
      </Sheet>

      {/* ── Paid ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {payout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-volt text-void flex flex-col items-center justify-center px-6 text-center overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 210 }}
              className="w-40 h-40 -mt-4"
            >
              <BurstScene className="w-full h-full" />
            </motion.div>

            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-void/55 mt-2">Delivered</p>
            <Money amount={payout.earnings} size="giant" tone="void" className="mt-2" />
            <p className="text-[15px] font-bold text-void/60 mt-2">earned</p>

            {/* The reimbursement is stated separately and labelled as the
                rider's own money. Rolling it into one number would tell a
                student they earned five thousand naira for a job that paid
                six hundred. */}
            {payout.reimbursement > 0 && (
              <div className="mt-7 w-full max-w-xs rounded-2xl bg-void/10 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-void/70">Your cash back</span>
                  <Money amount={payout.reimbursement} size="sm" tone="void" />
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-void/15">
                  <span className="text-[14px] font-bold">Into your wallet</span>
                  <Money amount={payout.totalCredited} size="md" tone="void" />
                </div>
              </div>
            )}

            <div className="mt-9 w-full max-w-xs space-y-3">
              <Button
                variant="light"
                size="lg"
                fullWidth
                onClick={() => {
                  setPayout(null)
                  navigate('/', { replace: true })
                }}
              >
                Find another job
              </Button>
              <button
                onClick={() => {
                  setPayout(null)
                  navigate('/earnings')
                }}
                className="w-full min-h-[44px] text-[14px] font-bold text-void/70 cursor-pointer"
              >
                See my wallet
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
