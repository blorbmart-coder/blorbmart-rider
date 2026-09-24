import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Lock,
  Receipt,
  RotateCcw,
  Smartphone,
  Tv,
  Wifi,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  billsApi,
  errorMessage,
  riderApi,
  type BillPayment,
  type BillPlan,
  type BillService,
} from '../lib/api'
import { Button, Card, EmptyState, Field, IconBadge, Money, SectionTitle, Sheet, Skeleton, cn } from '../components/ui'
import { money, timeAgo } from '../lib/format'

/**
 * Bills, paid from earnings.
 *
 * A rider's money already sits in this app, so topping up a phone or buying
 * a power token should not mean cashing out to a bank first and paying from
 * there. The form is driven by the catalogue — each biller says which fields
 * it needs — and every payment is approved with the same PIN as a cashout,
 * because it is the same money leaving the same wallet.
 */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  airtime: Smartphone,
  data: Wifi,
  electricity: Zap,
  tv: Tv,
  education: Receipt,
}

const METER_TYPES = [
  { id: 'prepaid', label: 'Prepaid' },
  { id: 'postpaid', label: 'Postpaid' },
]

const PERIOD_ORDER = ['Daily', 'Weekly', 'Monthly', '2 months+', 'Other']
const ALL = 'All'

/** "All" plus each period that has plans; nothing when there is one or none. */
function periodsOf(plans: BillPlan[]) {
  const present = new Set(plans.map((p) => p.periodLabel).filter(Boolean) as string[])
  if (present.size < 2) return []
  return [ALL, ...PERIOD_ORDER.filter((p) => present.has(p)), ...[...present].filter((p) => !PERIOD_ORDER.includes(p))]
}

const needs = (service: BillService | null, input: string) => Boolean(service?.inputs.includes(input))

const cleanPhone = (value: string) => value.replace(/\D/g, '').slice(0, 11)

const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full border text-[13px] font-bold',
        'transition-colors duration-150 active:scale-[0.97]',
        active ? 'bg-ink text-void border-ink' : 'bg-raised text-ink-soft border-line',
      )}
    >
      {children}
    </button>
  )
}

function statusMeta(payment: BillPayment): { label: string; icon: LucideIcon; tone: 'volt' | 'gold' | 'danger' | 'iris' } {
  switch (payment.status) {
    case 'delivered':
      return { label: 'Delivered', icon: CheckCircle2, tone: 'volt' }
    case 'refunded':
      return { label: 'Refunded to your wallet', icon: RotateCcw, tone: 'iris' }
    case 'failed':
      return { label: 'Failed', icon: XCircle, tone: 'danger' }
    default:
      return { label: 'Processing', icon: Clock, tone: 'gold' }
  }
}

