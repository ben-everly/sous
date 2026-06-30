// The email OTP `type` values this app verifies, in one place so call sites share the
// constants instead of bare strings.
export const OTP_TYPES = {
  // Verified against the local stack (GoTrue major_version 17): a signup confirmation
  // token's verification_type is `signup`; verifyOtp also accepts `email`, but `signup`
  // is what GoTrue emits and matches the SDK-locked resend type.
  signup: 'signup',
  recovery: 'recovery',
} as const

export type OtpType = (typeof OTP_TYPES)[keyof typeof OTP_TYPES]
