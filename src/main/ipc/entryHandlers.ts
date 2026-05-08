import { ipcMain } from 'electron'
import * as entryService from '../services/entryService'

export function registerEntryHandlers(): void {
  ipcMain.handle('entries:list',   (_e, filters) => entryService.listEntries(filters))
  ipcMain.handle('entries:get',    (_e, id: number) => entryService.getEntry(id))
  ipcMain.handle('entries:create', (_e, input) => entryService.createEntry(input))
}