export default function BillsScreen() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: catalog, isLoading: catalogLoading, error: catalogError } = useQuery({
    queryKey: ['bills-catalog'],
    queryFn: billsApi.catalog,
    staleTime: 5 * 60_000,
  })
  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: riderApi.wallet })
  const { data: history } = useQuery({ queryKey: ['bills-history'], queryFn: billsApi.history })

  const [categoryId, setCategoryId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [phone, setPhone] = useState('')
  const [account, setAccount] = useState('')
  const [meterType, setMeterType] = useState('prepaid')
  const [amount, setAmount] = useState('')
  const [plan, setPlan] = useState<BillPlan | null>(null)
  const [period, setPeriod] = useState(ALL)
  const [customer, setCustomer] = useState<string | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(newKey)
  const [result, setResult] = useState<BillPayment | null>(null)
  const [pinSetupOpen, setPinSetupOpen] = useState(false)
  const [newPin, setNewPin] = useState('')

  const categories = catalog?.categories ?? []
  const category = categoryId || categories[0]?.id || ''
  const services = useMemo(
    () => (catalog?.services ?? []).filter((s) => s.category === category),
    [catalog, category],
  )
  const service = services.find((s) => s.id === serviceId) ?? services[0] ?? null

  const { data: planData, isLoading: plansLoading } = useQuery({
    queryKey: ['bills-plans', service?.id],
    queryFn: () => billsApi.plans(service!.id),
    enabled: needs(service, 'variation'),
    staleTime: 3 * 60_000,
  })
  const plans = useMemo(() => planData?.variations ?? [], [planData])
  const periods = periodsOf(plans)
  const shownPlans = period === ALL ? plans : plans.filter((p) => p.periodLabel === period)

  /** A different biller: its plans, customer and amount no longer apply. */
  const chooseService = (id: string) => {
    setServiceId(id)
    setPlan(null)
    setPeriod(ALL)
    setCustomer(null)
    setAccount('')
  }

  const verify = useMutation({
    mutationFn: () => billsApi.verifyCustomer(service!.id, account.trim(), needs(service, 'meterType') ? meterType : undefined),
    onSuccess: (data) => setCustomer(data.name || 'Account found'),
    onError: (error) => {
      setCustomer(null)
      toast.error(errorMessage(error, 'We could not find that account.'))
    },
  })

  const value = plan ? plan.amount : Number(amount) || 0
  const fee = service?.fee ?? 0
  const total = value + fee
  const available = wallet?.availableBalance ?? 0

  const problem = (() => {
    if (!service) return 'Choose a biller'
    if (needs(service, 'phone') && cleanPhone(phone).length !== 11) return 'Enter an 11-digit phone number'
    if (needs(service, 'account') && !customer) return `Confirm the ${service.accountLabel?.toLowerCase() || 'account number'}`
    if (needs(service, 'variation') && !plan) return 'Choose a plan'
    if (!plan && needs(service, 'amount')) {
      if (!value) return 'Enter an amount'
      if (service.min && value < service.min) return `The minimum is ${money(service.min)}`
      if (service.max && value > service.max) return `The maximum is ${money(service.max)}`
    }
    if (total > available) return `You have ${money(available)} available`
    return null
  })()

  const pay = useMutation({
    mutationFn: () =>
      billsApi.purchase({
        serviceKey: service!.id,
        amount: plan ? undefined : value,
        phone: needs(service, 'phone') ? cleanPhone(phone) : undefined,
        accountNumber: needs(service, 'account') ? account.trim() : undefined,
        variationCode: plan?.code,
        meterType: needs(service, 'meterType') ? meterType : undefined,
        pin,
        idempotencyKey,
      }),
    onSuccess: (payment) => {
      setConfirmOpen(false)
      setPin('')
      setResult(payment)
      setIdempotencyKey(newKey())
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bills-history'] })
    },
    onError: (error) => {
      setPin('')
      toast.error(errorMessage(error, 'That payment did not go through.'))
    },
  })

  const setupPin = useMutation({
    mutationFn: () => riderApi.setPin(newPin),
    onSuccess: () => {
      toast.success('PIN set. Keep it to yourself.')
      setPinSetupOpen(false)
      setNewPin('')
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      setConfirmOpen(true)
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not set your PIN.')),
  })

  const startPayment = () => {
    if (!wallet?.pinSet) {
      setPinSetupOpen(true)
      return
    }
    setConfirmOpen(true)
  }

  const target = needs(service, 'phone') ? cleanPhone(phone) : account.trim()

  return (
    <div>
      <header className="pad-top-safe px-5 pt-4 pb-5">
        <button
          type="button"
          onClick={() => navigate('/earnings')}
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-faint min-h-[44px] -ml-1"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} aria-hidden />
          Wallet
        </button>
        <h1 className="font-display text-[30px] leading-none font-bold tracking-[-0.03em] mt-1">Pay bills</h1>
        <p className="text-[14px] text-ink-soft mt-2">
          From your earnings · <span className="text-volt font-bold tnum">{money(available)}</span> available
        </p>
      </header>

      <main className="px-5 space-y-5 pb-8">
        {catalogLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-40" />
          </div>
        ) : catalogError || categories.length === 0 ? (
          <EmptyState title="Bills are not available right now" message={errorMessage(catalogError, 'Try again in a little while.')} />
        ) : (
          <>
            {/* ── What kind of bill ─────────────────────────────────── */}
            <div className="flex gap-2 scroll-x -mx-5 px-5">
              {categories.map((c) => {
                const Icon = CATEGORY_ICONS[c.id] ?? Receipt
                return (
                  <Pill
                    key={c.id}
                    active={c.id === category}
                    onClick={() => {
                      setCategoryId(c.id)
                      chooseService('')
                      setAmount('')
                    }}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2.4} aria-hidden />
                    {c.label}
                  </Pill>
                )
              })}
            </div>

            <Card variant="solid" className="p-4 space-y-4">
              {/* ── Which biller ───────────────────────────────────── */}
              <div className="flex gap-2 flex-wrap">
                {services.map((s) => (
                  <Pill key={s.id} active={s.id === service?.id} onClick={() => chooseService(s.id)}>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: s.color || 'currentColor' }}
                      aria-hidden
                    />
                    {s.name}
                  </Pill>
                ))}
              </div>

              {needs(service, 'phone') && (
                <Field
                  label="Phone number"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(cleanPhone(event.target.value))}
                  hint={rider11Hint(phone)}
                />
              )}

              {needs(service, 'meterType') && (
                <div className="flex gap-2">
                  {METER_TYPES.map((m) => (
                    <Pill
                      key={m.id}
                      active={meterType === m.id}
                      onClick={() => {
                        setMeterType(m.id)
                        setCustomer(null)
                      }}
                    >
                      {m.label}
                    </Pill>
                  ))}
                </div>
              )}

              {needs(service, 'account') && (
                <div className="space-y-2">
                  <Field
                    label={service?.accountLabel || 'Account number'}
                    inputMode="numeric"
                    value={account}
                    onChange={(event) => {
                      setAccount(event.target.value.replace(/\s/g, ''))
                      setCustomer(null)
                    }}
                  />
                  {customer ? (
                    <div className="rounded-2xl bg-volt/8 border border-volt/25 px-4 py-3 flex items-center gap-2.5">
                      <BadgeCheck className="w-5 h-5 text-volt shrink-0" strokeWidth={2.4} aria-hidden />
                      <p className="font-bold text-[15px] truncate">{customer}</p>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={verify.isPending}
                      disabled={account.trim().length < 5}
                      onClick={() => verify.mutate()}
                    >
                      Check account
                    </Button>
                  )}
                </div>
              )}

              {needs(service, 'variation') && (
                <div className="space-y-3">
                  <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-faint">Choose a plan</p>
                  {periods.length > 0 && (
                    <div className="flex gap-2 scroll-x -mx-4 px-4">
                      {periods.map((p) => (
                        <Pill key={p} active={p === period} onClick={() => setPeriod(p)}>
                          {p}
                        </Pill>
                      ))}
                    </div>
                  )}
                  {plansLoading ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      {[0, 1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[74px]" />
                      ))}
                    </div>
                  ) : plans.length === 0 ? (
                    <p className="text-[14px] text-ink-faint">No plans listed for {service?.name} right now.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {shownPlans.map((p) => {
                        const active = plan?.code === p.code
                        const [headline, ...rest] = p.name.split(/\s*[—–-]\s*/)
                        return (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() => setPlan(p)}
                            className={cn(
                              'text-left rounded-2xl border p-3 min-h-[74px] transition-colors active:scale-[0.98]',
                              active ? 'bg-volt/10 border-volt' : 'bg-raised border-line',
                            )}
                          >
                            <p className="font-bold text-[14px] leading-tight line-clamp-1">{headline}</p>
                            {rest.length > 0 && (
                              <p className="text-[12px] text-ink-faint line-clamp-1">{rest.join(' · ')}</p>
                            )}
                            <p className={cn('font-display tnum font-bold text-[15px] mt-1', active ? 'text-volt' : 'text-ink')}>
                              {money(p.amount)}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {needs(service, 'amount') && !plan && (
                <Field
                  label="Amount"
                  type="number"
                  inputMode="numeric"
                  prefix="₦"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))}
                  hint={service?.min ? `From ${money(service.min)}` : undefined}
                />
              )}
            </Card>

            {/* ── What it costs ────────────────────────────────────── */}
            {value > 0 && (
              <Card variant="raised" className="p-4 space-y-2 text-[14px]">
                <div className="flex justify-between text-ink-soft">
                  <span>{plan ? plan.name : service?.name}</span>
                  <span className="tnum">{money(value)}</span>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <span>Fee</span>
                  <span className="tnum">{fee > 0 ? money(fee) : 'Free'}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-line-soft">
                  <span className="font-bold">Total</span>
                  <Money amount={total} size="md" />
                </div>
              </Card>
            )}

            <div>
              <Button
                variant="ember"
                size="lg"
                fullWidth
                icon={Lock}
                disabled={Boolean(problem)}
                onClick={startPayment}
              >
                {problem ?? `Pay ${money(total)}`}
              </Button>
            </div>
          </>
        )}

        {/* ── Recent ─────────────────────────────────────────────────── */}
        {history && history.payments.length > 0 && (
          <section className="pt-2">
            <SectionTitle>Recent bills</SectionTitle>
            <Card variant="solid" className="px-4">
              <ul className="divide-y divide-line-soft">
                {history.payments.map((payment) => {
                  const meta = statusMeta(payment)
                  return (
                    <li key={payment.id} className="flex items-center gap-3 py-3.5">
                      <IconBadge icon={CATEGORY_ICONS[payment.category] ?? Receipt} tone="neutral" size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[14px] truncate">
                          {payment.serviceName} · {payment.phone || payment.accountNumber}
                        </p>
                        <p className="text-[12px] text-ink-faint truncate">
                          {meta.label} · {timeAgo(payment.createdAt)}
                        </p>
                      </div>
                      <span className="font-display tnum font-bold text-[15px] text-ink-soft shrink-0">
                        −{money(payment.totalAmount)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </section>
        )}
      </main>

      {/* ── Approve with PIN ─────────────────────────────────────────── */}
      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Approve payment">
        <div className="rounded-2xl bg-raised border border-line p-4 mb-5">
          <p className="text-[13px] text-ink-faint">
            {service?.name}
            {plan ? ` · ${plan.name}` : ''}
          </p>
          <p className="font-bold text-[15px] tnum mt-0.5">{target}</p>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-[13px] text-ink-faint">From your earnings</span>
            <Money amount={total} size="lg" />
          </div>
        </div>
        <Field
          label="Wallet PIN"
          type="password"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
        />
        <Button
          variant="ember"
          size="lg"
          fullWidth
          className="mt-5"
          icon={Lock}
          loading={pay.isPending}
          disabled={pin.length !== 4}
          onClick={() => pay.mutate()}
        >
          Pay {money(total)}
        </Button>
      </Sheet>

      {/* ── First-time PIN ──────────────────────────────────────────── */}
      <Sheet open={pinSetupOpen} onClose={() => setPinSetupOpen(false)} title="Create a wallet PIN">
        <p className="text-[15px] text-ink-soft leading-relaxed mb-5">
          Four digits, asked for every time money leaves your wallet — cashouts and bills. Do not use your bank PIN.
        </p>
        <Field
          label="New PIN"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={newPin}
          onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))}
        />
        <Button
          variant="iris"
          size="lg"
          fullWidth
          className="mt-5"
          icon={Lock}
          loading={setupPin.isPending}
          disabled={newPin.length !== 4}
          onClick={() => setupPin.mutate()}
        >
          Set PIN and continue
        </Button>
      </Sheet>

      {/* ── Outcome ─────────────────────────────────────────────────── */}
      <Sheet open={Boolean(result)} onClose={() => setResult(null)} title={result ? statusMeta(result).label : ''}>
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <IconBadge icon={statusMeta(result).icon} tone={statusMeta(result).tone} size="lg" />
              <div className="min-w-0">
                <p className="font-bold text-[16px] truncate">
                  {result.serviceName}
                  {result.variationName ? ` · ${result.variationName}` : ''}
                </p>
                <p className="text-[14px] text-ink-faint tnum truncate">{result.phone || result.accountNumber}</p>
              </div>
            </div>

            {result.token && (
              <div className="rounded-2xl bg-volt/8 border border-volt/25 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-volt mb-1">Token</p>
                <p className="font-display tnum font-bold text-[20px] tracking-[0.04em] break-all">{result.token}</p>
                {result.units && <p className="text-[13px] text-ink-soft mt-1">{result.units}</p>}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    void navigator.clipboard?.writeText(result.token).then(
                      () => toast.success('Token copied'),
                      () => toast.error('Copy it by hand — the clipboard is blocked.'),
                    )
                  }}
                >
                  Copy token
                </Button>
              </div>
            )}

            <p className="text-[14px] text-ink-soft leading-relaxed">
              {result.status === 'delivered'
                ? `${money(result.totalAmount)} was paid from your earnings.`
                : result.status === 'refunded'
                  ? `It did not go through, so ${money(result.totalAmount)} is back in your wallet.`
                  : result.status === 'failed'
                    ? result.failureReason || 'It did not go through, and nothing was taken from your wallet.'
                  : 'The biller is still confirming it. You will see it update under Recent bills.'}
            </p>

            <Button variant="outline" size="lg" fullWidth onClick={() => setResult(null)}>
              Done
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

/** Counts down to the 11 digits a Nigerian number needs. */
function rider11Hint(phone: string) {
  const left = 11 - cleanPhone(phone).length
  return left > 0 ? `${left} more digit${left === 1 ? '' : 's'}` : undefined
}
