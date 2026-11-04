import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Star } from 'lucide-react'
import { riderApi } from '../lib/api'
import { Card, EmptyState, Skeleton, cn } from '../components/ui'

const PERIODS: Array<[number, string]> = [
  [30, '30 days'],
  [90, '90 days'],
  [365, 'Year'],
]

/**
 * How customers rate this rider. Comments come without the customer's name,
 * order or exact time: they are for getting better, not for finding who wrote
 * them.
 */
export default function RatingsScreen() {
  const navigate = useNavigate()
  const [days, setDays] = useState(30)
  const report = useQuery({ queryKey: ['rider-report', days], queryFn: () => riderApi.ratingsReport(days) })
  const r = report.data

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
        <h1 className="font-display font-bold text-[20px] tracking-[-0.02em] flex-1">Your ratings</h1>
      </header>

      <main className="px-5 mt-2 space-y-3">
        <div className="flex gap-2">
          {PERIODS.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setDays(value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[13px] font-bold border',
                days === value ? 'bg-volt text-void border-volt' : 'border-line',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {report.isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : !r || r.count === 0 ? (
          <EmptyState icon={Star} title="No ratings yet" message="Customers rate you after each delivery. Their stars show up here." />
        ) : (
          <>
            <Card variant="solid" className="p-4">
              <div className="flex items-end gap-3">
                <span className="font-display font-bold text-[40px] leading-none">{r.average?.toFixed(1)}</span>
                <span className="text-[14px] pb-1">{`★ from ${r.count} rating${r.count === 1 ? '' : 's'}`}</span>
              </div>
              <p className="text-[13px] mt-2 text-ink-soft">{`${r.positive} happy · ${r.negative} unhappy`}</p>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card variant="solid" className="p-4">
                <p className="text-[11px] font-bold tracking-wide text-ink-soft">PRAISED FOR</p>
                {r.compliments.length === 0 && <p className="text-[13px] mt-1">Nothing tagged yet</p>}
                {r.compliments.slice(0, 4).map((c) => (
                  <p key={c.tag} className="text-[13px] mt-1">{`${c.tag} · ${c.count}`}</p>
                ))}
              </Card>
              <Card variant="solid" className="p-4">
                <p className="text-[11px] font-bold tracking-wide text-ink-soft">COMPLAINTS</p>
                {r.complaints.length === 0 && <p className="text-[13px] mt-1">None. Keep it up.</p>}
                {r.complaints.slice(0, 4).map((c) => (
                  <p key={c.tag} className="text-[13px] mt-1 text-ember">{`${c.tag} · ${c.count}`}</p>
                ))}
              </Card>
            </div>

            {r.comments.length > 0 && (
              <Card variant="solid" className="p-4">
                <p className="text-[11px] font-bold tracking-wide text-ink-soft">WHAT CUSTOMERS WROTE</p>
                {r.comments.map((c, i) => (
                  <div key={i} className="mt-3">
                    <p className="text-[12px] text-ink-soft">{`${'★'.repeat(c.stars)} · ${c.month}`}</p>
                    <p className="text-[14px]">{c.comment}</p>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
