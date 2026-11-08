import {
  extractYouTubeVideoId,
  getQueryParam,
  setQueryParam,
} from "./utils/url"
import { YouTubePlayerController } from "./player/youtube"
import { toggleFullscreen, onFullscreenChange } from "./player/fullscreen"
import { parseSrt } from "./subtitles/parser"
import { loadSrtFromUrl, loadSrtFromFile } from "./subtitles/loader"
import { SubtitleSynchronizer } from "./subtitles/sync"
import {
  SettingsManager,
  SubtitleStyleSettings,
  SubtitleDisplayMode,
} from "./settings/manager"
import { fetchVideoManifest, buildRawSubtitleUrl } from "./subtitles/manifest"
import { SubtitleTrack } from "./types"

const appContainer = document.getElementById("app") as HTMLElement
const playerStage = document.getElementById("player-stage") as HTMLElement
const playerWrapper = document.getElementById("player-wrapper") as HTMLElement
const interactionSensor = document.getElementById(
  "interaction-sensor",
) as HTMLElement | null
const sidebarBackdrop = document.getElementById(
  "sidebar-backdrop",
) as HTMLElement | null
const placeholder = document.getElementById(
  "player-placeholder",
) as HTMLElement | null

// Forms & Inputs
const videoForm = document.getElementById(
  "video-form",
) as HTMLFormElement | null
const urlInput = document.getElementById(
  "youtube-url-input",
) as HTMLInputElement | null
const srtForm = document.getElementById("srt-form") as HTMLFormElement | null
const srtUrlInput = document.getElementById(
  "srt-url-input",
) as HTMLInputElement | null
const srtFileInput = document.getElementById(
  "srt-file-input",
) as HTMLInputElement | null
const srtStatus = document.getElementById("srt-status") as HTMLElement | null

// Track Selector UI
const trackSelectorRow = document.getElementById(
  "track-selector-row",
) as HTMLElement | null
const trackSelect = document.getElementById(
  "track-select",
) as HTMLSelectElement | null

// Subtitle slots
const subtitleTop = document.getElementById("subtitle-top") as HTMLElement
const subtitleBottom = document.getElementById("subtitle-bottom") as HTMLElement

// Floating Action Buttons
const panelToggleBtn = document.getElementById(
  "panel-toggle-btn",
) as HTMLButtonElement | null
const panelCloseBtn = document.getElementById(
  "panel-close-btn",
) as HTMLButtonElement | null
const fullscreenBtn = document.getElementById(
  "fullscreen-btn",
) as HTMLButtonElement | null
const fsIcon = document.getElementById("fs-icon")

// Sidebar Accordions
const settingsToggle = document.getElementById(
  "settings-toggle",
) as HTMLElement | null
const settingsBody = document.getElementById(
  "settings-body",
) as HTMLElement | null
const settingsArrow = document.getElementById(
  "settings-arrow",
) as HTMLElement | null

const sourcesToggle = document.getElementById(
  "sources-toggle",
) as HTMLElement | null
const sourcesBody = document.getElementById(
  "sources-body",
) as HTMLElement | null
const sourcesArrow = document.getElementById(
  "sources-arrow",
) as HTMLElement | null

// Settings Controls
const inputDisplayMode = document.getElementById(
  "input-display-mode",
) as HTMLSelectElement | null
const inputFontSize = document.getElementById(
  "input-font-size",
) as HTMLInputElement | null
const valFontSize = document.getElementById(
  "val-font-size",
) as HTMLElement | null
const inputBgOpacity = document.getElementById(
  "input-bg-opacity",
) as HTMLInputElement | null
const valBgOpacity = document.getElementById(
  "val-bg-opacity",
) as HTMLElement | null
const inputEdgeOffset = document.getElementById(
  "input-edge-offset",
) as HTMLInputElement | null
const valEdgeOffset = document.getElementById(
  "val-edge-offset",
) as HTMLElement | null
const inputTextColor = document.getElementById(
  "input-text-color",
) as HTMLInputElement | null
const valTextColor = document.getElementById(
  "val-text-color",
) as HTMLElement | null
const inputBgColor = document.getElementById(
  "input-bg-color",
) as HTMLInputElement | null
const valBgColor = document.getElementById("val-bg-color") as HTMLElement | null
const btnResetSettings = document.getElementById(
  "btn-reset-settings",
) as HTMLButtonElement | null

