import { contextBridge, ipcRenderer } from 'electron'
import type { ManagerAPI, ManagerSnapshot } from '../shared/manager'
const api:ManagerAPI={
 snapshot:()=>ipcRenderer.invoke('collection:snapshot'),
 action:action=>ipcRenderer.invoke('collection:action',action),
 onChange:callback=>{const listener=(_event:Electron.IpcRendererEvent,state:ManagerSnapshot)=>callback(state);ipcRenderer.on('collection:change',listener);return()=>ipcRenderer.removeListener('collection:change',listener)}
}
contextBridge.exposeInMainWorld('collection',api)
