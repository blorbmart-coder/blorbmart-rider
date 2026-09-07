import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Loader2, type LucideIcon } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import clsx from 'clsx'
import { amountOnly } from '../lib/format'

export const cn = (...classes: (string | false | null | undefined)[]) => twMerge(clsx(classes))

/**
 * A short vibration on the actions that commit something.
 *
 * A rider confirming a payment at a noisy counter, or a delivery at a gate,
 * often cannot hear a sound or watch the screen. Reserved for commits only —
 * vibrating on every tap trains people to ignore it, which costs the signal
 * exactly where it matters.
 */
export const tap = (pattern: number | number[] = 12) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* Unsupported or blocked — never worth failing an action over. */
    }
  }
}

/* ── Button ──────────────────────────────────────────────────────────────── */

type ButtonVariant = 'volt' | 'iris' | 'ember' | 'outline' | 'ghost' | 'danger' | 'light'
type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * The variant is the meaning, not the decoration.
 *
 *   volt    go, and money that is now yours. The loudest thing on any screen,
 *           and the reason nothing else is allowed to be lime.
 *   ember   money in motion — take this job, cover this order, cash out.
 *   iris    Blorbmart's own actions: sign in, continue, save.
 *
 * Dark buttons need a lit top edge and a coloured drop glow or they sink into
 * the card behind them; both are baked in rather than left to call sites.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  volt: 'bg-volt text-void active:bg-volt-deep shadow-[0_10px_30px_-12px_rgba(175,255,0,0.85)]',
  iris: 'bg-iris text-white active:bg-iris-deep shadow-[0_10px_30px_-12px_rgba(81,86,241,0.95)]',
  ember: 'bg-ember text-white active:bg-ember-deep shadow-[0_10px_30px_-12px_rgba(255,85,0,0.9)]',
  outline: 'bg-raised text-ink border border-line active:bg-line lit',
  ghost: 'bg-transparent text-ink-soft active:bg-raised',
  danger: 'bg-rose/12 text-rose border border-rose/25 active:bg-rose active:text-white',
  light: 'bg-ink text-void active:bg-ink-soft',
}

const SIZES: Record<ButtonSize, string> = {
  // Every size clears the 44px minimum touch target — this app is used
  // one-handed, on the move, sometimes in gloves.
  sm: 'min-h-[44px] px-4 text-[13px] rounded-xl gap-1.5',
  md: 'min-h-[52px] px-5 text-[15px] rounded-2xl gap-2',
  lg: 'min-h-[58px] px-6 text-[16px] rounded-[18px] gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: LucideIcon
  iconRight?: LucideIcon
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'iris',
    size = 'md',
    loading,
    icon: Icon,
    iconRight: IconRight,
    fullWidth,
    className,
    children,
    disabled,
    onClick,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      onClick={(event) => {
        if (!disabled && !loading) tap()
        onClick?.(event)
      }}
      className={cn(
        'inline-flex items-center justify-center font-bold cursor-pointer tracking-[-0.01em]',
        'transition-[transform,background-color,opacity,box-shadow] duration-150 ease-[var(--ease-out-soft)]',
        'active:scale-[0.975] disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-[18px] h-[18px] animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon className="w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden />
      ) : null}
      {children}
      {IconRight && !loading && <IconRight className="w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden />}
    </button>
  )
})

/* ── Card ────────────────────────────────────────────────────────────────── */

/**
 * On a dark ground a card cannot be "white with a shadow" — there is nothing
 * for a shadow to fall on. Separation comes from a slightly lifted fill plus
 * a hairline, which is why every variant here pairs the two.
 */
