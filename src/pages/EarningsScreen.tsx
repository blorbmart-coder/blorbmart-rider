import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Bike,
  Clock,
  HandCoins,
  Landmark,
  Lock,
  Plus,
  Receipt,
  Shield,
  Zap,
} from 'lucide-react'
import { riderApi, errorMessage, type WalletTransaction } from '../lib/api'
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  IconBadge,
  Money,
  SectionTitle,
  SelectField,
  Sheet,
  Skeleton,
  cn,
} from '../components/ui'
import { GlowField, WalletScene } from '../components/art'
import { money, timeAgo } from '../lib/format'

/**
 * The wallet.
 *
 * Its whole job is to be believed. A rider who has just handed four thousand
 * naira to a restaurant needs to open this and see that money accounted for,
 * named, and clearly on its way back — so the balance is split into three
 * figures rather than one:
 *
 *   Available    withdrawable right now
 *   On the road  cash they have fronted and not yet been paid back
 *   Earned       what they have actually made
 *
 * Every transaction row says which of those it is. "Order settled" would be
 * accurate and useless.
 */

const TX_META: Record<string, { label: string; icon: typeof Banknote; tone: 'volt' | 'ember' | 'iris' | 'gold' | 'neutral' }> = {
  delivery_earning: { label: 'Delivery', icon: Bike, tone: 'volt' },
  sourcing_bonus: { label: 'Cash-front bonus', icon: Zap, tone: 'ember' },
  reimbursement: { label: 'Your cash back', icon: HandCoins, tone: 'iris' },
  tip: { label: 'Tip', icon: Zap, tone: 'volt' },
  bonus: { label: 'Bonus', icon: Zap, tone: 'volt' },
  adjustment: { label: 'Adjustment', icon: Receipt, tone: 'neutral' },
  debit: { label: 'Cashed out', icon: ArrowUpRight, tone: 'neutral' },
  reversal: { label: 'Returned', icon: ArrowDownLeft, tone: 'gold' },
}

function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const meta = TX_META[transaction.type] ?? TX_META.adjustment
  const outgoing = transaction.direction === 'out'

  return (
    <li className="flex items-center gap-3 py-3.5">
      <IconBadge icon={meta.icon} tone={meta.tone} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] truncate">{meta.label}</p>
        <p className="text-[12px] text-ink-faint truncate">
          {transaction.description || transaction.orderId || ''} · {timeAgo(transaction.createdAt)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <span
          className={cn(
            'font-display tnum font-bold text-[15px]',
            outgoing ? 'text-ink-soft' : 'text-volt',
          )}
        >
          {outgoing ? '−' : '+'}
          {money(transaction.amount)}
        </span>
        {/* Reimbursed cash is not income, and a rider adding up this column at
            the end of a week must not be told otherwise. */}
        {!transaction.countsAsEarning && !outgoing && (
          <p className="text-[10px] font-bold text-ink-faint uppercase tracking-[0.08em]">not earnings</p>
        )}
      </div>
    </li>
  )
}

