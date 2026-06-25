import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    // Both links land with a single-use token_hash in the query string. no-referrer keeps it
    // out of the Referer header on any request these pages make (OWASP's named mitigation for
    // token-bearing-page referrer leakage).
    return ['/reset-password', '/auth/confirm'].map((source) => ({
      source,
      headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
    }))
  },
}

export default nextConfig
