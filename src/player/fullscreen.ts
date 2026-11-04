export function isFullscreen(): boolean {
  const doc = document as Document & {
    webkitFullscreenElement?: Element
  }
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement)
}

export async function toggleFullscreen(element: HTMLElement): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>
  }
  const el = element as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>
  }

  if (!isFullscreen()) {
    if (el.requestFullscreen) {
      await el.requestFullscreen()
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen()
    }
  } else {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen()
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen()
    }
  }
}

export function onFullscreenChange(
  callback: (active: boolean) => void,
): () => void {
  const handler = () => callback(isFullscreen())
  document.addEventListener("fullscreenchange", handler)
  document.addEventListener("webkitfullscreenchange", handler)
  return () => {
    document.removeEventListener("fullscreenchange", handler)
    document.removeEventListener("webkitfullscreenchange", handler)
  }
}
