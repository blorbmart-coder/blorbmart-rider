import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, IdCard, Loader2, MapPin, Phone, PhoneCall, ScanFace, ShieldAlert } from 'lucide-react'
import {
  errorMessage,
  riderApi,
  safetyApi,
  type Rider,
  type SosState,
} from '../lib/api'
import { pickImages, prepareImage, uploadImage } from '../lib/cloudinary'
import { useRider } from '../contexts/RiderContext'
import { Button, Field, IconBadge, Sheet, cn, tap } from './ui'

/** Safety: the photo check, SOS and the emergency contact. A port of widgets/safety.dart. */

const call = (phone: string) => window.location.assign(`tel:${phone.replace(/[^\d+]/g, '')}`)

/* ── Photos ─────────────────────────────────────────────────────────────── */

/**
 * A selfie and an ID photo side by side, uploading as each is taken. Call the
 * picker straight from the tap: browsers only open a file dialog inside the
 * gesture that asked for it.
 */
export function PhotoPair({
  selfieUrl,
  idUrl,
  onChange,
}: {
  selfieUrl: string | null
  idUrl: string | null
  onChange: (selfieUrl: string | null, idUrl: string | null) => void
}) {
  const [busy, setBusy] = useState<'selfie' | 'id' | null>(null)

  const take = async (which: 'selfie' | 'id') => {
    const [file] = await pickImages({ capture: which === 'selfie' ? 'user' : false })
    if (!file) return
    setBusy(which)
    try {
      const url = await uploadImage(await prepareImage(file, 1600), 'riders')
      if (which === 'selfie') onChange(url, idUrl)
      else onChange(selfieUrl, url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'That photo did not upload. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <PhotoTile
        label="Selfie"
        hint="Face the camera, good light"
        icon={ScanFace}
        url={selfieUrl}
        busy={busy === 'selfie'}
        onClick={() => void take('selfie')}
      />
      <PhotoTile
        label="Your ID"
        hint="Name and photo readable"
        icon={IdCard}
        url={idUrl}
        busy={busy === 'id'}
        onClick={() => void take('id')}
      />
    </div>
  )
}

function PhotoTile({
  label,
  hint,
  icon: Icon,
  url,
  busy,
  onClick,
}: {
  label: string
  hint: string
  icon: typeof ScanFace
  url: string | null
  busy: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        'relative h-[148px] overflow-hidden rounded-[20px] border bg-raised text-center',
        'active:scale-[0.98] transition-transform',
        url ? 'border-volt/40' : 'border-line',
      )}
    >
      {url && <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {(!url || busy) && (
        <span className={cn('absolute inset-0 flex flex-col items-center justify-center gap-1 p-3', url && 'bg-black/55')}>
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-volt" aria-hidden />
          ) : (
            <Icon className="h-6 w-6 text-ink-soft" aria-hidden />
          )}
          <span className="mt-1.5 text-[14px] font-bold">{label}</span>
          <span className="text-[12px] leading-snug text-ink-faint">{busy ? 'Uploading…' : hint}</span>
        </span>
      )}
      {url && !busy && (
        <span className="absolute bottom-2 right-2 rounded-full bg-black/80 px-2.5 py-1 text-[12px] font-bold">Retake</span>
      )}
    </button>
  )
}

/* ── Verification ───────────────────────────────────────────────────────── */

/** The account screen's "get verified" sheet. */
/**
 * Sends the rider to Didit's ID scan and liveness check. Didit brings them
 * back to `returnTo` with ?kyc=done, where the result is read.
 */
export function DiditButton({ returnTo, label = 'Verify my ID' }: { returnTo: '/onboarding' | '/account'; label?: string }) {
  const [opening, setOpening] = useState(false)
  const start = async () => {
    setOpening(true)
    try {
      const { url } = await riderApi.startDidit(returnTo)
      window.location.assign(url)
    } catch (error) {
      toast.error(errorMessage(error, 'Could not start your ID check.'))
      setOpening(false)
    }
  }
  return (
    <Button variant="volt" size="lg" fullWidth icon={ScanFace} loading={opening} onClick={() => void start()}>
      {label}
    </Button>
  )
}

