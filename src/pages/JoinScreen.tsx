import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  ChevronDown,
  Clock,
  GraduationCap,
  Landmark,
  Lock,
  Store,
  Wallet,
  Zap,
} from 'lucide-react'
import { Button, Money, cn } from '../components/ui'
import { BoltMark, GlowField, StepBadge, Wordmark } from '../components/art'
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
 *
 * This is also the only screen in the app that carries photographs. Everywhere
 * else, art is drawn inline so it survives a dead spot; here, a student
 * deciding whether this is a real job needs to see somebody actually doing it,
 * and that is worth the bytes exactly once.
 */

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
}

const Section = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.section
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: '-60px' }}
    variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    className={cn('px-5 py-12', className)}
  >
    {children}
  </motion.section>
)

/**
 * A photograph, with the page still working when it does not arrive.
 *
 * Campus data drops images long before it drops HTML. Rather than leave a
 * broken-image glyph in the middle of a recruitment pitch, a failed load
 * collapses to the brand gradient underneath, which was always going to be
 * there behind the scrim anyway.
 */
function Photo({
  src,
  alt,
  className,
  imgClassName,
  priority,
  children,
}: {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  priority?: boolean
  children?: ReactNode
}) {
  const [failed, setFailed] = useState(false)

  return (
    <div className={cn('relative overflow-hidden bg-raised', className)}>
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #1B262C 0%, #2A2350 55%, #101418 100%)' }}
        aria-hidden
      />
      {!failed && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('relative w-full h-full object-cover', imgClassName)}
        />
      )}
      {children}
    </div>
  )
}

