import { cn } from './ui'

/**
 * The drawn parts of the app.
 *
 * Everything here is inline SVG rather than an image file, and that is a
 * delivery decision more than an aesthetic one. A rider opens this in a
 * stairwell, on a dead spot between halls, on a plan they are rationing. An
 * empty state that arrives as a 40KB PNG is an empty state that shows a
 * broken-image icon exactly when the app is trying to explain itself.
 *
 * These cost nothing, scale to any screen, inherit the palette, and render
 * from the precached shell with no network at all.
 */

/* ── The mark ────────────────────────────────────────────────────────────── */

/*
 * Both paths are traced from the artwork in public/icons (shortlogo.png and
 * full-logo.png), so the app icon on a rider's home screen and the mark
 * inside the app are the same object.
 *
 * The logo is lemon — the same #AFFF00 as volt. It always sits on void or a
 * dark surface, never on a volt tile: lemon on lemon is simply not there.
 */
const MARK_PATH =
  'M25.16 47.95C24.13 47.91 22.81 47.76 22.07 47.6C19.16 46.97 16.68 45.3 14.72 42.68C13.3 40.77 12.76 39.25 12.12 35.36C11.93 34.19 11.56 31.96 11.29 30.4C11.03 28.84 10.65 26.55 10.45 25.32C10.25 24.09 9.89 21.93 9.65 20.52C9.41 19.11 9.03 16.83 8.8 15.44C8.2 11.75 7.99 10.76 7.67 10.11C7 8.74 5.43 7.76 3.88 7.76C2.88 7.76 1.89 7.34 1.15 6.6C0.33 5.79 -0.05 4.79 0.02 3.68C0.13 2.06 1.05 0.78 2.42 0.33C3.57 -0.05 6.07 -0.09 7.66 0.23C9.78 0.67 11.48 1.62 13.12 3.27C14.51 4.67 15.46 6.34 16 8.32C16.18 8.99 16.96 13.55 17.16 15.12C17.33 16.48 18.52 23.52 19.2 27.2C19.5 28.85 19.86 30.94 20 31.84C20.6 35.85 20.92 36.76 22.16 38C22.8 38.64 23.51 39.07 24.36 39.33C24.8 39.47 25.17 39.48 28.48 39.48C32.47 39.48 32.78 39.45 33.72 38.99C34.58 38.57 35.36 37.49 35.6 36.39C35.77 35.64 35.68 34.69 35.38 34.05C35.07 33.39 34.24 32.52 33.62 32.21C32.67 31.73 32.62 31.73 27.66 31.72C23.67 31.72 23.11 31.71 23 31.6C22.92 31.51 22.72 30.52 22.36 28.4C22.07 26.7 21.76 24.9 21.66 24.38C21.52 23.61 21.51 23.43 21.6 23.32C21.69 23.21 22.21 23.2 25.99 23.2C30.72 23.2 30.88 23.18 31.78 22.71C32.42 22.36 33.15 21.57 33.51 20.81C33.76 20.29 33.8 20.11 33.83 19.48C33.86 18.65 33.7 18.04 33.24 17.27C32.92 16.75 32.24 16.08 31.78 15.85C30.99 15.45 30.88 15.44 25.5 15.44C22.43 15.44 20.41 15.41 20.33 15.36C20.13 15.26 20.03 14.96 19.92 14.24C19.88 13.91 19.62 12.28 19.35 10.62C19.08 8.96 18.88 7.51 18.91 7.4C19.02 6.96 18.79 6.98 25.72 7.04C31.66 7.1 32.18 7.12 33 7.27C35.18 7.67 36.88 8.53 38.42 9.99C41.01 12.45 42.34 15.91 42.07 19.49C41.92 21.57 41.28 23.44 40.09 25.28C39.91 25.56 39.76 25.86 39.76 25.95C39.76 26.06 40.06 26.41 40.59 26.93C42.52 28.8 43.6 30.9 44.09 33.68C44.27 34.66 44.22 36.83 44.01 37.82C43.44 40.48 41.92 43.06 39.8 44.95C38.26 46.33 36.06 47.37 33.96 47.72C32.6 47.95 28.37 48.06 25.16 47.95Z'

