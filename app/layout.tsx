import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Sous - Home Kitchen Management',
  description: 'Manage your kitchen inventory, recipes, and meal plans.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <noscript>
          <p className="text-muted-foreground p-4 text-center text-sm">
            Sous requires JavaScript. Enable it and reload the page.
          </p>
        </noscript>
        {children}
      </body>
    </html>
  )
}
