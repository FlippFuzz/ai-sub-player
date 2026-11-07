const STORAGE_KEY = "ai_sub_playback_positions_v1"
const MIN_RESUME_SECONDS = 10
const NEAR_END_BUFFER_SECONDS = 15
const MAX_SAVED_VIDEOS = 100

/**
 * Retrieves the saved playback position for a given video ID.
 * Returns 0 if no position exists or if it was less than the minimum threshold.
 */
export function getSavedPlaybackPosition(videoId: string): number {
  if (!videoId) return 0
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 0
    const records: Record<string, number> = JSON.parse(raw)
    const savedTime = records[videoId]
    if (typeof savedTime === "number" && savedTime >= MIN_RESUME_SECONDS) {
      return savedTime
    }
  } catch (err) {
    console.warn("Could not load playback position:", err)
  }
  return 0
}

/**
 * Saves current playback position for a video ID.
 * If the user watched less than 10 seconds or is near the end, the saved position is cleared.
 */
export function savePlaybackPosition(
  videoId: string,
  currentTime: number,
  duration?: number,
): void {
  if (!videoId) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const records: Record<string, number> = raw ? JSON.parse(raw) : {}

    // If watched less than 10s or near the outro/credits, clear the record so next play starts at 0
    if (
      currentTime < MIN_RESUME_SECONDS ||
      (duration &&
        duration > 0 &&
        duration - currentTime < NEAR_END_BUFFER_SECONDS)
    ) {
      if (records[videoId] !== undefined) {
        delete records[videoId]
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
      }
      return
    }

    records[videoId] = Math.floor(currentTime)

    // Keep storage clean by pruning oldest entries if exceeding limit
    const keys = Object.keys(records)
    if (keys.length > MAX_SAVED_VIDEOS) {
      delete records[keys[0]]
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    console.warn("Could not save playback position:", err)
  }
}

/**
 * Explicitly clears the saved position for a given video ID (e.g. when video reaches ENDED).
 */
export function clearPlaybackPosition(videoId: string): void {
  if (!videoId) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const records: Record<string, number> = JSON.parse(raw)
    if (records[videoId] !== undefined) {
      delete records[videoId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    }
  } catch (err) {
    console.warn("Could not clear playback position:", err)
  }
}
