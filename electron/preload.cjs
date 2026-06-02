const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('casArchiveApi', {
  list: () => ipcRenderer.invoke('archives:list'),
  save: (files) => ipcRenderer.invoke('archives:save', files),
  open: (filePath) => ipcRenderer.invoke('archives:open', filePath),
  delete: (archiveId) => ipcRenderer.invoke('archives:delete', archiveId),
})

contextBridge.exposeInMainWorld('casManualApi', {
  get: () => ipcRenderer.invoke('manual:get'),
  replace: (file) => ipcRenderer.invoke('manual:replace', file),
})

contextBridge.exposeInMainWorld('casFeatureSettingsApi', {
  get: () => ipcRenderer.invoke('feature-settings:get'),
  set: (settings) => ipcRenderer.invoke('feature-settings:set', settings),
})
