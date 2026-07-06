import { ipcMain } from 'electron'
import { getSetting, setSetting, getAllSettings, deleteSetting } from '../db/settings'

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', (_event, key: string) => {
    return getSetting(key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    setSetting(key, value)
  })

  ipcMain.handle('settings:getAll', () => {
    return getAllSettings()
  })

  ipcMain.handle('settings:delete', (_event, key: string) => {
    return deleteSetting(key)
  })
}
