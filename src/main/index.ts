import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { runMigrations } from './database/migrations'
import { runSeed } from './database/seed'
import { closeDb } from './database/connection'
import { registerProductHandlers } from './ipc/productHandlers'
import { registerEntryHandlers } from './ipc/entryHandlers'
import { registerExitHandlers } from './ipc/exitHandlers'
import { registerAdjustmentHandlers } from './ipc/adjustmentHandlers'
import { registerDashboardHandlers } from './ipc/dashboardHandlers'

const isDev = !app.isPackaged

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#006a6b',
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  win.once('ready-to-show', () => win.show())
}

app.whenReady().then(() => {
  // Base de datos
  runMigrations()
  runSeed()

  // IPC
  registerProductHandlers()
  registerEntryHandlers()
  registerExitHandlers()
  registerAdjustmentHandlers()
  registerDashboardHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})
