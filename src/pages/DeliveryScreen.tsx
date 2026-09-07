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
  CheckCircle2,
  HandCoins,
  Navigation,
  PartyPopper,
  Phone,
  Store,
  Timer,
  Utensils,
} from 'lucide-react'
import { riderApi, errorMessage, type Delivery } from '../lib/api'
import { Button, Card, Chip, Money, Sheet, Skeleton, cn, tap } from '../components/ui'
import { countdown, directionsUrl, secondsUntil, telUrl } from '../lib/format'

/**
 * The active delivery.
 *
 * One job, one screen, one obvious next action. A rider reads this at a
 * counter with somebody waiting or at a gate in the rain, so at any moment
 * exactly one button is primary and everything else is smaller.
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
            className="w-16 h-[68px] rounded-2xl border-2 border-line bg-surface text-center text-[30px] font-extrabold tnum outline-none focus:border-brand focus:ring-4 focus:ring-brand/12 transition-colors"
          />
        ))}
      </div>
      <Button
        variant="cash"
        size="lg"
        fullWidth
        className="mt-5"
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
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 rounded-[var(--radius-card)]" />
        <Skeleton className="h-48 rounded-[var(--radius-card)]" />
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

  return (
    <div className="pb-8">
      <header className="bg-ink text-white pad-top-safe px-5 pt-3 pb-6 rounded-b-[28px]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            aria-label="Back to jobs"
            className="w-11 h-11 -ml-2 rounded-xl flex items-center justify-center cursor-pointer active:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </button>
          {sourcing && (
            <Chip tone="action" icon={HandCoins}>
              You&rsquo;re covering this one
            </Chip>
          )}
        </div>

        <div className="mt-3">
          <p className="text-[13px] font-semibold text-white/55">Order {delivery.orderId}</p>
          <div className="flex items-end justify-between gap-4 mt-1">
            <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
              {delivery.pickup.storeName}
            </h1>
            <div className="text-right shrink-0">
              <Money amount={delivery.payout.earnings} size="lg" tone="white" />
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-wide">You earn</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-1.5">
          {STEPS.map((step, index) => (
            <div key={step.key} className="flex-1">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-colors duration-300',
                  index <= activeStep ? 'bg-action' : 'bg-white/15',
                )}
              />
              <p
                className={cn(
                  'text-[11px] font-bold mt-1.5 transition-colors',
                  index <= activeStep ? 'text-white' : 'text-white/35',
                )}
              >
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </header>

      <main className="px-5 -mt-3 space-y-4">
        {/* ── The cash offer ────────────────────────────────────────────── */}
        {canOfferSourcing && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4 border-action/30 bg-action-tint">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-action text-white flex items-center justify-center shrink-0">
                  <HandCoins className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-[15px] text-action-deep">The kitchen hasn&rsquo;t responded</p>
                  <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
                    Pay for the food yourself and earn an extra{' '}
                    <Money amount={delivery.payout.potentialSourcingBonus} size="sm" tone="action" className="!text-[13px]" />{' '}
                    on top. Every naira comes back to your wallet when you deliver.
                  </p>
                </div>
              </div>
              <Button
                variant="action"
                size="md"
                fullWidth
                className="mt-3"
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
          <Card className="p-5 border-action/40">
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-ink-faint mb-2">
              Pay this at the counter
            </p>
            <Money amount={delivery.cashToPay} size="hero" tone="action" />
            <p className="text-[13px] text-ink-soft leading-relaxed mt-3">
              Show the restaurant order <span className="font-bold selectable">{delivery.orderId}</span>. This is
              exactly what Blorbmart would have paid them, so it is the amount they expect.
            </p>
            <div className="mt-4 rounded-2xl bg-cash-tint p-3.5 flex gap-2.5">
              <BadgeCheck className="w-[18px] h-[18px] text-cash-deep shrink-0 mt-0.5" aria-hidden />
              <p className="text-[13px] text-ink-soft leading-snug">
                <span className="font-bold text-cash-deep">You get all of it back.</span> The moment the customer
                gives you their PIN, <Money amount={delivery.cashToPay} size="sm" className="!text-[13px]" /> returns to
                your wallet along with your earnings.
              </p>
            </div>
            <Button
              variant="cash"
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
          <Card className="p-4 bg-cash-tint border-cash/25 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-cash-deep shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-bold text-[15px] text-cash-deep">
                <Money amount={delivery.cashPaidAmount} size="sm" tone="cash" className="!text-[15px]" /> logged
              </p>
              <p className="text-[13px] text-ink-soft leading-snug">
                Deliver the order and it comes straight back with your earnings.
              </p>
            </div>
          </Card>
        )}

        {/* ── Route ─────────────────────────────────────────────────────── */}
        <Card className="p-4">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-1 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-brand-tint flex items-center justify-center">
                <Store className="w-[18px] h-[18px] text-brand" aria-hidden />
              </div>
              <div className="w-px flex-1 my-1.5 bg-line" aria-hidden />
              <div className="w-9 h-9 rounded-xl bg-action-tint flex items-center justify-center">
                <Navigation className="w-[18px] h-[18px] text-action" aria-hidden />
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">Pick up</p>
                <p className="font-bold text-[15px] truncate">{delivery.pickup.storeName}</p>
                {delivery.pickup.address && (
                  <p className="text-[13px] text-ink-soft selectable">{delivery.pickup.address}</p>
                )}
                <div className="flex gap-2 mt-2">
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
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">Drop off</p>
                <p className="font-bold text-[15px] truncate">{delivery.dropoff.name}</p>
                <p className="text-[13px] text-ink-soft selectable leading-snug">
                  {delivery.dropoff.addressLine1}
                  {delivery.dropoff.landmark ? ` · ${delivery.dropoff.landmark}` : ''}
                </p>
                {delivery.dropoff.notes && (
                  <p className="text-[13px] text-action font-semibold mt-1">Note: {delivery.dropoff.notes}</p>
                )}
                <div className="flex gap-2 mt-2">
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
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Utensils className="w-4 h-4 text-ink-faint" aria-hidden />
              <p className="text-[12px] font-extrabold uppercase tracking-wide text-ink-faint">
                Check the bag
              </p>
            </div>
            <ul className="space-y-2">
              {delivery.items.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex items-start gap-3">
                  <span className="tnum w-7 h-7 rounded-lg bg-canvas flex items-center justify-center text-[13px] font-extrabold shrink-0">
                    {item.quantity}
                  </span>
                  <div className="min-w-0">
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
          <Card className="p-4 flex gap-3">
            <Timer className="w-5 h-5 text-ink-faint shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-bold text-[14px]">Kitchen has {countdown(unlockIn)} to respond</p>
              <p className="text-[13px] text-ink-soft leading-snug">
                If they still haven&rsquo;t accepted after that, you can pay for the order yourself and earn extra.
              </p>
            </div>
          </Card>
        )}

        {/* ── The one primary action ────────────────────────────────────── */}
        <div className="pt-1">
          {delivery.status === 'assigned' && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={busy === 'arrived'}
              icon={Store}
              onClick={() => run('arrived', () => riderApi.arrived(id))}
            >
              I&rsquo;m at the restaurant
            </Button>
          )}

          {(delivery.status === 'at_store' || delivery.status === 'paid_vendor') && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={busy === 'pickup'}
              icon={CheckCircle2}
              onClick={() => run('pickup', () => riderApi.pickup(id), 'Order collected')}
            >
              I have the order
            </Button>
          )}

          {delivery.status === 'picked_up' && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={busy === 'otw'}
              icon={Navigation}
              onClick={() => run('otw', () => riderApi.onTheWay(id))}
            >
              On my way
            </Button>
          )}

          {delivery.status === 'on_the_way' && (
            <Button variant="cash" size="lg" fullWidth icon={BadgeCheck} onClick={() => setShowPin(true)}>
              I&rsquo;ve arrived — enter PIN
            </Button>
          )}
        </div>

        <button
          onClick={() => setShowCancel(true)}
          className="w-full min-h-[44px] text-[13px] font-bold text-ink-faint cursor-pointer"
        >
          I can&rsquo;t complete this delivery
        </button>
      </main>

      {/* ── Sourcing confirmation ───────────────────────────────────────── */}
      <Sheet open={showSourcing} onClose={() => setShowSourcing(false)} title="Cover this order?">
        <p className="text-[15px] text-ink-soft leading-relaxed">
          You&rsquo;ll pay <Money amount={delivery.cashToPay} size="sm" className="!text-[15px]" /> at the counter
          out of your own pocket. It returns to your wallet in full the second the customer confirms delivery —
          plus a bonus for covering it.
        </p>
        <div className="mt-4 rounded-2xl bg-canvas p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-ink-soft">You pay now</span>
            <Money amount={delivery.cashToPay} size="sm" tone="action" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-ink-soft">Comes back on delivery</span>
            <Money amount={delivery.cashToPay} size="sm" tone="cash" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-line">
            <span className="text-[14px] font-bold">You keep</span>
            <Money
              amount={delivery.payout.deliveryEarning + delivery.payout.potentialSourcingBonus}
              size="md"
              tone="cash"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" size="lg" onClick={() => setShowSourcing(false)} className="flex-1">
            Not now
          </Button>
          <Button
            variant="action"
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
        <p className="text-[15px] text-ink-soft leading-relaxed mb-6">
          The customer has it in their Blorbmart app. It is how we both prove this order arrived.
        </p>
        <PinEntry onSubmit={confirmDelivery} busy={busy === 'deliver'} />
      </Sheet>

      {/* ── Cancel ──────────────────────────────────────────────────────── */}
      <Sheet open={showCancel} onClose={() => setShowCancel(false)} title="Release this delivery?">
        {paid ? (
          <div className="rounded-2xl bg-warn-tint p-4 flex gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-[#8A5B00] shrink-0 mt-0.5" aria-hidden />
            <p className="text-[13px] text-ink-soft leading-relaxed">
              You already paid <Money amount={delivery.cashPaidAmount} size="sm" className="!text-[13px]" /> for this
              order. Release it and support will return that to your wallet within 24 hours — you will not be out
              of pocket.
            </p>
          </div>
        ) : (
          <p className="text-[15px] text-ink-soft leading-relaxed mb-4">
            It goes back on the board for another rider. Frequent cancellations affect the jobs you get offered.
          </p>
        )}
        <textarea
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder="What happened? (optional)"
          rows={3}
          className="w-full rounded-2xl border border-line bg-surface p-4 text-[15px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/12 selectable"
        />
        <div className="mt-4 flex gap-2">
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
            className="fixed inset-0 z-50 bg-cash text-white flex flex-col items-center justify-center px-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 13, stiffness: 200 }}
              className="w-20 h-20 rounded-3xl bg-white/18 flex items-center justify-center mb-6"
            >
              <PartyPopper className="w-10 h-10" aria-hidden />
            </motion.div>

            <p className="text-[15px] font-bold text-white/70">Delivered</p>
            <Money amount={payout.earnings} size="hero" tone="white" className="mt-1" />
            <p className="text-[15px] font-bold text-white/70 mt-1">earned</p>

            {/* The reimbursement is stated separately and labelled as the
                rider's own money. Rolling it into one number would tell a
                student they earned five thousand naira for a job that paid
                six hundred. */}
            {payout.reimbursement > 0 && (
              <div className="mt-6 w-full max-w-xs rounded-2xl bg-white/12 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-white/75">Your cash back</span>
                  <Money amount={payout.reimbursement} size="sm" tone="white" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/15">
                  <span className="text-[14px] font-bold">Into your wallet</span>
                  <Money amount={payout.totalCredited} size="md" tone="white" />
                </div>
              </div>
            )}

            <div className="mt-8 w-full max-w-xs space-y-3">
              <Button
                variant="outline"
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
                className="w-full min-h-[44px] text-[14px] font-bold text-white/80 cursor-pointer"
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
