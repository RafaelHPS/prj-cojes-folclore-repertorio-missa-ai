export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatDateShort(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function formatTime(timeStr: string | null): string | null {
  if (!timeStr) return null
  return timeStr.slice(0, 5)
}
