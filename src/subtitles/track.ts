export interface SubtitleTrack {
  rawPath: string // e.g. "Title.g38f-011019.srt" or ".int/g38f-011019/Title.raw-g38f-011019.srt"
  modelCode: string // e.g. "g38f", "g35l"
  modelName: string // e.g. "Gemini 3.8 Flash"
  versionTag: string // e.g. "v01.10.19" or "v09.18"
  versionNum: number // e.g. 11019 or 918
  isRaw: boolean // true if raw dialogue draft
  score: number // composite sorting rank
  label: string // display name in dropdown
}

const MODEL_WEIGHTS: Record<string, { name: string; weight: number }> = {
  g38f: { name: "Gemini 3.8 Flash", weight: 380 },
  g36f: { name: "Gemini 3.6 Flash", weight: 360 },
  g35f: { name: "Gemini 3.5 Flash", weight: 355 },
  g35l: { name: "Gemini 3.5 Flash Lite", weight: 350 },
}

/**
 * Parses any subtitle filename into a scored SubtitleTrack object.
 * Handles:
 * - 6-digit tags: [stem].g38f-011019.srt (Summary v01, Lyrics v10, Subtitles v19)
 * - 4-digit tags: [stem].g35f-0918.srt   (Lyrics v09, Subtitles v18)
 * - Raw drafts:   .raw-[code].srt or files under .int/
 */
export function parseSubtitleTrack(path: string): SubtitleTrack {
  const isRaw = path.includes(".raw-") || path.startsWith(".int/")
  const match = path.match(
    /(?:^|[./])(?:raw-)?(g\d+[a-z][a-z0-9_-]*)-(\d{4,6})\.srt$/i,
  )

  if (!match) {
    // Non-standard filename fallback
    return {
      rawPath: path,
      modelCode: "custom",
      modelName: "Custom Subtitle",
      versionTag: "",
      versionNum: 0,
      isRaw,
      score: isRaw ? 0 : 1,
      label: path.split("/").pop() || path,
    }
  }

  const [, modelCode, digits] = match
  const lowerCode = modelCode.toLowerCase()
  const modelMeta = MODEL_WEIGHTS[lowerCode] || { name: modelCode, weight: 100 }

  // Parse version numbers (4-digit vs 6-digit)
  let versionTag = ""
  let versionNum = parseInt(digits, 10) || 0

  if (digits.length === 6) {
    const s = digits.substring(0, 2)
    const l = digits.substring(2, 4)
    const sub = digits.substring(4, 6)
    versionTag = `v${s}.${l}.${sub}`
  } else if (digits.length === 4) {
    const l = digits.substring(0, 2)
    const sub = digits.substring(2, 4)
    versionTag = `v${l}.${sub}`
  } else {
    versionTag = `v${digits}`
  }

  // Composite sorting score:
  // (Model Tier * 1,000,000) + (Version * 10) + (Refined: 1, Raw: 0)
  const typeWeight = isRaw ? 0 : 1
  const score = modelMeta.weight * 1_000_000 + versionNum * 10 + typeWeight

  const rawSuffix = isRaw ? " [Draft]" : ""
  const label = `${modelMeta.name} (${versionTag})${rawSuffix}`

  return {
    rawPath: path,
    modelCode: lowerCode,
    modelName: modelMeta.name,
    versionTag,
    versionNum,
    isRaw,
    score,
    label,
  }
}

/**
 * Sorts tracks in descending order: best model -> newest prompt version -> refined over raw.
 */
export function rankSubtitleTracks(paths: string[]): SubtitleTrack[] {
  return paths.map(parseSubtitleTrack).sort((a, b) => b.score - a.score)
}
