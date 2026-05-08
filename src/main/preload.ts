import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  products: {
    list:            ()             => ipcRenderer.invoke('products:list'),
    get:             (id: number)   => ipcRenderer.invoke('products:get', id),
    create:          (input: unknown) => ipcRenderer.invoke('products:create', input),
    update:          (id: number, input: unknown) => ipcRenderer.invoke('products:update', id, input),
    deactivate:      (id: number)   => ipcRenderer.invoke('products:deactivate', id),
    setInitialStock: (items: unknown) => ipcRenderer.invoke('products:setInitialStock', items),
  },
  suppliers: {
    list:   ()                             => ipcRenderer.invoke('suppliers:list'),
    create: (input: unknown)               => ipcRenderer.invoke('suppliers:create', input),
    update: (id: number, input: unknown)   => ipcRenderer.invoke('suppliers:update', id, input),
  },
  entries: {
    list:   (filters?: unknown) => ipcRenderer.invoke('entries:list', filters),
    get:    (id: number)        => ipcRenderer.invoke('entries:get', id),
    create: (input: unknown)    => ipcRenderer.invoke('entries:create', input),
  },
  exits: {
    list:   (filters?: unknown) => ipcRenderer.invoke('exits:list', filters),
    get:    (id: number)        => ipcRenderer.invoke('exits:get', id),
    create: (input: unknown)    => ipcRenderer.invoke('exits:create', input),
  },
  adjustments: {
    list:   (filters?: unknown) => ipcRenderer.invoke('adjustments:list', filters),
    create: (input: unknown)    => ipcRenderer.invoke('adjustments:create', input),
  },
  movements: {
    listByProduct: (productId: number) => ipcRenderer.invoke('movements:byProduct', productId),
    listRecent:    (limit?: number)    => ipcRenderer.invoke('movements:recent', limit),
  },
  dashboard: {
    getSummary: () => ipcRenderer.invoke('dashboard:summary'),
  },
  settings: {
    get:    (key: string)               => ipcRenderer.invoke('settings:get', key),
    set:    (key: string, val: string)  => ipcRenderer.invoke('settings:set', key, val),
    getAll: ()                          => ipcRenderer.invoke('settings:getAll'),
  },
})
