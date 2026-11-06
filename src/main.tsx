import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'
import { startSeasonalIcon } from './lib/seasonalIcon'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// After render, not before. Analytics waits for an idle moment so it never
// competes with the first paint of the recruitment page.
initAnalytics()

// The tab icon follows the season an admin has scheduled.
void startSeasonalIcon()
