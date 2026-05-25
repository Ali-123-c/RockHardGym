import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'ROCK HARD GYM — Gym Management System',
  description: 'Modern gym management with member tracking, attendance, and payments.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 antialiased noise">
        <Navbar />
        <main>{children}</main>
        <Toaster
          theme="light"
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#0f172a',
            },
          }}
        />
      </body>
    </html>
  )
}