const PHOTOS = {
  // A rider waiting at a light after dark, which is when campus orders
  // actually peak. Colour-wise it happens to sit exactly in the brand's
  // blue-green, so the scrim over it needs almost no correction.
  hero: 'https://images.pexels.com/photos/36072048/pexels-photo-36072048.jpeg?auto=compress&cs=tinysrgb&w=900',
  counter: 'https://images.pexels.com/photos/6867969/pexels-photo-6867969.jpeg?auto=compress&cs=tinysrgb&w=800',
  speed: 'https://images.pexels.com/photos/33411898/pexels-photo-33411898.jpeg?auto=compress&cs=tinysrgb&w=800',
  student: 'https://images.pexels.com/photos/7683693/pexels-photo-7683693.jpeg?auto=compress&cs=tinysrgb&w=700',
}

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
    <div className="relative overflow-hidden rounded-[28px] bg-surface border border-line p-6 grain">
      <GlowField tone="volt" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-7">
          <Zap className="w-4 h-4 text-volt" strokeWidth={2.6} aria-hidden />
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">Do the maths</p>
        </div>

        <div className="space-y-7">
          {[
            {
              id: 'per-day',
              label: 'Deliveries a day',
              value: perDay,
              min: 1,
              max: 12,
              set: setPerDay,
            },
            {
              id: 'per-week',
              label: 'Days a week',
              value: daysPerWeek,
              min: 1,
              max: 7,
              set: setDaysPerWeek,
            },
          ].map((slider) => (
            <div key={slider.id}>
              <div className="flex items-baseline justify-between mb-3">
                <label htmlFor={slider.id} className="text-[14px] font-semibold text-ink-soft">
                  {slider.label}
                </label>
                <span className="font-display tnum text-[20px] font-bold text-volt">{slider.value}</span>
              </div>
              <input
                id={slider.id}
                type="range"
                min={slider.min}
                max={slider.max}
                value={slider.value}
                onChange={(event) => slider.set(Number(event.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-line accent-volt cursor-pointer"
              />
            </div>
          ))}
        </div>

        <div className="mt-8 pt-7 border-t border-line">
          <p className="text-[13px] font-semibold text-ink-faint mb-2">That is about</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <Money amount={weekly} size="hero" tone="volt" className="aura-volt" />
              <p className="text-[13px] font-bold text-ink-soft mt-2">a week</p>
            </div>
            <div className="text-right pb-1.5">
              <Money amount={monthly} size="lg" tone="ember" />
              <p className="text-[11px] font-bold text-ink-faint mt-1">a month</p>
            </div>
          </div>
          <p className="text-[12px] text-ink-faint mt-5 leading-relaxed">
            Based on {money(AVG_EARNING_PER_DELIVERY)} average per delivery. Fronting cash for an order pays extra
            on top — that part is optional and it is explained below.
          </p>
        </div>
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
        className="w-full min-h-[60px] flex items-center justify-between gap-4 py-4 text-left cursor-pointer"
      >
        <span className="font-bold text-[15px]">{q}</span>
        <span
          className={cn(
            'w-7 h-7 rounded-full bg-raised border border-line flex items-center justify-center shrink-0',
            'transition-transform duration-200',
            open && 'rotate-180 bg-volt border-volt',
          )}
        >
          <ChevronDown className={cn('w-4 h-4', open ? 'text-void' : 'text-ink-soft')} strokeWidth={2.6} aria-hidden />
        </span>
      </button>
      <div
        className={cn(
          'grid transition-all duration-300 ease-[var(--ease-out-soft)]',
          open ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <p className="text-[14px] text-ink-soft leading-relaxed pr-10">{a}</p>
        </div>
      </div>
    </div>
  )
}

export default function JoinScreen() {
  /*
   * The sticky bar stays out of the way until the hero's own button has
   * scrolled off.
   *
   * Otherwise the first thing a student sees is two identical volt buttons
   * stacked twenty pixels apart, which reads as a rendering bug and makes the
   * page look like it is shouting. The bar exists for the people who scrolled
   * past the decision point; before that there is nothing for it to do.
   */
  const heroCta = useRef<HTMLDivElement>(null)
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    const target = heroCta.current
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting), {
      threshold: 0,
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-void pb-28">
      {/* ── Hero ─────────────────────────────────────────────────────────
          The photograph carries the whole pitch before a word is read: it is
          dark, it is a real rider, and it is plainly the evening — which is
          when a student is free and when the orders actually are. */}
      <section className="relative">
        <Photo
          src={PHOTOS.hero}
          alt="A delivery rider waiting at a junction after dark"
          className="absolute inset-0"
          imgClassName="object-cover"
          priority
        />
        {/* Two scrims rather than one. A flat overlay dulls the photo evenly
            and the headline still fights it; a vertical fade to void keeps
            the bright bokeh at the top and hands the text a solid ground. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(10,15,18,0.55) 0%, rgba(10,15,18,0.75) 45%, rgba(10,15,18,0.97) 88%, #0A0F12 100%)',
          }}
          aria-hidden
        />

        <div className="relative pad-top-safe px-5 pt-3">
          <header className="flex items-center justify-between">
            <Wordmark />
            <Link
              to="/login"
              className="min-h-[44px] px-4 inline-flex items-center text-[14px] font-bold text-ink cursor-pointer"
            >
              Sign in
            </Link>
          </header>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.09 } } }}
            className="pt-16 pb-12"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-volt/12 border border-volt/30 text-volt text-[10px] font-bold uppercase tracking-[0.12em]"
            >
              <BoltMark className="w-3 h-3" />
              Blorbmart is powering students
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="mt-6 font-display text-[46px] leading-[0.98] font-bold tracking-[-0.045em]"
            >
              Your free
              <br />
              periods are worth
              <br />
              <span className="text-volt aura-volt">real money.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 text-[17px] leading-relaxed text-ink-soft">
              Deliver Blorbmart orders around your campus when it suits you. No shifts, no interview, no uniform.
              Get paid the same day, straight to your bank.
            </motion.p>

            <motion.div ref={heroCta} variants={fadeUp} className="mt-8 space-y-3">
              <Link to="/signup" className="block">
                <Button variant="volt" size="lg" fullWidth iconRight={ArrowRight}>
                  Start earning
                </Button>
              </Link>
              <p className="text-center text-[13px] text-ink-faint">Free to join · Takes about 2 minutes</p>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-10 grid grid-cols-3 gap-3">
              {[
                { icon: Clock, label: 'Your hours' },
                { icon: Wallet, label: 'Same-day pay' },
                { icon: Lock, label: 'PIN-protected' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center mx-auto mb-2.5">
                    <Icon className="w-5 h-5 text-volt" strokeWidth={2.2} aria-hidden />
                  </div>
                  <p className="text-[12px] font-bold text-ink-soft leading-tight">{label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── The number ───────────────────────────────────────────────────── */}
      <Section>
        <motion.h2
          variants={fadeUp}
          className="font-display text-[30px] leading-[1.06] font-bold tracking-[-0.035em] mb-2"
        >
          What could you make?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-ink-soft mb-7">
          Move the sliders. This is your week.
        </motion.p>
        <motion.div variants={fadeUp}>
          <EarningsCalculator />
        </motion.div>
      </Section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <Section>
        <motion.h2
          variants={fadeUp}
          className="font-display text-[30px] leading-[1.06] font-bold tracking-[-0.035em] mb-8"
        >
          How it works
        </motion.h2>
        <div className="space-y-6">
          {STEPS.map((step, index) => (
            <motion.div key={step.title} variants={fadeUp} className="flex gap-4">
              <div className="shrink-0 flex flex-col items-center">
                <StepBadge n={index + 1} />
                {index < STEPS.length - 1 && <div className="w-px flex-1 mt-3 bg-line" aria-hidden />}
              </div>
              <div className="pb-2 min-w-0">
                <h3 className="font-bold text-[17px] mb-1.5 flex items-center gap-2 tracking-[-0.01em]">
                  <step.icon className="w-[18px] h-[18px] text-volt shrink-0" strokeWidth={2.4} aria-hidden />
                  {step.title}
                </h3>
                <p className="text-[14px] text-ink-soft leading-relaxed">{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── The differentiator ───────────────────────────────────────────── */}
      <Section className="relative overflow-hidden">
        <GlowField tone="ember" />
        <div className="relative">
          <motion.div variants={fadeUp} className="mb-7">
            <Photo
              src={PHOTOS.counter}
              alt="A delivery rider collecting packages at the kerb"
              className="rounded-[24px] aspect-[16/10] border border-line"
            >
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, rgba(10,15,18,0.1) 40%, rgba(10,15,18,0.9) 100%)' }}
                aria-hidden
              />
            </Photo>
          </motion.div>

          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ember/12 border border-ember/30 text-ember-light text-[10px] font-bold uppercase tracking-[0.12em]"
          >
            <Zap className="w-3 h-3" strokeWidth={2.8} aria-hidden />
            Earn more
          </motion.span>

          <motion.h2
            variants={fadeUp}
            className="mt-5 font-display text-[32px] leading-[1.04] font-bold tracking-[-0.04em]"
          >
            Restaurant not answering?
            <br />
            <span className="text-ember">Take the order yourself.</span>
          </motion.h2>

          <motion.p variants={fadeUp} className="mt-4 text-[15px] leading-relaxed text-ink-soft">
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
                icon: Zap,
                title: 'Plus a bonus on top',
                body: 'You earn the delivery fee as normal, and an extra bonus for covering the order. The bigger the order, the bigger the bonus.',
              },
              {
                icon: BadgeCheck,
                title: 'Unlocked after 3 deliveries',
                body: 'It starts small and the limit grows with every clean delivery you complete. Nobody is asked to front money on day one.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-surface border border-line rounded-2xl p-4 flex gap-3">
                <item.icon className="w-5 h-5 text-ember shrink-0 mt-0.5" strokeWidth={2.3} aria-hidden />
                <div className="min-w-0">
                  <p className="font-bold text-[15px] mb-1">{item.title}</p>
                  <p className="text-[13px] text-ink-soft leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ── Money ────────────────────────────────────────────────────────── */}
      <Section>
        <motion.div variants={fadeUp} className="mb-7">
          <Photo
            src={PHOTOS.speed}
            alt="A courier riding past, the street blurred behind"
            className="rounded-[24px] aspect-[16/9] border border-line"
          >
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(10,15,18,0.15) 40%, rgba(10,15,18,0.92) 100%)' }}
              aria-hidden
            />
          </Photo>
        </motion.div>

        <motion.h2
          variants={fadeUp}
          className="font-display text-[30px] leading-[1.06] font-bold tracking-[-0.035em] mb-2"
        >
          Paid today, not next month
        </motion.h2>
        <motion.p variants={fadeUp} className="text-ink-soft mb-7">
          No weekly payout cycle. No minimum you cannot reach.
        </motion.p>

        <motion.div variants={fadeUp} className="bg-surface rounded-[var(--radius-card)] border border-line p-5 space-y-5">
          {[
            { icon: Wallet, label: 'Earnings land instantly', value: 'The second the delivery PIN checks out' },
            { icon: Landmark, label: 'Straight to your bank', value: 'Add your account once, cash out any time' },
            { icon: Banknote, label: 'Cash out from ₦500', value: 'A low minimum, so a good afternoon is enough' },
          ].map((row) => (
            <div key={row.label} className="flex items-start gap-3.5">
              <span className="w-10 h-10 rounded-2xl bg-volt/12 flex items-center justify-center shrink-0">
                <row.icon className="w-[18px] h-[18px] text-volt" strokeWidth={2.3} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[15px]">{row.label}</p>
                <p className="text-[13px] text-ink-soft mt-0.5">{row.value}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </Section>

      {/* ── Who does this ────────────────────────────────────────────────── */}
      <Section>
        <motion.div variants={fadeUp} className="relative overflow-hidden rounded-[28px] border border-line">
          <Photo
            src={PHOTOS.student}
            alt="A student on campus between lectures"
            className="aspect-[4/5] sm:aspect-[16/11]"
          >
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(10,15,18,0.05) 25%, rgba(10,15,18,0.96) 92%)' }}
              aria-hidden
            />
          </Photo>
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-volt mb-3">Who rides</p>
            <p className="font-display text-[24px] leading-[1.15] font-bold tracking-[-0.03em]">
              Students with a free afternoon and a phone.
            </p>
            <p className="text-[14px] text-ink-soft leading-relaxed mt-3">
              Not couriers, not a fleet. People already crossing campus, getting paid for the trip.
            </p>
          </div>
        </motion.div>
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <Section>
        <motion.h2
          variants={fadeUp}
          className="font-display text-[30px] leading-[1.06] font-bold tracking-[-0.035em] mb-4"
        >
          Straight answers
        </motion.h2>
        <motion.div variants={fadeUp}>
          {FAQS.map((faq) => (
            <Faq key={faq.q} {...faq} />
          ))}
        </motion.div>
      </Section>

      {/* ── Close ────────────────────────────────────────────────────────── */}
      <Section className="relative overflow-hidden rounded-t-[36px] border-t border-line text-center">
        <GlowField tone="mixed" />
        <div className="absolute inset-0 dotfield opacity-50" aria-hidden />

        <div className="relative">
          <motion.div variants={fadeUp} className="flex justify-center mb-6">
            <span className="w-14 h-14 rounded-[18px] bg-volt flex items-center justify-center shadow-[0_16px_44px_-16px_rgba(175,255,0,0.9)]">
              <BoltMark className="w-6 h-6 text-void" />
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="font-display text-[32px] leading-[1.04] font-bold tracking-[-0.04em]"
          >
            Your next free period
            <br />
            could pay for lunch.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-ink-soft leading-relaxed">
            Sign up now and you could be online before your next lecture ends.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-7">
            <Link to="/signup" className="block">
              <Button variant="volt" size="lg" fullWidth iconRight={ArrowRight}>
                Create my rider account
              </Button>
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-8 text-[12px] text-ink-faint font-semibold">
            Blorbmart · Powering students
          </motion.p>
        </div>
      </Section>

      {/* A persistent call to action. The page is long and the decision is
          made at different points for different people — asking them to
          scroll back to act loses the ones who decided in the middle. */}
      <div
        className={cn(
          'fixed bottom-0 inset-x-0 z-40 glass border-t border-white/8 px-5 pt-3 pad-bottom-safe',
          'transition-[transform,opacity] duration-300 ease-[var(--ease-out-soft)]',
          showSticky ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none',
        )}
      >
        <Link to="/signup" className="block">
          <Button variant="volt" size="lg" fullWidth iconRight={ArrowRight}>
            Start earning
          </Button>
        </Link>
      </div>
    </div>
  )
}
