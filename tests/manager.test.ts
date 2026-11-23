import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ManagerSnapshot } from '../src/shared/manager'

const mock=vi.hoisted(()=>({handlers:new Map<string,Function>(),windows:[] as any[]}))
vi.mock('electron',()=>({
 app:{getAppPath:()=>'.'},
 Menu:{buildFromTemplate:(template:unknown)=>template},
 nativeTheme:{shouldUseHighContrastColors:false},
 ipcMain:{handle:(name:string,handler:Function)=>mock.handlers.set(name,handler)},
 BrowserWindow:class{
  webContents={mainFrame:{},isLoadingMainFrame:()=>false,send:vi.fn(),on:vi.fn(),setIgnoreMenuShortcuts:vi.fn()}
  show=vi.fn();focus=vi.fn();restore=vi.fn();setMenu=vi.fn();loadFile=vi.fn().mockResolvedValue(undefined);loadURL=vi.fn().mockResolvedValue(undefined)
  events=new Map<string,Function>();destroyed=false
  constructor(public options:unknown){mock.windows.push(this)}
  isDestroyed(){return this.destroyed}isMinimized(){return false}
  on(name:string,callback:Function){this.events.set(name,callback)}once(name:string,callback:Function){this.events.set(name,callback)}
  destroy(){this.destroyed=true;this.events.get('closed')?.()}
 }
}))
import { createManager } from '../src/main/manager'
const snapshot=():ManagerSnapshot=>({revision:0,notes:[],sets:[],settings:{sound:true,soundStyle:'rustle',defaultColor:'yellow',shortcut:'Control+Alt+N'},storagePath:'test/notes.json',saveError:false})
beforeEach(()=>{mock.handlers.clear();mock.windows.length=0;vi.useFakeTimers()})
afterEach(()=>vi.useRealTimers())
it('rejects another renderer and manager subframes before dispatching actions',async()=>{
 const action=vi.fn().mockResolvedValue({ok:true}),manager=createManager(snapshot,action,()=>{})
 await manager.open()
 const wc=mock.windows[0].webContents,handler=mock.handlers.get('collection:action')!
 expect(await handler({sender:{},senderFrame:{}},{type:'create'})).toEqual({ok:false,error:'Collection access denied'})
 expect(await handler({sender:wc,senderFrame:{}},{type:'create'})).toEqual({ok:false,error:'Collection access denied'})
 expect(action).not.toHaveBeenCalled()
 expect(()=>mock.handlers.get('collection:snapshot')!({sender:{},senderFrame:{}})).toThrow('access denied')
 manager.dispose()
})
it('serializes mutations and reuses one native manager window',async()=>{
 let finish!:()=>void
 const first=new Promise<void>(resolve=>finish=resolve),calls:string[]=[]
 const manager=createManager(snapshot,async(value:any)=>{calls.push(value.type);if(value.type==='first')await first;return {ok:true}},()=>{})
 await manager.open();await manager.open()
 expect(mock.windows).toHaveLength(1)
 expect(mock.windows[0].options.webPreferences).toMatchObject({sandbox:true,contextIsolation:true,nodeIntegration:false})
 const wc=mock.windows[0].webContents,event={sender:wc,senderFrame:wc.mainFrame},handler=mock.handlers.get('collection:action')!
 const a=handler(event,{type:'first'}),b=handler(event,{type:'second'})
 await Promise.resolve();expect(calls).toEqual(['first'])
 finish();await Promise.all([a,b]);expect(calls).toEqual(['first','second'])
 manager.dispose()
})
it('coalesces change events and can reopen after the manager is closed',async()=>{
 const manager=createManager(snapshot,async()=>({ok:true}),()=>{})
 await manager.open();manager.notify();manager.notify();manager.notify()
 await vi.advanceTimersByTimeAsync(100)
 const win=mock.windows[0]
 expect(win.webContents.send).toHaveBeenCalledTimes(1)
 expect(win.webContents.send).toHaveBeenCalledWith('collection:change',expect.objectContaining({revision:1}))
 win.destroy();await manager.open();expect(mock.windows).toHaveLength(2)
 manager.dispose()
})
it('restores shortcut ownership when the manager blurs, closes or its renderer exits',async()=>{
 const restore=vi.fn(),manager=createManager(snapshot,async()=>({ok:true}),()=>{},restore)
 await manager.open();const win=mock.windows[0]
 manager.ignoreMenuShortcuts(true);expect(win.webContents.setIgnoreMenuShortcuts).toHaveBeenCalledWith(true)
 win.events.get('blur')();expect(restore).toHaveBeenCalledTimes(1)
 const gone=win.webContents.on.mock.calls.find((call:any[])=>call[0]==='render-process-gone')[1]
 gone();expect(restore).toHaveBeenCalledTimes(2)
 win.destroy();expect(restore).toHaveBeenCalledTimes(3)
 manager.dispose()
})
