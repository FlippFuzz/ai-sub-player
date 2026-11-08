import { PlayerStateListener } from "../types"
import {
  getSavedPlaybackPosition,
  savePlaybackPosition,
  clearPlaybackPosition,
} from "./history"

declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiLoadedPromise: Promise<void> | null = null

function loadYouTubeIframeApi(): Promise<void> {
  if (apiLoadedPromise) return apiLoadedPromise

  apiLoadedPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve()
      return
    }

    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback()
      resolve()
    }

    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    document.head.appendChild(script)
  })

  return apiLoadedPromise
}

export class YouTubePlayerController {
  private player: YT.Player | null = null
  private containerId: string
  private stateListeners: Set<PlayerStateListener> = new Set()
  private isReady = false
  private currentVideoId: string | null = null
  private saveIntervalId: number | null = null
  private hasStartedPlaying = false

  constructor(containerId: string) {
    this.containerId = containerId
    this.setupLifecycleListeners()
  }

  private setupLifecycleListeners(): void {
    window.addEventListener("beforeunload", () => {
      this.saveProgress()
    })

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.saveProgress()
      }
    })
  }

  public async loadVideo(videoId: string): Promise<void> {
    // If switching away from a previous video, ensure its final position is saved
    if (this.currentVideoId && this.currentVideoId !== videoId) {
      this.saveProgress()
    }

    this.currentVideoId = videoId
    this.hasStartedPlaying = false
    const startSeconds = getSavedPlaybackPosition(videoId)

    await loadYouTubeIframeApi()

    if (this.player && this.isReady) {
      this.player.loadVideoById({
        videoId,
        startSeconds: startSeconds > 0 ? startSeconds : undefined,
      })
      return
    }

    await this.initPlayer(videoId, startSeconds)
  }

  private initPlayer(videoId: string, startSeconds: number): Promise<void> {
    return new Promise((resolve) => {
      const origin = window.location.origin.startsWith("http")
        ? window.location.origin
        : undefined

      const playerVars: YT.PlayerVars = {
        autoplay: 1,
        playsinline: 1, // Crucial for inline mobile playback (prevents OS native fullscreen)
        fs: 0, // Disable native fullscreen button so our container fullscreen is used
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
        origin,
      }

      this.player = new YT.Player(this.containerId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars,
        events: {
          onReady: () => {
            this.isReady = true
            // Seek on ready without passing playerVars.start into constructor,
            // avoiding browser blocked-autoplay states and multiple-tap issues.
            if (startSeconds > 0) {
              this.player?.seekTo(startSeconds, true)
            }
            resolve()
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            this.handleStateChange(event.data)
            this.stateListeners.forEach((listener) => listener(event.data))
          },
        },
      })
    })
  }

  private handleStateChange(state: YT.PlayerState): void {
    if (state === YT.PlayerState.PLAYING) {
      this.hasStartedPlaying = true
      // PLAYING: start periodic position saving (every 3 seconds)
      this.startSaveInterval()
    } else {
      // Stop interval on any non-playing state
      this.stopSaveInterval()

      if (state === YT.PlayerState.ENDED) {
        // ENDED: clear stored position so future playback starts from 0
        if (this.currentVideoId) {
          clearPlaybackPosition(this.currentVideoId)
        }
        this.hasStartedPlaying = false
      } else if (state === YT.PlayerState.PAUSED) {
        // PAUSED: safe to save progress since user intentionally paused
        this.saveProgress()
      }
      // Note: We deliberately do NOT save during BUFFERING, UNSTARTED, or CUED
    }
  }

  private startSaveInterval(): void {
    if (this.saveIntervalId !== null) return
    this.saveIntervalId = window.setInterval(() => {
      this.saveProgress()
    }, 3000)
  }

  private stopSaveInterval(): void {
    if (this.saveIntervalId !== null) {
      clearInterval(this.saveIntervalId)
      this.saveIntervalId = null
    }
  }

  private saveProgress(): void {
    // Never overwrite saved position if playback hasn't started yet in this session
    if (
      !this.hasStartedPlaying ||
      !this.currentVideoId ||
      !this.player ||
      !this.isReady
    ) {
      return
    }
    try {
      const currentTime = this.player.getCurrentTime() || 0
      const duration = this.player.getDuration() || 0
      if (currentTime > 0) {
        savePlaybackPosition(this.currentVideoId, currentTime, duration)
      }
    } catch {
      // Player might not be ready or currently destroying
    }
  }

  public onStateChange(listener: PlayerStateListener): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  public getCurrentTime(): number {
    if (!this.player || !this.isReady) return 0
    try {
      return this.player.getCurrentTime() || 0
    } catch {
      return 0
    }
  }
}
