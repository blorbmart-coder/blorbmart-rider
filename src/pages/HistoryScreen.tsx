import { useQuery } from '@tanstack/react-query'
import { HandCoins, MapPin, Store, XCircle } from 'lucide-react'
import { riderApi, type Delivery } from '../lib/api'
import { Card, Chip, EmptyState, IconBadge, Money, Skeleton } from '../components/ui'
import { GlowField, RouteScene } from '../components/art'
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
        <IconBadge
          icon={cancelled ? XCircle : Store}
          tone={cancelled ? 'neutral' : 'iris'}
          size="sm"
          className={cancelled ? 'opacity-60' : undefined}
        />

        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] truncate">{delivery.pickup?.storeName || 'Restaurant'}</p>
          <p className="text-[12px] text-ink-faint truncate flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" aria-hidden />
            {delivery.dropoff?.landmark || delivery.dropoff?.addressLine1 || 'Customer'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[12px] text-ink-faint">{timeAgo(delivery.deliveredAt ?? delivery.createdAt)}</span>
            {delivery.mode === 'sourcing' && !cancelled && (
              <Chip tone="ember" icon={HandCoins}>
                Covered
              </Chip>
            )}
            {cancelled && <Chip tone="neutral">Released</Chip>}
          </div>
        </div>

        <div className="text-right shrink-0 pt-0.5">
          {cancelled ? (
            <span className="text-[14px] font-bold text-ink-faint">—</span>
          ) : (
            <Money amount={earnings} size="md" tone="volt" />
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
      <header className="relative overflow-hidden pad-top-safe px-5 pt-5 pb-7 grain">
        <GlowField tone="iris" />
        <div className="relative">
          <h1 className="font-display text-[32px] leading-none font-bold tracking-[-0.035em]">History</h1>
          {completed.length > 0 && (
            <div className="mt-4 flex items-center gap-5">
              <div>
                <p className="font-display tnum text-[24px] font-bold leading-none">{completed.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint mt-1.5">
                  Deliveries
                </p>
              </div>
              <div className="w-px h-9 bg-line" aria-hidden />
              <div>
                <Money amount={totalEarned} size="lg" tone="volt" />
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint mt-1.5">Earned</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="px-5">
        <Card variant="solid" className="px-4">
          {isLoading ? (
            <div className="py-4 space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : !deliveries?.length ? (
            <EmptyState
              art={<RouteScene className="w-full" />}
              title="No deliveries yet"
              message="Go online and take your first job — it will show up here with exactly what you made."
            />
          ) : (
            <ul className="divide-y divide-line-soft">
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
