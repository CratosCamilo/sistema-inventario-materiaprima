// Re-exports convenientes del API IPC
// El objeto window.electronAPI es inyectado por el preload

export const api = {
  get products()    { return window.electronAPI.products    },
  get suppliers()   { return window.electronAPI.suppliers   },
  get entries()     { return window.electronAPI.entries     },
  get exits()       { return window.electronAPI.exits       },
  get adjustments() { return window.electronAPI.adjustments },
  get movements()   { return window.electronAPI.movements   },
  get dashboard()   { return window.electronAPI.dashboard   },
  get settings()    { return window.electronAPI.settings    },
}
