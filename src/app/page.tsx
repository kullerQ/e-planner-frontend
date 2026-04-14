import Link from 'next/link'
import { messages } from '@/lib/messages'

export default function Home() {
  const home = messages.home

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="w-full max-w-2xl rounded-lg border border-border bg-card p-10 text-center shadow-sm">
        <h1 className="text-4xl font-semibold tracking-tight">{home.heading}</h1>
        <p className="mt-4 text-muted-foreground">{home.description}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            {home.loginCta}
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {home.registerCta}
          </Link>
        </div>
      </section>
    </main>
  )
}
