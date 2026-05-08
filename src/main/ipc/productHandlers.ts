import { ipcMain } from 'electron'
import * as productService from '../services/productService'

export function registerProductHandlers(): void {
  ipcMain.handle('products:list',   () => productService.listProducts())
  ipcMain.handle('products:get',    (_e, id: number) => productService.getProduct(id))
  ipcMain.handle('products:create', (_e, input) => productService.createProduct(input))
  ipcMain.handle('products:update', (_e, id: number, input) => productService.updateProduct(id, input))
  ipcMain.handle('products:deactivate', (_e, id: number) => productService.deactivateProduct(id))
  ipcMain.handle('products:setInitialStock', (_e, items) => productService.setInitialStock(items))
}
