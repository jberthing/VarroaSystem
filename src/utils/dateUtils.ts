export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

export const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('da-DK', {
    month: 'short',
    day: 'numeric'
  }).format(date)
}

export const getTodayString = (): string => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

export const getDaysAgo = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}
