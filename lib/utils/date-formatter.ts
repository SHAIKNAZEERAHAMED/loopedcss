export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date

  // Check if the date is valid
  if (isNaN(d.getTime())) {
    return "Invalid date"
  }

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "just now"
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  // Format as MM/DD/YYYY
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

