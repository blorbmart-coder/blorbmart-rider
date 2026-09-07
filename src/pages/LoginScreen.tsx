import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, Bike } from 'lucide-react'
import { auth } from '../lib/firebase'
import { Button, Field } from '../components/ui'

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

      <main className="px-5 pt-6 pb-10">
        <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center mb-5">
          <Bike className="w-6 h-6 text-white" aria-hidden />
        </div>

        <h1 className="text-[32px] leading-[1.08] font-extrabold tracking-[-0.03em]">Welcome back.</h1>
        <p className="mt-2 text-ink-soft">Orders are waiting.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
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
            className="min-h-[44px] text-[13px] font-bold text-brand cursor-pointer"
          >
            Forgot your password?
          </button>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
            Sign in
          </Button>

          <p className="text-center text-[13px] text-ink-faint pt-1">
            New here?{' '}
            <Link to="/signup" className="font-bold text-brand cursor-pointer">
              Create an account
            </Link>
          </p>
        </form>
      </main>
    </div>
  )
}
