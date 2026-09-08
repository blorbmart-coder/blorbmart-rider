import axios, { AxiosError } from 'axios'
import { auth } from './firebase'

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://blorbmart.onrender.com'

const api = axios.create({ baseURL: BASE_URL, timeout: 30000 })

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Turns any failure into one sentence a rider can act on.
 *
 * This app is read one-handed, outdoors, often at a restaurant counter with
 * somebody waiting. A raw Axios message ("Request failed with status code
 * 409") tells a rider nothing about whether to wait, retry, or walk away, so
 * the server's own message wins wherever there is one — the backend writes
 * them for exactly this screen.
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.') {
  const axiosError = error as AxiosError<{ message?: string }>
  if (axiosError?.response?.data?.message) return axiosError.response.data.message
  if (axiosError?.code === 'ECONNABORTED') return 'That took too long. Check your connection.'
  if (axiosError?.message === 'Network Error') return 'No connection. We will retry when you are back online.'
  return fallback
}

export function errorStatus(error: unknown): number | null {
  return (error as AxiosError)?.response?.status ?? null
}

export type RiderStatus = 'onboarding' | 'pending' | 'active' | 'suspended' | 'rejected'
export type VehicleType = 'foot' | 'bicycle' | 'bike' | 'car'
export type OnboardingStep = 'campus' | 'vehicle' | 'identity' | 'payout' | 'done'

export interface SourcingProgress {
  limit: number
  unlocked: boolean
  deliveriesCompleted: number
  nextLimit: number | null
  deliveriesToNextTier: number | null
}

export interface University {
  id: string
  name: string
  shortName: string
  state: string | null
  city: string | null
  /** The "my school is not listed" option, which opens the bills-only app. */
  billsOnly: boolean
  description?: string
}

export interface UniversityCatalog {
  universities: University[]
  billsOnly: University
  /** Campuses in display order with the bills-only option appended last. */
  options: University[]
}

export interface Rider {
  uid: string
  firstName?: string
  lastName?: string
  displayName?: string
  email?: string | null
  phone?: string | null
  campus?: {
    school: string
    /** Canonical campus id from the registry — the value orders are matched on. */
    universityId?: string | null
    department?: string | null
    level?: string | null
    matricNumber?: string | null
  } | null
  vehicleType?: VehicleType | null
  plateNumber?: string | null
  documents?: { idType: string; idNumber: string } | null
  onboardingStep: OnboardingStep
  onboardingComplete: boolean
  status: RiderStatus
  isAvailable: boolean
  online: boolean
  rating: number
  deliveriesCompleted: number
  sourcing: SourcingProgress
}

export interface OfferPayout {
  deliveryEarning: number
  potentialSourcingBonus: number
  cashToPay: number
  maxEarnings: number
}

export interface Offer {
  id: string
  orderId: string
  status: string
  itemCount: number
  itemSummary: string[]
  pickup: { storeName: string; area: string | null; latitude: number | null; longitude: number | null }
  dropoff: { area: string; latitude: number | null; longitude: number | null }
  distanceKm: number | null
  payout: OfferPayout
  subtotal: number
  deliveryFee: number
  vendorAccepted: boolean
  sourcingUnlocksAt: string | null
  expiresAt: string | null
  createdAt: string | null
  eligibility?: {
    canDeliver: boolean
    canSource: boolean
    sourcingLimit: number
    blockedReason: 'restaurant_accepted' | 'restaurant_window' | 'limit_too_low' | null
  }
}

export type DeliveryStatus =
  | 'assigned'
  | 'at_store'
  | 'paid_vendor'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled'

export interface Delivery {
  id: string
  orderId: string
  orderDocId: string
  mode: 'delivery' | 'sourcing'
  settlement: 'vendor' | 'rider'
  status: DeliveryStatus
  pickup: {
    storeName: string
    phone: string | null
    address: string | null
    city: string | null
    latitude: number | null
    longitude: number | null
  }
  dropoff: {
    name: string
    phone: string | null
    addressLine1: string
    landmark: string | null
    city: string | null
    latitude: number | null
    longitude: number | null
    notes: string | null
  }
  items: { name: string; quantity: number; note: string | null }[]
  payout: {
    deliveryEarning: number
    sourcingBonus: number
    earnings: number
    reimbursement: number
    /** Quoted by the server so the app never recomputes the bonus formula. */
    potentialSourcingBonus: number
  }
  cashToPay: number
  cashPaidAmount: number
  sourcingUnlocksAt: string | null
  settledAmount?: number
  settledEarnings?: number
  createdAt?: string
  deliveredAt?: string
}

export interface RiderWallet {
  walletId: string
  availableBalance: number
  cashOutstanding: number
  totalEarned: number
  totalReimbursed: number
  deliveriesCompleted: number
  isWithdrawalEnabled: boolean
  pinSet: boolean
  minWithdrawal: number
  bankAccount: BankAccount | null
}

export interface BankAccount {
  id: string
  bankCode: string
  bankName: string
  accountName: string
  accountMasked: string | null
  isVerified: boolean
}

export interface Earnings {
  earningsToday: number
  earningsWeek: number
  earningsMonth: number
  deliveriesToday: number
  deliveriesWeek: number
  averagePerDelivery: number
  streakDays: number
  availableBalance: number
  cashOutstanding: number
  totalEarned: number
  lifetimeDeliveries: number
  rating: number
  sourcing: SourcingProgress | null
}

