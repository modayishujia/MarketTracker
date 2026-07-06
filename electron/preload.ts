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
    fetchActive: () => ipcRenderer.invoke('feeds:fetchActive')
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
    analyzeArticle: (title: string, content: string) =>
      ipcRenderer.invoke('llm:analyzeArticle', title, content),
    analyzeSentiment: (title: string, content: string) =>
      ipcRenderer.invoke('llm:analyzeSentiment', title, content),
    generateReport: (articles: { title: string; content: string }[]) =>
      ipcRenderer.invoke('llm:generateReport', articles),
    testConnection: () => ipcRenderer.invoke('llm:testConnection')
  },

  scheduler: {
    restart: () => ipcRenderer.send('scheduler:restart')
  },

  onNewArticles: (callback: (count: number) => void) => {
    ipcRenderer.on('feeds:newArticles', (_event, count) => callback(count))
  }
})
