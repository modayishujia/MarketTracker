import { ipcMain } from 'electron'
import {
  getAllCompanies, getCompanyById, addCompany, updateCompany, deleteCompany,
  getAllProducts, getProductsByCompany, addProduct, updateProduct, deleteProduct,
  getActiveSignals, addSignal, dismissSignal, getSignalCount,
  linkArticleProduct, getProductsByArticle,
  getSignalDetail, getCompanyArticles, getCompanyProducts
} from '../db/opportunities'

export function registerOpportunityHandlers() {
  // Companies
  ipcMain.handle('companies:getAll', async () => {
    return getAllCompanies()
  })

  ipcMain.handle('companies:getById', async (_event, id: number) => {
    return getCompanyById(id)
  })

  ipcMain.handle('companies:add', async (_event, name: string, ticker?: string, sector?: string, description?: string) => {
    return addCompany(name, ticker, sector, description)
  })

  ipcMain.handle('companies:update', async (_event, id: number, name: string, ticker?: string, sector?: string, description?: string) => {
    updateCompany(id, name, ticker, sector, description)
    return { ok: true }
  })

  ipcMain.handle('companies:delete', async (_event, id: number) => {
    deleteCompany(id)
    return { ok: true }
  })

  // Products
  ipcMain.handle('products:getAll', async () => {
    return getAllProducts()
  })

  ipcMain.handle('products:getByCompany', async (_event, companyId: number) => {
    return getProductsByCompany(companyId)
  })

  ipcMain.handle('products:add', async (_event, companyId: number, name: string, category?: string, description?: string, keywords?: string) => {
    return addProduct(companyId, name, category, description, keywords)
  })

  ipcMain.handle('products:update', async (_event, id: number, name: string, category?: string, description?: string, keywords?: string) => {
    updateProduct(id, name, category, description, keywords)
    return { ok: true }
  })

  ipcMain.handle('products:delete', async (_event, id: number) => {
    deleteProduct(id)
    return { ok: true }
  })

  // Signals
  ipcMain.handle('signals:getActive', async (_event, limit?: number) => {
    return getActiveSignals(limit)
  })

  ipcMain.handle('signals:add', async (_event, companyId: number, signalType: string, grade: string, score: number, reasoning: string, evidence: string) => {
    return addSignal(companyId, signalType, grade, score, reasoning, evidence)
  })

  ipcMain.handle('signals:dismiss', async (_event, id: number) => {
    dismissSignal(id)
    return { ok: true }
  })

  ipcMain.handle('signals:getCount', async () => {
    return getSignalCount()
  })

  // Article-Product linking
  ipcMain.handle('opportunities:getProductsByArticle', async (_event, articleId: number) => {
    return getProductsByArticle(articleId)
  })

  ipcMain.handle('opportunities:linkArticleProduct', async (_event, articleId: number, productId: number, relevanceScore?: number) => {
    linkArticleProduct(articleId, productId, relevanceScore)
    return { ok: true }
  })

  ipcMain.handle('signals:getDetail', async (_event, signalId: number) => {
    return getSignalDetail(signalId)
  })

  ipcMain.handle('signals:getCompanyArticles', async (_event, companyId: number, limit?: number) => {
    return getCompanyArticles(companyId, limit)
  })

  ipcMain.handle('signals:getCompanyProducts', async (_event, companyId: number) => {
    return getCompanyProducts(companyId)
  })
}
