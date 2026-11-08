export type PlayerStateListener = (state: YT.PlayerState) => void

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
