// Single source for the email OTP `type` values this app verifies. Mirrors AUTH_PATHS:
// the verifyEmailToken allowlist derives from Object.values(OTP_TYPES) (see verify-email-token.ts),
// so there is no parallel array to keep in sync.
export const OTP_TYPES = {
  // Verified against the local stack (GoTrue major_version 17): a signup confirmation
  // token's verification_type is `signup`; verifyOtp also accepts `email`, but `signup`
  // is what GoTrue emits and matches the SDK-locked resend type.
  signup: 'signup',
  recovery: 'recovery',
} as const

export type OtpType = (typeof OTP_TYPES)[keyof typeof OTP_TYPES]
