# Financial RSS Analyzer - Design Spec

## [S1] Architecture Overview

**Tech Stack:**
- **Electron + React** (TypeScript)
- **SQLite** via better-sqlite3 (local storage)
- **OpenAI-compatible API** (LLM integration)
- **Tailwind CSS** (styling)
- **electron-vite** (unified build)
- **Zustand** (state management)
- **Recharts** (data visualization)

**Three-layer architecture:**

```
┌─────────────────────────────────────┐
│           Renderer (React UI)       │
│  ┌──────┐ ┌──────┐ ┌──────────┐    │
│  │Feed  │ │Detail│ │ Analysis │    │
│  │List  │ │Panel │ │ Charts   │    │
│  └──────┘ └──────┘ └──────────┘    │
├─────────────────────────────────────┤
│        IPC Bridge (preload)         │
├─────────────────────────────────────┤
│          Main Process               │
│  ┌──────┐ ┌──────┐ ┌──────────┐    │
│  │RSS   │ │LLM   │ │ SQLite   │    │
│  │Parser│ │Client│ │ Database │    │
│  └──────┘ └──────┘ └──────────┘    │
└─────────────────────────────────────┘
```

## [S2] Data Model

```sql
-- RSS feeds
CREATE TABLE feeds (
  id INTEGER PRIMARY KEY,
  title TEXT,
  url TEXT UNIQUE,
  source_type TEXT,  -- 'rss' | 'dxtools'
  last_fetched_at DATETIME,
  is_active BOOLEAN DEFAULT 1
);

-- Articles
CREATE TABLE articles (
  id INTEGER PRIMARY KEY,
  feed_id INTEGER REFERENCES feeds(id),
  title TEXT,
  url TEXT UNIQUE,
  content TEXT,
  published_at DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT 0,
  is_favorite BOOLEAN DEFAULT 0
);

-- LLM analysis results
CREATE TABLE analyses (
  id INTEGER PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id),
  analysis_type TEXT,  -- 'insight' | 'sentiment' | 'report'
  result JSON,         -- {summary, keyPoints, sentiment, score, ...}
  model TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User notes
CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id),
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User settings (KV store)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

## [S3] RSS Fetching & LLM Analysis

### RSS Fetching Flow

1. User adds RSS source (plain URL or dxtools aggregated source)
2. Periodic fetching (configurable interval, default 30 minutes)
3. For dxtools aggregated sources: fetch sub-source list first, then fetch each
4. New articles deduplicated by URL and stored in SQLite
5. Auto-analysis triggered based on user configuration

### LLM Analysis Prompt Templates

- **Insight Extraction**: Extract 3-5 key points, involved markets/assets, potential impacts
- **Sentiment Analysis**: Determine market sentiment (bullish/bearish/neutral) + confidence + reasoning
- **Comprehensive Report**: Merge multiple articles into market overview

### OpenAI API Integration

```typescript
interface LLMConfig {
  baseUrl: string;   // e.g. "https://api.openai.com/v1"
  apiKey: string;
  model: string;     // e.g. "gpt-4o-mini"
}

// POST {baseUrl}/chat/completions
{
  model,
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: articleContent }
  ]
}
```

## [S4] UI Design

### Layout: Three-column

```
┌──────────┬──────────────────────┬──────────────┐
│ Left     │   Center Content     │ Right Panel  │
│ Sidebar  │                      │              │
│          │                      │              │
│ Feeds    │  Article List /      │ Analysis     │
│  - All   │  Article Detail      │ Results      │
│  - By src│                      │              │
│          │                      │ Insights     │
│ Favorites│                      │ Sentiment    │
│ Analysis │                      │ Notes        │
│ Settings │                      │              │
└──────────┴──────────────────────┴──────────────┘
```

### Pages/Components

1. **Feed Management** - Add/delete/edit RSS sources, show fetch status
2. **Article List** - Timeline view, filters (unread/favorites/analyzed)
3. **Article Detail** - Original content + right-side analysis panel
4. **Analysis Dashboard** - Sentiment trend chart, keyword cloud, asset mention frequency
5. **Settings** - LLM config, fetch interval, language switch, auto-analysis toggle

### Data Visualization (Recharts)

- Sentiment trend line chart
- Asset mention frequency bar chart
- Sentiment distribution pie chart

## [S5] Error Handling & Project Structure

### Error Handling

- RSS fetch failure → Show error status, auto-retry (exponential backoff)
- LLM API call failure → Prompt user to check config, support retry
- Network offline → Cache existing data, show offline status
- SQLite write failure → Transaction rollback, prompt user

### Project Structure

```
MoneyAalysis/
├── electron/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # IPC bridge
│   ├── db/              # SQLite database operations
│   │   ├── schema.ts
│   │   └── queries.ts
│   ├── services/
│   │   ├── rss.ts       # RSS fetching & parsing
│   │   ├── llm.ts       # LLM API calls
│   │   └── scheduler.ts # Scheduled tasks
│   └── ipc/             # IPC handlers
├── src/                 # React frontend
│   ├── App.tsx
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   ├── stores/          # Zustand state management
│   ├── i18n/            # Internationalization
│   └── types/
├── package.json
├── electron-builder.json
├── vite.config.ts
└── tailwind.config.js
```

### Build Tool

**electron-vite** - Unified Vite build for both Electron main process and React renderer.

## [S6] Feature Scope

### Core Features (All Selected)

1. News Feed browsing
2. Key insight extraction
3. Sentiment analysis
4. Comprehensive analysis reports
5. Favorites & notes
6. Data visualization

### Analysis Trigger Modes

- Auto-analyze all new articles
- Manual trigger per article
- Configurable via settings

### UI Language

- Chinese/English bilingual with language switch in settings
