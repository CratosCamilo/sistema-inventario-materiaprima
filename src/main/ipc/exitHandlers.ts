import { ipcMain } from 'electron'
import * as exitService from '../services/exitService'

export function registerExitHandlers(): void {
  ipcMain.handle('exits:list',   (_e, filters) => exitService.listExits(filters))
  ipcMain.handle('exits:get',    (_e, id: number) => exitService.getExit(id))
  ipcMain.handle('exits:create', (_e, input) => exitService.createExit(input))
}
