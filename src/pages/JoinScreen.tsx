import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bike,
  ChevronDown,
  Clock,
  GraduationCap,
  Landmark,
  Lock,
  Sparkles,
  Store,
  Wallet,
  Zap,
} from 'lucide-react'
import { Button, Money, cn } from '../components/ui'
import { money } from '../lib/format'

/**
 * The recruitment page.
 *
 * It is selling a job to a broke student, which means every claim has to be a
 * number they can check rather than an adjective they have heard before.
 * "Earn money delivering" is what every other gig ad says; the calculator
 * below says what four deliveries a day is worth by Friday, and a student can
 * do that arithmetic against their own week.
 *
 * The three objections it is built to answer, in the order they arrive:
 *   "How much, really?"     — the calculator, above the fold's fold.
 *   "What does it cost me?" — nothing, and the one place money is involved
 *                             is explained rather than buried.
 *   "When do I get paid?"   — same day, to a bank account, stated three times.
 */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
}

const Section = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.section
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: '-60px' }}
    variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    className={cn('px-5 py-14', className)}
  >
    {children}
  </motion.section>
)

/**
 * The earnings calculator.
 *
 * Deliberately conservative: it quotes the delivery share alone and leaves
 * the cash-front bonus out entirely. A recruitment number that a rider cannot
 * hit in their first week is a refund request and a bad review, so the figure
 * here is the floor rather than the ceiling.
 */
const AVG_EARNING_PER_DELIVERY = 480

