export type SubtitleDisplayMode =
  | "both-bottom"
  | "split-og-top"
  | "split-en-top"
  | "original-only"
  | "english-only"

export interface SubtitleStyleSettings {
  fontScale: number
  textColor: string
  bgColor: string
  bgOpacity: number
  bottomOffset: number
  displayMode: SubtitleDisplayMode
}

export const DEFAULT_SETTINGS: SubtitleStyleSettings = {
  fontScale: 1.0,
  textColor: "#ffffff",
  bgColor: "#000000",
  bgOpacity: 0.75,
  bottomOffset: 28,
  displayMode: "both-bottom",
}

const STORAGE_KEY = "ai_sub_player_settings_v3"

export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace("#", "")
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export class SettingsManager {
  private settings: SubtitleStyleSettings
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    this.settings = this.load()
    this.apply()
  }

  public getSettings(): SubtitleStyleSettings {
    return { ...this.settings }
  }

  public update(partial: Partial<SubtitleStyleSettings>): void {
    this.settings = { ...this.settings, ...partial }
    this.save()
    this.apply()
  }

  public reset(): SubtitleStyleSettings {
    this.settings = { ...DEFAULT_SETTINGS }
    this.save()
    this.apply()
    return this.getSettings()
  }

  private load(): SubtitleStyleSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (err) {
      console.warn("Could not load saved subtitle settings:", err)
    }
    return { ...DEFAULT_SETTINGS }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    } catch (err) {
      console.warn("Could not save subtitle settings to localStorage:", err)
    }
  }

  public apply(): void {
    const bgRgba = hexToRgba(this.settings.bgColor, this.settings.bgOpacity)
    this.container.style.setProperty(
      "--sub-font-scale",
      `${this.settings.fontScale}`,
    )
    this.container.style.setProperty("--sub-color", this.settings.textColor)
    this.container.style.setProperty("--sub-bg", bgRgba)
    this.container.style.setProperty(
      "--sub-bottom-offset",
      `${this.settings.bottomOffset}px`,
    )
  }
}
