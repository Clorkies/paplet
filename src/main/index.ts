import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut, dialog } from 'electron'
import { randomUUID } from 'node:crypto'
import { NoteStore, type SavedNote, type SavedData } from './store'
import { join } from 'node:path'
import { clampPosition, contains, polygon, region, SIZE } from '../shared/geometry'
import { platform } from './platform'
import type { Config, Mode } from '../shared/api'
const notes=new Map<number,{win:BrowserWindow;config:Config;record:SavedNote}>()
let store:NoteStore,data:SavedData={schemaVersion:1,notes:[]},tray:Tray,quitting=false,saveTimer:ReturnType<typeof setTimeout>|undefined,saveWarning=false,persistenceReady=false
function flush(){
 clearTimeout(saveTimer)
 if(!persistenceReady)return true
 try{store.save(data);saveWarning=false;return true}catch(error){console.error(error);if(!saveWarning){saveWarning=true;dialog.showErrorBox('Stickee could not save notes',String(error)+'\nKeep Stickee open and check disk access.')}return false}
}
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(flush,250)}
function capture(){for(const {win,record,config} of notes.values()){const b=win.getBounds();record.x=b.x;record.y=b.y;record.angle=config.angle}}
function showAll(){for(const {win,record} of notes.values()){record.hidden=false;win.showInactive();platform.keepOnTop(win)}save()}
function hideAll(){for(const {win,record} of notes.values()){record.hidden=true;win.hide()}capture();flush()}
function newNote(){
 const cursor=screen.getCursorScreenPoint(),area=screen.getDisplayNearestPoint(cursor).workArea,p=clampPosition({x:cursor.x-180,y:cursor.y-90},area)
 const record:SavedNote={id:randomUUID(),text:'',note:0,angle:-2,...p,hidden:false}
 data.notes.push(record);save();void createWindow(record,true).catch(error=>dialog.showErrorBox('Could not open note',String(error)))
}
let drag:{id:number;dx:number;dy:number}|undefined
let timer:ReturnType<typeof setInterval>
function secure(win:BrowserWindow){
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}))
 win.webContents.on('will-navigate',event=>event.preventDefault())
 win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false))
 win.webContents.setZoomFactor(1)
 win.webContents.on('before-input-event',(event,input)=>{if(input.control && ['+','-','=','0'].includes(input.key))event.preventDefault()})
}
async function load(win:BrowserWindow,query:Record<string,string>){
 if(process.env.ELECTRON_RENDERER_URL){const url=new URL(process.env.ELECTRON_RENDERER_URL);Object.entries(query).forEach(([k,v])=>url.searchParams.set(k,v));await win.loadURL(url.toString())}
 else await win.loadFile(join(__dirname,'../renderer/index.html'),{query})
}
function recover(){for(const {win} of notes.values()){const b=win.getBounds(),area=screen.getDisplayMatching(b).workArea,p=clampPosition(b,area);platform.move(win,p.x,p.y)}}
async function createWindow(record:SavedNote,focus=false){
 const {note}=record,area=screen.getDisplayMatching({x:record.x,y:record.y,width:SIZE,height:SIZE}).workArea
 const p=clampPosition(record,area);record.x=p.x;record.y=p.y
  const win=new BrowserWindow({...p,width:SIZE,height:SIZE,frame:false,transparent:true,thickFrame:false,skipTaskbar:true,backgroundColor:'#00000000',hasShadow:false,resizable:false,maximizable:false,fullscreenable:false,show:false,alwaysOnTop:true,webPreferences:{preload:join(__dirname,'../preload/index.js'),sandbox:true,contextIsolation:true,nodeIntegration:false}})
  const config:Config={text:record.text,note,angle:record.angle,mode:'shape',nativeDrag:true,status:''}
  try{config.status=platform.apply(win,config.angle,config.mode)}catch(error){config.status=`FAILED: ${String(error)}`}
  const id=win.webContents.id
  notes.set(id,{win,config,record});secure(win)
  // Reassert the native topmost band at activation boundaries. Never call
  // show/focus from blur: another application must keep keyboard focus.
  win.on('show',()=>platform.keepOnTop(win))
  win.on('restore',()=>platform.keepOnTop(win))
  win.on('always-on-top-changed',(_event,onTop)=>{
   if(!onTop&&!quitting&&!record.hidden)setImmediate(()=>platform.keepOnTop(win))
  })
  win.on('focus',()=>{
   platform.keepOnTop(win,true)
   setImmediate(()=>{if(!win.isDestroyed()&&win.isFocused()&&!record.hidden)platform.keepOnTop(win,true)})
  })
  win.on('blur',()=>{setImmediate(()=>{if(!record.hidden)platform.keepOnTop(win)})})
  if(process.platform==='win32'){
   win.hookWindowMessage(0x0231,()=>{win.webContents.send('drag-state',true)})
   win.hookWindowMessage(0x0232,()=>{win.webContents.send('drag-state',false);win.webContents.send('settle')})
  }
  // OS owns the drag loop. Only notify the renderer once movement has stopped.
  let settleTimer:ReturnType<typeof setTimeout>|undefined
  let previous=win.getBounds(),lastMotion=0,directionDistance=0
  let shapeTimer:ReturnType<typeof setTimeout>|undefined
  win.on('will-move',(_event,bounds)=>{
   if(!config.nativeDrag)return
   const now=performance.now(),dt=Math.max(16,now-lastMotion)
   if(dt<30)return
   const delta=bounds.x-previous.x
   directionDistance=Math.sign(delta)===Math.sign(directionDistance)?directionDistance+delta:delta
   const desired=directionDistance>55?1.7:directionDistance < -55?-2:config.angle
   if(desired!==config.angle){
    config.angle=desired
    clearTimeout(shapeTimer)
    if(process.platform==='win32'&&config.mode!=='ignore'){
     // Preserve both silhouettes while the decorative orientation changes.
     const pad=config.mode==='tight'?0:14
     win.setShape([...region(-2,pad),...region(1.7,pad)])
     platform.keepOnTop(win)
     shapeTimer=setTimeout(()=>{if(!win.isDestroyed())platform.apply(win,config.angle,config.mode)},900)
    }
   }
   const cursor=screen.getCursorScreenPoint()
   win.webContents.send('motion',{angle:config.angle,curlSide:config.angle>0?'left':'right',grabX:cursor.x-bounds.x,grabY:cursor.y-bounds.y,dx:(bounds.x-previous.x)*16/dt,dy:(bounds.y-previous.y)*16/dt})
   previous=bounds;lastMotion=now
   clearTimeout(settleTimer)
   settleTimer=setTimeout(()=>{if(!win.isDestroyed())win.webContents.send('settle')},120)
  })
  win.on('move',()=>{capture();save();if(!config.nativeDrag)return;clearTimeout(settleTimer);settleTimer=setTimeout(()=>{if(!win.isDestroyed())win.webContents.send('settle')},100)})
  win.on('closed',()=>{clearTimeout(settleTimer);clearTimeout(shapeTimer)})
  win.on('closed',()=>{notes.delete(id);if(drag?.id===id)drag=undefined})
  win.on('blur',()=>{if(drag?.id===id)drag=undefined;capture();flush()})
  win.on('close',event=>{if(!quitting){event.preventDefault();record.hidden=true;win.hide();capture();flush()}})
  win.webContents.on('context-menu',()=>Menu.buildFromTemplate([{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'},{type:'separator'},{label:'New note',click:newNote},{label:'Hide note',click:()=>{record.hidden=true;win.hide();flush()}}]).popup({window:win}))
  win.once('ready-to-show',()=>{if(!record.hidden){if(focus)win.show();else win.showInactive()}})
  await load(win,{note:String(note)})
}
async function start(){
 store=new NoteStore(join(app.getPath('userData'),'data'));data=store.load();persistenceReady=true
 if(store.recovered)void dialog.showMessageBox({type:'warning',message:'Stickee recovered your notes.',detail:'The primary notes file was unavailable or malformed. A valid backup was used when available. Malformed files are preserved beside notes.json for recovery.'})
 // A tiny local RGBA paper glyph, independent of network or asset paths.
 const pixels=Buffer.alloc(16*16*4)
 for(let y=2;y<14;y++)for(let x=2;x<14;x++){const i=(y*16+x)*4;pixels[i]=110;pixels[i+1]=218;pixels[i+2]=248;pixels[i+3]=255}
 tray=new Tray(nativeImage.createFromBitmap(pixels,{width:16,height:16,scaleFactor:1}))
 tray.setToolTip('Stickee - Ctrl+Alt+N to create a note')
 tray.setContextMenu(Menu.buildFromTemplate([{label:'Create Note',click:newNote},{label:'Show All',click:showAll},{label:'Hide All',click:hideAll},{type:'separator'},{label:'Quit',click:()=>app.quit()}]))
 tray.on('double-click',newNote)
 if(!globalShortcut.register('Control+Alt+N',newNote))void dialog.showMessageBox({type:'warning',message:'Ctrl+Alt+N is already in use.',detail:'Create notes from the Stickee tray menu instead.'})
 for(const record of data.notes)await createWindow(record)
 if(data.notes.length===0)newNote()
 save()
 timer=setInterval(()=>{
  if(!drag&&![...notes.values()].some(item=>item.config.mode==='ignore'))return
  const cursor=screen.getCursorScreenPoint()
  if(drag){const item=notes.get(drag.id);if(item)platform.move(item.win,cursor.x-drag.dx,cursor.y-drag.dy)}
  for(const {win,config} of notes.values())if(config.mode==='ignore'&&process.platform==='win32'){
   const [x,y]=win.getPosition();win.setIgnoreMouseEvents(drag?.id===win.webContents.id?false:!contains({x:cursor.x-x,y:cursor.y-y},polygon(config.angle)),{forward:true})
  }
 },16)
 screen.on('display-removed',recover);screen.on('display-metrics-changed',recover)
}
ipcMain.handle('config',event=>notes.get(event.sender.id)?.config??{text:'',note:-1,angle:0,mode:'shape',nativeDrag:false,status:'Click-test panel'})
ipcMain.on('drag',(event,action:unknown)=>{
 const item=notes.get(event.sender.id);if(!item||event.senderFrame!==event.sender.mainFrame)return
 if(action==='start'&&!item.config.nativeDrag){const p=screen.getCursorScreenPoint(),[x,y]=item.win.getPosition();drag={id:event.sender.id,dx:p.x-x,dy:p.y-y}}
 if(action==='end'&&drag?.id===event.sender.id){drag=undefined;recover()}
})
ipcMain.handle('experiment',(event,mode:unknown,nativeDrag:unknown)=>{
 const item=notes.get(event.sender.id)
 if(!item||event.senderFrame!==event.sender.mainFrame||!['shape','tight','ignore'].includes(String(mode))||typeof nativeDrag!=='boolean')return
 drag=undefined;item.config.mode=mode as Mode;item.config.nativeDrag=nativeDrag
 item.config.status=platform.apply(item.win,item.config.angle,item.config.mode)
})
ipcMain.on('text',(event,value:unknown,immediate:unknown)=>{
 const item=notes.get(event.sender.id)
 if(!item||event.senderFrame!==event.sender.mainFrame||typeof value!=='string'||value.length>1_000_000||typeof immediate!=='boolean')return
 item.record.text=value;item.config.text=value;if(immediate)flush();else save()
})
ipcMain.on('create',event=>{if(notes.has(event.sender.id)&&event.senderFrame===event.sender.mainFrame)newNote()})
ipcMain.on('hide',event=>{const item=notes.get(event.sender.id);if(item&&event.senderFrame===event.sender.mainFrame){item.record.hidden=true;item.win.hide();capture();flush()}})
ipcMain.on('quit',event=>{if(notes.has(event.sender.id))app.quit()})
if(!app.requestSingleInstanceLock())app.quit()
else {
 app.whenReady().then(start).catch(error=>{dialog.showErrorBox('Stickee startup failed',String(error));app.quit()})
 app.on('second-instance',()=>{showAll();const item=[...notes.values()][0];if(item)item.win.focus()})
}
app.on('window-all-closed',()=>{})
app.on('before-quit',event=>{capture();if(!flush()){event.preventDefault();quitting=false;return}quitting=true})
app.on('will-quit',()=>{clearInterval(timer);clearTimeout(saveTimer);globalShortcut.unregisterAll();tray?.destroy()})
