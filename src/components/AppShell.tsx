import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CloudOff, History, Home, User, Wallet } from 'lucide-react'
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
  { to: '/', label: 'Jobs', icon: Home, end: true },
  { to: '/earnings', label: 'Wallet', icon: Wallet, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
  { to: '/account', label: 'Account', icon: User, end: false },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-canvas">
      {/*
        Losing signal mid-delivery is normal here, not exceptional — a
        stairwell, a basement canteen, a dead spot between halls. Saying so
        plainly stops a rider tapping "Delivered" five times and assuming the
        app ate their money.
      */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -48 }}
            animate={{ y: 0 }}
            exit={{ y: -48 }}
            role="status"
            className="fixed top-0 inset-x-0 z-50 bg-ink text-white text-[13px] font-bold pad-top-safe"
          >
            <div className="flex items-center justify-center gap-2 py-2">
              <CloudOff className="w-4 h-4" aria-hidden />
              No connection — we&rsquo;ll sync when you&rsquo;re back
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pb-[calc(72px+env(safe-area-inset-bottom))]">{children}</div>

      <nav
        aria-label="Main"
        className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-line pad-bottom-safe"
      >
        <div className="flex">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex-1 min-h-[60px] flex flex-col items-center justify-center gap-1 cursor-pointer relative',
                  'transition-colors duration-150',
                  isActive ? 'text-brand' : 'text-ink-faint active:text-ink-soft',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute top-0 h-[3px] w-8 rounded-full bg-brand"
                      transition={{ type: 'spring', damping: 26, stiffness: 380 }}
                    />
                  )}
                  <tab.icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                  <span className="text-[11px] font-bold">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Page transitions are keyed on the route so the browser back button
          animates the same way as an in-app one. */}
      <span className="sr-only" aria-live="polite">
        {location.pathname}
      </span>
    </div>
  )
}
