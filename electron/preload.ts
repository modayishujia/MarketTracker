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
      ipcRenderer.invoke('analyses:getCount', options)
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
    testConnection: () => ipcRenderer.invoke('llm:testConnection')
  },

  batchAnalysis: {
    start: (articleIds: number[]) => ipcRenderer.invoke('analysis:startBatch', articleIds),
    status: () => ipcRenderer.invoke('analysis:status')
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
