import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { LocaleProvider } from '@/lib/messages'
import { getServerMessages, getUserLocale } from '@/lib/i18n/server'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerMessages()

  return {
    title: t.meta.title,
    description: t.meta.description,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale()
  const t = await getServerMessages()

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body>
        <LocaleProvider initialLocale={locale} initialMessages={t}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Toaster />
          </ThemeProvider>
        </LocaleProvider>
      {/* impeccable-live-start */}
<script src="http://localhost:8400/live.js"></script>
{/* impeccable-live-end */}
</body>
    </html>
  )
}
