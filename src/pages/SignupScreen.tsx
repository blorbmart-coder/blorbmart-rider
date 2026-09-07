import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Bike } from 'lucide-react'
import { auth } from '../lib/firebase'
import { riderApi, errorMessage } from '../lib/api'
import { useRider } from '../contexts/RiderContext'
import { Button, Field } from '../components/ui'

const schema = z
  .object({
    firstName: z.string().trim().min(2, 'Your first name, please'),
    lastName: z.string().trim().min(2, 'Your surname, please'),
    // Nigerian numbers, local or international. Kept loose enough that a
    // valid number is never rejected — a signup blocked by an over-strict
    // regex is a rider lost with nothing to fix.
    phone: z
      .string()
      .trim()
      .regex(/^(\+?234|0)[789]\d{9}$/, 'Enter a Nigerian number, like 08012345678'),
    email: z.email('Check that email address'),
    password: z.string().min(6, 'At least 6 characters'),
  })

type FormValues = z.infer<typeof schema>

export default function SignupScreen() {
  const navigate = useNavigate()
  const { refresh } = useRider()
  const [busy, setBusy] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' })

  const onSubmit = async (values: FormValues) => {
    setBusy(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, values.email, values.password)
      const displayName = `${values.firstName} ${values.lastName}`.trim()
      await updateProfile(credential.user, { displayName })

      await riderApi.register({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
      })

      await refresh()
      navigate('/onboarding', { replace: true })
    } catch (error) {
      const code = (error as { code?: string })?.code
      if (code === 'auth/email-already-in-use') {
        toast.error('That email already has an account. Sign in instead.')
      } else if (code === 'auth/weak-password') {
        toast.error('Pick a stronger password — at least 6 characters.')
      } else if (code === 'auth/invalid-email') {
        toast.error('Check that email address.')
      } else {
        toast.error(errorMessage(error, 'Could not create your account. Try again.'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="pad-top-safe px-5 pt-3 pb-2">
        <Link
          to="/join"
          aria-label="Back"
          className="w-11 h-11 -ml-2 rounded-xl flex items-center justify-center cursor-pointer active:bg-canvas"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </Link>
      </header>

      <main className="px-5 pt-4 pb-10">
        <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center mb-5">
          <Bike className="w-6 h-6 text-white" aria-hidden />
        </div>

        <h1 className="text-[32px] leading-[1.08] font-extrabold tracking-[-0.03em]">
          Let&rsquo;s get you
          <br />
          on the road.
        </h1>
        <p className="mt-2 text-ink-soft leading-relaxed">
          Start with the basics. School and vehicle details come next — it takes about two minutes in total.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
            <Field label="Surname" autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
          </div>

          <Field
            label="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08012345678"
            hint="Restaurants and customers call this number."
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Field
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 6 characters."
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="pt-2">
            <Button type="submit" variant="action" size="lg" fullWidth loading={busy} icon={ArrowRight}>
              Continue
            </Button>
          </div>

          <p className="text-center text-[13px] text-ink-faint pt-1">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand cursor-pointer">
              Sign in
            </Link>
          </p>
        </form>
      </main>
    </div>
  )
}
