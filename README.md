# AI Sub Player

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?style=flat-square&logo=github)](https://flippfuzz.github.io/ai-sub-player/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](./LICENSE)

**AI Sub Player** is a lightweight, responsive web player designed for streaming YouTube videos with synchronized bilingual (Japanese + English) subtitles.

It serves as the dedicated web frontend for the **[ai-sub](https://github.com/FlippFuzz/ai-sub)** subtitle generation ecosystem and automatically discovers subtitle tracks from the **[ai-sub-showcase](https://github.com/FlippFuzz/ai-sub-showcase)** archive.

---

## 🌐 Live Player

**👉 Open the player:** **[https://flippfuzz.github.io/ai-sub-player/](https://flippfuzz.github.io/ai-sub-player/)**

---

## ✨ Features

- **Split & Stacked Dual Subtitles:**
  - **Stacked Bottom (Default):** Original transcription and English translation displayed together at the bottom.
  - **Split Screen:** Place the original language at the top and the English translation at the bottom (or vice versa) to avoid obstructing video action.
  - **Single Language Mode:** Toggle to display only the original language or only the English translation.
- **Automated Showcase Discovery:** When provided with an `uploader` and `v` (Video ID), the player fetches `video_meta.json` directly from **[ai-sub-showcase](https://github.com/FlippFuzz/ai-sub-showcase)** and populates all available model pipelines and drafts into an instant track selector.
- **Universal Input:**
  - Stream any YouTube video via URL or 11-character video ID.
  - Load remote `.srt` files from direct URLs (automatically converts GitHub blob links into raw CDN links).
  - Load local `.srt` files via file picker or drag-and-drop.
- **Metadata-Aware Parser:** Automatically detects and filters out 1ms ai-sub archival metadata headers (Event 0) to ensure zero artifact flashes during playback.
- **High-Precision Time Synchronization:** 100ms binary search synchronization loop guarantees audio-synchronized subtitles even through pauses, seeking, and playback rate adjustments.
- **Fully Customizable Subtitle Appearance:**
  - Relative font scaling (50% to 200%).
  - Text color and background box color pickers.
  - Background box opacity slider.
  - Bottom offset slider to clear YouTube player progress bars.
  - All appearance settings automatically persist in `localStorage`.
- **Fullscreen & Mobile Ready:** Container-level fullscreen retains styled subtitle overlays across desktop and mobile browsers, with `playsinline` support preventing native OS video takeover.

---

## 🔗 URL Query Parameters

You can share or bookmark direct playback links using URL parameters:

| Parameter | Description | Example |
| :--- | :--- | :--- |
| `v` | YouTube video ID or full YouTube video URL. | `v=23UEX1Yh43U` |
| `uploader` | Channel or uploader handle from [ai-sub-showcase](https://github.com/FlippFuzz/ai-sub-showcase). | `uploader=kazamairoha` |
| `track` | *(Optional)* Exact subtitle track name to select by default. | `track=gemini-3.8-flash (011019)` |
| `srt` | *(Optional)* Direct URL to an external `.srt` file. | `srt=https://example.com/subs.srt` |

### URL Examples

- **Auto-load from showcase archive:**
  ```text
  https://flippfuzz.github.io/ai-sub-player/?uploader=kazamairoha&v=23UEX1Yh43U
  ```
- **Load a YouTube video with a custom remote SRT:**
  ```text
  https://flippfuzz.github.io/ai-sub-player/?v=23UEX1Yh43U&srt=https://raw.githubusercontent.com/user/repo/main/subtitles.srt
  ```

---

## 🧩 The AI Sub Ecosystem

AI Sub Player is part of a three-part subtitling suite:

1. **[ai-sub](https://github.com/FlippFuzz/ai-sub)**: The core Python engine and distributed coordinator. It uses Google Gemini multimodal inference, FFmpeg chunking, and web search (LRCLIB, Tinyfish, DuckDuckGo) to generate timestamp-accurate bilingual subtitles.
2. **[ai-sub-showcase](https://github.com/FlippFuzz/ai-sub-showcase)**: The centralized GitHub archive where finalized subtitles, manifests (`video_meta.json`), and intermediate AI reasoning traces (`.int/`) are stored and organized.
3. **[ai-sub-player](https://github.com/FlippFuzz/ai-sub-player)** *(this repository)*: The web player client that ties the media stream and archive subtitles together into a seamless viewing experience.

---

## 🛠️ Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- npm

### Installation & Run

1. Clone this repository:
   ```bash
   git clone https://github.com/FlippFuzz/ai-sub-player.git
   cd ai-sub-player
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local Vite development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```
   The bundled static output will be written to the `dist/` directory.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).