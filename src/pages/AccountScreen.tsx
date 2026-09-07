import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Bike,
  ChevronRight,
  Download,
  GraduationCap,
  HandCoins,
  LifeBuoy,
  LogOut,
  Star,
  Wallet,
} from 'lucide-react'
import { riderApi } from '../lib/api'
import { useRider } from '../contexts/RiderContext'
import { useInstalled } from '../hooks/usePresence'
import { Button, Card, Chip, Money, ProgressBar } from '../components/ui'
import { initials, money } from '../lib/format'

const VEHICLE_LABEL: Record<string, string> = {
  foot: 'On foot',
  bicycle: 'Bicycle',
  bike: 'Motorcycle',
  car: 'Car',
}

function Row({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof Bike
  label: string
  value?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full min-h-[56px] flex items-center gap-3 px-4 text-left disabled:cursor-default cursor-pointer active:bg-canvas transition-colors"
    >
      <Icon className="w-5 h-5 text-ink-faint shrink-0" aria-hidden />
      <span className="flex-1 font-semibold text-[15px]">{label}</span>
      {value && <span className="text-[14px] text-ink-soft">{value}</span>}
      {onClick && <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" aria-hidden />}
    </button>
  )
}

export default function AccountScreen() {
  const navigate = useNavigate()
  const { rider, logout } = useRider()
  const installed = useInstalled()

  const { data: earnings } = useQuery({ queryKey: ['earnings'], queryFn: riderApi.earnings })
  const sourcing = rider?.sourcing

  return (
    <div>
      <header className="pad-top-safe px-5 pt-4 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-brand text-white flex items-center justify-center text-xl font-extrabold shrink-0">
            {initials(rider?.displayName)}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-[-0.02em] truncate">
              {rider?.displayName || 'Rider'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-[13px] font-bold text-ink-soft">
                <Star className="w-3.5 h-3.5 fill-warn text-warn" aria-hidden />
                {(rider?.rating ?? 5).toFixed(1)}
              </span>
              {rider?.status === 'active' && (
                <Chip tone="cash" icon={BadgeCheck}>
                  Verified
                </Chip>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint mb-1">Deliveries</p>
            <p className="tnum text-2xl font-extrabold">{earnings?.lifetimeDeliveries ?? 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint mb-1">Earned</p>
            <Money amount={earnings?.totalEarned ?? 0} size="lg" tone="cash" />
          </Card>
        </div>

        {/* The trust ladder, stated plainly. A limit a rider understands is a
            goal; a limit they only discover as a rejection is a bug report. */}
        {sourcing && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <HandCoins className="w-4 h-4 text-action" aria-hidden />
              <p className="font-extrabold text-[15px]">Cash-front limit</p>
            </div>

            {sourcing.unlocked ? (
              <>
                <Money amount={sourcing.limit} size="xl" tone="action" />
                <p className="text-[13px] text-ink-soft leading-snug mt-2">
                  You can cover orders up to this amount when a restaurant does not respond. Every naira comes
                  back on delivery, plus a bonus.
                </p>
                {sourcing.nextLimit && sourcing.deliveriesToNextTier !== null && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[12px] font-bold text-ink-faint mb-1.5">
                      <span>Next: {money(sourcing.nextLimit)}</span>
                      <span className="tnum">{sourcing.deliveriesToNextTier} to go</span>
                    </div>
                    <ProgressBar
                      value={sourcing.deliveriesCompleted}
                      max={sourcing.deliveriesCompleted + sourcing.deliveriesToNextTier}
                      tone="cash"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-[13px] text-ink-soft leading-relaxed">
                  Complete {sourcing.deliveriesToNextTier ?? 3} more deliver
                  {(sourcing.deliveriesToNextTier ?? 3) === 1 ? 'y' : 'ies'} to unlock covering orders yourself —
                  it pays a bonus on top of the delivery fee.
                </p>
                {sourcing.deliveriesToNextTier !== null && (
                  <div className="mt-3">
                    <ProgressBar
                      value={sourcing.deliveriesCompleted}
                      max={sourcing.deliveriesCompleted + sourcing.deliveriesToNextTier}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        <Card className="py-1">
          <Row icon={Wallet} label="Wallet and cashouts" onClick={() => navigate('/earnings')} />
          <div className="h-px bg-line mx-4" />
          <Row icon={Bike} label="Vehicle" value={VEHICLE_LABEL[rider?.vehicleType ?? ''] ?? 'Not set'} />
          <div className="h-px bg-line mx-4" />
          <Row icon={GraduationCap} label="School" value={rider?.campus?.school ?? 'Not set'} />
        </Card>

        {/* Installing is what makes push notifications work on iOS at all —
            a Safari tab gets none, so a rider who never installs is a rider
            who only sees jobs when the app happens to be open. */}
        {!installed && (
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-action-tint flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-action" aria-hidden />
              </div>
              <div>
                <p className="font-bold text-[15px]">Install the app</p>
                <p className="text-[13px] text-ink-soft leading-snug mt-0.5">
                  Add Blorbmart Rider to your home screen so job alerts reach you when the app is closed. On
                  iPhone: Share, then <span className="font-semibold">Add to Home Screen</span>. On Android:
                  menu, then <span className="font-semibold">Install app</span>.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="py-1">
          <Row
            icon={LifeBuoy}
            label="Get help"
            onClick={() => {
              window.location.href = 'mailto:support@blorbmart.shop?subject=Rider%20support'
            }}
          />
        </Card>

        <Button
          variant="outline"
          size="lg"
          fullWidth
          icon={LogOut}
          onClick={async () => {
            await logout()
            navigate('/join', { replace: true })
          }}
        >
          Sign out
        </Button>

        <p className="text-center text-[12px] text-ink-faint pt-2 pb-4">Blorbmart · Powering students</p>
      </main>
    </div>
  )
}
