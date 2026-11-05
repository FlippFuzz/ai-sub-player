export interface PlayerStateChangeEvent {
  state: number // YT.PlayerState (-1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued)
}

export type PlayerStateListener = (state: number) => void
export type TimeListener = (currentTime: number) => void

export interface SubtitleCue {
  id: number
  start: number // in seconds
  end: number // in seconds
  text: string
}

export interface SubtitleTrack {
  name: string
  path: string
}
