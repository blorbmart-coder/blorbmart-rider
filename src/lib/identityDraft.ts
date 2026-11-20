/**
 * What a rider has typed and uploaded on the student-ID step, kept on the
 * device until it is sent.
 *
 * Phones kill the browser behind the camera — often on the selfie — and the
 * page comes back empty, so a rider who had already uploaded their ID photo
 * starts again and gives up. The draft brings back the name, matric number
 * and every photo that finished uploading. Same idea as the marketplace
 * seller form (SellerVerifyScreen in the shop).
 */

export interface IdentityDraft {
  fullName: string
  matricNumber: string
  selfieUrl: string | null
  idImageUrl: string | null
}

const KEY = (uid: string) => `blorbmart.rider.identityDraft.${uid}`
/** A draft older than this is somebody's abandoned attempt, not an interrupted one. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export function loadIdentityDraft(uid: string | undefined): IdentityDraft | null {
  if (!uid) return null
  try {
    const raw = localStorage.getItem(KEY(uid))
    if (!raw) return null
    const parsed = JSON.parse(raw) as IdentityDraft & { savedAt?: number }
    if (!parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) return null
    return {
      fullName: String(parsed.fullName || ''),
      matricNumber: String(parsed.matricNumber || ''),
      selfieUrl: parsed.selfieUrl || null,
      idImageUrl: parsed.idImageUrl || null,
    }
  } catch {
    return null
  }
}

export function saveIdentityDraft(uid: string | undefined, draft: IdentityDraft) {
  if (!uid) return
  try {
    localStorage.setItem(KEY(uid), JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    /* private mode or full storage: the form still works, it just won't survive a reload */
  }
}

export function clearIdentityDraft(uid: string | undefined) {
  if (!uid) return
  try {
    localStorage.removeItem(KEY(uid))
  } catch {
    /* nothing to clear */
  }
}

/** Same rules as the backend (riderService.studentIdentity). */
export const cleanMatric = (value: string) => value.replace(/\s+/g, '').toUpperCase()
export const matricLooksValid = (value: string) => /^[A-Z0-9/\-.]{4,24}$/.test(cleanMatric(value))
export const nameLooksValid = (value: string) => {
  const name = value.replace(/\s+/g, ' ').trim()
  return name.length >= 3 && name.length <= 80
}