export function Card({
  children,
  className,
  onClick,
  variant = 'solid',
  glow,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'solid' | 'raised' | 'glass' | 'bare'
  glow?: 'volt' | 'iris' | 'ember'
}) {
  const interactive = Boolean(onClick)
  const variants = {
    solid: 'bg-surface border border-line-soft',
    raised: 'bg-raised border border-line lit',
    glass: 'glass border border-white/8',
    bare: 'border border-line-soft',
  }
  const glows = {
    volt: 'border-volt/25 shadow-[0_16px_50px_-24px_rgba(175,255,0,0.7)]',
    iris: 'border-iris/35 shadow-[0_16px_50px_-24px_rgba(81,86,241,0.9)]',
    ember: 'border-ember/30 shadow-[0_16px_50px_-24px_rgba(255,85,0,0.8)]',
  }

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'relative rounded-[var(--radius-card)]',
        variants[variant],
        glow && glows[glow],
        interactive &&
          'cursor-pointer transition-transform duration-150 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iris',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ── Money ───────────────────────────────────────────────────────────────── */

/**
 * A money figure.
 *
 * The naira mark is set small and raised rather than at full size: at 52px a
 * full-height ₦ is the widest glyph in the number and the eye lands on the
 * currency instead of the amount. Every figure is tabular so a column of them
 * in the wallet lines up digit for digit.
 */
export function Money({
  amount,
  size = 'md',
  tone = 'ink',
  className,
}: {
  amount: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero' | 'giant'
  tone?: 'ink' | 'volt' | 'ember' | 'iris' | 'void' | 'faint' | 'gold'
  className?: string
}) {
  const sizes = {
    xs: 'text-[13px] font-bold',
    sm: 'text-[15px] font-bold',
    md: 'text-lg font-bold',
    lg: 'text-[26px] leading-none font-bold tracking-[-0.02em]',
    xl: 'text-[36px] leading-[0.95] font-bold tracking-[-0.03em]',
    hero: 'text-[54px] leading-[0.9] font-bold tracking-[-0.04em]',
    giant: 'text-[68px] leading-[0.85] font-bold tracking-[-0.045em]',
  }
  const tones = {
    ink: 'text-ink',
    volt: 'text-volt',
    ember: 'text-ember',
    iris: 'text-iris-light',
    void: 'text-void',
    faint: 'text-ink-faint',
    gold: 'text-gold',
  }

  return (
    <span
      className={cn('font-display tnum inline-flex items-baseline gap-[0.07em]', sizes[size], tones[tone], className)}
    >
      {/* Sat on the baseline, not raised. A superscript ₦ next to a 54px
          figure stops reading as currency and starts reading as a footnote
          marker — and inline in a sentence it looked like a typo. */}
      <span className="text-[0.62em] font-bold opacity-55">₦</span>
      {amountOnly(amount)}
    </span>
  )
}

/* ── Chip ────────────────────────────────────────────────────────────────── */

export function Chip({
  children,
  tone = 'neutral',
  icon: Icon,
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'iris' | 'volt' | 'ember' | 'gold' | 'danger' | 'outline'
  icon?: LucideIcon
  className?: string
}) {
  const tones = {
    neutral: 'bg-raised text-ink-soft border-transparent',
    iris: 'bg-iris/16 text-iris-light border-iris/25',
    volt: 'bg-volt/14 text-volt border-volt/25',
    ember: 'bg-ember/14 text-ember-light border-ember/25',
    gold: 'bg-gold/14 text-gold border-gold/25',
    danger: 'bg-rose/14 text-rose border-rose/25',
    outline: 'bg-transparent text-ink-soft border-line',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
        'text-[11px] font-bold uppercase tracking-[0.04em] whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />}
      {children}
    </span>
  )
}

/** A coloured tile behind an icon — the recurring unit of every list row. */
export function IconBadge({
  icon: Icon,
  tone = 'iris',
  size = 'md',
  className,
}: {
  icon: LucideIcon
  tone?: 'iris' | 'volt' | 'ember' | 'gold' | 'neutral' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const tones = {
    iris: 'bg-iris/15 text-iris-light',
    volt: 'bg-volt/14 text-volt',
    ember: 'bg-ember/15 text-ember-light',
    gold: 'bg-gold/14 text-gold',
    neutral: 'bg-raised text-ink-soft',
    danger: 'bg-rose/14 text-rose',
  }
  const sizes = {
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-11 h-11 rounded-2xl',
    lg: 'w-14 h-14 rounded-[18px]',
  }
  const icons = { sm: 'w-4 h-4', md: 'w-[19px] h-[19px]', lg: 'w-6 h-6' }

  return (
    <span className={cn('flex items-center justify-center shrink-0', sizes[size], tones[tone], className)}>
      <Icon className={icons[size]} strokeWidth={2.2} aria-hidden />
    </span>
  )
}

/* ── Form fields ─────────────────────────────────────────────────────────── */

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  prefix?: string
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, prefix, className, id, ...rest },
  ref,
) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="space-y-2">
      {/* A visible label, not a placeholder. A placeholder disappears the
          moment someone types, and a rider re-checking a long account number
          then has no idea which field they are in. */}
      <label
        htmlFor={inputId}
        className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint"
      >
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint font-display font-bold pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'w-full min-h-[54px] rounded-2xl border bg-raised px-4 text-[16px] font-semibold text-ink',
            // 16px, not 15: anything smaller and iOS Safari zooms the whole
            // page in on focus, which on a form a rider is filling at a gate
            // is a fight to get back out of.
            'placeholder:font-medium placeholder:text-ink-faint',
            'outline-none transition-[border-color,box-shadow] duration-150',
            error
              ? 'border-rose focus:ring-4 focus:ring-rose/15'
              : 'border-line focus:border-iris focus:ring-4 focus:ring-iris/20',
            prefix && 'pl-10',
            className,
          )}
          {...rest}
        />
      </div>
      {/* The error sits against the field it belongs to, never collected in a
          banner at the top of the form. */}
      {error ? (
        <p id={`${inputId}-error`} className="text-[13px] font-semibold text-rose">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
})

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, className, id, children, ...rest },
  ref,
) {
  const selectId = id ?? `select-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="space-y-2">
      <label
        htmlFor={selectId}
        className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint"
      >
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          className={cn(
            'w-full min-h-[54px] rounded-2xl border bg-raised pl-4 pr-11 text-[16px] font-semibold text-ink appearance-none',
            'outline-none transition-[border-color,box-shadow] duration-150',
            error ? 'border-rose' : 'border-line focus:border-iris focus:ring-4 focus:ring-iris/20',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        {/* appearance-none removes the native arrow, so one has to be drawn
            back or the control stops looking like a menu at all. */}
        <ChevronDown
          className="w-5 h-5 text-ink-faint absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden
        />
      </div>
      {error && <p className="text-[13px] font-semibold text-rose">{error}</p>}
    </div>
  )
})

/* ── Feedback ────────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-2xl', className)} aria-hidden />
}

/** A label above a figure. The whole app is built out of these. */
export function Stat({
  label,
  children,
  icon: Icon,
  tone = 'neutral',
  className,
}: {
  label: string
  children: ReactNode
  icon?: LucideIcon
  tone?: 'neutral' | 'volt' | 'ember' | 'iris' | 'gold'
  className?: string
}) {
  const tones = {
    neutral: 'text-ink-faint',
    volt: 'text-volt',
    ember: 'text-ember',
    iris: 'text-iris-light',
    gold: 'text-gold',
  }
  return (
    <div className={cn('bg-surface rounded-[var(--radius-card)] border border-line-soft p-4', className)}>
      <div className="flex items-center gap-1.5 mb-2.5">
        {Icon && <Icon className={cn('w-4 h-4', tones[tone])} strokeWidth={2.4} aria-hidden />}
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">{label}</p>
      </div>
      {children}
    </div>
  )
}

/** A section heading with an optional trailing slot for a count or a link. */
export function SectionTitle({
  children,
  trailing,
  className,
}: {
  children: ReactNode
  trailing?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-end justify-between gap-3 mb-3.5', className)}>
      <h2 className="font-display text-[22px] leading-none font-bold tracking-[-0.02em]">{children}</h2>
      {trailing}
    </div>
  )
}

/**
 * A bottom sheet.
 *
 * Sheets rather than centred modals throughout: the bottom third of the
 * screen is the only part a thumb reaches comfortably on a phone held in one
 * hand, and every sheet in this app ends in a decision.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  dismissable = true,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  dismissable?: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={dismissable ? onClose : undefined}
            className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 360 }}
            className={cn(
              'relative w-full max-w-lg bg-surface border-t border-line',
              'rounded-t-[var(--radius-sheet)] pad-bottom-safe max-h-[92vh] overflow-y-auto',
            )}
          >
            {dismissable && (
              <div className="sticky top-0 z-10 bg-surface pt-3 pb-1 flex justify-center rounded-t-[var(--radius-sheet)]">
                <div className="w-11 h-1 rounded-full bg-line" aria-hidden />
              </div>
            )}
            {title && (
              <h2 className="font-display px-5 pt-2 pb-4 text-[24px] leading-tight font-bold tracking-[-0.025em]">
                {title}
              </h2>
            )}
            <div className="px-5 pb-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/**
 * An empty state.
 *
 * Takes a drawn scene rather than an icon in a rounded square. Empty states
 * are where a rider decides whether the app is working or broken, and a
 * 160px illustration reads as "this is a designed state" in a way that a
 * greyed-out glyph never has.
 */
export function EmptyState({
  art,
  icon: Icon,
  title,
  message,
  action,
}: {
  art?: ReactNode
  icon?: LucideIcon
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="text-center py-10 px-6">
      {art ? (
        <div className="mx-auto mb-5 w-40 max-w-full">{art}</div>
      ) : Icon ? (
        <div className="w-16 h-16 rounded-2xl bg-raised flex items-center justify-center mx-auto mb-5">
          <Icon className="w-7 h-7 text-ink-faint" aria-hidden />
        </div>
      ) : null}
      <p className="font-display font-bold text-[19px] tracking-[-0.02em] mb-1.5">{title}</p>
      <p className="text-[14px] text-ink-soft max-w-[19rem] mx-auto leading-relaxed">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/** Progress along the trust ladder — the sourcing limit rendered as a goal. */
export function ProgressBar({
  value,
  max,
  tone = 'volt',
}: {
  value: number
  max: number
  tone?: 'volt' | 'iris' | 'ember'
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const fills = {
    volt: 'bg-gradient-to-r from-volt-deep to-volt',
    iris: 'bg-gradient-to-r from-iris-deep to-iris-light',
    ember: 'bg-gradient-to-r from-ember-deep to-ember-light',
  }
  return (
    <div
      className="h-2 rounded-full bg-line overflow-hidden"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <motion.div
        className={cn('h-full rounded-full', fills[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

/**
 * A tappable settings row.
 *
 * Pulled out of the account screen because the wallet and the delivery screen
 * had each grown their own slightly different version of it.
 */
export function Row({
  icon: Icon,
  label,
  value,
  onClick,
  tone = 'neutral',
  danger,
}: {
  icon: LucideIcon
  label: string
  value?: string
  onClick?: () => void
  tone?: 'iris' | 'volt' | 'ember' | 'gold' | 'neutral'
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full min-h-[60px] flex items-center gap-3.5 px-4 text-left',
        'disabled:cursor-default cursor-pointer active:bg-raised transition-colors',
      )}
    >
      <IconBadge icon={Icon} tone={danger ? 'danger' : tone} size="sm" />
      <span className={cn('flex-1 font-semibold text-[15px]', danger && 'text-rose')}>{label}</span>
      {value && <span className="text-[14px] text-ink-faint truncate max-w-[45%]">{value}</span>}
      {onClick && <ChevronDown className="w-4 h-4 text-ink-faint shrink-0 -rotate-90" aria-hidden />}
    </button>
  )
}
