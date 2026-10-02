import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bell, Bike, CheckCheck, ShieldCheck, Wallet } from 'lucide-react'
import { riderApi, type RiderNotification } from '../lib/api'
import { timeAgo } from '../lib/format'
import { EmptyState, IconBadge, Skeleton, cn } from '../components/ui'

/**
 * Everything the rider was told, newest first.
 *
 * A payment notice opens the money it is about: a delivery's earnings, or a
 * withdrawal. A job notice opens the job. Anything that only informs stays
 * where it is, read.
 */

/** Where tapping a notification takes the rider, or null if nowhere. */
export function linkFor(n: RiderNotification): string | null {
  const meta = n.metadata || {}
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const withdrawalId = str(meta.withdrawalId)
  const deliveryId = str(meta.deliveryId)
  if (withdrawalId) return `/earnings/tx?withdrawalId=${encodeURIComponent(withdrawalId)}`
  if (n.type === 'wallet' && deliveryId) return `/earnings/tx?deliveryId=${encodeURIComponent(deliveryId)}`
  if (n.actionUrl && n.actionUrl.startsWith('/')) return n.actionUrl
  if (deliveryId) return `/delivery/${encodeURIComponent(deliveryId)}`
  if (n.type === 'wallet') return '/earnings'
  if (n.type === 'rider_verification') return '/account'
  return null
}

const iconFor = (n: RiderNotification) =>
  n.type === 'wallet' ? Wallet : n.type === 'rider_verification' ? ShieldCheck : n.type.includes('delivery') ? Bike : Bell

export default function NotificationsScreen() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['rider-notifications'], queryFn: riderApi.notifications, refetchInterval: 60_000 })
  const read = useMutation({
    mutationFn: (id?: string) => riderApi.readNotifications(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rider-notifications'] }),
  })

  const notes = list.data?.notifications ?? []
  const unread = list.data?.unread ?? 0

  const open = (n: RiderNotification) => {
    if (n.status === 'unread') read.mutate(n.id)
    const to = linkFor(n)
    if (to) navigate(to)
  }

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
        <h1 className="font-display font-bold text-[20px] tracking-[-0.02em] flex-1">Notifications</h1>
        {unread > 0 && (
          <button onClick={() => read.mutate(undefined)} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-volt">
            <CheckCheck className="w-4 h-4" aria-hidden /> Mark all read
          </button>
        )}
      </header>

      <main className="px-5 mt-2">
        {list.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <EmptyState icon={Bell} title="Nothing yet" message="Jobs, payments and account updates will show up here." />
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => {
              const Icon = iconFor(n)
              const linked = Boolean(linkFor(n))
              return (
                <li key={n.id}>
                  <button
                    onClick={() => open(n)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 rounded-2xl border p-3.5 transition-colors',
                      n.status === 'unread' ? 'bg-raised border-volt/30' : 'border-line',
                      linked ? 'active:bg-raised' : 'cursor-default',
                    )}
                  >
                    <IconBadge icon={Icon} tone={n.type === 'wallet' ? 'volt' : 'iris'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[14px] leading-snug">{n.title}</p>
                      {n.message && <p className="text-[13px] text-ink-soft leading-snug mt-0.5">{n.message}</p>}
                      <p className="text-[11.5px] text-ink-faint mt-1">
                        {n.createdAt ? timeAgo(new Date(n.createdAt).toISOString()) : ''}
                        {linked && n.type === 'wallet' ? ' · Tap for details' : ''}
                      </p>
                    </div>
                    {n.status === 'unread' && <span className="w-2 h-2 rounded-full bg-volt mt-1.5 shrink-0" aria-label="Unread" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
