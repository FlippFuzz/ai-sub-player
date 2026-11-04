import { SubtitleCue } from "../types"

/**
 * Parses timestamp formats:
 * - 00:01:23,450
 * - 00:01:23.450
 * - 01:23.450
 * Returns time in seconds (float).
 */
export function parseSrtTimestamp(timestampStr: string): number {
  const normalized = timestampStr.trim().replace(",", ".")
  const parts = normalized.split(":")

  if (parts.length === 3) {
    const hours = parseFloat(parts[0])
    const minutes = parseFloat(parts[1])
    const seconds = parseFloat(parts[2])
    return hours * 3600 + minutes * 60 + seconds
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0])
    const seconds = parseFloat(parts[1])
    return minutes * 60 + seconds
  }

  return parseFloat(normalized) || 0
}

/**
 * Identifies if a cue is an embedded ai-sub metadata header rather than real dialogue.
 * ai-sub stores a 1ms (0.001s) escaped JSON configuration block at the very beginning of the file.
 */
export function isMetadataCue(
  start: number,
  end: number,
  text: string,
): boolean {
  // Check 1: ai-sub embeds headers with a 1ms duration (end - start <= 0.01s) at 0:00
  const isSuperShortHeader = start < 0.1 && end - start < 0.05

  // Check 2: Content signature check (contains escaped JSON settings, prompt versions, or ai-sub tags)
  const hasMetadataSignature =
    text.includes('"ai_sub_version"') ||
    text.includes('"settings"') ||
    text.includes('"subtitles_prompt_version"')

  return isSuperShortHeader || hasMetadataSignature
}

/**
 * Parses raw SRT string content into a chronological list of SubtitleCue items,
 * filtering out any archival metadata blocks.
 */
export function parseSrt(rawContent: string): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  const normalizedContent = rawContent
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
  const blocks = normalizedContent.split(/\n\n+/)

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim()
    if (!block) continue

    const lines = block.split("\n")
    if (lines.length < 2) continue

    let timeLineIdx = 1
    let cueId = i + 1

    if (lines[0].includes("-->")) {
      timeLineIdx = 0
    } else {
      const parsedId = parseInt(lines[0], 10)
      if (!isNaN(parsedId)) {
        cueId = parsedId
      }
    }

    const timeLine = lines[timeLineIdx]
    if (!timeLine || !timeLine.includes("-->")) continue

    const [startStr, endStr] = timeLine.split("-->")
    if (!startStr || !endStr) continue

    const start = parseSrtTimestamp(startStr)
    const end = parseSrtTimestamp(endStr)

    const textLines = lines.slice(timeLineIdx + 1)
    const text = textLines.join("\n").trim()

    // Only add if it is valid speech and NOT an archival metadata header
    if (text && end > start && !isMetadataCue(start, end, text)) {
      cues.push({
        id: cueId,
        start,
        end,
        text,
      })
    }
  }

  return cues.sort((a, b) => a.start - b.start)
}
