import { ipcMain } from 'electron'
import { getArticles, getArticleById, markArticleRead, toggleArticleFavorite, getArticleCount } from '../db/articles'

export function registerArticleHandlers() {
  ipcMain.handle('articles:getAll', (_event, options?: { feedId?: number; isFavorite?: boolean; isRead?: boolean; limit?: number; offset?: number }) => {
    return getArticles(options)
  })

  ipcMain.handle('articles:getById', (_event, id: number) => {
    return getArticleById(id)
  })

  ipcMain.handle('articles:markRead', (_event, id: number, isRead?: boolean) => {
    markArticleRead(id, isRead)
  })

  ipcMain.handle('articles:toggleFavorite', (_event, id: number) => {
    return toggleArticleFavorite(id)
  })

  ipcMain.handle('articles:getCount', (_event, options?: { feedId?: number; isFavorite?: boolean }) => {
    return getArticleCount(options)
  })
}
