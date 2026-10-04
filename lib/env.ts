import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

const origin = z.url().refine((v) => new URL(v).origin === v, 'must be a bare origin')

export const env = createEnv({
  server: {
    SUPABASE_SECRET_KEY: z.string().min(1),
    SITE_URL:
      process.env.NODE_ENV === 'production' ? origin : origin.default('http://localhost:3000'),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  },
  runtimeEnv: {
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SITE_URL: process.env.SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
})
