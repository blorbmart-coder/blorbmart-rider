import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CloudOff, History, LayoutGrid, User, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from './ui'
import { useOnlineStatus } from '../hooks/usePresence'

/**
 * Four tabs, and no more.
 *
 * A rider glances at this while moving. Five is the usual ceiling for a
 * bottom bar; four keeps every target comfortably above 44px on the narrowest
 * phone this app will ever run on, with room for the label underneath.
 */
const TABS = [
  { to: '/', label: 'Jobs', icon: LayoutGrid, end: true },
  { to: '/earnings', label: 'Wallet', icon: Wallet, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
  { to: '/account', label: 'You', icon: User, end: false },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus()
  const location = useLocation()

  return (
    <div className="relative min-h-screen bg-void">
      {/*
        Losing signal mid-delivery is normal here, not exceptional — a
        stairwell, a basement canteen, a dead spot between halls. Saying so
        plainly stops a rider tapping "Delivered" five times and assuming the
        app ate their money.
      */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -60 }}
            animate={{ y: 0 }}
            exit={{ y: -60 }}
            role="status"
            className="fixed top-0 inset-x-0 z-50 bg-gold text-void text-[13px] font-bold pad-top-safe"
          >
            <div className="flex items-center justify-center gap-2 py-2.5">
              <CloudOff className="w-4 h-4" strokeWidth={2.5} aria-hidden />
              No connection — we&rsquo;ll sync when you&rsquo;re back
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pb-[calc(96px+env(safe-area-inset-bottom))]">{children}</div>

      {/*
        A floating dock rather than an edge-to-edge bar.

        Two reasons, both practical. It lifts the targets clear of the iPhone
        home indicator without needing a taller bar, and the gap underneath
        lets content scroll visibly past it, so a rider can tell there is more
        list below rather than guessing at a hard edge.
      */}
      <nav
        aria-label="Main"
        className="fixed bottom-0 inset-x-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 pointer-events-none"
      >
        <div className="pointer-events-auto mx-auto max-w-md glass border border-white/10 rounded-[26px] p-1.5 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.9)]">
          <div className="flex">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'relative flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 cursor-pointer rounded-[20px]',
                    'transition-colors duration-150',
                    isActive ? 'text-volt' : 'text-ink-faint active:text-ink-soft',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-[20px] bg-volt/12 border border-volt/22"
                        transition={{ type: 'spring', damping: 28, stiffness: 400 }}
                      />
                    )}
                    <tab.icon
                      className="relative w-[21px] h-[21px]"
                      strokeWidth={isActive ? 2.5 : 2}
                      aria-hidden
                    />
                    <span className="relative text-[10px] font-bold uppercase tracking-[0.06em]">
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Screen readers get the route change announced; sighted riders get the
          dock indicator sliding to it. */}
      <span className="sr-only" aria-live="polite">
        {location.pathname}
      </span>
    </div>
  )
}