export default function EarningsScreen() {
  const queryClient = useQueryClient()
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showBank, setShowBank] = useState(false)
  const [showPinSetup, setShowPinSetup] = useState(false)

  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [newPin, setNewPin] = useState('')

  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [resolvedName, setResolvedName] = useState<string | null>(null)

  const { data: wallet, isLoading } = useQuery({ queryKey: ['wallet'], queryFn: riderApi.wallet })
  const { data: earnings } = useQuery({ queryKey: ['earnings'], queryFn: riderApi.earnings })
  const { data: history } = useQuery({ queryKey: ['transactions'], queryFn: () => riderApi.transactions() })
  const { data: banks } = useQuery({ queryKey: ['banks'], queryFn: riderApi.banks, enabled: showBank })

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    queryClient.invalidateQueries({ queryKey: ['earnings'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }

  const verifyBank = useMutation({
    mutationFn: () => riderApi.verifyBank(bankCode, accountNumber),
    onSuccess: (data) => setResolvedName(data.accountName),
    onError: (error) => {
      setResolvedName(null)
      toast.error(errorMessage(error, 'Could not find that account.'))
    },
  })

  const saveBank = useMutation({
    mutationFn: () => riderApi.saveBank(bankCode, accountNumber),
    onSuccess: () => {
      toast.success('Bank account saved')
      setShowBank(false)
      setResolvedName(null)
      setAccountNumber('')
      refreshAll()
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not save that account.')),
  })

  const setupPin = useMutation({
    mutationFn: () => riderApi.setPin(newPin),
    onSuccess: () => {
      toast.success('PIN set. Keep it to yourself.')
      setShowPinSetup(false)
      setNewPin('')
      refreshAll()
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not set your PIN.')),
  })

  const withdraw = useMutation({
    mutationFn: () => riderApi.withdraw(Number(amount), pin),
    onSuccess: () => {
      toast.success('On its way to your bank')
      setShowWithdraw(false)
      setAmount('')
      setPin('')
      refreshAll()
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not send that cashout.')),
  })

  const startWithdraw = () => {
    if (!wallet?.bankAccount) {
      setShowBank(true)
      return
    }
    if (!wallet.pinSet) {
      setShowPinSetup(true)
      return
    }
    setAmount(String(wallet.availableBalance))
    setShowWithdraw(true)
  }

  return (
    <div>
      {/* ── The balance ───────────────────────────────────────────────────
          One number, as large as the screen allows, in volt because it is
          the definition of volt: money that has landed and is the rider's to
          spend. Nothing else on this screen is permitted to compete. */}
      <header className="relative overflow-hidden pad-top-safe px-5 pt-5 pb-9 grain">
        <GlowField tone="volt" />
        <div className="absolute inset-0 dotfield opacity-50" aria-hidden />

        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Available to cash out</p>
          {isLoading ? (
            <Skeleton className="h-14 w-52 mt-3" />
          ) : (
            <Money
              amount={wallet?.availableBalance ?? 0}
              size="hero"
              tone="volt"
              className="mt-2 aura-volt"
            />
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/5 border border-white/8 p-3.5">
              <p className="text-[10px] font-bold text-ink-faint uppercase tracking-[0.1em]">Earned all time</p>
              <Money amount={wallet?.totalEarned ?? 0} size="md" tone="ink" className="mt-1" />
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/8 p-3.5">
              <p className="text-[10px] font-bold text-ink-faint uppercase tracking-[0.1em]">Deliveries</p>
              <p className="font-display tnum text-lg font-bold mt-1">{wallet?.deliveriesCompleted ?? 0}</p>
            </div>
          </div>

          <Button
            variant="volt"
            size="lg"
            fullWidth
            className="mt-5"
            icon={ArrowUpRight}
            disabled={(wallet?.availableBalance ?? 0) <= 0}
            onClick={startWithdraw}
          >
            Cash out
          </Button>
          {(wallet?.availableBalance ?? 0) < (wallet?.minWithdrawal ?? 500) &&
            (wallet?.availableBalance ?? 0) > 0 && (
              <p className="text-center text-[12px] text-ink-faint mt-2.5">
                Minimum cashout is {money(wallet?.minWithdrawal ?? 500)}
              </p>
            )}
        </div>
      </header>

      <main className="px-5 space-y-4">
        {/* Money the rider is owed. Its own card, never mixed into the
            balance, because it is not spendable yet and pretending otherwise
            is how a wallet loses a rider's trust for good. */}
        {(wallet?.cashOutstanding ?? 0) > 0 && (
          <Card variant="solid" className="p-4 border-gold/25 flex gap-3">
            <IconBadge icon={Clock} tone="gold" size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-[15px] text-gold">Your cash on the road</p>
                <Money amount={wallet?.cashOutstanding ?? 0} size="md" tone="ink" />
              </div>
              <p className="text-[13px] text-ink-soft leading-snug mt-1">
                You fronted this for an order in progress. It returns to your balance the moment that delivery is
                confirmed.
              </p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Today', value: earnings?.earningsToday },
            { label: 'This week', value: earnings?.earningsWeek },
            { label: 'Per job', value: earnings?.averagePerDelivery },
          ].map((stat) => (
            <Card key={stat.label} variant="raised" className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint mb-1.5">
                {stat.label}
              </p>
              {earnings ? <Money amount={stat.value ?? 0} size="sm" /> : <Skeleton className="h-5 w-12" />}
            </Card>
          ))}
        </div>

        <Card variant="raised" className="p-3.5" onClick={() => setShowBank(true)}>
          <div className="flex items-center gap-3">
            <IconBadge icon={Landmark} tone="iris" size="sm" />
            <div className="flex-1 min-w-0">
              {wallet?.bankAccount ? (
                <>
                  <p className="font-bold text-[15px] truncate">{wallet.bankAccount.bankName}</p>
                  <p className="text-[13px] text-ink-faint tnum truncate">
                    {wallet.bankAccount.accountMasked} · {wallet.bankAccount.accountName}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-[15px]">Add your bank account</p>
                  <p className="text-[13px] text-ink-faint">Needed once, before your first cashout</p>
                </>
              )}
            </div>
            {wallet?.bankAccount ? (
              <Chip tone="outline">Change</Chip>
            ) : (
              <Plus className="w-5 h-5 text-iris-light shrink-0" strokeWidth={2.5} aria-hidden />
            )}
          </div>
        </Card>

        {!wallet?.pinSet && (
          <Card variant="raised" className="p-3.5 flex items-center gap-3" onClick={() => setShowPinSetup(true)}>
            <IconBadge icon={Shield} tone="ember" size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px]">Set a wallet PIN</p>
              <p className="text-[13px] text-ink-faint">Stops anyone with your phone moving your money</p>
            </div>
            <Plus className="w-5 h-5 text-ember shrink-0" strokeWidth={2.5} aria-hidden />
          </Card>
        )}

        <section className="pt-1">
          <SectionTitle>Activity</SectionTitle>
          <Card variant="solid" className="px-4">
            {!history ? (
              <div className="py-4 space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : history.transactions.length === 0 ? (
              <EmptyState
                art={<WalletScene className="w-full" />}
                title="Nothing here yet"
                message="Finish your first delivery and your earnings will show up right here, named and dated."
              />
            ) : (
              <ul className="divide-y divide-line-soft">
                {history.transactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </ul>
            )}
          </Card>
        </section>
      </main>

      {/* ── Cash out ────────────────────────────────────────────────────── */}
      <Sheet open={showWithdraw} onClose={() => setShowWithdraw(false)} title="Cash out">
        <div className="rounded-2xl bg-raised border border-line p-3.5 flex items-center gap-3 mb-5">
          <IconBadge icon={Landmark} tone="iris" size="sm" />
          <div className="min-w-0">
            <p className="font-bold text-[14px] truncate">{wallet?.bankAccount?.bankName}</p>
            <p className="text-[13px] text-ink-faint tnum">{wallet?.bankAccount?.accountMasked}</p>
          </div>
        </div>
        <div className="space-y-4">
          <Field
            label="Amount"
            type="number"
            inputMode="numeric"
            prefix="₦"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            hint={`You have ${money(wallet?.availableBalance ?? 0)} available`}
          />
          <Field
            label="Wallet PIN"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
          />
          <Button
            variant="volt"
            size="lg"
            fullWidth
            icon={Banknote}
            loading={withdraw.isPending}
            disabled={!amount || pin.length !== 4}
            onClick={() => withdraw.mutate()}
          >
            Send {amount ? money(Number(amount)) : 'money'}
          </Button>
        </div>
      </Sheet>

      {/* ── Bank ────────────────────────────────────────────────────────── */}
      <Sheet
        open={showBank}
        onClose={() => {
          setShowBank(false)
          setResolvedName(null)
        }}
        title="Where should we send your money?"
      >
        <div className="space-y-4">
          <SelectField
            label="Bank"
            value={bankCode}
            onChange={(event) => {
              setBankCode(event.target.value)
              setResolvedName(null)
            }}
          >
            <option value="">Choose your bank</option>
            {banks?.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </SelectField>

          <Field
            label="Account number"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, '')
              setAccountNumber(value)
              setResolvedName(null)
              // Ten digits is a complete NUBAN, so the name check fires the
              // moment it can succeed rather than waiting for a button. A
              // rider seeing their own name appear is the confirmation that
              // they typed it right.
              if (value.length === 10 && bankCode) verifyBank.mutate()
            }}
            hint="10 digits"
          />

          {verifyBank.isPending && <p className="text-[13px] text-ink-faint">Checking that account…</p>}

          {resolvedName && (
            <div className="rounded-2xl bg-volt/8 border border-volt/25 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-volt mb-1">Account name</p>
              <p className="font-display font-bold text-[17px] tracking-[-0.02em]">{resolvedName}</p>
            </div>
          )}

          <Button
            variant="iris"
            size="lg"
            fullWidth
            loading={saveBank.isPending}
            disabled={!resolvedName}
            onClick={() => saveBank.mutate()}
          >
            Save this account
          </Button>
        </div>
      </Sheet>

      {/* ── PIN ─────────────────────────────────────────────────────────── */}
      <Sheet open={showPinSetup} onClose={() => setShowPinSetup(false)} title="Create a wallet PIN">
        <p className="text-[15px] text-ink-soft leading-relaxed mb-5">
          Four digits, asked for every time you cash out. Do not use your bank PIN, and do not share it — nobody
          from Blorbmart will ever ask you for it.
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
          Set PIN
        </Button>
      </Sheet>
    </div>
  )
}