export function VerificationSheet({ open, onClose, rider }: { open: boolean; onClose: () => void; rider: Rider }) {
  const { setRider } = useRider()
  const [selfie, setSelfie] = useState<string | null>(null)
  const [id, setId] = useState<string | null>(null)
  const [idNumber, setIdNumber] = useState(rider.documents?.idNumber ?? '')
  const [sending, setSending] = useState(false)
  const reason = rider.verification?.reason

  const send = async () => {
    if (!selfie || !id) return
    setSending(true)
    try {
      const updated = await riderApi.submitVerification({
        selfieUrl: selfie,
        idImageUrl: id,
        idType: rider.documents?.idType ?? 'Student ID',
        idNumber: idNumber.trim(),
      })
      setRider(updated)
      toast.success('Sent. Campus ops will check your photos.')
      onClose()
    } catch (error) {
      toast.error(errorMessage(error, 'Could not send your photos.'))
    } finally {
      setSending(false)
    }
  }

  if (rider.identityCheck === 'didit') {
    return (
      <Sheet open={open} onClose={onClose} title="Get verified">
        <div className="space-y-5">
          <p className="text-[14px] leading-relaxed text-ink-soft">
            Scan your ID and take a quick video selfie with Didit, our verification partner. It takes about two
            minutes. Once it passes, customers see your photo and a verified mark when you are on the way.
          </p>
          {rider.verificationStatus === 'rejected' && reason && (
            <p className="rounded-2xl border border-ember/30 bg-ember/8 p-3.5 text-[13px] leading-snug text-ember-light">
              Last time: {reason}
            </p>
          )}
          <p className="text-[13px] leading-relaxed text-ink-faint">
            Have your original ID with you, and find good light. Use your phone — the check needs its camera.
          </p>
          <DiditButton returnTo="/account" label={rider.verificationStatus === 'rejected' ? 'Try again' : 'Verify my ID'} />
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title="Get verified">
      <div className="space-y-5">
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Campus ops matches your selfie to your ID. Once they do, customers see your photo and a verified mark when you
          are on the way — which is what makes them open the door.
        </p>
        {rider.verificationStatus === 'rejected' && reason && (
          <p className="rounded-2xl border border-ember/30 bg-ember/8 p-3.5 text-[13px] leading-snug text-ember-light">
            Last time: {reason}
          </p>
        )}
        <PhotoPair
          selfieUrl={selfie}
          idUrl={id}
          onChange={(s, i) => {
            setSelfie(s)
            setId(i)
          }}
        />
        <Field label="ID number" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
        <Button
          variant="volt"
          size="lg"
          fullWidth
          loading={sending}
          disabled={!selfie || !id || !idNumber.trim()}
          onClick={() => void send()}
        >
          Send for checking
        </Button>
      </div>
    </Sheet>
  )
}

/* ── SOS ────────────────────────────────────────────────────────────────── */

/** Where the phone is now, or the trip's last position, or nothing — fast. */
function whereAmI(fallback: GeolocationCoordinates | null): Promise<{ latitude: number; longitude: number; accuracy?: number } | null> {
  const from = (c: GeolocationCoordinates | null) =>
    c ? { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy } : null
  if (!navigator.geolocation) return Promise.resolve(from(fallback))
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(from(fallback)), 6500)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve(from(pos.coords))
      },
      () => {
        clearTimeout(timer)
        resolve(from(fallback))
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30_000 },
    )
  })
}

/**
 * The shield in the delivery screen's header. Opens a sheet rather than
 * firing on tap: a button this easy to reach gets pressed by a pocket, and
 * false alarms are how a real one gets ignored.
 */
export function SosButton({ coords }: { coords: GeolocationCoordinates | null }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose/45 bg-rose/14 px-3 text-[12px] font-bold uppercase tracking-[0.08em] text-rose active:scale-95 transition-transform"
      >
        <ShieldAlert className="h-4 w-4" aria-hidden />
        SOS
      </button>
      <SosSheet open={open} onClose={() => setOpen(false)} coords={coords} />
    </>
  )
}

