import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { auth } from '../lib/firebase'
import { Button, Field } from '../components/ui'
import { BrandMark, GlowField } from '../components/art'

const schema = z.object({
  email: z.email('Check that email address'),
  password: z.string().min(1, 'Enter your password'),
})

type FormValues = z.infer<typeof schema>

export default function LoginScreen() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password)
      // Where they land is decided by the router once the profile loads —
      // a half-registered rider goes back to onboarding, not to a dashboard
      // with nothing on it.
      navigate('/', { replace: true })
    } catch {
      // Deliberately one message for a wrong password and an unknown email.
      // Distinguishing them tells a stranger which addresses have accounts.
      toast.error('That email and password do not match.')
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async () => {
    const email = getValues('email')?.trim()
    if (!email) {
      toast.error('Type your email above first, then tap this again.')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email)
      toast.success('Check your inbox for a reset link.')
    } catch {
      toast.success('If that email has an account, a reset link is on its way.')
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

        <main className="px-5 pt-8 pb-12">
          <div className="w-14 h-14 rounded-[18px] bg-surface border border-line lit flex items-center justify-center mb-7 shadow-[0_14px_40px_-16px_rgba(175,255,0,0.5)]">
            <BrandMark className="w-7 h-7" />
          </div>

          <h1 className="font-display text-[38px] leading-[1.02] font-bold tracking-[-0.04em]">
            Welcome
            <br />
            back.
          </h1>
          <p className="mt-3 text-[16px] text-ink-soft">Orders are waiting.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-9 space-y-4" noValidate>
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
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <button
              type="button"
              onClick={resetPassword}
              className="min-h-[44px] text-[13px] font-bold text-iris-light cursor-pointer"
            >
              Forgot your password?
            </button>

            <Button type="submit" variant="volt" size="lg" fullWidth loading={busy}>
              Sign in
            </Button>

            <p className="text-center text-[13px] text-ink-faint pt-2">
              New here?{' '}
              <Link to="/signup" className="font-bold text-volt cursor-pointer">
                Create an account
              </Link>
            </p>
          </form>
        </main>
      </div>
    </div>
  )
}