const WORDMARK_PATH =
  'M19.94 39.89C17.52 39.69 15.41 38.79 13.73 37.23C13 36.55 11.99 35.26 11.51 34.41C10.7 32.96 10.56 32.28 8.67 20.92C7.68 15.01 6.8 9.85 6.72 9.47C6.5 8.52 6.23 8.02 5.61 7.46C4.92 6.82 4.32 6.57 3.19 6.46C1.75 6.31 0.92 5.79 0.3 4.62C0.11 4.26 0.06 3.98 0.06 3.22C0.06 2.38 0.09 2.21 0.39 1.68C1.1 0.38 1.88 0.06 4.28 0.06C6.23 0.06 7.04 0.23 8.39 0.89C10.6 1.96 12.32 3.93 13.1 6.28C13.38 7.12 14.01 10.46 14.27 12.5C14.4 13.47 15.55 20.31 15.94 22.44C16.15 23.57 16.5 25.55 16.71 26.83C16.92 28.12 17.18 29.43 17.27 29.74C17.54 30.6 18.29 31.64 19 32.13C20.1 32.88 20.35 32.91 24.02 32.86C26.41 32.83 27.4 32.77 27.72 32.66C28.39 32.43 29.26 31.51 29.51 30.77C29.94 29.5 29.68 28.35 28.78 27.44C27.85 26.51 27.82 26.51 23.23 26.44C19.8 26.4 19.18 26.36 19.1 26.22C18.95 25.96 17.89 19.51 17.98 19.42C18.02 19.38 19.78 19.33 21.89 19.31C25.52 19.28 25.75 19.27 26.23 19.04C26.89 18.74 27.48 18.15 27.85 17.41C28.6 15.96 27.92 14 26.4 13.19C25.96 12.95 25.8 12.94 21.41 12.89C17.86 12.85 16.86 12.8 16.79 12.69C16.68 12.5 15.78 6.96 15.78 6.44C15.78 6.22 15.83 6 15.88 5.94C16.03 5.79 25.89 5.85 27.02 6C29.55 6.35 31.5 7.48 33.01 9.48C34.4 11.31 35.04 13.21 35.04 15.5C35.04 17.52 34.53 19.26 33.46 20.94C33.27 21.24 33.11 21.55 33.11 21.63C33.11 21.72 33.42 22.07 33.79 22.42C35.44 23.96 36.5 26.15 36.77 28.57C37.1 31.53 36.06 34.4 33.8 36.8C32.05 38.66 29.98 39.62 27.21 39.88C25.81 40.01 21.51 40.01 19.94 39.89ZM67.87 28C67.41 27.86 66.91 27.47 66.69 27.07C66.52 26.75 66.49 26.11 66.44 20.14L66.39 13.56L67.47 13.56L68.55 13.56L68.58 19.68L68.61 25.8L68.89 26.02C69.17 26.25 69.53 26.25 70.46 26.04C70.74 25.98 70.75 26 70.89 26.71C70.96 27.11 71 27.51 70.96 27.6C70.83 27.950 68.63 28.23 67.87 28ZM75.5 27.95C74.04 27.59 72.82 26.57 72.14 25.14C71.72 24.28 71.72 24.27 71.72 22.83C71.72 21.4 71.72 21.38 72.14 20.52C74.24 16.12 80.8 16.74 82.06 21.46C82.25 22.16 82.27 23.4 82.1 24.11C81.8 25.43 80.74 26.84 79.59 27.47C78.47 28.08 76.8 28.28 75.5 27.95ZM95.7 27.9C94.97 27.63 94.23 27.12 93.8 26.59L93.45 26.17L93.45 27.03L93.44 27.89L92.5 27.89L91.56 27.89L91.56 20.72L91.56 13.56L92.61 13.56L93.67 13.56L93.67 16.56C93.67 18.21 93.7 19.55 93.75 19.55C93.8 19.55 93.97 19.35 94.14 19.1C94.55 18.51 95.64 17.82 96.42 17.66C98.48 17.23 100.43 18.24 101.38 20.22C102.75 23.09 101.69 26.45 99.02 27.7C98.05 28.15 96.61 28.24 95.7 27.9ZM123.83 27.96C123.15 27.74 122.76 27.5 122.32 27.04C121.67 26.36 121.51 25.94 121.5 25C121.5 23.93 121.82 23.24 122.62 22.64C123.53 21.94 124.37 21.72 126 21.74C126.84 21.75 127.62 21.82 127.97 21.92L128.56 22.08L128.55 21.62C128.55 19.8 127.13 18.89 125.02 19.34C124.71 19.4 124.08 19.66 123.61 19.9C123.13 20.14 122.73 20.32 122.72 20.31C122.7 20.29 122.54 19.97 122.35 19.59L122 18.89L122.58 18.56C124.34 17.54 126.63 17.27 128.25 17.89C129.09 18.2 130 19.04 130.35 19.8C130.59 20.36 130.61 20.55 130.67 23.15C130.72 25.72 130.74 25.92 130.94 26.06C131.06 26.15 131.2 26.22 131.25 26.22C131.3 26.22 131.33 26.61 131.31 27.08L131.28 27.94L130.47 27.98C129.67 28.01 129.65 28 129.27 27.63C128.98 27.33 128.89 27.15 128.89 26.84C128.89 26.36 128.8 26.35 128.38 26.79C127.37 27.85 125.24 28.4 123.83 27.96ZM142.59 27.94C142.03 27.73 141.5 27.16 141.34 26.59C141.27 26.34 141.22 24.79 141.22 22.75L141.22 19.33L140.56 19.33L139.89 19.33L139.89 18.5L139.89 17.67L140.56 17.67L141.22 17.67L141.22 16L141.22 14.33L142.33 14.33L143.44 14.33L143.44 16L143.44 17.67L144.56 17.67L145.67 17.67L145.67 18.5L145.67 19.33L144.56 19.33L143.44 19.33L143.45 22.42C143.45 24.67 143.49 25.55 143.59 25.68C143.94 26.14 144.68 26.24 145.45 25.93C145.71 25.83 145.94 25.79 145.99 25.85C146.14 26.01 146.44 27.38 146.35 27.47C146.31 27.51 145.97 27.66 145.61 27.79C144.73 28.1 143.23 28.17 142.59 27.94ZM53.33 20.89L53.33 13.87L57.31 13.91C61.19 13.94 61.29 13.95 61.8 14.2C62.74 14.66 63.42 15.61 63.66 16.81C63.94 18.17 63.33 19.77 62.25 20.45L61.79 20.74L62.34 21C63 21.31 63.71 22.050 64.02 22.73C64.35 23.48 64.41 24.61 64.16 25.4C63.89 26.28 63 27.18 62.05 27.57C61.4 27.83 61.32 27.83 57.36 27.87L53.33 27.9L53.33 20.89ZM84.14 22.81L84.17 17.72L85.19 17.69L86.22 17.66L86.22 18.73L86.22 19.8L86.59 19.26C87.29 18.25 88.48 17.56 89.52 17.56L90.01 17.56L89.98 18.53L89.94 19.5L89.31 19.58C88.16 19.72 87.22 20.26 86.67 21.09L86.33 21.59L86.33 24.74L86.33 27.89L85.22 27.89L84.11 27.89L84.14 22.81ZM103.89 22.78L103.89 17.67L104.89 17.67L105.89 17.67L105.89 18.68L105.89 19.7L106.22 19.24C106.63 18.67 107.45 18.07 108.11 17.83C108.39 17.73 108.96 17.62 109.39 17.59C110.89 17.47 111.96 18.04 112.49 19.24L112.73 19.78L113.14 19.22C113.98 18.1 115.37 17.49 116.85 17.58C118.31 17.67 119.16 18.47 119.5 20.06C119.62 20.65 119.66 21.68 119.66 24.36L119.67 27.89L118.56 27.89L117.46 27.89L117.42 24.36C117.39 20.89 117.38 20.83 117.13 20.38C116.78 19.77 116.34 19.53 115.61 19.53C114.63 19.54 113.66 20.23 113.12 21.3C112.9 21.74 112.89 21.94 112.89 24.83L112.89 27.89L111.78 27.89L110.67 27.89L110.67 24.63C110.67 21.02 110.6 20.52 110.02 19.96C109 18.98 107.14 19.65 106.29 21.3C106.14 21.61 106.11 22.1 106.11 24.77L106.11 27.89L105 27.89L103.89 27.89L103.89 22.78ZM133.33 22.78L133.33 17.67L134.33 17.67L135.33 17.67L135.34 18.75C135.34 19.8 135.35 19.83 135.53 19.56C136.33 18.38 137.58 17.56 138.58 17.56L139.11 17.56L139.11 18.54L139.11 19.52L138.5 19.59C137.39 19.7 136.13 20.45 135.71 21.24C135.59 21.48 135.56 22.2 135.56 24.72L135.56 27.89L134.44 27.89L133.33 27.89L133.33 22.78ZM127.2 26.1C128.14 25.64 128.56 25.03 128.56 24.09L128.56 23.45L127.92 23.26C127.03 22.99 125.44 22.99 124.76 23.26C124 23.550 123.56 24.1 123.56 24.74C123.56 26.34 125.35 27 127.2 26.1ZM78.24 25.91C80.57 24.69 80.55 20.9 78.2 19.73C76.73 19 75.06 19.63 74.2 21.25C73.98 21.65 73.94 21.89 73.94 22.83C73.94 23.83 73.98 24.01 74.24 24.51C74.59 25.17 75.38 25.91 75.91 26.08C76.11 26.15 76.58 26.2 76.96 26.21C77.5 26.22 77.76 26.16 78.24 25.91ZM97.83 25.96C99.3 25.26 100.03 23.62 99.62 21.98C99.21 20.41 98.13 19.45 96.75 19.45C95.68 19.44 94.87 19.91 94.1 20.98L93.67 21.59L93.67 22.91C93.67 24.44 93.8 24.83 94.57 25.48C95.46 26.25 96.8 26.45 97.83 25.96ZM60.81 25.85C61.3 25.65 61.86 24.98 61.95 24.5C62.08 23.84 61.95 23.04 61.64 22.58C61.14 21.83 60.91 21.78 58.07 21.78L55.56 21.78L55.56 23.89L55.56 26L58 26C59.81 26 60.55 25.96 60.81 25.85ZM60.59 19.67C61.51 19.04 61.78 17.76 61.2 16.76C60.72 15.94 60.51 15.89 57.84 15.89L55.56 15.89L55.56 17.95L55.56 20.02L57.87 19.98C60.12 19.950 60.19 19.94 60.59 19.67Z'

