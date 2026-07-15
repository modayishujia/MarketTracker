import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database.Database | null = null

const DEFAULT_FEEDS = [
  // 科技新闻
  { title: 'TechCrunch', url: 'https://techcrunch.com/feed/', source_type: 'rss' },
  { title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', source_type: 'rss' },
  { title: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', source_type: 'rss' },
  { title: 'Wired', url: 'https://www.wired.com/feed/rss', source_type: 'rss' },
  { title: 'Hacker News', url: 'https://hnrss.org/frontpage', source_type: 'rss' },
  { title: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', source_type: 'rss' },
  
  // AI & 机器学习
  { title: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', source_type: 'rss' },
  { title: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', source_type: 'rss' },
  { title: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml', source_type: 'rss' },
  { title: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', source_type: 'rss' },
  
  // 金融 & 财经
  { title: 'Bloomberg Markets', url: 'https://feeds.bloomberg.com/markets/news.rss', source_type: 'rss' },
  { title: 'Reuters Business', url: 'https://www.reutersagency.com/feed/?best-topics=business-finance', source_type: 'rss' },
  { title: 'Financial Times', url: 'https://www.ft.com/rss/home', source_type: 'rss' },
  { title: 'Wall Street Journal', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', source_type: 'rss' },
  { title: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source_type: 'rss' },
  { title: 'CoinTelegraph', url: 'https://cointelegraph.com/rss', source_type: 'rss' },
  { title: 'Seeking Alpha', url: 'https://seekingalpha.com/market_currents.xml', source_type: 'rss' },
  { title: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories/', source_type: 'rss' },
  { title: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', source_type: 'rss' },
  { title: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', source_type: 'rss' },
  { title: 'Investing.com News', url: 'https://www.investing.com/rss/news.rss', source_type: 'rss' },
  
  // 产品评测 & 消费科技
  { title: 'MacRumors', url: 'https://feeds.macrumors.com/MacRumors-All', source_type: 'rss' },
  { title: '9to5Mac', url: 'https://9to5mac.com/feed/', source_type: 'rss' },
  { title: 'Electrek', url: 'https://electrek.co/feed/', source_type: 'rss' },
  { title: 'The Information', url: 'https://www.theinformation.com/feed', source_type: 'rss' },
  
  // 开发者 & 编程
  { title: 'GitHub Blog', url: 'https://github.blog/feed/', source_type: 'rss' },
  { title: 'Stack Overflow Blog', url: 'https://stackoverflow.blog/feed/', source_type: 'rss' },
  { title: 'Dev.to', url: 'https://dev.to/feed', source_type: 'rss' },
  { title: 'Medium Technology', url: 'https://medium.com/feed/topic/technology', source_type: 'rss' },
  
  // 科学 & 研究
  { title: 'Nature News', url: 'https://www.nature.com/nature.rss', source_type: 'rss' },
  { title: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', source_type: 'rss' },
  { title: 'arXiv CS', url: 'https://rss.arxiv.org/rss/cs', source_type: 'rss' },
  
  // 中国科技媒体
  { title: '36氪', url: 'https://36kr.com/feed', source_type: 'rss' },
  { title: '少数派', url: 'https://sspai.com/feed', source_type: 'rss' },
  { title: 'InfoQ 中文', url: 'https://www.infoq.cn/feed', source_type: 'rss' },
  { title: '机器之心', url: 'https://www.jiqizhixin.com/rss', source_type: 'rss' },
  
  // 中国财经
  { title: '华尔街见闻', url: 'https://wallstreetcn.com/rss', source_type: 'rss' },
  { title: '财新网', url: 'https://rsshub.app/caixin/latest', source_type: 'rss' },
  { title: '第一财经', url: 'https://rsshub.app/yicai/brief', source_type: 'rss' },
]

export function getDatabase(): Database.Database {
  if (db) {
    return db
  }

  const dbPath = path.join(app.getPath('userData'), 'money-analysis.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initializeDatabase(db)
  migrateDatabase(db)
  seedDefaultFeeds(db)

  return db
}

function initializeDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'rss',
      last_fetched_at DATETIME,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      title_zh TEXT,
      url TEXT UNIQUE NOT NULL,
      content TEXT,
      published_at DATETIME,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read BOOLEAN DEFAULT 0,
      is_favorite BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      analysis_type TEXT NOT NULL,
      result TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
    CREATE INDEX IF NOT EXISTS idx_articles_is_favorite ON articles(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_analyses_article_id ON analyses(article_id);
    CREATE INDEX IF NOT EXISTS idx_analyses_analysis_type ON analyses(analysis_type);
    CREATE INDEX IF NOT EXISTS idx_notes_article_id ON notes(article_id);

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ticker TEXT,
      sector TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      keywords TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS article_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      relevance_score REAL DEFAULT 0.5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(article_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      signal_type TEXT NOT NULL,
      grade TEXT NOT NULL,
      score REAL NOT NULL,
      reasoning TEXT NOT NULL,
      evidence TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
    CREATE INDEX IF NOT EXISTS idx_article_products_article_id ON article_products(article_id);
    CREATE INDEX IF NOT EXISTS idx_article_products_product_id ON article_products(product_id);
    CREATE INDEX IF NOT EXISTS idx_signals_company_id ON signals(company_id);
    CREATE INDEX IF NOT EXISTS idx_signals_grade ON signals(grade);
    CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at);
  `)
}

function migrateDatabase(db: Database.Database): void {
  const columns = db.prepare("PRAGMA table_info(articles)").all() as { name: string }[]
  const hasTitleZh = columns.some(c => c.name === 'title_zh')
  if (!hasTitleZh) {
    db.exec('ALTER TABLE articles ADD COLUMN title_zh TEXT')
    console.log('Migrated: added title_zh column to articles')
  }

  // Ensure new tables exist (for existing DBs)
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
  const tableNames = new Set(tables.map(t => t.name))
  if (!tableNames.has('companies')) {
    initializeDatabase(db)
    console.log('Migrated: added companies/products/article_products/signals tables')
  }
}

function seedDefaultFeeds(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) as count FROM feeds').get() as any).count
  if (count > 0) return

  const stmt = db.prepare('INSERT OR IGNORE INTO feeds (title, url, source_type) VALUES (?, ?, ?)')
  const insertMany = db.transaction((feeds: typeof DEFAULT_FEEDS) => {
    for (const feed of feeds) {
      stmt.run(feed.title, feed.url, feed.source_type)
    }
  })

  insertMany(DEFAULT_FEEDS)
  console.log(`Seeded ${DEFAULT_FEEDS.length} default feeds`)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
