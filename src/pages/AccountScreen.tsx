import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Bike,
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
import { Button, Card, Chip, IconBadge, Money, ProgressBar, Row } from '../components/ui'
import { BrandMark, GlowField } from '../components/art'
import { initials, money } from '../lib/format'

const VEHICLE_LABEL: Record<string, string> = {
  foot: 'On foot',
  bicycle: 'Bicycle',
  bike: 'Motorcycle',
  car: 'Car',
}

export default function AccountScreen() {
  const navigate = useNavigate()
  const { rider, logout } = useRider()
  const installed = useInstalled()

  const { data: earnings } = useQuery({ queryKey: ['earnings'], queryFn: riderApi.earnings })
  const sourcing = rider?.sourcing

  return (
    <div>
      <header className="relative overflow-hidden pad-top-safe px-5 pt-6 pb-7 grain">
        <GlowField tone="iris" />
        <div className="absolute inset-0 dotfield opacity-50" aria-hidden />

        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-[68px] h-[68px] rounded-[22px] bg-raised border border-line flex items-center justify-center font-display text-[22px] font-bold">
              {initials(rider?.displayName)}
            </div>
            {rider?.status === 'active' && (
              <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-surface flex items-center justify-center border-[3px] border-void">
                <BrandMark className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[24px] leading-tight font-bold tracking-[-0.03em] truncate">
              {rider?.displayName || 'Rider'}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[13px] font-bold text-ink-soft">
                <Star className="w-3.5 h-3.5 fill-gold text-gold" aria-hidden />
                {(rider?.rating ?? 5).toFixed(1)}
              </span>
              {rider?.status === 'active' && (
                <Chip tone="volt" icon={BadgeCheck}>
                  Verified
                </Chip>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card variant="raised" className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint mb-2">Deliveries</p>
            <p className="font-display tnum text-[26px] leading-none font-bold">
              {earnings?.lifetimeDeliveries ?? 0}
            </p>
          </Card>
          <Card variant="raised" className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint mb-2">Earned</p>
            <Money amount={earnings?.totalEarned ?? 0} size="lg" tone="volt" />
          </Card>
        </div>

        {/* The trust ladder, stated plainly. A limit a rider understands is a
            goal; a limit they only discover as a rejection is a bug report. */}
        {sourcing && (
          <Card variant="solid" className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <IconBadge icon={HandCoins} tone="ember" size="sm" />
              <p className="font-display font-bold text-[16px] tracking-[-0.02em]">Cash-front limit</p>
            </div>

            {sourcing.unlocked ? (
              <>
                <Money amount={sourcing.limit} size="xl" tone="ember" />
                <p className="text-[13px] text-ink-soft leading-relaxed mt-3">
                  You can cover orders up to this amount when a restaurant does not respond. Every naira comes
                  back on delivery, plus a bonus.
                </p>
                {sourcing.nextLimit && sourcing.deliveriesToNextTier !== null && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-[12px] font-bold text-ink-faint mb-2">
                      <span>Next: {money(sourcing.nextLimit)}</span>
                      <span className="tnum">{sourcing.deliveriesToNextTier} to go</span>
                    </div>
                    <ProgressBar
                      value={sourcing.deliveriesCompleted}
                      max={sourcing.deliveriesCompleted + sourcing.deliveriesToNextTier}
                      tone="ember"
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
                  <div className="mt-4">
                    <ProgressBar
                      value={sourcing.deliveriesCompleted}
                      max={sourcing.deliveriesCompleted + sourcing.deliveriesToNextTier}
                      tone="ember"
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        <Card variant="solid" className="py-1.5 overflow-hidden">
          <Row icon={Wallet} label="Wallet and cashouts" tone="volt" onClick={() => navigate('/earnings')} />
          <div className="h-px bg-line-soft mx-4" />
          <Row icon={Bike} label="Vehicle" value={VEHICLE_LABEL[rider?.vehicleType ?? ''] ?? 'Not set'} />
          <div className="h-px bg-line-soft mx-4" />
          <Row icon={GraduationCap} label="School" value={rider?.campus?.school ?? 'Not set'} />
        </Card>

        {/* Installing is what makes push notifications work on iOS at all —
            a Safari tab gets none, so a rider who never installs is a rider
            who only sees jobs when the app happens to be open. */}
        {!installed && (
          <Card variant="solid" glow="iris" className="p-4">
            <div className="flex items-start gap-3">
              <IconBadge icon={Download} tone="iris" />
              <div className="min-w-0">
                <p className="font-bold text-[15px]">Install the app</p>
                <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
                  Add Blorbmart Rider to your home screen so job alerts reach you when the app is closed. On
                  iPhone: Share, then <span className="font-bold text-ink">Add to Home Screen</span>. On Android:
                  menu, then <span className="font-bold text-ink">Install app</span>.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card variant="solid" className="py-1.5 overflow-hidden">
          <Row
            icon={LifeBuoy}
            label="Get help"
            tone="neutral"
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

        <div className="flex items-center justify-center gap-2 pt-3 pb-4 text-ink-faint">
          <BrandMark className="w-3.5 h-3.5" />
          <p className="text-[12px] font-semibold">Blorbmart · Powering students</p>
        </div>
      </main>
    </div>
  )
}
