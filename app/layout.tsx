import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'MyDailySales',
  description: 'Know your numbers. Every day.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MyDailySales',
  },
}

export const viewport: Viewport = {
  themeColor: '#00C853',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#111711',
              color: '#F0F4F0',
              border: '1px solid #2A362A',
              borderRadius: '12px',
            },
            success: {
              iconTheme: { primary: '#00C853', secondary: '#0A0F0A' },
            },
          }}
        />
      </body>
    </html>
  )
}
