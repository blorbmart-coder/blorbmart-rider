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

/**
 * The Blorbmart bolt, straight off the favicon so the app icon on a rider's
 * home screen and the mark inside the app are the same object.
 */
export function BoltMark({ className, gradient }: { className?: string; gradient?: boolean }) {
  const id = gradient ? 'bolt-grad' : undefined
  return (
    <svg viewBox="0 0 48 46" fill="none" className={className} aria-hidden>
      {gradient && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="48" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#AFFF00" />
            <stop offset="1" stopColor="#5156F1" />
          </linearGradient>
        </defs>
      )}
      <path
        fill={gradient ? `url(#${id})` : 'currentColor'}
        d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="w-8 h-8 rounded-xl bg-volt flex items-center justify-center shrink-0">
        <BoltMark className="w-[15px] h-[15px] text-void" />
      </span>
      <span className="font-display font-bold text-[15px] tracking-[-0.02em] leading-none">
        Blorbmart<span className="text-volt"> Rider</span>
      </span>
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

      <circle cx="100" cy="100" r="16" fill="#AFFF00" />
      <path
        d="M101.9 108.9c-.24.3-.73.14-.73-.25v-3.72a.82.82 0 0 0-.82-.82h-3.4c-.33 0-.53-.38-.33-.65l2.71-3.79c.39-.54 0-1.3-.67-1.3h-5c-.33 0-.53-.38-.33-.65l3.5-4.9a.41.41 0 0 1 .33-.17h10.46c.33 0 .53.38.33.65l-2.7 3.79c-.4.54 0 1.3.66 1.3h4.12c.34 0 .53.39.32.66l-8.45 9.85z"
        fill="#0A0F12"
      />
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
 * A step marker for the recruitment page — a big numeral in a bolt-shaped
 * badge, so the marketing page carries the same mark as the app icon.
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
      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-lg bg-volt flex items-center justify-center">
        <BoltMark className="w-2.5 h-2.5 text-void" />
      </span>
      {n}
    </span>
  )
}
