import { ipcMain } from 'electron'
import * as adjustmentService from '../services/adjustmentService'
import * as movementService from '../services/movementService'

export function registerAdjustmentHandlers(): void {
  ipcMain.handle('adjustments:list',   (_e, filters) => adjustmentService.listAdjustments(filters))
  ipcMain.handle('adjustments:create', (_e, input) => adjustmentService.createAdjustment(input))
  ipcMain.handle('movements:byProduct', (_e, productId: number) => movementService.listMovementsByProduct(productId))
  ipcMain.handle('movements:recent',    (_e, limit?: number) => movementService.listRecentMovements(limit))
}
