import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The recovery link carries a single-use token_hash in the query string. no-referrer
        // keeps it out of the Referer header on any request the page makes (OWASP's named
        // mitigation for reset-page referrer leakage).
        source: '/reset-password',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ]
  },
}

export default nextConfig
