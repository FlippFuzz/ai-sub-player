/**
 * Extracts a standard 11-character YouTube video ID from various URL formats or raw input.
 * Supports:
 * - https://www.youtube.com/watch?v=XXXXXXXXXXX
 * - https://youtu.be/XXXXXXXXXXX
 * - https://www.youtube.com/shorts/XXXXXXXXXXX
 * - https://www.youtube.com/embed/XXXXXXXXXXX
 * - Raw 11-character IDs
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Direct 11-char ID check
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  // Regex matching all common YouTube domain variations
  const match = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
  )

  return match ? match[1] : null
}

/**
 * Reads a URL query parameter from the current window location.
 */
export function getQueryParam(key: string): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get(key)
}

/**
 * Updates or sets a query parameter without reloading the page.
 */
export function setQueryParam(key: string, value: string): void {
  const url = new URL(window.location.href)
  url.searchParams.set(key, value)
  window.history.replaceState({}, "", url.toString())
}
