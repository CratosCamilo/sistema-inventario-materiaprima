import { ipcMain } from 'electron'
import * as dashboardService from '../services/dashboardService'
import * as settingsService from '../services/settingsService'
import * as supplierService from '../services/supplierService'

export function registerDashboardHandlers(): void {
  ipcMain.handle('dashboard:summary', () => dashboardService.getDashboardSummary())

  ipcMain.handle('settings:get',    (_e, key: string) => settingsService.getSetting(key))
  ipcMain.handle('settings:set',    (_e, key: string, value: string) => settingsService.setSetting(key, value))
  ipcMain.handle('settings:getAll', () => settingsService.getAllSettings())

  ipcMain.handle('suppliers:list',   () => supplierService.listSuppliers())
  ipcMain.handle('suppliers:create', (_e, input) => supplierService.createSupplier(input))
  ipcMain.handle('suppliers:update', (_e, id: number, input) => supplierService.updateSupplier(id, input))
}
