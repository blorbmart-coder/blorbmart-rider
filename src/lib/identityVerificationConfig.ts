export const identityVerificationEnabled =
  String(import.meta.env.VITE_IDENTITY_VERIFICATION_ENABLED || '').toLowerCase() === 'true'
