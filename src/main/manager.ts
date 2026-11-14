import { BrowserWindow, ipcMain, Menu, type IpcMainInvokeEvent } from 'electron'
import { join } from 'node:path'
import type { ManagerResult, ManagerSnapshot } from '../shared/manager'

/** One ordinary native window. No note capabilities are exposed by its preload. */
export function createManager(getSnapshot:()=>ManagerSnapshot,action:(value:unknown)=>Promise<ManagerResult>,secure:(win:BrowserWindow)=>void){
 let win:BrowserWindow|undefined,revision=0,notification:ReturnType<typeof setTimeout>|undefined
 let queue=Promise.resolve<unknown>(undefined)
 const authorized=(event:IpcMainInvokeEvent)=>win&&!win.isDestroyed()&&event.sender===win.webContents&&event.senderFrame===event.sender.mainFrame
 const snapshot=()=>({...getSnapshot(),revision})
 ipcMain.handle('collection:snapshot',event=>{if(!authorized(event))throw new Error('Collection access denied');return snapshot()})
 ipcMain.handle('collection:action',(event,value:unknown)=>{
  if(!authorized(event))return {ok:false,error:'Collection access denied'}
  const result=queue.then(()=>action(value)).catch(error=>({ok:false,error:String(error)}))
  queue=result;return result
 })
 const notify=()=>{
  clearTimeout(notification)
  notification=setTimeout(()=>{revision++;if(win&&!win.isDestroyed()&&!win.webContents.isLoadingMainFrame())win.webContents.send('collection:change',snapshot())},100)
 }
 const open=async()=>{
  if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.show();win.focus();return}
  const current=new BrowserWindow({width:1120,height:780,minWidth:760,minHeight:560,title:'Stickee',backgroundColor:'#f4f3ef',show:false,autoHideMenuBar:true,webPreferences:{preload:join(__dirname,'../preload/manager.js'),sandbox:true,contextIsolation:true,nodeIntegration:false}})
  win=current;secure(current)
  // Hidden until Alt is pressed; native zoom roles retain their accelerators.
  current.setMenu(Menu.buildFromTemplate([{label:'View',submenu:[{role:'zoomIn'},{role:'zoomOut'},{role:'resetZoom'}]}]))
  current.on('closed',()=>{if(win===current)win=undefined})
  current.once('ready-to-show',()=>{if(!current.isDestroyed())current.show()})
  try{
   if(process.env.ELECTRON_RENDERER_URL)await current.loadURL(new URL('manager.html',process.env.ELECTRON_RENDERER_URL).toString())
   else await current.loadFile(join(__dirname,'../renderer/manager.html'))
  }catch(error){current.destroy();throw error}
 }
 return {open,notify,bounds:()=>win&&!win.isDestroyed()?win.getBounds():undefined,dispose:()=>clearTimeout(notification)}
}