/** The short mark. Lemon by default; pass a text colour to override. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44.24 48" className={cn('text-volt shrink-0', className)} aria-hidden>
      <path fill="currentColor" d={MARK_PATH} />
    </svg>
  )
}

/**
 * The full Blorbmart logo with "Rider" set beside it in ink — not volt, since
 * the logo already carries the lemon and a second lemon word would read as
 * part of the name.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 146.44 40" className="h-8 w-auto text-volt shrink-0" role="img" aria-label="Blorbmart">
        <path fill="currentColor" fillRule="evenodd" d={WORDMARK_PATH} />
      </svg>
      <span className="font-display font-bold text-[15px] tracking-[-0.02em] leading-none text-ink">Rider</span>
    </span>
  )
}

/* ── Ambient light ───────────────────────────────────────────────────────── */

/**
 * The coloured haze behind a hero panel.
 *
 * Two blurred blobs on a slow drift. It is the cheapest way to give a dark
 * screen depth, and unlike a background image it recolours with the section
 * it sits in — volt over the wallet, ember over a cash decision, iris over
 * everything that is simply Blorbmart.
 *
 * The mask is the important part. A header with `overflow-hidden` cuts the
 * haze off at its own bottom edge, which draws a hard horizontal seam right
 * across the screen where the colour stops. Fading the field out over its
 * last third means the panel dissolves into the void instead, and the header
 * no longer needs a border, a shadow or a matching background to hide the
 * join — there is nothing to hide.
 *
 * Kept deliberately faint. At the intensity this started on, volt tinted the
 * stat cards below it green and ember turned the whole delivery header
 * orange; ambient light should be felt rather than read.
 */