// Controllers
const player = new YouTubePlayerController("yt-player-target")
const settingsManager = new SettingsManager(playerWrapper)
const synchronizer = new SubtitleSynchronizer(
  subtitleTop,
  subtitleBottom,
  () => player.getCurrentTime(),
  () => settingsManager.getSettings().displayMode,
)

let currentTracks: SubtitleTrack[] = []
let currentBaseUrl = ""
let isVideoPlaying = false

// --- Sidebar Collapse / Expand ---
const SIDEBAR_STORAGE_KEY = "ai_sub_panel_collapsed_v1"

function setSidebarCollapsed(collapsed: boolean): void {
  if (collapsed) {
    appContainer.classList.add("panel-collapsed")
  } else {
    appContainer.classList.remove("panel-collapsed")
  }
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(collapsed))
  } catch {
    // Ignore storage errors
  }
}

// Restore saved sidebar preference (default to open)
try {
  const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY)
  if (savedState !== null) {
    setSidebarCollapsed(JSON.parse(savedState))
  }
} catch {
  // Ignore
}

panelToggleBtn?.addEventListener("click", () => {
  const isCurrentlyCollapsed =
    appContainer.classList.contains("panel-collapsed")
  setSidebarCollapsed(!isCurrentlyCollapsed)
})

panelCloseBtn?.addEventListener("click", () => {
  setSidebarCollapsed(true)
})

// Tap outside backdrop on tiny windows/drawers to close
sidebarBackdrop?.addEventListener("click", () => {
  setSidebarCollapsed(true)
})

// --- 5-Second Inactivity Fade ---
const IDLE_TIMEOUT_MS = 5000
let idleTimer: number | null = null

function resetIdleTimer(): void {
  playerStage.classList.remove("user-idle")

  if (idleTimer !== null) {
    window.clearTimeout(idleTimer)
    idleTimer = null
  }

  // Only fade when video is actively playing
  if (isVideoPlaying) {
    idleTimer = window.setTimeout(() => {
      playerStage.classList.add("user-idle")
    }, IDLE_TIMEOUT_MS)
  }
}

playerStage.addEventListener("mousemove", resetIdleTimer)
playerStage.addEventListener("pointermove", resetIdleTimer)
playerStage.addEventListener("touchstart", resetIdleTimer, { passive: true })
playerStage.addEventListener("click", resetIdleTimer)

// Interaction sensor catches movements over iframe when buttons are idle
interactionSensor?.addEventListener("mousemove", resetIdleTimer)
interactionSensor?.addEventListener("pointermove", resetIdleTimer)
interactionSensor?.addEventListener("touchstart", resetIdleTimer, {
  passive: true,
})
interactionSensor?.addEventListener("click", resetIdleTimer)

// Window focus change (e.g. clicking into YouTube player) wakes controls
window.addEventListener("blur", () => {
  resetIdleTimer()
})

// --- Settings Accordion ---
let settingsExpanded = true
settingsToggle?.addEventListener("click", () => {
  settingsExpanded = !settingsExpanded
  if (settingsBody)
    settingsBody.style.display = settingsExpanded ? "flex" : "none"
  if (settingsArrow)
    settingsArrow.textContent = settingsExpanded ? "▲ Collapse" : "▼ Expand"
})

// --- Input Sources Accordion (Collapsed by default) ---
let sourcesExpanded = false
sourcesToggle?.addEventListener("click", () => {
  sourcesExpanded = !sourcesExpanded
  if (sourcesBody) sourcesBody.style.display = sourcesExpanded ? "flex" : "none"
  if (sourcesArrow)
    sourcesArrow.textContent = sourcesExpanded ? "▲ Collapse" : "▼ Expand"
})

// --- Status Message Helper ---
function setStatus(text: string, color: string = "#94a3b8"): void {
  if (srtStatus) {
    srtStatus.textContent = text
    srtStatus.style.color = color
  }
}

