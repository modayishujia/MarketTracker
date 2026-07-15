import { getDatabase } from './database'

export interface Company {
  id: number
  name: string
  ticker: string | null
  sector: string | null
  description: string | null
  created_at: string
}

export interface Product {
  id: number
  company_id: number
  name: string
  category: string | null
  description: string | null
  keywords: string | null
  created_at: string
}

export interface ArticleProduct {
  id: number
  article_id: number
  product_id: number
  relevance_score: number
  created_at: string
}

export interface Signal {
  id: number
  company_id: number
  signal_type: string
  grade: string
  score: number
  reasoning: string
  evidence: string
  status: string
  created_at: string
}

// Companies CRUD
export function getAllCompanies(): Company[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM companies ORDER BY name').all() as Company[]
}

export function getCompanyById(id: number): Company | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as Company | undefined
}

export function addCompany(name: string, ticker?: string, sector?: string, description?: string): Company {
  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO companies (name, ticker, sector, description) VALUES (?, ?, ?, ?)'
  ).run(name, ticker || null, sector || null, description || null)
  return getCompanyById(result.lastInsertRowid as number)!
}

export function updateCompany(id: number, name: string, ticker?: string, sector?: string, description?: string): void {
  const db = getDatabase()
  db.prepare(
    'UPDATE companies SET name = ?, ticker = ?, sector = ?, description = ? WHERE id = ?'
  ).run(name, ticker || null, sector || null, description || null, id)
}

export function deleteCompany(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM companies WHERE id = ?').run(id)
}

// Products CRUD
export function getProductsByCompany(companyId: number): Product[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM products WHERE company_id = ? ORDER BY name').all(companyId) as Product[]
}

export function getAllProducts(): Product[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT p.*, c.name as company_name, c.ticker
    FROM products p
    JOIN companies c ON p.company_id = c.id
    ORDER BY c.name, p.name
  `).all() as (Product & { company_name: string; ticker: string | null })[]
}

export function getProductById(id: number): Product | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined
}

export function addProduct(companyId: number, name: string, category?: string, description?: string, keywords?: string): Product {
  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO products (company_id, name, category, description, keywords) VALUES (?, ?, ?, ?, ?)'
  ).run(companyId, name, category || null, description || null, keywords || null)
  return getProductById(result.lastInsertRowid as number)!
}

export function updateProduct(id: number, name: string, category?: string, description?: string, keywords?: string): void {
  const db = getDatabase()
  db.prepare(
    'UPDATE products SET name = ?, category = ?, description = ?, keywords = ? WHERE id = ?'
  ).run(name, category || null, description || null, keywords || null, id)
}

export function deleteProduct(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM products WHERE id = ?').run(id)
}

// Article-Product linking
export function linkArticleProduct(articleId: number, productId: number, relevanceScore: number = 0.5): void {
  const db = getDatabase()
  db.prepare(
    'INSERT OR IGNORE INTO article_products (article_id, product_id, relevance_score) VALUES (?, ?, ?)'
  ).run(articleId, productId, relevanceScore)
}

export function getProductsByArticle(articleId: number): (Product & { relevance_score: number })[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT p.*, ap.relevance_score
    FROM products p
    JOIN article_products ap ON p.id = ap.product_id
    WHERE ap.article_id = ?
    ORDER BY ap.relevance_score DESC
  `).all(articleId) as (Product & { relevance_score: number })[]
}

export function getArticlesByProduct(productId: number, limit: number = 50): { article_id: number }[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT article_id FROM article_products
    WHERE product_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(productId, limit) as { article_id: number }[]
}

// Signals CRUD
export function getSignalsByCompany(companyId: number): Signal[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM signals WHERE company_id = ? ORDER BY created_at DESC'
  ).all(companyId) as Signal[]
}

export function getActiveSignals(limit: number = 50): (Signal & { company_name: string; ticker: string | null })[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT s.*, c.name as company_name, c.ticker
    FROM signals s
    JOIN companies c ON s.company_id = c.id
    WHERE s.status = 'active'
    ORDER BY s.score DESC, s.created_at DESC
    LIMIT ?
  `).all(limit) as (Signal & { company_name: string; ticker: string | null })[]
}

export function addSignal(
  companyId: number,
  signalType: string,
  grade: string,
  score: number,
  reasoning: string,
  evidence: string
): Signal {
  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO signals (company_id, signal_type, grade, score, reasoning, evidence) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(companyId, signalType, grade, score, reasoning, evidence)
  return db.prepare('SELECT * FROM signals WHERE id = ?').get(result.lastInsertRowid) as Signal
}

export function dismissSignal(id: number): void {
  const db = getDatabase()
  db.prepare("UPDATE signals SET status = 'dismissed' WHERE id = ?").run(id)
}

export function getSignalCount(): { active: number; dismissed: number } {
  const db = getDatabase()
  const active = (db.prepare("SELECT COUNT(*) as c FROM signals WHERE status = 'active'").get() as { c: number }).c
  const dismissed = (db.prepare("SELECT COUNT(*) as c FROM signals WHERE status = 'dismissed'").get() as { c: number }).c
  return { active, dismissed }
}

export function getSignalDetail(signalId: number): (Signal & { company_name: string; ticker: string | null; sector: string | null }) | undefined {
  const db = getDatabase()
  return db.prepare(`
    SELECT s.*, c.name as company_name, c.ticker, c.sector
    FROM signals s JOIN companies c ON s.company_id = c.id
    WHERE s.id = ?
  `).get(signalId) as any
}

export function getCompanyArticles(companyId: number, limit: number = 30): {
  id: number; title: string; title_zh: string | null; url: string; published_at: string | null;
  sentiment: string | null; confidence: number | null; summary: string | null
}[] {
  const db = getDatabase()
  const productIds = db.prepare('SELECT id FROM products WHERE company_id = ?').all(companyId).map((p: any) => p.id)
  if (productIds.length === 0) return []
  const ph = productIds.map(() => '?').join(',')

  return db.prepare(`
    SELECT DISTINCT ar.id, ar.title, ar.title_zh, ar.url, ar.published_at,
      json_extract(a.result, '$.sentiment') as sentiment,
      json_extract(a.result, '$.confidence') as confidence,
      json_extract(a.result, '$.summary') as summary
    FROM articles ar
    JOIN article_products ap ON ar.id = ap.article_id
    LEFT JOIN analyses a ON ar.id = a.article_id AND a.analysis_type IN ('insight', 'sentiment')
    WHERE ap.product_id IN (${ph})
    ORDER BY ar.published_at DESC
    LIMIT ?
  `).all(...productIds, limit) as any[]
}

export function getCompanyProducts(companyId: number): Product[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM products WHERE company_id = ? ORDER BY name').all(companyId) as Product[]
}
