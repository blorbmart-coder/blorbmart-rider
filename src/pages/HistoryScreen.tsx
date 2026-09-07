import { useQuery } from '@tanstack/react-query'
import { HandCoins, MapPin, Package, Store, XCircle } from 'lucide-react'
import { riderApi, type Delivery } from '../lib/api'
import { Card, Chip, EmptyState, Money, Skeleton } from '../components/ui'
import { timeAgo } from '../lib/format'

/**
 * Past deliveries.
 *
 * Each row shows what the rider earned, not what landed in their wallet. On a
 * sourcing job those differ by thousands, and a history that quotes the
 * larger figure would have a rider believing they earn four times what they
 * do — until they try to spend it.
 */
function DeliveryRow({ delivery }: { delivery: Delivery }) {
  const cancelled = delivery.status === 'cancelled'
  const earnings = delivery.settledEarnings ?? delivery.payout?.earnings ?? 0

  return (
    <li className="py-3.5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-canvas flex items-center justify-center shrink-0">
          {cancelled ? (
            <XCircle className="w-[18px] h-[18px] text-ink-faint" aria-hidden />
          ) : (
            <Store className="w-[18px] h-[18px] text-brand" aria-hidden />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] truncate">{delivery.pickup?.storeName || 'Restaurant'}</p>
          <p className="text-[12px] text-ink-faint truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" aria-hidden />
            {delivery.dropoff?.landmark || delivery.dropoff?.addressLine1 || 'Customer'}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[12px] text-ink-faint">{timeAgo(delivery.deliveredAt ?? delivery.createdAt)}</span>
            {delivery.mode === 'sourcing' && !cancelled && (
              <Chip tone="action" icon={HandCoins}>
                Covered
              </Chip>
            )}
            {cancelled && <Chip tone="neutral">Released</Chip>}
          </div>
        </div>

        <div className="text-right shrink-0">
          {cancelled ? (
            <span className="text-[13px] font-bold text-ink-faint">—</span>
          ) : (
            <Money amount={earnings} size="md" tone="cash" />
          )}
        </div>
      </div>
    </li>
  )
}

export default function HistoryScreen() {
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => riderApi.deliveries(50),
  })

  const completed = deliveries?.filter((delivery) => delivery.status === 'delivered') ?? []
  const totalEarned = completed.reduce(
    (sum, delivery) => sum + (delivery.settledEarnings ?? delivery.payout?.earnings ?? 0),
    0,
  )

  return (
    <div>
      <header className="pad-top-safe px-5 pt-4 pb-3">
        <h1 className="text-[30px] font-extrabold tracking-[-0.025em]">History</h1>
        {completed.length > 0 && (
          <p className="text-ink-soft mt-1">
            {completed.length} deliveries · <Money amount={totalEarned} size="sm" tone="cash" /> earned
          </p>
        )}
      </header>

      <main className="px-5">
        <Card className="px-4">
          {isLoading ? (
            <div className="py-4 space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : !deliveries?.length ? (
            <EmptyState
              icon={Package}
              title="No deliveries yet"
              message="Go online and take your first job — it will show up here with exactly what you made."
            />
          ) : (
            <ul className="divide-y divide-line">
              {deliveries.map((delivery) => (
                <DeliveryRow key={delivery.id} delivery={delivery} />
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  )
}