// --- Sync Settings UI ---
function syncSettingsUi(settings: SubtitleStyleSettings): void {
  if (inputDisplayMode) inputDisplayMode.value = settings.displayMode
  if (inputFontSize && valFontSize) {
    inputFontSize.value = settings.fontScale.toString()
    valFontSize.textContent = `${Math.round(settings.fontScale * 100)}%`
  }
  if (inputBgOpacity && valBgOpacity) {
    inputBgOpacity.value = settings.bgOpacity.toString()
    valBgOpacity.textContent = `${Math.round(settings.bgOpacity * 100)}%`
  }
  if (inputEdgeOffset && valEdgeOffset) {
    inputEdgeOffset.value = settings.edgeOffset.toString()
    valEdgeOffset.textContent = `${settings.edgeOffset}px`
  }
  if (inputTextColor && valTextColor) {
    inputTextColor.value = settings.textColor
    valTextColor.textContent = settings.textColor
  }
  if (inputBgColor && valBgColor) {
    inputBgColor.value = settings.bgColor
    valBgColor.textContent = settings.bgColor
  }
}

syncSettingsUi(settingsManager.getSettings())

inputDisplayMode?.addEventListener("change", () => {
  const mode = inputDisplayMode.value as SubtitleDisplayMode
  settingsManager.update({ displayMode: mode })
  synchronizer.forceRefresh()
})

inputFontSize?.addEventListener("input", () => {
  const val = parseFloat(inputFontSize.value)
  if (valFontSize) valFontSize.textContent = `${Math.round(val * 100)}%`
  settingsManager.update({ fontScale: val })
})

inputBgOpacity?.addEventListener("input", () => {
  const val = parseFloat(inputBgOpacity.value)
  if (valBgOpacity) valBgOpacity.textContent = `${Math.round(val * 100)}%`
  settingsManager.update({ bgOpacity: val })
})

inputEdgeOffset?.addEventListener("input", () => {
  const val = parseInt(inputEdgeOffset.value, 10)
  if (valEdgeOffset) valEdgeOffset.textContent = `${val}px`
  settingsManager.update({ edgeOffset: val })
})

inputTextColor?.addEventListener("input", () => {
  const val = inputTextColor.value
  if (valTextColor) valTextColor.textContent = val
  settingsManager.update({ textColor: val })
})

inputBgColor?.addEventListener("input", () => {
  const val = inputBgColor.value
  if (valBgColor) valBgColor.textContent = val
  settingsManager.update({ bgColor: val })
})

btnResetSettings?.addEventListener("click", () => {
  const defaults = settingsManager.reset()
  syncSettingsUi(defaults)
  synchronizer.forceRefresh()
})

// --- Player State Listener ---
player.onStateChange((state) => {
  isVideoPlaying = state === YT.PlayerState.PLAYING

  if (isVideoPlaying) {
    synchronizer.start()
    resetIdleTimer()
  } else {
    synchronizer.stop()
    synchronizer.update()
    // When paused or ended, keep controls visible
    playerStage.classList.remove("user-idle")
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer)
      idleTimer = null
    }
  }
})

// --- Video & Subtitle Loading ---
async function playVideo(rawInput: string): Promise<void> {
  const videoId = extractYouTubeVideoId(rawInput)
  if (!videoId) {
    alert("Please enter a valid YouTube URL or 11-character video ID.")
    return
  }

  setQueryParam("v", videoId)
  if (urlInput) urlInput.value = videoId

  if (placeholder) {
    placeholder.style.display = "none"
  }

  await player.loadVideo(videoId)
}

async function loadSubtitlesFromUrl(
  url: string,
  label: string = "URL",
): Promise<void> {
  try {
    setStatus(`Loading ${label}...`)
    const rawSrt = await loadSrtFromUrl(url)
    const cues = parseSrt(rawSrt)
    synchronizer.setCues(cues)
    setStatus("")
  } catch (err) {
    console.error(err)
    setStatus(`Error loading subtitle: ${(err as Error).message}`, "#fca5a5")
  }
}

