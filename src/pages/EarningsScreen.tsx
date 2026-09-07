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
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { riderApi, errorMessage, type WalletTransaction } from '../lib/api'
import { Button, Card, Chip, EmptyState, Field, Money, SelectField, Sheet, Skeleton, cn } from '../components/ui'
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

const TX_META: Record<string, { label: string; icon: typeof Banknote; tone: string }> = {
  delivery_earning: { label: 'Delivery', icon: Bike, tone: 'text-cash' },
  sourcing_bonus: { label: 'Cash-front bonus', icon: Sparkles, tone: 'text-action' },
  reimbursement: { label: 'Your cash back', icon: HandCoins, tone: 'text-brand' },
  tip: { label: 'Tip', icon: Sparkles, tone: 'text-cash' },
  bonus: { label: 'Bonus', icon: Sparkles, tone: 'text-cash' },
  adjustment: { label: 'Adjustment', icon: Receipt, tone: 'text-ink-soft' },
  debit: { label: 'Cashed out', icon: ArrowUpRight, tone: 'text-ink-soft' },
  reversal: { label: 'Returned', icon: ArrowDownLeft, tone: 'text-warn' },
}

function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const meta = TX_META[transaction.type] ?? TX_META.adjustment
  const outgoing = transaction.direction === 'out'

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="w-10 h-10 rounded-xl bg-canvas flex items-center justify-center shrink-0">
        <meta.icon className={cn('w-[18px] h-[18px]', meta.tone)} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[14px] truncate">{meta.label}</p>
        <p className="text-[12px] text-ink-faint truncate">
          {transaction.description || transaction.orderId || ''} · {timeAgo(transaction.createdAt)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <span className={cn('tnum font-extrabold text-[15px]', outgoing ? 'text-ink-soft' : 'text-cash')}>
          {outgoing ? '−' : '+'}
          {money(transaction.amount).replace('₦', '₦')}
        </span>
        {!transaction.countsAsEarning && !outgoing && (
          <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wide">not earnings</p>
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
      <header className="bg-brand text-white pad-top-safe px-5 pt-4 pb-8 rounded-b-[28px]">
        <p className="text-[13px] font-bold text-white/60 uppercase tracking-wide">Available to cash out</p>
        {isLoading ? (
          <Skeleton className="h-14 w-48 mt-2 bg-white/20" />
        ) : (
          <Money amount={wallet?.availableBalance ?? 0} size="hero" tone="white" className="mt-1" />
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/12 p-3">
            <p className="text-[11px] font-bold text-white/55 uppercase tracking-wide">Earned all time</p>
            <Money amount={wallet?.totalEarned ?? 0} size="md" tone="white" className="mt-0.5" />
          </div>
          <div className="rounded-2xl bg-white/12 p-3">
            <p className="text-[11px] font-bold text-white/55 uppercase tracking-wide">Deliveries</p>
            <p className="tnum text-lg font-extrabold mt-0.5">{wallet?.deliveriesCompleted ?? 0}</p>
          </div>
        </div>

        <Button
          variant="action"
          size="lg"
          fullWidth
          className="mt-5"
          icon={ArrowUpRight}
          disabled={(wallet?.availableBalance ?? 0) <= 0}
          onClick={startWithdraw}
        >
          Cash out
        </Button>
        {(wallet?.availableBalance ?? 0) < (wallet?.minWithdrawal ?? 500) && (wallet?.availableBalance ?? 0) > 0 && (
          <p className="text-center text-[12px] text-white/55 mt-2">
            Minimum cashout is {money(wallet?.minWithdrawal ?? 500)}
          </p>
        )}
      </header>

      <main className="px-5 -mt-4 space-y-4">
        {/* Money the rider is owed. Shown as its own card, never mixed into
            the balance, because it is not spendable yet and pretending
            otherwise is how a wallet loses a rider's trust for good. */}
        {(wallet?.cashOutstanding ?? 0) > 0 && (
          <Card className="p-4 bg-warn-tint border-warn/25 flex gap-3">
            <Clock className="w-5 h-5 text-[#8A5B00] shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-extrabold text-[15px] text-[#8A5B00]">Your cash on the road</p>
                <Money amount={wallet?.cashOutstanding ?? 0} size="md" tone="ink" />
              </div>
              <p className="text-[13px] text-ink-soft leading-snug mt-1">
                You fronted this for an order in progress. It returns to your balance the moment that delivery is
                confirmed.
              </p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Today', value: earnings?.earningsToday },
            { label: 'This week', value: earnings?.earningsWeek },
            { label: 'Per job', value: earnings?.averagePerDelivery },
          ].map((stat) => (
            <Card key={stat.label} className="p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint mb-1">{stat.label}</p>
              {earnings ? <Money amount={stat.value ?? 0} size="sm" /> : <Skeleton className="h-5 w-12" />}
            </Card>
          ))}
        </div>

        <Card className="p-4" onClick={() => setShowBank(true)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5 text-brand" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              {wallet?.bankAccount ? (
                <>
                  <p className="font-bold text-[15px] truncate">{wallet.bankAccount.bankName}</p>
                  <p className="text-[13px] text-ink-soft tnum">
                    {wallet.bankAccount.accountMasked} · {wallet.bankAccount.accountName}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-[15px]">Add your bank account</p>
                  <p className="text-[13px] text-ink-soft">Needed once, before your first cashout</p>
                </>
              )}
            </div>
            {wallet?.bankAccount ? (
              <Chip tone="cash">Change</Chip>
            ) : (
              <Plus className="w-5 h-5 text-brand shrink-0" aria-hidden />
            )}
          </div>
        </Card>

        {!wallet?.pinSet && (
          <Card className="p-4 flex items-center gap-3" onClick={() => setShowPinSetup(true)}>
            <div className="w-10 h-10 rounded-xl bg-action-tint flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-action" aria-hidden />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[15px]">Set a wallet PIN</p>
              <p className="text-[13px] text-ink-soft">Stops anyone with your phone moving your money</p>
            </div>
            <Plus className="w-5 h-5 text-action shrink-0" aria-hidden />
          </Card>
        )}

        <section>
          <h2 className="text-xl font-extrabold tracking-[-0.01em] mb-2">Activity</h2>
          <Card className="px-4">
            {!history ? (
              <div className="py-4 space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : history.transactions.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="Nothing here yet"
                message="Finish your first delivery and your earnings will show up right here."
              />
            ) : (
              <ul className="divide-y divide-line">
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
        <p className="text-[14px] text-ink-soft mb-5">
          Going to {wallet?.bankAccount?.bankName} · {wallet?.bankAccount?.accountMasked}
        </p>
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
            variant="cash"
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
            <div className="rounded-2xl bg-cash-tint p-4">
              <p className="text-[12px] font-bold uppercase tracking-wide text-cash-deep mb-0.5">Account name</p>
              <p className="font-extrabold text-[16px]">{resolvedName}</p>
            </div>
          )}

          <Button
            variant="primary"
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
        <p className="text-[14px] text-ink-soft leading-relaxed mb-5">
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
          variant="primary"
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
