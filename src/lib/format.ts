/**
 * Formatting for money, distance and time.
 *
 * Everything here is about being read in a second, at arm's length, by
 * somebody on a bike.
 */

const nairaFull = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Money, always to the naira.
 *
 * Kobo are never shown. No amount in this app is ever settled in kobo, and a
 * trailing ".00" on a headline figure makes it slower to read and no more
 * accurate.
 */
export const money = (amount: number | null | undefined) => nairaFull.format(Number(amount || 0))

/** Naira without the symbol — for placing beside a separately styled currency mark. */
export const amountOnly = (amount: number | null | undefined) =>
  new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(amount || 0))

export const distance = (km: number | null | undefined) => {
  if (km === null || km === undefined || !Number.isFinite(km)) return null
  // Under a kilometre, metres are the unit people actually think in.
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/** A rough walk/ride time, so a rider can judge a job without opening a map. */
export const travelTime = (km: number | null | undefined, vehicle: string | null | undefined) => {
  if (!km || !Number.isFinite(km)) return null
  const speedKmh = vehicle === 'bike' || vehicle === 'car' ? 22 : vehicle === 'bicycle' ? 14 : 5
  const minutes = Math.max(2, Math.round((km / speedKmh) * 60))
  return `${minutes} min`
}

type Firestoreish = { _seconds?: number; seconds?: number } | string | number | Date | null | undefined

export const toDate = (value: Firestoreish): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const seconds = value._seconds ?? value.seconds
  return seconds ? new Date(seconds * 1000) : null
}

export const timeAgo = (value: Firestoreish) => {
  const date = toDate(value)
  if (!date) return ''
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export const clockTime = (value: Firestoreish) => {
  const date = toDate(value)
  if (!date) return ''
  return date.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })
}

/** Seconds remaining until a deadline, floored at zero. */
export const secondsUntil = (value: Firestoreish) => {
  const date = toDate(value)
  if (!date) return 0
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000))
}

export const countdown = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins <= 0) return `${secs}s`
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export const initials = (name: string | null | undefined) =>
  String(name || 'R')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'R'

/**
 * Opens the phone's own map app for turn-by-turn directions.
 *
 * Deliberately not an embedded map: a rider needs their real navigation app
 * with voice guidance while the phone is in a pocket or on a mount, and an
 * in-app map that cannot speak is worse than useless on the road.
 */
export const directionsUrl = (lat: number | null, lng: number | null, label?: string) => {
  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const query = encodeURIComponent(label ? `${lat},${lng}(${label})` : `${lat},${lng}`)
  return `https://www.google.com/maps/dir/?api=1&destination=${query}`
}

export const telUrl = (phone: string | null | undefined) =>
  phone ? `tel:${String(phone).replace(/[^\d+]/g, '')}` : null