async function loadSubtitlesFromFile(file: File): Promise<void> {
  try {
    setStatus(`Reading ${file.name}...`)
    const rawSrt = await loadSrtFromFile(file)
    const cues = parseSrt(rawSrt)
    synchronizer.setCues(cues)
    if (trackSelectorRow) trackSelectorRow.style.display = "none"
    setStatus("")
  } catch (err) {
    console.error(err)
    setStatus(`Error reading file: ${(err as Error).message}`, "#fca5a5")
  }
}

async function selectTrackByIndex(index: number): Promise<void> {
  const track = currentTracks[index]
  if (!track || !currentBaseUrl) return

  const fullUrl = buildRawSubtitleUrl(currentBaseUrl, track.path)
  setQueryParam("track", track.name)
  await loadSubtitlesFromUrl(fullUrl, track.name)
}

async function initializeFromShowcase(
  uploader: string,
  videoId: string,
  requestedTrack?: string,
): Promise<void> {
  setStatus("Checking showcase for subtitles...")
  const { manifest, subtitles, baseUrl } = await fetchVideoManifest(
    uploader,
    videoId,
  )

  currentBaseUrl = baseUrl

  if (manifest && manifest.title) {
    document.title = `${manifest.title} - AI Sub Player`
  }

  if (subtitles.length === 0) {
    if (trackSelectorRow) trackSelectorRow.style.display = "none"
    currentTracks = []
    synchronizer.clearCues()
    setStatus("No showcase subtitles found for this video.", "#94a3b8")
    return
  }

  currentTracks = subtitles

  if (trackSelect) {
    trackSelect.innerHTML = ""
    currentTracks.forEach((t, idx) => {
      const opt = document.createElement("option")
      opt.value = idx.toString()
      opt.textContent = t.name
      trackSelect.appendChild(opt)
    })
  }

  if (trackSelectorRow) trackSelectorRow.style.display = "block"

  let selectedIdx = 0
  if (requestedTrack) {
    const req = requestedTrack.toLowerCase()
    const foundIdx = currentTracks.findIndex(
      (t) => t.name.toLowerCase() === req,
    )
    if (foundIdx !== -1) selectedIdx = foundIdx
  }

  if (trackSelect) trackSelect.selectedIndex = selectedIdx
  await selectTrackByIndex(selectedIdx)
}

trackSelect?.addEventListener("change", () => {
  const idx = parseInt(trackSelect.value, 10)
  if (!isNaN(idx)) selectTrackByIndex(idx)
})

videoForm?.addEventListener("submit", (e) => {
  e.preventDefault()
  const value = urlInput?.value.trim()
  if (value) playVideo(value)
})

srtForm?.addEventListener("submit", (e) => {
  e.preventDefault()
  const value = srtUrlInput?.value.trim()
  if (value) {
    if (trackSelectorRow) trackSelectorRow.style.display = "none"
    setQueryParam("srt", value)
    loadSubtitlesFromUrl(value)
  }
})

srtFileInput?.addEventListener("change", () => {
  const file = srtFileInput.files?.[0]
  if (file) loadSubtitlesFromFile(file)
})

// Fullscreen is requested on appContainer (#app) so controls work side-by-side in fullscreen
fullscreenBtn?.addEventListener("click", () => {
  toggleFullscreen(appContainer)
})

onFullscreenChange((isActive) => {
  if (fsIcon) {
    if (isActive) {
      fsIcon.innerHTML =
        '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'
    } else {
      fsIcon.innerHTML =
        '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>'
    }
  }
})

// --- App Initialization ---
async function initApp(): Promise<void> {
  const videoId = getQueryParam("v")
  const uploader = getQueryParam("uploader")
  const requestedTrack = getQueryParam("track") || undefined
  const directSrt = getQueryParam("srt")

  if (videoId) {
    await playVideo(videoId)

    if (uploader) {
      await initializeFromShowcase(uploader, videoId, requestedTrack)
    }
  }

  if (!uploader && directSrt) {
    if (srtUrlInput) srtUrlInput.value = directSrt
    await loadSubtitlesFromUrl(directSrt)
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initApp())
} else {
  initApp()
}