export interface WalletTransaction {
  id: string
  type: 'delivery_earning' | 'sourcing_bonus' | 'reimbursement' | 'tip' | 'bonus' | 'adjustment' | 'debit' | 'reversal'
  direction: 'in' | 'out'
  amount: number
  balanceAfter: number
  countsAsEarning: boolean
  description: string
  orderId: string | null
  createdAt: { _seconds?: number } | string | null
}

export interface Withdrawal {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  bankName: string | null
  accountMasked: string | null
  failureReason?: string | null
  initiatedAt: { _seconds?: number } | string | null
}

const unwrap = <T,>(promise: Promise<{ data: { data: T } }>) => promise.then((res) => res.data.data)

export const riderApi = {
  /**
   * Given its own, longer timeout.
   *
   * This is the first request a new rider's device ever makes, and it lands on
   * a host that idles down when nobody is ordering. A cold start there
   * regularly runs past the 30s default — and a timeout here is expensive in a
   * way a timeout anywhere else is not, because the Firebase account has
   * already been created by the time it fires. Waiting a minute is strictly
   * better than stranding somebody mid-signup.
   */
  register: (body: { firstName: string; lastName: string; phone: string; referralCode?: string }) =>
    unwrap<Rider>(api.post('/api/rider/register', body, { timeout: 60000 })),

  universities: () =>
    unwrap<UniversityCatalog>(api.get('/api/universities', { timeout: 20000 })),

  me: () => unwrap<{ rider: Rider; wallet: Pick<RiderWallet, 'availableBalance' | 'cashOutstanding' | 'totalEarned' | 'pinSet'> }>(
    api.get('/api/rider/me'),
  ),

  saveStep: (step: OnboardingStep, payload: Record<string, unknown>) =>
    unwrap<Rider>(api.post(`/api/rider/onboarding/${step}`, payload)),

  setAvailability: (isAvailable: boolean, location?: GeolocationCoordinates | null) =>
    unwrap<Rider>(
      api.post('/api/rider/availability', {
        isAvailable,
        location: location ? { latitude: location.latitude, longitude: location.longitude } : null,
      }),
    ),

  heartbeat: (location?: GeolocationCoordinates | null) =>
    api.post('/api/rider/heartbeat', {
      location: location ? { latitude: location.latitude, longitude: location.longitude } : null,
    }),

  registerDevice: (token: string, platform: string) =>
    api.post('/api/rider/device-token', { token, platform }),

  offers: () => unwrap<{ offers: Offer[]; sourcingLimit: number }>(api.get('/api/rider/offers')),
  acceptOffer: (offerId: string) => unwrap<Delivery>(api.post(`/api/rider/offers/${offerId}/accept`)),
  declineOffer: (offerId: string) => api.post(`/api/rider/offers/${offerId}/decline`),

  activeDelivery: () => unwrap<Delivery | null>(api.get('/api/rider/deliveries/active')),
  deliveries: (limit = 30) => unwrap<Delivery[]>(api.get('/api/rider/deliveries', { params: { limit } })),
  delivery: (id: string) => unwrap<Delivery>(api.get(`/api/rider/deliveries/${id}`)),

  arrived: (id: string) => unwrap<Delivery>(api.post(`/api/rider/deliveries/${id}/arrived`)),
  claimSourcing: (id: string) => unwrap<Delivery>(api.post(`/api/rider/deliveries/${id}/claim-sourcing`)),
  confirmPaid: (id: string) => unwrap<Delivery>(api.post(`/api/rider/deliveries/${id}/paid`)),
  pickup: (id: string) => unwrap<Delivery>(api.post(`/api/rider/deliveries/${id}/pickup`)),
  onTheWay: (id: string) => unwrap<Delivery>(api.post(`/api/rider/deliveries/${id}/on-the-way`)),
  deliver: (id: string, pin: string) =>
    unwrap<{ verified: boolean; settlement: { earnings: number; reimbursement: number; totalCredited: number } }>(
      api.post(`/api/rider/deliveries/${id}/deliver`, { pin }),
    ),
  cancel: (id: string, reason: string) =>
    unwrap<{ needsCashReview: boolean }>(api.post(`/api/rider/deliveries/${id}/cancel`, { reason })),

  wallet: () => unwrap<RiderWallet>(api.get('/api/rider/wallet')),
  earnings: () => unwrap<Earnings>(api.get('/api/rider/earnings')),
  transactions: (cursor?: string | null) =>
    unwrap<{ transactions: WalletTransaction[]; nextCursor: string | null }>(
      api.get('/api/rider/wallet/transactions', { params: { cursor: cursor ?? undefined } }),
    ),

  setPin: (pin: string) => api.post('/api/rider/wallet/pin/setup', { pin }),
  changePin: (currentPin: string, newPin: string) =>
    api.post('/api/rider/wallet/pin/change', { currentPin, newPin }),

  banks: () => unwrap<{ name: string; code: string }[]>(api.get('/api/rider/wallet/banks')),
  verifyBank: (bankCode: string, accountNumber: string) =>
    unwrap<{ accountName: string; bankName: string }>(
      api.post('/api/rider/wallet/bank-account/verify', { bankCode, accountNumber }),
    ),
  saveBank: (bankCode: string, accountNumber: string) =>
    unwrap<BankAccount>(api.post('/api/rider/wallet/bank-account', { bankCode, accountNumber })),
  removeBank: () => api.delete('/api/rider/wallet/bank-account'),

  withdraw: (amount: number, pin: string) =>
    unwrap<Withdrawal>(api.post('/api/rider/wallet/withdraw', { amount, pin })),
  withdrawals: () => unwrap<Withdrawal[]>(api.get('/api/rider/wallet/withdrawals')),
}

export default api
