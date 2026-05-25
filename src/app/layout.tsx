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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-[#080810] text-slate-200 antialiased noise">
        <Navbar />
        <main>{children}</main>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#13131f',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#e2e8f0',
            },
          }}
        />
      </body>
    </html>
  )
}
