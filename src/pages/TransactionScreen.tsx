import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Copy, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import { riderApi, errorMessage, type TransactionDetail } from '../lib/api'
import { money } from '../lib/format'
import { Card, Chip, EmptyState, IconBadge, Skeleton } from '../components/ui'
import { TX_META } from './EarningsScreen'

/**
 * One wallet entry, in full.
 *
 * Reached by tapping a row in the earnings history, or a payment
 * notification (which names a delivery or a withdrawal, not an entry). A
 * delivery's credits are shown together — "earned" and "your cash back" are
 * one job — and a withdrawal says where the money went and whether it got
 * there.
 */

const when = (ms: number | null) =>
  ms ? new Date(ms).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

const WITHDRAWAL_STATUS: Record<string, { label: string; tone: 'volt' | 'gold' | 'ember' | 'neutral' }> = {
  completed: { label: 'Sent to your bank', tone: 'volt' },
  processing: { label: 'On its way', tone: 'gold' },
  pending: { label: 'Starting', tone: 'gold' },
  failed: { label: 'Failed — money returned to your wallet', tone: 'ember' },
}

function Line({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-line last:border-0">
      <span className="text-[13px] text-ink-faint shrink-0">{label}</span>
      <span className={mono ? 'font-mono text-[12.5px] text-right break-all' : 'text-[14px] font-semibold text-right'}>{value}</span>
    </div>
  )
}

export default function TransactionScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const query = {
    id: params.get('id') ?? undefined,
    deliveryId: params.get('deliveryId') ?? undefined,
    withdrawalId: params.get('withdrawalId') ?? undefined,
  }
  const detail = useQuery({ queryKey: ['rider-transaction', query], queryFn: () => riderApi.transaction(query) })

  return (
    <div className="min-h-dvh pb-28">
      <header className="pad-top-safe px-5 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-10 h-10 rounded-2xl bg-raised border border-line flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </button>
        <h1 className="font-display font-bold text-[20px] tracking-[-0.02em]">Transaction</h1>
      </header>

      <main className="px-5 space-y-4 mt-2">
        {detail.isLoading ? (
          <>
            <Skeleton className="h-36 rounded-3xl" />
            <Skeleton className="h-48 rounded-3xl" />
          </>
        ) : detail.isError || !detail.data ? (
          <EmptyState icon={Receipt} title="We could not find that" message={errorMessage(detail.error, 'This transaction is not on your wallet.')} />
        ) : (
          <Body detail={detail.data} />
        )}
      </main>
    </div>
  )
}

function Body({ detail }: { detail: TransactionDetail }) {
  const { transaction: t, delivery, related, withdrawal } = detail
  const meta = TX_META[t.type] ?? TX_META.adjustment
  const outgoing = t.direction === 'out'
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied')
    } catch {
      /* nothing to do: the reference is on screen */
    }
  }

  return (
    <>
      <Card variant="solid" className="p-5 text-center">
        <div className="flex justify-center">
          <IconBadge icon={meta.icon} tone={meta.tone} />
        </div>
        <p className="mt-3 text-[13px] font-bold text-ink-soft">{meta.label}</p>
        <p className={`font-display tnum font-bold text-[34px] tracking-[-0.03em] mt-1 ${outgoing ? 'text-ink' : 'text-volt'}`}>
          {outgoing ? '−' : '+'}
          {money(t.amount)}
        </p>
        <p className="text-[12.5px] text-ink-faint mt-1">{when(t.createdAt)}</p>
        {t.type === 'reimbursement' && (
          <p className="mt-3 text-[12.5px] text-ink-soft">Your own cash coming back — not earnings.</p>
        )}
      </Card>

      {withdrawal && (
        <Card variant="raised" className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display font-bold text-[16px]">Withdrawal</p>
            {withdrawal.status && (
              <Chip tone={WITHDRAWAL_STATUS[withdrawal.status]?.tone ?? 'neutral'}>
                {WITHDRAWAL_STATUS[withdrawal.status]?.label ?? withdrawal.status}
              </Chip>
            )}
          </div>
          <div className="mt-2">
            {withdrawal.accountName && <Line label="To" value={withdrawal.accountName} />}
            {withdrawal.bankName && <Line label="Bank" value={`${withdrawal.bankName}${withdrawal.accountMasked ? ` · ${withdrawal.accountMasked}` : ''}`} />}
            <Line label="Started" value={when(withdrawal.initiatedAt)} />
            {withdrawal.completedAt && <Line label="Arrived" value={when(withdrawal.completedAt)} />}
            {withdrawal.failureReason && <Line label="Why it failed" value={withdrawal.failureReason} />}
          </div>
        </Card>
      )}

      {delivery && (
        <Card variant="raised" className="p-4">
          <p className="font-display font-bold text-[16px]">The job</p>
          <div className="mt-2">
            {delivery.orderId && <Line label="Order" value={delivery.orderId} mono />}
            {delivery.storeName && <Line label="From" value={delivery.storeName} />}
            {delivery.dropoffArea && <Line label="To" value={delivery.dropoffArea} />}
            {delivery.mode === 'sourcing' && delivery.cashPaidAmount > 0 && (
              <Line label="You paid for the order" value={money(delivery.cashPaidAmount)} />
            )}
            {delivery.deliveredAt && <Line label="Delivered" value={when(delivery.deliveredAt)} />}
          </div>
          {related.length > 0 && (
            <div className="mt-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-faint mb-1">Also paid for this job</p>
              {[t, ...related].map((r) => {
                const m = TX_META[r.type] ?? TX_META.adjustment
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 text-[14px]">
                    <span className={r.id === t.id ? 'font-bold' : 'text-ink-soft'}>{m.label}</span>
                    <span className="tnum font-bold">{r.direction === 'out' ? '−' : '+'}{money(r.amount)}</span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-line text-[14px] font-bold">
                <span>Total to your wallet</span>
                <span className="tnum text-volt">{money([t, ...related].reduce((s, r) => s + (r.direction === 'out' ? -r.amount : r.amount), 0))}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card variant="raised" className="p-4">
        <p className="font-display font-bold text-[16px]">Details</p>
        <div className="mt-2">
          {t.description && <Line label="Description" value={t.description} />}
          {t.balanceAfter !== null && <Line label="Wallet balance after" value={money(t.balanceAfter)} />}
          {t.reference && (
            <button className="w-full text-left" onClick={() => void copy(t.reference ?? '')}>
              <div className="flex items-start justify-between gap-4 py-2.5">
                <span className="text-[13px] text-ink-faint shrink-0">Reference</span>
                <span className="font-mono text-[12.5px] text-right break-all inline-flex items-center gap-1.5">
                  {t.reference}
                  <Copy className="w-3.5 h-3.5 text-ink-faint" aria-hidden />
                </span>
              </div>
            </button>
          )}
        </div>
      </Card>
      <p className="text-center text-[12px] text-ink-faint px-6">Something wrong with this payment? Tell support and quote the reference.</p>
    </>
  )
}
