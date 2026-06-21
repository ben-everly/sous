import { z } from 'zod'

// GoTrue is the real boundary; mirror this in supabase/config.toml's minimum_password_length.
export const MIN_PASSWORD_LENGTH = 8

const email = z.email('Enter a valid email address.')
const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)

const passwordsMatch = (data: { password: string; confirmPassword: string }) =>
  data.password === data.confirmPassword
const matchError = { message: 'Passwords do not match.', path: ['confirmPassword'] }

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
})

export const signUpSchema = z
  .object({ email, password, confirmPassword: z.string() })
  .refine(passwordsMatch, matchError)

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine(passwordsMatch, matchError)

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
