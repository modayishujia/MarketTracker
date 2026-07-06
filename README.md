# MarketTracker

An AI-powered market analysis terminal built with Electron, React, and Vite.

[中文文档](./README.zh-CN.md)

## Features

- **RSS Feed** — Subscribe to multiple RSS sources, auto-fetch latest articles
- **AI Summary** — Auto-generate summaries and key points after fetching full content
- **AI Analysis** — Sentiment analysis (bullish/bearish/neutral), related assets, reasoning
- **Custom Analysis** — Configure custom prompts in settings, analyze articles on demand
- **Title Translation** — Auto-translate English titles to Chinese (requires LLM)
- **Dark / Light Theme** — Two theme modes
- **Bilingual UI** — Chinese and English interface
- **Auto Update** — Check for new versions and update with one click

## Download

Download the latest version from [Releases](https://github.com/modayishujia/MarketTracker/releases):

| Platform | Format |
|----------|--------|
| macOS | `.dmg` |
| Windows | `.exe` (NSIS installer) |

Daily automated builds (prerelease) are also published on the Releases page.

## Quick Start

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Build macOS installer
npm run build:mac

# Build Windows installer
npm run build:win
```

## Configuration

After first launch, go to **Settings** to configure:

1. **AI Model** — Enter your OpenAI-compatible API base URL, API key, and model name
2. **Feeds** — Default RSS sources are pre-loaded, you can add or remove feeds
3. **General** — Language, theme, fetch interval, auto-analyze toggle

## Tech Stack

- **Frontend** — React 19 + TypeScript + Tailwind CSS + Zustand
- **Desktop** — Electron 43 + electron-vite
- **Database** — SQLite (better-sqlite3), stored locally in `userData` directory
- **AI** — OpenAI-compatible API (works with any compatible endpoint)

## Project Structure

```
MarketTracker/
├── electron/              # Electron main process
│   ├── db/                # Database operations
│   ├── ipc/               # IPC handlers
│   ├── services/          # Business services (RSS, LLM, updater)
│   ├── main.ts            # Entry point
│   └── preload.ts         # Preload script
├── src/                   # React frontend
│   ├── components/        # Components
│   ├── stores/            # Zustand state management
│   ├── i18n/              # Internationalization
│   └── pages/             # Pages
├── build/                 # Build assets (icon etc.)
└── .github/workflows/     # CI/CD
```

## License

MIT
