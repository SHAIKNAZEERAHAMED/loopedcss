export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  return text.substring(0, maxLength) + "..."
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  }

  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }

  return num.toString()
}

