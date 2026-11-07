/// <reference types="youtube" />

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
    const startSeconds = getSavedPlaybackPosition(videoId)

    await loadYouTubeIframeApi()

    if (this.player && this.isReady) {
      if (startSeconds > 0) {
        this.player.loadVideoById({
          videoId,
          startSeconds,
        })
      } else {
        this.player.loadVideoById(videoId)
      }
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

      if (startSeconds > 0) {
        playerVars.start = startSeconds
      }

      this.player = new YT.Player(this.containerId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars,
        events: {
          onReady: () => {
            this.isReady = true
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

  private handleStateChange(state: number): void {
    if (state === 1) {
      // PLAYING: start periodic position saving (every 3 seconds)
      this.startSaveInterval()
    } else {
      // PAUSED, BUFFERING, CUED, or ENDED: stop interval
      this.stopSaveInterval()

      if (state === 0) {
        // ENDED: clear stored position so future playback starts from 0
        if (this.currentVideoId) {
          clearPlaybackPosition(this.currentVideoId)
        }
      } else {
        // Paused or buffered: save current progress immediately
        this.saveProgress()
      }
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
    if (!this.currentVideoId || !this.player || !this.isReady) return
    try {
      const currentTime = this.player.getCurrentTime() || 0
      const duration = this.player.getDuration() || 0
      savePlaybackPosition(this.currentVideoId, currentTime, duration)
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

  public getDuration(): number {
    if (!this.player || !this.isReady) return 0
    try {
      return this.player.getDuration() || 0
    } catch {
      return 0
    }
  }

  public getPlayerState(): number {
    if (!this.player || !this.isReady) return -1
    try {
      return this.player.getPlayerState()
    } catch {
      return -1
    }
  }

  public destroy(): void {
    this.stopSaveInterval()
    this.saveProgress()
    if (this.player) {
      this.player.destroy()
      this.player = null
      this.isReady = false
      this.currentVideoId = null
    }
  }
}
