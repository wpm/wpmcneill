import type { Metadata, Viewport } from 'next'
import { EB_Garamond } from 'next/font/google'
import './globals.css'

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'W.P. McNeill',
  description: 'Natural language systems, AI, and philosophy.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={ebGaramond.className}>{children}</body>
    </html>
  )
}
