import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  Bike,
  Car,
  CheckCircle2,
  Footprints,
  IdCard,
  PartyPopper,
  Zap,
} from 'lucide-react'
import { riderApi, errorMessage, type OnboardingStep, type VehicleType } from '../lib/api'
import { useRider } from '../contexts/RiderContext'
import { Button, Field, SelectField, cn } from '../components/ui'

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

const VEHICLES: { value: VehicleType; label: string; note: string; icon: typeof Bike }[] = [
  { value: 'foot', label: 'On foot', note: 'Great for hostel-to-hostel runs', icon: Footprints },
  { value: 'bicycle', label: 'Bicycle', note: 'Fast across campus', icon: Bike },
  { value: 'bike', label: 'Motorcycle', note: 'Longer runs, more per trip', icon: Bike },
  { value: 'car', label: 'Car', note: 'Big orders and bad weather', icon: Car },
]

const ID_TYPES = ['Student ID', "National ID (NIN)", "Driver's licence", 'Voter card', 'International passport']

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
  const current: OnboardingStep = rider?.onboardingStep && rider.onboardingStep !== 'done'
    ? rider.onboardingStep
    : 'campus'
  const stepIndex = Math.max(0, ORDER.indexOf(current))

  const [school, setSchool] = useState(rider?.campus?.school ?? '')
  const [department, setDepartment] = useState(rider?.campus?.department ?? '')
  const [level, setLevel] = useState(rider?.campus?.level ?? '')
  const [matricNumber, setMatricNumber] = useState(rider?.campus?.matricNumber ?? '')

  const [vehicleType, setVehicleType] = useState<VehicleType | null>(rider?.vehicleType ?? null)
  const [plateNumber, setPlateNumber] = useState(rider?.plateNumber ?? '')

  const [idType, setIdType] = useState(ID_TYPES[0])
  const [idNumber, setIdNumber] = useState('')

  const [fieldError, setFieldError] = useState<string | null>(null)

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
      <div className="min-h-screen bg-brand text-white flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 220 }}
          className="w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center mb-6"
        >
          <PartyPopper className="w-10 h-10" aria-hidden />
        </motion.div>
        <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em]">
          You&rsquo;re in.
        </h1>
        <p className="mt-3 text-white/80 leading-relaxed max-w-xs">
          Flip yourself online and orders will start arriving. Your first three deliveries unlock the higher
          earnings.
        </p>
        <div className="mt-8 w-full max-w-sm">
          <Button variant="action" size="lg" fullWidth icon={Zap} onClick={finish}>
            Take me to the jobs
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="pad-top-safe px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-4">
          {ORDER.map((step, index) => (
            <div
              key={step}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                index <= stepIndex ? 'bg-brand' : 'bg-line',
              )}
            />
          ))}
        </div>
        <p className="text-[13px] font-bold text-ink-faint">
          Step {stepIndex + 1} of {ORDER.length}
        </p>
      </header>

      <main className="flex-1 px-5 pb-8">
        <AnimatePresence mode="wait">
          {current === 'campus' && (
            <motion.div key="campus" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
              <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.03em]">Where do you school?</h1>
              <p className="mt-2 text-ink-soft">
                We use this to send you orders near your campus.
              </p>

              <div className="mt-7 space-y-4">
                <Field
                  label="School"
                  placeholder="e.g. Osun State University"
                  value={school}
                  onChange={(event) => setSchool(event.target.value)}
                  error={fieldError ?? undefined}
                />
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

              <div className="mt-7">
                <Button
                  variant="action"
                  size="lg"
                  fullWidth
                  loading={busy}
                  icon={ArrowRight}
                  disabled={school.trim().length < 2}
                  onClick={() => save('campus', { school, department, level, matricNumber })}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {current === 'vehicle' && (
            <motion.div key="vehicle" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
              <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.03em]">How do you get around?</h1>
              <p className="mt-2 text-ink-soft">On foot counts. On a busy campus it is often the fastest.</p>

              <div className="mt-7 space-y-3">
                {VEHICLES.map((vehicle) => {
                  const selected = vehicleType === vehicle.value
                  return (
                    <button
                      key={vehicle.value}
                      onClick={() => setVehicleType(vehicle.value)}
                      aria-pressed={selected}
                      className={cn(
                        'w-full min-h-[68px] flex items-center gap-4 px-4 rounded-2xl border-2 text-left cursor-pointer',
                        'transition-colors duration-150',
                        selected ? 'border-brand bg-brand-tint' : 'border-line bg-surface active:bg-canvas',
                      )}
                    >
                      <div
                        className={cn(
                          'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                          selected ? 'bg-brand text-white' : 'bg-canvas text-ink-soft',
                        )}
                      >
                        <vehicle.icon className="w-5 h-5" aria-hidden />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[15px]">{vehicle.label}</p>
                        <p className="text-[13px] text-ink-soft">{vehicle.note}</p>
                      </div>
                      {selected && <CheckCircle2 className="w-5 h-5 text-brand shrink-0" aria-hidden />}
                    </button>
                  )
                })}
              </div>

              {/* Only motorised vehicles have a plate. Asking every rider for
                  one is a dead end for anyone delivering on foot. */}
              {(vehicleType === 'bike' || vehicleType === 'car') && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                  <Field
                    label="Plate number"
                    placeholder="ABC 123 XY"
                    value={plateNumber}
                    onChange={(event) => setPlateNumber(event.target.value.toUpperCase())}
                    error={fieldError ?? undefined}
                  />
                </motion.div>
              )}

              <div className="mt-7">
                <Button
                  variant="action"
                  size="lg"
                  fullWidth
                  loading={busy}
                  icon={ArrowRight}
                  disabled={!vehicleType || ((vehicleType === 'bike' || vehicleType === 'car') && !plateNumber.trim())}
                  onClick={() => save('vehicle', { vehicleType, plateNumber })}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {current === 'identity' && (
            <motion.div key="identity" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
              <div className="w-12 h-12 rounded-2xl bg-brand-tint flex items-center justify-center mb-5">
                <IdCard className="w-6 h-6 text-brand" aria-hidden />
              </div>
              <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.03em]">One ID and you&rsquo;re done.</h1>
              <p className="mt-2 text-ink-soft leading-relaxed">
                Customers are handing you their food and sometimes their money. This is how we know who is on
                the road.
              </p>

              <div className="mt-7 space-y-4">
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

              <div className="mt-7">
                <Button
                  variant="action"
                  size="lg"
                  fullWidth
                  loading={busy}
                  icon={ArrowRight}
                  disabled={!idNumber.trim()}
                  onClick={() => save('identity', { idType, idNumber })}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {current === 'payout' && (
            <motion.div key="payout" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
              <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.03em]">That&rsquo;s everything.</h1>
              <p className="mt-2 text-ink-soft leading-relaxed">
                You can add your bank account now or later — you only need it the first time you cash out.
                Nothing is stopping you from taking a job right away.
              </p>

              <div className="mt-6 bg-cash-tint rounded-[var(--radius-card)] p-5">
                <p className="font-extrabold text-[15px] text-cash-deep mb-1">Your money is separate</p>
                <p className="text-[13px] text-ink-soft leading-relaxed">
                  Earnings and any cash you front for an order are tracked apart from each other, so you can
                  always see exactly what you made and exactly what you are owed back.
                </p>
              </div>

              <div className="mt-7 space-y-3">
                <Button variant="action" size="lg" fullWidth loading={busy} icon={ArrowRight} onClick={() => save('payout', {})}>
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
