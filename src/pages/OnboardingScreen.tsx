import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  Bike,
  Car,
  Check,
  Footprints,
  IdCard,
  Power,
  ShieldCheck,
} from 'lucide-react'
import { riderApi, errorMessage, type OnboardingStep, type University, type VehicleType } from '../lib/api'
import { useRider } from '../contexts/RiderContext'
import { Button, Field, IconBadge, SelectField, cn } from '../components/ui'
import { BurstScene, GlowField } from '../components/art'

/**
 * Onboarding.
 *
 * Every step commits to the server the moment it is completed, and the server
 * remembers which step that was. A student on a bad connection who closes the
 * tab reopens on the step they stopped at with everything they typed still
 * there — the alternative, holding four steps in memory and saving at the
 * end, loses the whole thing to one dropped request and asks them to start
 * over. That is the point where people give up.
 */

const ORDER: OnboardingStep[] = ['campus', 'vehicle', 'identity', 'payout']

const STEP_TITLES: Record<string, string> = {
  campus: 'Campus',
  vehicle: 'Vehicle',
  identity: 'ID',
  payout: 'Done',
}

const VEHICLES: { value: VehicleType; label: string; note: string; icon: typeof Bike }[] = [
  { value: 'foot', label: 'On foot', note: 'Great for hostel-to-hostel runs', icon: Footprints },
  { value: 'bicycle', label: 'Bicycle', note: 'Fast across campus', icon: Bike },
  { value: 'bike', label: 'Motorcycle', note: 'Longer runs, more per trip', icon: Bike },
  { value: 'car', label: 'Car', note: 'Big orders and bad weather', icon: Car },
]

const ID_TYPES = ['Student ID', 'National ID (NIN)', "Driver's licence", 'Voter card', 'International passport']

const slide = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
}

