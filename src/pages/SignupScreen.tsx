import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { auth } from '../lib/firebase'
import { riderApi, errorMessage } from '../lib/api'
import { useRider } from '../contexts/RiderContext'
import { Button, Field } from '../components/ui'
import { BoltMark, GlowField } from '../components/art'

const schema = z.object({
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
    <div className="relative min-h-screen bg-void overflow-hidden">
      <GlowField tone="mixed" className="h-[420px] bottom-auto" />
      <div className="absolute inset-x-0 top-0 h-[420px] dotfield opacity-40" aria-hidden />

      <div className="relative">
        <header className="pad-top-safe px-5 pt-3 pb-2">
          <Link
            to="/join"
            aria-label="Back"
            className="w-11 h-11 -ml-2.5 rounded-2xl flex items-center justify-center cursor-pointer active:bg-white/8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} aria-hidden />
          </Link>
        </header>

        <main className="px-5 pt-6 pb-12">
          <div className="w-14 h-14 rounded-[18px] bg-volt flex items-center justify-center mb-7 shadow-[0_14px_40px_-16px_rgba(175,255,0,0.9)]">
            <BoltMark className="w-6 h-6 text-void" />
          </div>

          <h1 className="font-display text-[38px] leading-[1.02] font-bold tracking-[-0.04em]">
            Let&rsquo;s get you
            <br />
            on the road.
          </h1>
          <p className="mt-3 text-[16px] text-ink-soft leading-relaxed">
            Start with the basics. School and vehicle details come next — about two minutes in total.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-9 space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="First name"
                autoComplete="given-name"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Field
                label="Surname"
                autoComplete="family-name"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
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
              <Button type="submit" variant="volt" size="lg" fullWidth loading={busy} iconRight={ArrowRight}>
                Continue
              </Button>
            </div>

            <p className="text-center text-[13px] text-ink-faint pt-1">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-volt cursor-pointer">
                Sign in
              </Link>
            </p>
          </form>
        </main>
      </div>
    </div>
  )
}
