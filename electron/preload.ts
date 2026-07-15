import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  feeds: {
    getAll: () => ipcRenderer.invoke('feeds:getAll'),
    add: (title: string, url: string, sourceType?: 'rss' | 'dxtools') =>
      ipcRenderer.invoke('feeds:add', title, url, sourceType),
    update: (id: number, title: string, url: string, sourceType: 'rss' | 'dxtools') =>
      ipcRenderer.invoke('feeds:update', id, title, url, sourceType),
    delete: (id: number) => ipcRenderer.invoke('feeds:delete', id),
    fetch: (feedId: number, feedUrl: string, sourceType: 'rss' | 'dxtools') =>
      ipcRenderer.invoke('feeds:fetch', feedId, feedUrl, sourceType),
    fetchActive: () => ipcRenderer.invoke('feeds:fetchActive'),
    syncAll: () => ipcRenderer.invoke('feeds:syncAll')
  },

  articles: {
    getAll: (options?: { feedId?: number; isFavorite?: boolean; isRead?: boolean; limit?: number; offset?: number }) =>
      ipcRenderer.invoke('articles:getAll', options),
    getById: (id: number) => ipcRenderer.invoke('articles:getById', id),
    markRead: (id: number, isRead?: boolean) => ipcRenderer.invoke('articles:markRead', id, isRead),
    toggleFavorite: (id: number) => ipcRenderer.invoke('articles:toggleFavorite', id),
    getCount: (options?: { feedId?: number; isFavorite?: boolean }) =>
      ipcRenderer.invoke('articles:getCount', options)
  },

  analyses: {
    getByArticle: (articleId: number) => ipcRenderer.invoke('analyses:getByArticle', articleId),
    getRecent: (limit?: number) => ipcRenderer.invoke('analyses:getRecent', limit),
    getByType: (analysisType: 'insight' | 'sentiment' | 'report', limit?: number) =>
      ipcRenderer.invoke('analyses:getByType', analysisType, limit),
    getCount: (options?: { articleId?: number; analysisType?: string }) =>
      ipcRenderer.invoke('analyses:getCount', options),
    getPulseData: () => ipcRenderer.invoke('analyses:getPulseData'),
    getUnanalyzed: (limit?: number) => ipcRenderer.invoke('analyses:getUnanalyzed', limit)
  },

  notes: {
    getByArticle: (articleId: number) => ipcRenderer.invoke('notes:getByArticle', articleId),
    add: (articleId: number, content: string) => ipcRenderer.invoke('notes:add', articleId, content),
    update: (id: number, content: string) => ipcRenderer.invoke('notes:update', id, content),
    delete: (id: number) => ipcRenderer.invoke('notes:delete', id)
  },

  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    delete: (key: string) => ipcRenderer.invoke('settings:delete', key)
  },

  llm: {
    analyzeArticle: (articleId: number) =>
      ipcRenderer.invoke('llm:analyzeArticle', articleId),
    analyzeSentiment: (articleId: number) =>
      ipcRenderer.invoke('llm:analyzeSentiment', articleId),
    generateReport: (articles: { title: string; content: string }[]) =>
      ipcRenderer.invoke('llm:generateReport', articles),
    testConnection: () => ipcRenderer.invoke('llm:testConnection'),
    fetchContent: (url: string) => ipcRenderer.invoke('llm:fetchContent', url),
    summarize: (title: string, content: string) => ipcRenderer.invoke('llm:summarize', title, content),
    customAnalyze: (articleId: number, prompt: string) => ipcRenderer.invoke('llm:customAnalyze', articleId, prompt),
    generatePulseReport: (limit?: number) => ipcRenderer.invoke('llm:generatePulseReport', limit),
    marketIntelligence: (webData: { topic: string; items: string[] }[]) => ipcRenderer.invoke('llm:marketIntelligence', webData)
  },

  service: {
    isReady: () => ipcRenderer.invoke('service:isReady'),
    fetchFeed: (url: string) => ipcRenderer.invoke('service:fetchFeed', url),
    analyzeArticle: (title: string, content: string) => ipcRenderer.invoke('service:analyzeArticle', title, content),
    batchAnalyze: (articles: { title: string; content: string }[]) =>
      ipcRenderer.invoke('service:batchAnalyze', articles),
    updateConfig: () => ipcRenderer.invoke('service:updateConfig')
  },

  batchAnalysis: {
    start: (articleIds: number[]) => ipcRenderer.invoke('analysis:startBatch', articleIds),
    status: () => ipcRenderer.invoke('analysis:status')
  },

  companies: {
    getAll: () => ipcRenderer.invoke('companies:getAll'),
    getById: (id: number) => ipcRenderer.invoke('companies:getById', id),
    add: (name: string, ticker?: string, sector?: string, description?: string) =>
      ipcRenderer.invoke('companies:add', name, ticker, sector, description),
    update: (id: number, name: string, ticker?: string, sector?: string, description?: string) =>
      ipcRenderer.invoke('companies:update', id, name, ticker, sector, description),
    delete: (id: number) => ipcRenderer.invoke('companies:delete', id)
  },

  products: {
    getAll: () => ipcRenderer.invoke('products:getAll'),
    getByCompany: (companyId: number) => ipcRenderer.invoke('products:getByCompany', companyId),
    add: (companyId: number, name: string, category?: string, description?: string, keywords?: string) =>
      ipcRenderer.invoke('products:add', companyId, name, category, description, keywords),
    update: (id: number, name: string, category?: string, description?: string, keywords?: string) =>
      ipcRenderer.invoke('products:update', id, name, category, description, keywords),
    delete: (id: number) => ipcRenderer.invoke('products:delete', id)
  },

  signals: {
    getActive: (limit?: number) => ipcRenderer.invoke('signals:getActive', limit),
    add: (companyId: number, signalType: string, grade: string, score: number, reasoning: string, evidence: string) =>
      ipcRenderer.invoke('signals:add', companyId, signalType, grade, score, reasoning, evidence),
    dismiss: (id: number) => ipcRenderer.invoke('signals:dismiss', id),
    getCount: () => ipcRenderer.invoke('signals:getCount'),
    scan: () => ipcRenderer.invoke('signals:scan'),
    getDetail: (signalId: number) => ipcRenderer.invoke('signals:getDetail', signalId),
    getCompanyArticles: (companyId: number, limit?: number) => ipcRenderer.invoke('signals:getCompanyArticles', companyId, limit),
    getCompanyProducts: (companyId: number) => ipcRenderer.invoke('signals:getCompanyProducts', companyId)
  },

  opportunities: {
    getProductsByArticle: (articleId: number) => ipcRenderer.invoke('opportunities:getProductsByArticle', articleId),
    linkArticleProduct: (articleId: number, productId: number, relevanceScore?: number) =>
      ipcRenderer.invoke('opportunities:linkArticleProduct', articleId, productId, relevanceScore)
  },

  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  },

  mcp: {
    getCommand: () => ipcRenderer.invoke('mcp:getCommand')
  },

  websearch: {
    market: () => ipcRenderer.invoke('websearch:market'),
    query: (q: string, n?: number) => ipcRenderer.invoke('websearch:query', q, n)
  },

  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    version: () => ipcRenderer.invoke('update:version'),
    onChecking: (cb: () => void) => ipcRenderer.on('update:checking', () => cb()),
    onAvailable: (cb: (info: any) => void) => ipcRenderer.on('update:available', (_e, info) => cb(info)),
    onProgress: (cb: (progress: any) => void) => ipcRenderer.on('update:progress', (_e, p) => cb(p)),
    onDownloaded: (cb: (info: any) => void) => ipcRenderer.on('update:downloaded', (_e, info) => cb(info)),
    onError: (cb: (err: any) => void) => ipcRenderer.on('update:error', (_e, err) => cb(err))
  },

  scheduler: {
    restart: () => ipcRenderer.send('scheduler:restart')
  },

  onFeedsFetched: (callback: (data: { newCount: number }) => void) => {
    ipcRenderer.on('feeds:fetched', (_event, data) => callback(data))
  },

  onAnalysisProgress: (callback: (data: { processed: number; total: number; success: number }) => void) => {
    ipcRenderer.on('analysis:progress', (_event, data) => callback(data))
  },

  onAnalysisCompleted: (callback: (data: { processed: number; success: number }) => void) => {
    ipcRenderer.on('analysis:completed', (_event, data) => callback(data))
  },

  onAnalysisStarted: (callback: (data: { count: number }) => void) => {
    ipcRenderer.on('analysis:started', (_event, data) => callback(data))
  }
})