export default function OnboardingScreen() {
  const navigate = useNavigate()
  const { rider, setRider, refresh } = useRider()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  // Resume exactly where the server says they stopped.
  const current: OnboardingStep = rider?.onboardingStep && ORDER.includes(rider.onboardingStep)
    ? rider.onboardingStep
    : 'campus'
  const stepIndex = Math.max(0, ORDER.indexOf(current))

  const [universityId, setUniversityId] = useState(rider?.campus?.universityId ?? '')
  const [department, setDepartment] = useState(rider?.campus?.department ?? '')
  const [level, setLevel] = useState(rider?.campus?.level ?? '')
  const [matricNumber, setMatricNumber] = useState(rider?.campus?.matricNumber ?? '')

  const [vehicleType, setVehicleType] = useState<VehicleType | null>(rider?.vehicleType ?? null)
  const [plateNumber, setPlateNumber] = useState(rider?.plateNumber ?? '')

  const [idType, setIdType] = useState(ID_TYPES[0])
  const [idNumber, setIdNumber] = useState('')

  const [fieldError, setFieldError] = useState<string | null>(null)

  /**
   * The campus list comes from the backend, never from a constant in here.
   *
   * There is no offline fallback on purpose. If this request cannot complete,
   * neither can the request that saves the step — so a baked-in list would buy
   * nothing except the chance to show a school the server would then reject.
   */
  const [campuses, setCampuses] = useState<University[]>([])

  useEffect(() => {
    let cancelled = false
    riderApi
      .universities()
      .then((catalog) => {
        if (!cancelled) setCampuses(catalog.universities)
      })
      .catch(() => {
        if (!cancelled) setFieldError('Could not load the school list. Check your connection and retry.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = async (step: OnboardingStep, payload: Record<string, unknown>) => {
    setBusy(true)
    setFieldError(null)
    try {
      const updated = await riderApi.saveStep(step, payload)
      setRider(updated)
      if (step === 'payout') {
        setDone(true)
      }
    } catch (error) {
      const message = errorMessage(error, 'Could not save that. Try again.')
      setFieldError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    await refresh()
    navigate('/', { replace: true })
  }

  if (done) {
    return (
      <div className="relative min-h-screen bg-void flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <GlowField tone="volt" />
        <div className="absolute inset-0 dotfield opacity-40" aria-hidden />

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 220 }}
          className="relative w-40 h-40"
        >
          <BurstScene className="w-full h-full" />
        </motion.div>

        <h1 className="relative font-display text-[42px] leading-[0.98] font-bold tracking-[-0.045em] mt-2">
          You&rsquo;re in.
        </h1>
        <p className="relative mt-4 text-ink-soft leading-relaxed max-w-xs">
          Flip yourself online and orders start arriving. Your first three deliveries unlock the higher earnings.
        </p>
        <div className="relative mt-9 w-full max-w-sm">
          <Button variant="volt" size="lg" fullWidth icon={Power} onClick={finish}>
            Take me to the jobs
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-void flex flex-col overflow-hidden">
      <GlowField tone="iris" className="h-[380px] bottom-auto" />

      <header className="relative pad-top-safe px-5 pt-5 pb-4">
        {/* The steps are named, not just counted. "Step 2 of 4" tells a
            student nothing about what is left; "Vehicle, then ID, then done"
            tells them it is nearly over. */}
        <ol className="flex items-center gap-2">
          {ORDER.map((step, index) => (
            <li key={step} className="flex-1">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-colors duration-500',
                  index < stepIndex ? 'bg-volt' : index === stepIndex ? 'bg-volt' : 'bg-line',
                )}
              />
              <p
                className={cn(
                  'text-[10px] font-bold uppercase tracking-[0.08em] mt-2 transition-colors',
                  index <= stepIndex ? 'text-ink-soft' : 'text-ink-faint',
                )}
              >
                {STEP_TITLES[step]}
              </p>
            </li>
          ))}
        </ol>
      </header>

      <main className="relative flex-1 px-5 pb-10">
        <AnimatePresence mode="wait">
          {current === 'campus' && (
            <motion.div
              key="campus"
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22 }}
            >
              <h1 className="font-display text-[32px] leading-[1.05] font-bold tracking-[-0.04em] mt-4">
                Where do you school?
              </h1>
              <p className="mt-3 text-ink-soft leading-relaxed">
                We use this to send you orders near your campus.
              </p>

              <div className="mt-8 space-y-4">
                {/* A picker, not a text box. The school a rider types has to
                    match the school a vendor tagged their store with for an
                    order ever to reach them, and free text guarantees it will
                    not: "LAUTECH", "Lautech Ogbomoso" and "ladoke akintola"
                    are three campuses as far as an equality filter is
                    concerned. */}
                <SelectField
                  label="School"
                  value={universityId}
                  onChange={(event) => setUniversityId(event.target.value)}
                  error={fieldError ?? undefined}
                  disabled={campuses.length === 0}
                >
                  <option value="">
                    {campuses.length === 0 ? 'Loading schools…' : 'Select your school'}
                  </option>
                  {campuses.map((campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                      {campus.shortName && campus.shortName !== campus.name ? ` (${campus.shortName})` : ''}
                    </option>
                  ))}
                </SelectField>

                {/* Riders are dispatched from one campus, so there is no
                    bills-only option here as there is for buyers. Saying so
                    beats letting somebody hunt the list for their school. */}
                <p className="text-[13px] text-ink-faint leading-relaxed -mt-1">
                  Only the campuses we deliver on are listed. We add more as we open them.
                </p>
                <Field
                  label="Department (optional)"
                  placeholder="e.g. Computer Science"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Level (optional)"
                    placeholder="300"
                    inputMode="numeric"
                    value={level}
                    onChange={(event) => setLevel(event.target.value)}
                  />
                  <Field
                    label="Matric no. (optional)"
                    value={matricNumber}
                    onChange={(event) => setMatricNumber(event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-8">
                <Button
                  variant="volt"
                  size="lg"
                  fullWidth
                  loading={busy}
                  iconRight={ArrowRight}
                  disabled={!universityId}
                  onClick={() => save('campus', { universityId, department, level, matricNumber })}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {current === 'vehicle' && (
            <motion.div
              key="vehicle"
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22 }}
            >
              <h1 className="font-display text-[32px] leading-[1.05] font-bold tracking-[-0.04em] mt-4">
                How do you get around?
              </h1>
              <p className="mt-3 text-ink-soft leading-relaxed">
                On foot counts. On a busy campus it is often the fastest.
              </p>

              <div className="mt-8 space-y-3">
                {VEHICLES.map((vehicle) => {
                  const selected = vehicleType === vehicle.value
                  return (
                    <button
                      key={vehicle.value}
                      onClick={() => setVehicleType(vehicle.value)}
                      aria-pressed={selected}
                      className={cn(
                        'w-full min-h-[74px] flex items-center gap-4 px-4 rounded-[20px] border text-left cursor-pointer',
                        'transition-all duration-200 active:scale-[0.99]',
                        selected
                          ? 'border-volt/40 bg-volt/8 shadow-[0_12px_36px_-20px_rgba(175,255,0,0.9)]'
                          : 'border-line bg-surface active:bg-raised',
                      )}
                    >
                      <span
                        className={cn(
                          'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors',
                          selected ? 'bg-volt text-void' : 'bg-raised text-ink-soft',
                        )}
                      >
                        <vehicle.icon className="w-5 h-5" strokeWidth={2.3} aria-hidden />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-[15px]">{vehicle.label}</span>
                        <span className="block text-[13px] text-ink-soft mt-0.5">{vehicle.note}</span>
                      </span>
                      {selected && (
                        <span className="w-6 h-6 rounded-full bg-volt flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-void" strokeWidth={3.5} aria-hidden />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Only motorised vehicles have a plate. Asking every rider for
                  one is a dead end for anyone delivering on foot. */}
              {(vehicleType === 'bike' || vehicleType === 'car') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 overflow-hidden"
                >
                  <Field
                    label="Plate number"
                    placeholder="ABC 123 XY"
                    value={plateNumber}
                    onChange={(event) => setPlateNumber(event.target.value.toUpperCase())}
                    error={fieldError ?? undefined}
                  />
                </motion.div>
              )}

              <div className="mt-8">
                <Button
                  variant="volt"
                  size="lg"
                  fullWidth
                  loading={busy}
                  iconRight={ArrowRight}
                  disabled={!vehicleType || ((vehicleType === 'bike' || vehicleType === 'car') && !plateNumber.trim())}
                  onClick={() => save('vehicle', { vehicleType, plateNumber })}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {current === 'identity' && (
            <motion.div
              key="identity"
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22 }}
            >
              <IconBadge icon={IdCard} tone="iris" size="lg" className="mt-4" />
              <h1 className="font-display text-[32px] leading-[1.05] font-bold tracking-[-0.04em] mt-5">
                One ID and you&rsquo;re done.
              </h1>
              <p className="mt-3 text-ink-soft leading-relaxed">
                Customers are handing you their food and sometimes their money. This is how we know who is on the
                road.
              </p>

              <div className="mt-8 space-y-4">
                <SelectField label="ID type" value={idType} onChange={(event) => setIdType(event.target.value)}>
                  {ID_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </SelectField>
                <Field
                  label="ID number"
                  value={idNumber}
                  onChange={(event) => setIdNumber(event.target.value)}
                  error={fieldError ?? undefined}
                />
              </div>

              <div className="mt-8">
                <Button
                  variant="volt"
                  size="lg"
                  fullWidth
                  loading={busy}
                  iconRight={ArrowRight}
                  disabled={!idNumber.trim()}
                  onClick={() => save('identity', { idType, idNumber })}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {current === 'payout' && (
            <motion.div
              key="payout"
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22 }}
            >
              <h1 className="font-display text-[32px] leading-[1.05] font-bold tracking-[-0.04em] mt-4">
                That&rsquo;s everything.
              </h1>
              <p className="mt-3 text-ink-soft leading-relaxed">
                You can add your bank account now or later — you only need it the first time you cash out. Nothing
                is stopping you from taking a job right away.
              </p>

              <div className="mt-7 rounded-[var(--radius-card)] bg-volt/8 border border-volt/25 p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <ShieldCheck className="w-5 h-5 text-volt shrink-0" strokeWidth={2.4} aria-hidden />
                  <p className="font-display font-bold text-[16px] text-volt tracking-[-0.02em]">
                    Your money is separate
                  </p>
                </div>
                <p className="text-[13px] text-ink-soft leading-relaxed">
                  Earnings and any cash you front for an order are tracked apart from each other, so you can
                  always see exactly what you made and exactly what you are owed back.
                </p>
              </div>

              <div className="mt-8">
                <Button
                  variant="volt"
                  size="lg"
                  fullWidth
                  loading={busy}
                  iconRight={ArrowRight}
                  onClick={() => save('payout', {})}
                >
                  Finish and go online
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
