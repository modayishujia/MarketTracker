import { ipcMain } from 'electron'
import { getNotesByArticle, addNote, updateNote, deleteNote } from '../db/notes'

export function registerNoteHandlers() {
  ipcMain.handle('notes:getByArticle', (_event, articleId: number) => {
    return getNotesByArticle(articleId)
  })

  ipcMain.handle('notes:add', (_event, articleId: number, content: string) => {
    return addNote(articleId, content)
  })

  ipcMain.handle('notes:update', (_event, id: number, content: string) => {
    return updateNote(id, content)
  })

  ipcMain.handle('notes:delete', (_event, id: number) => {
    return deleteNote(id)
  })
}
