import { SubtitleTrack } from "../types"

interface VideoMetaManifest {
  video_id?: string
  uploader?: string
  channel_name?: string
  title?: string
  source_type?: string
  timestamp?: number
  subtitles?: SubtitleTrack[]
}

interface LoadedManifestResult {
  manifest: VideoMetaManifest | null
  subtitles: SubtitleTrack[]
  baseUrl: string
}

const DEFAULT_REPO = "FlippFuzz/ai-sub-showcase"
const DEFAULT_BRANCH = "main"

/**
 * Builds a properly encoded raw.githubusercontent.com URL.
 * Encodes each path segment while preserving directory slashes.
 */
export function buildRawSubtitleUrl(
  baseUrl: string,
  relativePath: string,
): string {
  const cleanRelative = relativePath.replace(/^\/+/, "")
  const encodedSegments = cleanRelative
    .split("/")
    .map((seg) => encodeURIComponent(seg))
  return `${baseUrl}/${encodedSegments.join("/")}`
}

/**
 * Fetches video_meta.json from the showcase repo.
 * If the schema changes or subtitles cannot be located, returns an empty array.
 */
export async function fetchVideoManifest(
  uploader: string,
  videoId: string,
  repo: string = DEFAULT_REPO,
  branch: string = DEFAULT_BRANCH,
): Promise<LoadedManifestResult> {
  const cleanUploader = encodeURIComponent(uploader.trim())
  const cleanVideoId = encodeURIComponent(videoId.trim())
  const baseUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${cleanUploader}/v/${cleanVideoId}`
  const manifestUrl = `${baseUrl}/video_meta.json`

  try {
    const res = await fetch(manifestUrl)
    if (!res.ok) {
      console.warn(
        `Manifest not found at ${manifestUrl} (HTTP ${res.status}). Treating as 0 subtitles.`,
      )
      return { manifest: null, subtitles: [], baseUrl }
    }

    const data: unknown = await res.json()
    if (!data || typeof data !== "object") {
      return { manifest: null, subtitles: [], baseUrl }
    }

    const manifest = data as VideoMetaManifest

    if (!Array.isArray(manifest.subtitles)) {
      return { manifest, subtitles: [], baseUrl }
    }

    const subtitles = manifest.subtitles.filter(
      (s): s is SubtitleTrack =>
        Boolean(s) &&
        typeof s.name === "string" &&
        typeof s.path === "string" &&
        s.name.trim().length > 0 &&
        s.path.trim().length > 0,
    )

    return { manifest, subtitles, baseUrl }
  } catch (err) {
    console.warn(`Error fetching manifest from ${manifestUrl}:`, err)
    return { manifest: null, subtitles: [], baseUrl }
  }
}
