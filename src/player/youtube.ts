/// <reference types="youtube" />

import { PlayerStateListener } from "../types"

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

  constructor(containerId: string) {
    this.containerId = containerId
  }

  public async loadVideo(videoId: string): Promise<void> {
    await loadYouTubeIframeApi()

    if (this.player && this.isReady) {
      this.player.loadVideoById(videoId)
      return
    }

    await this.initPlayer(videoId)
  }

  private initPlayer(videoId: string): Promise<void> {
    return new Promise((resolve) => {
      const origin = window.location.origin.startsWith("http")
        ? window.location.origin
        : undefined

      this.player = new YT.Player(this.containerId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          playsinline: 1, // Crucial for inline mobile playback (prevents OS native fullscreen)
          fs: 0, // Disable native fullscreen button so our container fullscreen is used
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin,
        },
        events: {
          onReady: () => {
            this.isReady = true
            resolve()
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            this.stateListeners.forEach((listener) => listener(event.data))
          },
        },
      })
    })
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

  public getPlayerState(): number {
    if (!this.player || !this.isReady) return -1
    try {
      return this.player.getPlayerState()
    } catch {
      return -1
    }
  }

  public destroy(): void {
    if (this.player) {
      this.player.destroy()
      this.player = null
      this.isReady = false
    }
  }
}