export function SosSheet({ open, onClose, coords }: { open: boolean; onClose: () => void; coords: GeolocationCoordinates | null }) {
  const [state, setState] = useState<SosState | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const live = state != null && state.status !== 'resolved'

  // An alert raised earlier and still open is shown as live, not re-offered;
  // while live, "acknowledged" arrives without a refresh.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = () =>
      safetyApi
        .mine()
        .then((s) => {
          if (!cancelled) setState(s && s.alertId ? s : null)
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    void load()
    const id = setInterval(() => void load(), 20_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [open])

  const send = async () => {
    setSending(true)
    try {
      const next = await safetyApi.raise(await whereAmI(coords))
      tap([80, 60, 80])
      setState(next)
    } catch (error) {
      toast.error(errorMessage(error, 'Could not send your alert. Call 112 if you are in danger.'))
    } finally {
      setSending(false)
    }
  }

  const safe = async () => {
    if (!state) return
    setClosing(true)
    try {
      await safetyApi.markSafe(state.alertId)
      setState(null)
      toast.success('Glad you are safe. Campus ops has been told.')
      onClose()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setClosing(false)
    }
  }

  const emergency = state?.call.emergency ?? '112'

  return (
    <Sheet open={open} onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-rose" aria-hidden />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3.5 pb-1 pt-2">
            <IconBadge icon={ShieldAlert} tone="danger" size="lg" />
            <h2 className="font-display text-[24px] font-bold leading-tight tracking-[-0.025em]">
              {live ? 'Help is being alerted' : 'Get help now'}
            </h2>
          </div>

          {live && state ? (
            <>
              <p className="pb-3 text-[15px] leading-relaxed text-ink-soft">
                {state.status === 'acknowledged'
                  ? 'Campus ops has your alert and is on it. Get somewhere public and keep your phone on.'
                  : 'Campus ops and the Blorbmart team have your location — and the order and customer’s details if you are on a job. Get somewhere public and keep your phone on.'}
              </p>
              {state.call.campusOps && (
                <Button variant="iris" size="lg" fullWidth icon={Phone} onClick={() => call(state.call.campusOps!.phone)}>
                  Call {state.call.campusOps.name}
                </Button>
              )}
              {state.call.hotline && (
                <Button variant="outline" size="lg" fullWidth icon={Phone} onClick={() => call(state.call.hotline!)}>
                  Call Blorbmart
                </Button>
              )}
              <Button variant="danger" size="lg" fullWidth icon={PhoneCall} onClick={() => call(emergency)}>
                Call {emergency} — emergency
              </Button>
              <Button variant="ghost" fullWidth icon={MapPin} loading={sending} onClick={() => void send()}>
                Send my location again
              </Button>
              <div className="pt-3">
                <Button variant="volt" size="lg" fullWidth icon={CheckCircle2} loading={closing} onClick={() => void safe()}>
                  I’m safe now
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="pb-3 text-[15px] leading-relaxed text-ink-soft">
                This alerts campus ops, the Blorbmart team and your emergency contact right away with where you are —
                and the order and customer’s details if you are on a job. If you are in immediate danger, call{' '}
                {emergency} first.
              </p>
              <Button variant="danger" size="lg" fullWidth icon={ShieldAlert} loading={sending} onClick={() => void send()}>
                Send SOS
              </Button>
              <Button variant="outline" size="lg" fullWidth icon={PhoneCall} onClick={() => call(emergency)}>
                Call {emergency}
              </Button>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}

/* ── Emergency contact ──────────────────────────────────────────────────── */

export function EmergencyContactSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [had, setHad] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoaded(false)
    safetyApi
      .emergencyContact()
      .then((c) => {
        if (cancelled) return
        setName(c?.name ?? '')
        setPhone(c?.phone ?? '')
        setHad(Boolean(c?.phone))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const save = async (clear = false) => {
    setSaving(true)
    try {
      const saved = await safetyApi.saveEmergencyContact(clear ? '' : name.trim(), clear ? '' : phone.trim())
      toast.success(saved?.phone ? 'Emergency contact saved' : 'Emergency contact removed')
      onClose()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Emergency contact">
      <div className="space-y-4">
        <p className="text-[14px] leading-relaxed text-ink-soft">
          If you press SOS during a delivery, we text this person where you are as well as alerting campus ops. Pick
          someone who will pick up.
        </p>
        <Field label="Their name" value={name} placeholder="e.g. Mum" disabled={!loaded} onChange={(e) => setName(e.target.value)} />
        <Field
          label="Their phone number"
          value={phone}
          type="tel"
          inputMode="tel"
          placeholder="0803 123 4567"
          disabled={!loaded}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Button variant="volt" size="lg" fullWidth loading={saving} disabled={!loaded || !phone.trim()} onClick={() => void save()}>
          Save
        </Button>
        {had && (
          <Button variant="ghost" fullWidth disabled={saving} onClick={() => void save(true)}>
            Remove
          </Button>
        )}
      </div>
    </Sheet>
  )
}
