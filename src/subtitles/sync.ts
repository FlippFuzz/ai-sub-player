import { SubtitleCue } from "../types"
import { SubtitleDisplayMode } from "../settings/manager"

interface CueSplit {
  original: string
  english: string
  isSingleLine: boolean
}

/**
 * Splits raw multi-line cue text into original language and English translation.
 */
function splitCueText(rawText: string): CueSplit {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { original: "", english: "", isSingleLine: true }
  }

  if (lines.length === 1) {
    return { original: lines[0], english: lines[0], isSingleLine: true }
  }

  const hasCjk = (str: string) =>
    /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str)

  if (hasCjk(lines[0]) && !hasCjk(lines[lines.length - 1])) {
    let splitIdx = 1
    for (let i = 1; i < lines.length; i++) {
      if (!hasCjk(lines[i])) {
        splitIdx = i
        break
      }
    }
    return {
      original: lines.slice(0, splitIdx).join("\n"),
      english: lines.slice(splitIdx).join("\n"),
      isSingleLine: false,
    }
  }

  return {
    original: lines[0],
    english: lines.slice(1).join("\n"),
    isSingleLine: false,
  }
}

export class SubtitleSynchronizer {
  private cues: SubtitleCue[] = []
  private intervalId: number | null = null
  private topSlot: HTMLElement
  private bottomSlot: HTMLElement
  private getCurrentTime: () => number
  private getDisplayMode: () => SubtitleDisplayMode
  private activeCueId: number | null = null

  constructor(
    topSlot: HTMLElement,
    bottomSlot: HTMLElement,
    getCurrentTime: () => number,
    getDisplayMode: () => SubtitleDisplayMode,
  ) {
    this.topSlot = topSlot
    this.bottomSlot = bottomSlot
    this.getCurrentTime = getCurrentTime
    this.getDisplayMode = getDisplayMode
  }

  public setCues(cues: SubtitleCue[]): void {
    this.cues = cues
    this.activeCueId = null
    this.update()
  }

  public clearCues(): void {
    this.cues = []
    this.activeCueId = null
    this.clearSlots()
  }

  public start(): void {
    if (this.intervalId !== null) return
    this.intervalId = window.setInterval(() => this.update(), 100)
    this.update()
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  public forceRefresh(): void {
    this.activeCueId = null
    this.update()
  }

  public update(): void {
    if (this.cues.length === 0) {
      this.clearSlots()
      return
    }

    const currentTime = this.getCurrentTime()
    const activeCue = this.findActiveCue(currentTime)

    if (activeCue) {
      if (this.activeCueId !== activeCue.id) {
        this.activeCueId = activeCue.id
        this.renderCue(activeCue.text)
      }
    } else {
      if (this.activeCueId !== null) {
        this.activeCueId = null
        this.clearSlots()
      }
    }
  }

  private findActiveCue(currentTime: number): SubtitleCue | null {
    let low = 0
    let high = this.cues.length - 1

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const cue = this.cues[mid]

      if (currentTime >= cue.start && currentTime <= cue.end) {
        return cue
      }

      if (currentTime < cue.start) {
        high = mid - 1
      } else {
        low = mid + 1
      }
    }

    return null
  }

  private clearSlots(): void {
    if (this.topSlot.innerHTML !== "") this.topSlot.innerHTML = ""
    if (this.bottomSlot.innerHTML !== "") this.bottomSlot.innerHTML = ""
  }

  private renderCue(rawText: string): void {
    const mode = this.getDisplayMode()
    const { original, english, isSingleLine } = splitCueText(rawText)

    let topText = ""
    let bottomText = ""

    switch (mode) {
      case "split-og-top":
        if (isSingleLine) {
          bottomText = original
        } else {
          topText = original
          bottomText = english
        }
        break

      case "split-en-top":
        if (isSingleLine) {
          bottomText = english
        } else {
          topText = english
          bottomText = original
        }
        break

      case "original-only":
        bottomText = original
        break

      case "english-only":
        bottomText = english
        break

      case "both-bottom":
      default:
        bottomText = rawText
        break
    }

    this.topSlot.innerHTML = topText
      ? `<div class="subtitle-cue">${this.escapeHtml(topText)}</div>`
      : ""
    this.bottomSlot.innerHTML = bottomText
      ? `<div class="subtitle-cue">${this.escapeHtml(bottomText)}</div>`
      : ""
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }
}