function EarningsCalculator() {
  const [perDay, setPerDay] = useState(4)
  const [daysPerWeek, setDaysPerWeek] = useState(5)

  const weekly = useMemo(() => perDay * daysPerWeek * AVG_EARNING_PER_DELIVERY, [perDay, daysPerWeek])
  const monthly = weekly * 4

  return (
    <div className="bg-ink rounded-[28px] p-6 text-white">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-4 h-4 text-action" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Do the maths</p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label htmlFor="per-day" className="text-sm font-semibold text-white/80">
              Deliveries a day
            </label>
            <span className="tnum text-lg font-extrabold">{perDay}</span>
          </div>
          <input
            id="per-day"
            type="range"
            min={1}
            max={12}
            value={perDay}
            onChange={(event) => setPerDay(Number(event.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-white/15 accent-action cursor-pointer"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label htmlFor="per-week" className="text-sm font-semibold text-white/80">
              Days a week
            </label>
            <span className="tnum text-lg font-extrabold">{daysPerWeek}</span>
          </div>
          <input
            id="per-week"
            type="range"
            min={1}
            max={7}
            value={daysPerWeek}
            onChange={(event) => setDaysPerWeek(Number(event.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-white/15 accent-action cursor-pointer"
          />
        </div>
      </div>

      <div className="mt-7 pt-6 border-t border-white/12">
        <p className="text-sm font-semibold text-white/60 mb-1">That is about</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <Money amount={weekly} size="hero" tone="white" />
            <p className="text-sm font-bold text-white/60 mt-1">a week</p>
          </div>
          <div className="text-right pb-1">
            <Money amount={monthly} size="lg" tone="action" />
            <p className="text-xs font-bold text-white/50 mt-0.5">a month</p>
          </div>
        </div>
        <p className="text-[13px] text-white/45 mt-4 leading-relaxed">
          Based on {money(AVG_EARNING_PER_DELIVERY)} average per delivery. Fronting cash for an order pays
          extra on top — that part is optional and it is explained below.
        </p>
      </div>
    </div>
  )
}

const STEPS = [
  {
    icon: GraduationCap,
    title: 'Sign up in two minutes',
    body: 'Your name, your school, how you get around, and an ID. No interview, no CV, no waiting for a callback.',
  },
  {
    icon: Zap,
    title: 'Go online whenever you are free',
    body: 'Between lectures, after class, on a Sunday. Flip one switch and orders start arriving. Flip it back when you are done.',
  },
  {
    icon: Store,
    title: 'Pick it up, drop it off',
    body: 'You see the restaurant, the drop-off area and exactly what the job pays before you accept. The customer gives you a 4-digit PIN at the door.',
  },
  {
    icon: Banknote,
    title: 'Cash out the same day',
    body: 'Money lands in your Blorbmart wallet the second the PIN checks out. Send it to your bank account whenever you want.',
  },
]

const FAQS = [
  {
    q: 'Do I need a motorcycle?',
    a: 'No. Plenty of riders deliver on foot or on a bicycle — on a campus that is often faster than a bike stuck in gate traffic. Pick whatever you actually have when you sign up.',
  },
  {
    q: 'Does it cost me anything to start?',
    a: 'Nothing. There is no sign-up fee, no deposit and no equipment to buy. You are never required to spend your own money — fronting cash for an order is a separate thing you choose, and only after three deliveries.',
  },
  {
    q: 'What if I pay for an order and something goes wrong?',
    a: 'You are paid back. Your own money is tracked separately from your earnings so you can always see exactly what you are owed, and if an order is cancelled after you have paid, it goes straight back to your wallet.',
  },
  {
    q: 'How fast is "same day" really?',
    a: 'Earnings are withdrawable the moment a delivery is confirmed. Bank transfers usually land within minutes.',
  },
  {
    q: 'Can I do this with a full timetable?',
    a: 'That is who it is built for. There are no shifts, no minimum hours and nobody to tell if you go quiet for two weeks during exams.',
  },
]

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full min-h-[56px] flex items-center justify-between gap-4 py-4 text-left cursor-pointer"
      >
        <span className="font-bold text-[15px]">{q}</span>
        <ChevronDown
          className={cn('w-5 h-5 text-ink-faint shrink-0 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      <div className={cn('grid transition-all duration-250 ease-[var(--ease-out-soft)]', open ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <p className="text-[14px] text-ink-soft leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  )
}

export default function JoinScreen() {
  return (
    <div className="min-h-screen bg-surface pb-28">
      <header className="pad-top-safe px-5 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
            <Bike className="w-5 h-5 text-white" aria-hidden />
          </div>
          <span className="font-extrabold tracking-[-0.01em]">Blorbmart Rider</span>
        </div>
        <Link
          to="/login"
          className="min-h-[44px] px-4 inline-flex items-center text-sm font-bold text-brand cursor-pointer"
        >
          Sign in
        </Link>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-5 pt-8 pb-12">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.09 } } }}>
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-action-tint text-action-deep text-xs font-extrabold uppercase tracking-wide">
              <GraduationCap className="w-3.5 h-3.5" aria-hidden />
              Blorbmart is powering students
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-5 text-[42px] leading-[1.02] font-extrabold tracking-[-0.035em]"
          >
            Your free periods
            <br />
            are worth
            <span className="text-action"> real money.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-4 text-[17px] leading-relaxed text-ink-soft">
            Deliver Blorbmart orders around your campus when it suits you. No shifts, no interview, no
            uniform. Get paid the same day, straight to your bank.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-7 space-y-3">
            <Link to="/signup" className="block">
              <Button variant="action" size="lg" fullWidth icon={ArrowRight}>
                Start earning
              </Button>
            </Link>
            <p className="text-center text-[13px] text-ink-faint">
              Free to join · Takes about 2 minutes
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: Clock, label: 'Your hours' },
              { icon: Wallet, label: 'Same-day pay' },
              { icon: Lock, label: 'PIN-protected' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="text-center">
                <div className="w-11 h-11 rounded-2xl bg-brand-tint flex items-center justify-center mx-auto mb-2">
                  <Icon className="w-5 h-5 text-brand" aria-hidden />
                </div>
                <p className="text-[12px] font-bold text-ink-soft leading-tight">{label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── The number ───────────────────────────────────────────────────── */}
      <Section className="bg-canvas">
        <motion.h2 variants={fadeUp} className="text-[28px] leading-tight font-extrabold tracking-[-0.02em] mb-2">
          What could you make?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-ink-soft mb-6">
          Move the sliders. This is your week.
        </motion.p>
        <motion.div variants={fadeUp}>
          <EarningsCalculator />
        </motion.div>
      </Section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <Section>
        <motion.h2 variants={fadeUp} className="text-[28px] leading-tight font-extrabold tracking-[-0.02em] mb-7">
          How it works
        </motion.h2>
        <div className="space-y-5">
          {STEPS.map((step, index) => (
            <motion.div key={step.title} variants={fadeUp} className="flex gap-4">
              <div className="shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-brand text-white flex items-center justify-center font-extrabold tnum">
                  {index + 1}
                </div>
                {index < STEPS.length - 1 && <div className="w-px h-full mx-auto mt-2 bg-line" aria-hidden />}
              </div>
              <div className="pb-1">
                <h3 className="font-extrabold text-[17px] mb-1 flex items-center gap-2">
                  <step.icon className="w-[18px] h-[18px] text-action" aria-hidden />
                  {step.title}
                </h3>
                <p className="text-[14px] text-ink-soft leading-relaxed">{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── The differentiator ───────────────────────────────────────────── */}
      <Section className="bg-ink text-white">
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-extrabold uppercase tracking-wide"
        >
          <Zap className="w-3.5 h-3.5 text-action" aria-hidden />
          Earn more
        </motion.span>

        <motion.h2 variants={fadeUp} className="mt-5 text-[30px] leading-[1.1] font-extrabold tracking-[-0.025em]">
          Restaurant not answering?
          <br />
          <span className="text-action">Take the order yourself.</span>
        </motion.h2>

        <motion.p variants={fadeUp} className="mt-4 text-[15px] leading-relaxed text-white/70">
          Sometimes nobody is watching the tablet and a paid order just sits there. When that happens, you can
          walk in, pay for the food at the counter, and deliver it. The app tells you the exact amount to pay.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-6 space-y-3">
          {[
            {
              icon: Banknote,
              title: 'You get every naira back',
              body: 'Your cash is tracked separately from your earnings, and it returns to your wallet the moment the customer confirms delivery.',
            },
            {
              icon: Sparkles,
              title: 'Plus a bonus on top',
              body: 'You earn the delivery fee as normal, and an extra bonus for covering the order. The bigger the order, the bigger the bonus.',
            },
            {
              icon: BadgeCheck,
              title: 'Unlocked after 3 deliveries',
              body: 'It starts small and the limit grows with every clean delivery you complete. Nobody is asked to front money on day one.',
            },
          ].map((item) => (
            <div key={item.title} className="bg-white/[0.07] rounded-2xl p-4 flex gap-3">
              <item.icon className="w-5 h-5 text-action shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="font-bold text-[15px] mb-0.5">{item.title}</p>
                <p className="text-[13px] text-white/60 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </Section>

      {/* ── Money ────────────────────────────────────────────────────────── */}
      <Section className="bg-canvas">
        <motion.h2 variants={fadeUp} className="text-[28px] leading-tight font-extrabold tracking-[-0.02em] mb-2">
          Paid today, not next month
        </motion.h2>
        <motion.p variants={fadeUp} className="text-ink-soft mb-6">
          No weekly payout cycle. No minimum you cannot reach.
        </motion.p>

        <motion.div variants={fadeUp} className="bg-surface rounded-[var(--radius-card)] border border-line p-5 space-y-4">
          {[
            { icon: Wallet, label: 'Earnings land instantly', value: 'The second the delivery PIN checks out' },
            { icon: Landmark, label: 'Straight to your bank', value: 'Add your account once, cash out any time' },
            { icon: Banknote, label: 'Cash out from ₦500', value: 'A low minimum, so a good afternoon is enough' },
          ].map((row) => (
            <div key={row.label} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cash-tint flex items-center justify-center shrink-0">
                <row.icon className="w-[18px] h-[18px] text-cash-deep" aria-hidden />
              </div>
              <div>
                <p className="font-bold text-[15px]">{row.label}</p>
                <p className="text-[13px] text-ink-soft">{row.value}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <Section>
        <motion.h2 variants={fadeUp} className="text-[28px] leading-tight font-extrabold tracking-[-0.02em] mb-4">
          Straight answers
        </motion.h2>
        <motion.div variants={fadeUp}>
          {FAQS.map((faq) => (
            <Faq key={faq.q} {...faq} />
          ))}
        </motion.div>
      </Section>

      {/* ── Close ────────────────────────────────────────────────────────── */}
      <Section className="bg-brand text-white text-center rounded-t-[32px]">
        <motion.h2 variants={fadeUp} className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.025em]">
          Your next free period
          <br />
          could pay for lunch.
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-3 text-white/75 leading-relaxed">
          Sign up now and you could be online before your next lecture ends.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-6">
          <Link to="/signup" className="block">
            <Button variant="action" size="lg" fullWidth icon={ArrowRight}>
              Create my rider account
            </Button>
          </Link>
        </motion.div>
        <motion.p variants={fadeUp} className="mt-6 text-[13px] text-white/55">
          Blorbmart · Powering students
        </motion.p>
      </Section>

      {/* A persistent call to action. The page is long and the decision is
          made at different points for different people — asking them to
          scroll back to act loses the ones who decided in the middle. */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-lg border-t border-line px-5 pt-3 pad-bottom-safe">
        <Link to="/signup" className="block">
          <Button variant="action" size="lg" fullWidth icon={ArrowRight}>
            Start earning
          </Button>
        </Link>
      </div>
    </div>
  )
}
