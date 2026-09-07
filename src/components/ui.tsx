import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, type LucideIcon } from 'lucide-react'
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

type ButtonVariant = 'primary' | 'action' | 'cash' | 'ghost' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white active:bg-brand-deep shadow-[0_6px_16px_-6px_rgba(31,119,241,0.6)]',
  action: 'bg-action text-white active:bg-action-deep shadow-[0_6px_16px_-6px_rgba(255,90,31,0.65)]',
  cash: 'bg-cash text-white active:bg-cash-deep shadow-[0_6px_16px_-6px_rgba(0,184,148,0.6)]',
  outline: 'bg-white text-ink border border-line active:bg-canvas',
  ghost: 'bg-transparent text-ink-soft active:bg-canvas',
  danger: 'bg-danger-tint text-danger active:bg-danger active:text-white',
}

const SIZES: Record<ButtonSize, string> = {
  // Every size clears the 44px minimum touch target — this app is used
  // one-handed, on the move, sometimes in gloves.
  sm: 'min-h-[44px] px-4 text-sm rounded-xl',
  md: 'min-h-[52px] px-5 text-[15px] rounded-2xl',
  lg: 'min-h-[58px] px-6 text-base rounded-2xl',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: LucideIcon
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon: Icon, fullWidth, className, children, disabled, onClick, ...rest },
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
        'inline-flex items-center justify-center gap-2 font-bold cursor-pointer',
        'transition-[transform,background-color,opacity] duration-150 ease-[var(--ease-out-soft)]',
        'active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : Icon ? <Icon className="w-[18px] h-[18px]" aria-hidden /> : null}
      {children}
    </button>
  )
})

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const interactive = Boolean(onClick)
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
        'bg-surface rounded-[var(--radius-card)] border border-line',
        interactive &&
          'cursor-pointer transition-transform duration-150 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * A money figure.
 *
 * `tnum` on every one of these so a column of amounts in the wallet lines up
 * digit for digit — proportional figures make a list of naira amounts read
 * like a ransom note.
 */
export function Money({
  amount,
  size = 'md',
  tone = 'ink',
  className,
}: {
  amount: number
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero'
  tone?: 'ink' | 'cash' | 'action' | 'brand' | 'white' | 'faint'
  className?: string
}) {
  const sizes = {
    sm: 'text-sm font-bold',
    md: 'text-lg font-extrabold',
    lg: 'text-2xl font-extrabold',
    xl: 'text-[34px] leading-none font-extrabold',
    hero: 'text-[52px] leading-[0.95] font-extrabold tracking-[-0.03em]',
  }
  const tones = {
    ink: 'text-ink',
    cash: 'text-cash',
    action: 'text-action',
    brand: 'text-brand',
    white: 'text-white',
    faint: 'text-ink-faint',
  }
  const symbolSize = size === 'hero' ? 'text-[0.55em]' : size === 'xl' ? 'text-[0.6em]' : 'text-[0.72em]'

  return (
    <span className={cn('tnum inline-flex items-baseline gap-[0.12em]', sizes[size], tones[tone], className)}>
      <span className={cn(symbolSize, 'font-bold opacity-70')}>₦</span>
      {amountOnly(amount)}
    </span>
  )
}

export function Chip({
  children,
  tone = 'neutral',
  icon: Icon,
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'cash' | 'action' | 'warn' | 'danger'
  icon?: LucideIcon
}) {
  const tones = {
    neutral: 'bg-canvas text-ink-soft',
    brand: 'bg-brand-tint text-brand-deep',
    cash: 'bg-cash-tint text-cash-deep',
    action: 'bg-action-tint text-action-deep',
    warn: 'bg-warn-tint text-[#8A5B00]',
    danger: 'bg-danger-tint text-danger',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap',
        tones[tone],
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden />}
      {children}
    </span>
  )
}

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
    <div className="space-y-1.5">
      {/* A visible label, not a placeholder. A placeholder disappears the
          moment someone types, and a rider re-checking a long account number
          then has no idea which field they are in. */}
      <label htmlFor={inputId} className="block text-[13px] font-bold text-ink-soft">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint font-semibold pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'w-full min-h-[52px] rounded-2xl border bg-surface px-4 text-[15px] font-semibold',
            'placeholder:font-medium placeholder:text-ink-faint',
            'outline-none transition-colors duration-150',
            'focus:border-brand focus:ring-4 focus:ring-brand/12',
            error ? 'border-danger' : 'border-line',
            prefix && 'pl-10',
            className,
          )}
          {...rest}
        />
      </div>
      {/* The error sits against the field it belongs to, never collected in a
          banner at the top of the form. */}
      {error ? (
        <p id={`${inputId}-error`} className="text-[13px] font-semibold text-danger">
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
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="block text-[13px] font-bold text-ink-soft">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={Boolean(error)}
        className={cn(
          'w-full min-h-[52px] rounded-2xl border bg-surface px-4 text-[15px] font-semibold appearance-none',
          'outline-none transition-colors duration-150 focus:border-brand focus:ring-4 focus:ring-brand/12',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-[13px] font-semibold text-danger">{error}</p>}
    </div>
  )
})

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} aria-hidden />
}

export function Stat({
  label,
  children,
  icon: Icon,
  tone = 'ink',
}: {
  label: string
  children: ReactNode
  icon?: LucideIcon
  tone?: 'ink' | 'cash' | 'action' | 'brand'
}) {
  const tones = { ink: 'text-ink-faint', cash: 'text-cash', action: 'text-action', brand: 'text-brand' }
  return (
    <div className="bg-surface rounded-[var(--radius-card)] border border-line p-4">
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon className={cn('w-4 h-4', tones[tone])} aria-hidden />}
        <p className="text-[12px] font-bold uppercase tracking-wide text-ink-faint">{label}</p>
      </div>
      {children}
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
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            className="relative w-full max-w-lg bg-surface rounded-t-[var(--radius-sheet)] pad-bottom-safe max-h-[92vh] overflow-y-auto"
          >
            {dismissable && (
              <div className="sticky top-0 bg-surface pt-3 pb-1 flex justify-center rounded-t-[var(--radius-sheet)]">
                <div className="w-10 h-1 rounded-full bg-line" aria-hidden />
              </div>
            )}
            {title && <h2 className="px-5 pt-2 pb-3 text-xl font-extrabold tracking-[-0.01em]">{title}</h2>}
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-16 h-16 rounded-2xl bg-brand-tint flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-brand" aria-hidden />
      </div>
      <p className="font-extrabold text-lg mb-1">{title}</p>
      <p className="text-sm text-ink-soft max-w-xs mx-auto leading-relaxed">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Progress along the trust ladder — the sourcing limit rendered as a goal. */
export function ProgressBar({ value, max, tone = 'brand' }: { value: number; max: number; tone?: 'brand' | 'cash' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      className="h-2 rounded-full bg-line overflow-hidden"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <motion.div
        className={cn('h-full rounded-full', tone === 'cash' ? 'bg-cash' : 'bg-brand')}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}
