import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { LocaleProvider } from '@/lib/messages'
import { getServerMessages, getUserLocale } from '@/lib/i18n/server'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getServerMessages()

  return {
    title: messages.meta.title,
    description: messages.meta.description,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale()
  const messages = await getServerMessages()

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body>
        <LocaleProvider initialLocale={locale} initialMessages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Toaster />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