export function GlowField({
  tone = 'iris',
  className,
}: {
  tone?: 'iris' | 'volt' | 'ember' | 'mixed'
  className?: string
}) {
  const pairs: Record<string, [string, string]> = {
    iris: ['#5156F1', '#3A3FD4'],
    volt: ['#AFFF00', '#5156F1'],
    ember: ['#FF5500', '#FFC200'],
    mixed: ['#5156F1', '#AFFF00'],
  }
  const [a, b] = pairs[tone]
  const fade = 'linear-gradient(180deg, #000 0%, #000 55%, rgba(0,0,0,0.45) 78%, transparent 100%)'

  return (
    <div
      className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}
      style={{ maskImage: fade, WebkitMaskImage: fade }}
      aria-hidden
    >
      <div
        className="absolute -top-28 -left-20 w-72 h-72 rounded-full blur-[72px] opacity-[0.22] drift"
        style={{ background: a }}
      />
      <div
        className="absolute -top-10 -right-16 w-64 h-64 rounded-full blur-[80px] opacity-[0.14] drift-slow"
        style={{ background: b }}
      />
    </div>
  )
}

/* ── Scenes ──────────────────────────────────────────────────────────────── */

/**
 * Waiting for work.
 *
 * A sweep over concentric rings with the rider at the centre. It says "we are
 * looking" rather than "there is nothing", which is the difference between a
 * rider staying online for another ten minutes and closing the app.
 */
