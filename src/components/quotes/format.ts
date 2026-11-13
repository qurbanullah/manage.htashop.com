/** Shared quote formatting helpers. */

export function formatMoney(value: number | null | undefined, currency: string): string {
  const amount = Number(value ?? 0)

  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeDue(value: string | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60000)

  if (diffMinutes < 0) {
    const overdue = Math.abs(diffMinutes)
    if (overdue < 60) return `${overdue}m overdue`
    if (overdue < 1440) return `${Math.round(overdue / 60)}h overdue`
    return `${Math.round(overdue / 1440)}d overdue`
  }

  if (diffMinutes < 60) return `in ${diffMinutes}m`
  if (diffMinutes < 1440) return `in ${Math.round(diffMinutes / 60)}h`
  return `in ${Math.round(diffMinutes / 1440)}d`
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  if (minutes < 60) return `${Math.round(minutes)}m`

  const hours = minutes / 60

  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`

  return `${(hours / 24).toFixed(1)}d`
}
