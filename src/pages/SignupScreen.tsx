import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { auth } from '../lib/firebase'
import { riderApi, errorMessage } from '../lib/api'
import { useRider } from '../contexts/RiderContext'
import { Button, Field } from '../components/ui'
import { BrandMark, GlowField } from '../components/art'

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

/**
 * Signup is two independent commits, and it used to pretend it was one.
 *
 * Creating the Firebase account and creating the rider profile are separate
 * writes to separate systems. The account is created first, and if the profile
 * call then failed — a cold backend, a dropped request on campus data — the
 * old code showed one generic error and left a real, usable Firebase account
 * behind with nothing attached to it. Every retry from there hit
 * `email-already-in-use`, so the rider was told to sign in instead; signing in
 * found no profile and bounced them straight back to this screen. That is the
 * loop being reported: an error on screen, the email plainly taken in the
 * Firebase console, and no way forward.
 *
 * So the two phases are tracked separately and the second one is made
 * resumable. If we already hold a signed-in user for this email, account
 * creation is skipped entirely; if the email is taken, we try the password
 * against it, because the overwhelmingly likely owner of a half-made account
 * is the person currently trying to finish it. Only when that password is
 * wrong is it somebody else's account, which is the one case worth sending to
 * the sign-in screen.
 */
type Phase = 'auth' | 'profile'

export default function SignupScreen() {
  const navigate = useNavigate()
  const { firebaseUser, needsRegistration, refresh } = useRider()
  const [busy, setBusy] = useState(false)

  // Somebody who got here mid-loop already has an account; the email on it is
  // the only one that can be used, so it is filled in and the copy changes to
  // say what is actually happening.
  const resuming = Boolean(firebaseUser && needsRegistration)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      email: firebaseUser?.email ?? '',
      firstName: firebaseUser?.displayName?.split(' ')[0] ?? '',
      lastName: firebaseUser?.displayName?.split(' ').slice(1).join(' ') ?? '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setBusy(true)
    let phase: Phase = 'auth'

    try {
      const email = values.email.trim().toLowerCase()
      const displayName = `${values.firstName} ${values.lastName}`.trim()

      /* ── Phase 1: make sure we hold a signed-in user for this email ── */

      let user = auth.currentUser

      if (!user || (user.email ?? '').toLowerCase() !== email) {
        try {
          user = (await createUserWithEmailAndPassword(auth, email, values.password)).user
        } catch (error) {
          const code = (error as { code?: string })?.code
          if (code !== 'auth/email-already-in-use') throw error

          // The account exists. If this password opens it, it is theirs and
          // almost certainly the orphan left by an earlier failed attempt —
          // carry on and finish the half that is missing.
          try {
            user = (await signInWithEmailAndPassword(auth, email, values.password)).user
          } catch {
            toast.error('That email already has an account. Sign in instead.')
            return
          }
        }
      }

      if (user.displayName !== displayName) {
        // Cosmetic only — never allowed to fail the signup around it.
        await updateProfile(user, { displayName }).catch(() => {})
      }

      /* ── Phase 2: the rider profile. Idempotent on the server. ── */

      phase = 'profile'
      await riderApi.register({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
      })

      await refresh()
      navigate('/onboarding', { replace: true })
    } catch (error) {
      const code = (error as { code?: string })?.code

      if (phase === 'auth') {
        if (code === 'auth/weak-password') {
          toast.error('Pick a stronger password — at least 6 characters.')
        } else if (code === 'auth/invalid-email') {
          toast.error('Check that email address.')
        } else if (code === 'auth/network-request-failed') {
          toast.error('No connection. Check your internet and try again.')
        } else {
          toast.error(errorMessage(error, 'Could not create your account. Try again.'))
        }
        return
      }

      // Phase 2. The account is real and they are signed in, so the honest
      // message is that one step is outstanding — not that signup failed.
      // Pressing Continue again resumes from exactly here.
      toast.error(
        errorMessage(error, 'Your account is ready, but we could not finish your profile. Tap Continue to retry.'),
      )
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
          <div className="w-14 h-14 rounded-[18px] bg-surface border border-line lit flex items-center justify-center mb-7 shadow-[0_14px_40px_-16px_rgba(175,255,0,0.5)]">
            <BrandMark className="w-7 h-7" />
          </div>

          <h1 className="font-display text-[38px] leading-[1.02] font-bold tracking-[-0.04em]">
            {resuming ? (
              <>
                Let&rsquo;s finish
                <br />
                signing you up.
              </>
            ) : (
              <>
                Let&rsquo;s get you
                <br />
                on the road.
              </>
            )}
          </h1>
          <p className="mt-3 text-[16px] text-ink-soft leading-relaxed">
            {resuming
              ? 'Your account exists — one step did not save last time. Confirm your details and we will pick up where it stopped.'
              : 'Start with the basics. School and vehicle details come next — about two minutes in total.'}
          </p>

          {/* Named explicitly, because the alternative is a rider staring at a
              form they know they already filled in, with an email the app
              insists is taken. */}
          {resuming && (
            <div className="mt-5 flex gap-3 rounded-2xl border border-iris/30 bg-iris/10 px-4 py-3.5">
              <Info className="w-5 h-5 shrink-0 text-iris mt-px" strokeWidth={2.2} aria-hidden />
              <p className="text-[13.5px] leading-relaxed text-ink-soft">
                You are signed in as{' '}
                <span className="font-bold text-ink">{firebaseUser?.email}</span>. Nothing is charged and no
                second account is created.
              </p>
            </div>
          )}

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
                {resuming ? 'Finish signing up' : 'Continue'}
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