export function RadarScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden>
      <defs>
        <radialGradient id="radar-sweep" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#AFFF00" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#AFFF00" stopOpacity="0" />
        </radialGradient>
      </defs>

      {[78, 58, 38].map((r, i) => (
        <circle
          key={r}
          cx="100"
          cy="100"
          r={r}
          stroke="#26333A"
          strokeWidth="1.5"
          strokeDasharray={i === 1 ? '4 6' : undefined}
        />
      ))}

      <path d="M100 100 L100 22 A78 78 0 0 1 155 45 Z" fill="url(#radar-sweep)">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 100 100"
          to="360 100 100"
          dur="4s"
          repeatCount="indefinite"
        />
      </path>

      {/* Restaurants somewhere out there, blinking out of sync so the field
          feels populated rather than decorated. */}
      {[
        [148, 62, '0s'],
        [56, 74, '1.1s'],
        [132, 140, '2.2s'],
        [64, 138, '0.6s'],
      ].map(([cx, cy, delay]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="#5156F1">
          <animate
            attributeName="opacity"
            values="0.25;1;0.25"
            dur="3s"
            begin={delay as string}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* The rider at the centre: the mark on void inside a volt ring, since
          the lemon mark on a volt disc would vanish. */}
      <circle cx="100" cy="100" r="16" fill="#0A0F12" stroke="#AFFF00" strokeWidth="2" />
      <path d={MARK_PATH} fill="#AFFF00" transform="translate(91.7 91) scale(0.375)" />
    </svg>
  )
}

/**
 * Offline.
 *
 * A campus skyline asleep. Deliberately warm and quiet rather than an error
 * icon — being offline is a choice the rider made, not a fault to apologise
 * for, and the screen should look like a night off.
 */
export function NightScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 140" className={className} fill="none" aria-hidden>
      <defs>
        <linearGradient id="night-sky" x1="120" y1="0" x2="120" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5156F1" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5156F1" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="240" height="140" fill="url(#night-sky)" rx="16" />

      {[
        [22, 12, '1.4s'],
        [62, 30, '2.6s'],
        [186, 20, '1.9s'],
        [214, 46, '3.1s'],
        [140, 14, '2.2s'],
      ].map(([cx, cy, dur]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="#F1F6F8" opacity="0.7">
          <animate attributeName="opacity" values="0.2;0.85;0.2" dur={dur as string} repeatCount="indefinite" />
        </circle>
      ))}

      <circle cx="196" cy="34" r="15" fill="#FFC200" opacity="0.9" />
      <circle cx="189" cy="29" r="15" fill="#0A0F12" />

      {/* Hostel blocks. A couple of lit windows, because somebody is always
          awake and that is who orders at 1am. */}
      {[
        [10, 88, 34, 52],
        [50, 74, 28, 66],
        [84, 96, 40, 44],
        [130, 66, 32, 74],
        [168, 90, 26, 50],
        [200, 78, 32, 62],
      ].map(([x, y, w, h]) => (
        <rect key={x} x={x} y={y} width={w} height={h} rx="4" fill="#131C21" stroke="#26333A" strokeWidth="1.5" />
      ))}

      {[
        [58, 86],
        [66, 100],
        [138, 78],
        [146, 96],
        [208, 90],
        [18, 100],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" rx="1.5" fill="#FFC200" opacity="0.55" />
      ))}

      <rect x="0" y="132" width="240" height="8" rx="4" fill="#131C21" />
    </svg>
  )
}

