import type { Locale, Messages } from './types'

export async function loadMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case 'pl-PL':
      return (await import('@/messages/pl-PL')).messages
    case 'en-US':
    default:
      return (await import('@/messages/en-US')).messages
  }
}
