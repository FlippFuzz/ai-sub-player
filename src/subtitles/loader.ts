/**
 * Converts standard GitHub web URLs to raw CORS-accessible URLs:
 * https://github.com/user/repo/blob/branch/path/sub.srt
 * -> https://raw.githubusercontent.com/user/repo/branch/path/sub.srt
 */
function normalizeSrtUrl(inputUrl: string): string {
  const trimmed = inputUrl.trim()
  const githubBlobRegex =
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/
  const match = trimmed.match(githubBlobRegex)

  if (match) {
    const [, user, repo, branch, path] = match
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`
  }

  return trimmed
}

/**
 * Fetches an SRT file over HTTP/HTTPS with error reporting.
 */
export async function loadSrtFromUrl(url: string): Promise<string> {
  const directUrl = normalizeSrtUrl(url)
  const response = await fetch(directUrl)

  if (!response.ok) {
    throw new Error(
      `Failed to fetch subtitle (HTTP ${response.status}: ${response.statusText})`,
    )
  }

  return await response.text()
}

/**
 * Reads a user-selected local file using FileReader.
 */
export function loadSrtFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () =>
      reject(new Error("Failed to read local subtitle file."))
    reader.readAsText(file, "utf-8")
  })
}