/**
 * The wallet, empty.
 *
 * A card with nothing in it and a coin on its way. Shown once, before the
 * first delivery — after that this screen has real rows and never appears.
 */
export function WalletScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" className={className} fill="none" aria-hidden>
      <rect x="28" y="52" width="144" height="78" rx="16" fill="#131C21" stroke="#26333A" strokeWidth="2" />
      <rect x="28" y="72" width="144" height="14" fill="#26333A" />
      <rect x="44" y="100" width="52" height="8" rx="4" fill="#26333A" />
      <rect x="44" y="114" width="32" height="6" rx="3" fill="#1E2A31" />

      <g>
        <circle cx="146" cy="46" r="24" fill="#AFFF00" />
        <text
          x="146"
          y="56"
          textAnchor="middle"
          fill="#0A0F12"
          fontSize="26"
          fontWeight="700"
          fontFamily="Space Grotesk, sans-serif"
        >
          ₦
        </text>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -6; 0 0"
          dur="3.2s"
          repeatCount="indefinite"
        />
      </g>

      <path d="M64 40 l6 -12 6 12" stroke="#5156F1" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <circle cx="42" cy="30" r="3" fill="#5156F1" opacity="0.5" />
    </svg>
  )
}

/**
 * A finished delivery.
 *
 * Rings expanding out of a tick. This plays once, full screen, at the only
 * moment in the app where a rider has definitively won — it is allowed to be
 * louder than anything else here.
 */
export function BurstScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden>
      {[0, 1, 2].map((i) => (
        <circle key={i} cx="100" cy="100" r="46" stroke="#0A0F12" strokeWidth="2" opacity="0.35">
          <animate
            attributeName="r"
            values="46;92"
            dur="2.4s"
            begin={`${i * 0.8}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.4;0"
            dur="2.4s"
            begin={`${i * 0.8}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* Confetti, thrown outward on fixed vectors so it never lands on the
          tick and never needs a physics loop. */}
      {[
        [40, 44, '#5156F1', -20],
        [160, 52, '#FF5500', 34],
        [46, 154, '#FFC200', 12],
        [158, 148, '#5156F1', -48],
        [100, 28, '#FF5500', 8],
        [30, 100, '#FFC200', -32],
      ].map(([x, y, fill, rot], i) => (
        <rect
          key={i}
          x={x as number}
          y={y as number}
          width="9"
          height="9"
          rx="2"
          fill={fill as string}
          transform={`rotate(${rot} ${x} ${y})`}
        >
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="2.4s"
            begin={`${i * 0.28}s`}
            repeatCount="indefinite"
          />
        </rect>
      ))}

      <circle cx="100" cy="100" r="44" fill="#0A0F12" />
      <path
        d="M80 100 l14 15 27 -32"
        stroke="#AFFF00"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Nothing delivered yet.
 *
 * A route from a store to a door with the middle still dashed — the shape of
 * the job, drawn as something not yet done.
 */
export function RouteScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 120" className={className} fill="none" aria-hidden>
      <path
        d="M34 78 C 70 20, 150 108, 186 44"
        stroke="#26333A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="7 9"
      />
      <path
        d="M34 78 C 70 20, 150 108, 186 44"
        stroke="#AFFF00"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="160 400"
        strokeDashoffset="160"
      >
        <animate attributeName="stroke-dashoffset" values="160;-400" dur="4s" repeatCount="indefinite" />
      </path>

      <circle cx="34" cy="78" r="14" fill="#131C21" stroke="#5156F1" strokeWidth="2.5" />
      <rect x="28" y="72" width="12" height="12" rx="2.5" fill="#5156F1" />

      <circle cx="186" cy="44" r="14" fill="#131C21" stroke="#FF5500" strokeWidth="2.5" />
      <path d="M186 37 l7 9 -7 9 -7 -9z" fill="#FF5500" />
    </svg>
  )
}

/**
 * A step marker for the recruitment page — a big numeral with the mark in
 * its corner, so the marketing page carries the same mark as the app icon.
 */
export function StepBadge({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        'relative w-12 h-12 shrink-0 rounded-2xl bg-raised border border-line',
        'flex items-center justify-center font-display font-bold text-[17px] tnum',
        className,
      )}
    >
      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-lg bg-void border border-line flex items-center justify-center">
        <BrandMark className="w-2.5 h-2.5" />
      </span>
      {n}
    </span>
  )
}
