import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut, dialog, systemPreferences } from 'electron'
import { createManager } from './manager'
import { validShortcut } from '../shared/settings'
import type { ManagerResult, ManagerSnapshot } from '../shared/manager'
import { setTrashed, trashed } from './trash'
import { randomAppearance } from '../shared/appearance'
import { randomUUID } from 'node:crypto'
import { NoteStore, emptyData, type SavedNote, type SavedData } from './store'
import { COLORS, DEFAULT_COLOR, PALETTE, isPaperColor, type PaperColor } from '../shared/palette'
import { springStep } from '../shared/motion'
import { join } from 'node:path'
import { clampPosition, contains, polygon, region, movementRegion, SIZE } from '../shared/geometry'
import { platform } from './platform'
import type { Config, Mode } from '../shared/api'
type Item={win:BrowserWindow;config:Config;record:SavedNote;entering:boolean;stopEntrance?:(arrive:boolean)=>void}
const notes=new Map<number,Item>()
// Hit-testing experiments are developer tools, not part of an ordinary note.
const diagnostics=process.env.STICKEE_DIAGNOSTICS==='1'||process.argv.includes('--diagnostics')
let manager:ReturnType<typeof createManager>|undefined,shortcutActive=false
const DEFAULT_SHORTCUT='Control+Alt+N'
const settings=()=>({sound:data.settings.sound,defaultColor:data.settings.defaultColor??DEFAULT_COLOR,shortcut:data.settings.shortcut??DEFAULT_SHORTCUT})
const changed=()=>manager?.notify()
let store:NoteStore,data:SavedData=emptyData(),tray:Tray,quitting=false,saveTimer:ReturnType<typeof setTimeout>|undefined,saveWarning=false,persistenceReady=false
function flush(){
 clearTimeout(saveTimer)
 if(!persistenceReady)return true
 try{store.save(data);saveWarning=false;changed();return true}catch(error){console.error(error);if(!saveWarning){saveWarning=true;dialog.showErrorBox('Stickee could not save notes',String(error)+'\nKeep Stickee open and check disk access.')}changed();return false}
}
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(flush,250);changed()}
// A note that is still rising into place keeps its destination as its saved position.
function capture(){for(const {win,record,config,entering} of notes.values()){if(record.deletedAt!==undefined)continue;if(!entering){const b=win.getBounds();record.x=b.x;record.y=b.y}record.angle=config.angle;record.curlSide=config.curlSide}}
function pushState(item:Item){item.config.sound=data.settings.sound;if(!item.win.isDestroyed())item.win.webContents.send('state',{color:item.config.color,sound:item.config.sound})}
function setColor(item:Item,color:PaperColor){item.record.color=color;item.config.color=color;pushState(item);save()}
function setSound(enabled:boolean){data.settings.sound=enabled;for(const item of notes.values())pushState(item);buildTray();save()}
function buildTray(){
 tray?.setContextMenu(Menu.buildFromTemplate([{label:'Open Stickee',click:()=>openManager()},{type:'separator'},{label:'Create Note',click:()=>newNote()},{label:'Show All',click:showAll},{label:'Hide All',click:hideAll},{type:'separator'},{label:'Undo delete',enabled:trashed(data).length>0,click:()=>{const note=trashed(data)[0];if(note)void restoreNote(note).catch(error=>dialog.showErrorBox('Could not restore note',String(error)))}},{label:'Trash',submenu:trashed(data).length?trashed(data).map(note=>({label:(note.text.trim().split('\n')[0]||'Untitled note').slice(0,60).replace(/&/g,'&&'),click:()=>{void restoreNote(note).catch(error=>dialog.showErrorBox('Could not restore note',String(error)))}})):[{label:'Trash is empty',enabled:false}]},{type:'separator'},{label:'Drag sound',type:'checkbox',checked:data.settings.sound,click:item=>setSound(item.checked)},{type:'separator'},{label:'Quit',click:()=>app.quit()}]))
}
function showAll(){for(const {win,record} of notes.values()){if(record.deletedAt!==undefined)continue;record.hidden=false;win.showInactive();platform.keepOnTop(win)}save()}
function hideAll(){for(const {win,record} of notes.values()){if(record.deletedAt!==undefined)continue;record.hidden=true;win.hide()}capture();flush()}
function deleteNote(item:Item){return trashRecord(item.record)}
function trashRecord(record:SavedNote){
 capture()
 const deletedAt=Math.max(Date.now(),(trashed(data)[0]?.deletedAt??-1)+1)
 if(!setTrashed(record,true,flush,deletedAt))return false
 const item=[...notes.values()].find(item=>item.record.id===record.id)
 if(item){item.win.hide();item.win.destroy()}
 buildTray();changed();return true
}
async function restoreNote(record:SavedNote){
 if(record.deletedAt===undefined)return false
 const deletedAt=record.deletedAt,hidden=record.hidden
 record.hidden=false
 if(!setTrashed(record,false,flush)){record.hidden=hidden;return false}
 try{await showNote(record)}catch(error){record.hidden=hidden;setTrashed(record,true,flush,deletedAt);buildTray();changed();throw error}
 buildTray();changed();return true
}
function newNote(color:PaperColor=settings().defaultColor){
 const cursor=screen.getCursorScreenPoint(),area=screen.getDisplayNearestPoint(cursor).workArea,p=clampPosition({x:cursor.x-180,y:cursor.y-90},area)
 const record:SavedNote={id:randomUUID(),text:'',color,...randomAppearance(),...p,hidden:false}
 data.notes.push(record);save();void createWindow(record,true,true).catch(error=>dialog.showErrorBox('Could not open note',String(error)))
 return record.id
}
async function showNote(record:SavedNote){
 const wasHidden=record.hidden;record.hidden=false
 if(!flush()){record.hidden=wasHidden;throw new Error('Could not save note visibility')}
 const item=[...notes.values()].find(item=>item.record.id===record.id)
 if(item){if(item.win.isMinimized())item.win.restore();item.win.show();platform.keepOnTop(item.win,true);item.win.focus()}
 else await createWindow(record,true)
 changed()
}
function openManager(){void manager?.open().catch(error=>dialog.showErrorBox('Could not open Stickee',String(error)))}
function snapshot():ManagerSnapshot{return {revision:0,notes:data.notes.map(({id,text,color,hidden,deletedAt})=>({id,text,color,hidden,...(deletedAt!==undefined?{deletedAt}:{})})),settings:settings(),storagePath:store.path,saveError:saveWarning}}
async function managerAction(value:unknown):Promise<ManagerResult>{
 if(!value||typeof value!=='object'||!('type' in value)||typeof value.type!=='string')return {ok:false,error:'Invalid action'}
 const input=value as Record<string,unknown>
 if(input.type==='create')return {ok:true,id:newNote()}
 if(input.type==='show-all'){showAll();return {ok:true}}
 if(input.type==='hide-all'){hideAll();return {ok:true}}
 if(input.type==='recover-all'){if([...notes.values()].some(item=>item.entering))return {ok:false,error:'Let new notes arrive before recovering their positions.'};recover();capture();return {ok:flush()}}
 if(input.type==='undo-delete'){const note=trashed(data)[0];return {ok:note?await restoreNote(note):false}}
 if(input.type==='settings'){
  if(typeof input.sound!=='boolean'||!isPaperColor(input.defaultColor)||!validShortcut(input.shortcut))return {ok:false,error:'Use a modifier and a letter, number or F key for the shortcut.'}
  const old=data.settings,oldShortcut=settings().shortcut,next=input.shortcut,different=next!==oldShortcut
  if((different||!shortcutActive)&&!globalShortcut.register(next,()=>newNote()))return {ok:false,error:'That shortcut is already in use. Choose another combination.'}
  data.settings={sound:input.sound,defaultColor:input.defaultColor,shortcut:next}
  if(!flush()){data.settings=old;if(different)globalShortcut.unregister(next);return {ok:false,error:'Settings could not be saved.'}}
  if(different&&shortcutActive)globalShortcut.unregister(oldShortcut)
  shortcutActive=true;for(const item of notes.values())pushState(item);buildTray();updateTrayTip();changed();return {ok:true}
 }
 if(typeof input.id!=='string')return {ok:false,error:'Choose a note.'}
 const record=data.notes.find(note=>note.id===input.id)
 if(!record)return {ok:false,error:'This note is no longer available.'}
 if(input.type==='delete-forever'){
  if(record.deletedAt===undefined)return {ok:false,error:'Move this note to Trash first.'}
  const result=await dialog.showMessageBox({type:'warning',message:'Delete this note permanently?',detail:'This removes the note from Stickee. This action cannot be undone.',buttons:['Cancel','Delete permanently'],defaultId:0,cancelId:0,noLink:true})
  if(result.response!==1)return {ok:true}
  if(record.deletedAt===undefined||!data.notes.includes(record))return {ok:false,error:'This note changed while confirmation was open. Try again.'}
  const index=data.notes.indexOf(record);data.notes.splice(index,1)
  if(!flush()){data.notes.splice(index,0,record);return {ok:false,error:'Could not save the deletion.'}}
  buildTray();changed();return {ok:true}
 }
 if(input.type==='restore')return {ok:await restoreNote(record)}
 if(record.deletedAt!==undefined)return {ok:false,error:'Restore this note from Trash first.'}
 if(input.type==='trash')return {ok:trashRecord(record)}
 if(input.type==='show'){await showNote(record);return {ok:true}}
 const item=[...notes.values()].find(item=>item.record.id===record.id)
 if(input.type==='hide'){
  const hidden=record.hidden;record.hidden=true
  if(!flush()){record.hidden=hidden;return {ok:false,error:'Could not save note visibility.'}}
  item?.win.hide();capture();changed();return {ok:true}
 }
 if(input.type==='recover'){
  if(item?.entering)return {ok:false,error:'Let this note arrive before recovering its position.'}
  const area=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea,p=clampPosition({x:area.x+80,y:area.y+80},area)
  record.x=p.x;record.y=p.y;if(item)platform.move(item.win,p.x,p.y)
  await showNote(record);return {ok:true}
 }
 return {ok:false,error:'Unknown action'}
}
function updateTrayTip(){tray.setToolTip(`Stickee - ${settings().shortcut.replace('Control','Ctrl')} to create a note`)}
let drag:{id:number;dx:number;dy:number}|undefined
let timer:ReturnType<typeof setInterval>
function secure(win:BrowserWindow,lockZoom=true){
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}))
 win.webContents.on('will-navigate',event=>event.preventDefault())
 win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false))
 win.webContents.setZoomFactor(1)
 if(lockZoom)win.webContents.on('before-input-event',(event,input)=>{if(input.control && ['+','-','=','0'].includes(input.key))event.preventDefault()})
}
async function load(win:BrowserWindow,query:Record<string,string>){
 if(process.env.ELECTRON_RENDERER_URL){const url=new URL(process.env.ELECTRON_RENDERER_URL);Object.entries(query).forEach(([k,v])=>url.searchParams.set(k,v));await win.loadURL(url.toString())}
 else await win.loadFile(join(__dirname,'../renderer/index.html'),{query})
}
function recover(){for(const {win} of notes.values()){const b=win.getBounds(),area=screen.getDisplayMatching(b).workArea,p=clampPosition(b,area);platform.move(win,p.x,p.y)}}
async function createWindow(record:SavedNote,focus=false,entrance=false){
 const area=screen.getDisplayMatching({x:record.x,y:record.y,width:SIZE,height:SIZE}).workArea
 const p=clampPosition(record,area);record.x=p.x;record.y=p.y
  const win=new BrowserWindow({...p,width:SIZE,height:SIZE,frame:false,transparent:true,thickFrame:false,skipTaskbar:true,backgroundColor:'#00000000',hasShadow:false,resizable:false,maximizable:false,fullscreenable:false,show:false,alwaysOnTop:true,webPreferences:{preload:join(__dirname,'../preload/index.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,autoplayPolicy:'no-user-gesture-required'}})
  const config:Config={curlSide:record.curlSide??(record.angle>0?'left':'right'),text:record.text,color:record.color,angle:record.angle,mode:'shape',nativeDrag:true,status:'',diagnostics,sound:data.settings.sound}
  try{config.status=platform.apply(win,config.angle,config.mode,config.curlSide)}catch(error){config.status=`FAILED: ${String(error)}`}
  const id=win.webContents.id
  const item:Item={win,config,record,entering:false}
  notes.set(id,item);secure(win)
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
  let movementEnvelope=false
  if(process.platform==='win32'){
   win.hookWindowMessage(0x0231,()=>{item.stopEntrance?.(false);previous=win.getBounds();lastMotion=performance.now();directionDistance=0;clearTimeout(shapeTimer);movementEnvelope=true;if(config.mode==='shape'){win.setShape(movementRegion());platform.keepOnTop(win)}win.webContents.send('drag-state',true)})
   win.hookWindowMessage(0x0232,()=>{win.webContents.send('drag-state',false);win.webContents.send('settle');clearTimeout(shapeTimer);shapeTimer=setTimeout(()=>{movementEnvelope=false;if(!win.isDestroyed())platform.apply(win,config.angle,config.mode,config.curlSide)},1400)})
  }
  // OS owns the drag loop. Only notify the renderer once movement has stopped.
  let settleTimer:ReturnType<typeof setTimeout>|undefined
  let previous=win.getBounds(),lastMotion=0,directionDistance=0
  let shapeTimer:ReturnType<typeof setTimeout>|undefined
  win.on('will-move',(_event,bounds)=>{
   if(!config.nativeDrag)return
   item.stopEntrance?.(false)
   const now=performance.now(),dt=now-lastMotion
   if(dt<16)return
   const delta=bounds.x-previous.x
   directionDistance=Math.sign(delta)===Math.sign(directionDistance)?directionDistance+delta:delta
   const desiredSide=directionDistance>55?'left':directionDistance < -55?'right':config.curlSide
   const desired=desiredSide===config.curlSide?config.angle:(desiredSide==='left'?1:-1)*Math.max(.6,Math.abs(config.angle))
   if(desiredSide!==config.curlSide){
    const oldAngle=config.angle,oldSide=config.curlSide
    config.curlSide=desiredSide
    config.angle=desired
    clearTimeout(shapeTimer)
    if(process.platform==='win32'&&config.mode!=='ignore'&&!movementEnvelope){
     // Preserve both silhouettes while the decorative orientation changes.
     const pad=config.mode==='tight'?0:14
     win.setShape([...region(oldAngle,pad,oldSide),...region(desired,pad,desiredSide)])
     platform.keepOnTop(win)
     shapeTimer=setTimeout(()=>{if(!win.isDestroyed())platform.apply(win,config.angle,config.mode,config.curlSide)},900)
    }
   }
   const cursor=screen.getCursorScreenPoint()
   win.webContents.send('motion',{angle:config.angle,curlSide:config.curlSide,grabX:cursor.x-bounds.x,grabY:cursor.y-bounds.y,vx:(bounds.x-previous.x)*1000/Math.min(dt,50),vy:(bounds.y-previous.y)*1000/Math.min(dt,50)})
   previous=bounds;lastMotion=now
   clearTimeout(settleTimer)
   settleTimer=setTimeout(()=>{if(!win.isDestroyed())win.webContents.send('settle')},120)
  })
  win.on('move',()=>{capture();save();if(!config.nativeDrag)return;clearTimeout(settleTimer);settleTimer=setTimeout(()=>{if(!win.isDestroyed())win.webContents.send('settle')},100)})
  // New notes rise from the lower edge of the work area and settle at their
  // destination. The spring runs here because the window itself moves; the
  // renderer receives the same motion samples as a drag, so the paper flexes.
  const startEntrance=()=>{
   if(systemPreferences.getAnimationSettings().prefersReducedMotion)return
   const dest={x:record.x,y:record.y},startY=area.y+area.height-100
   if(startY-dest.y<60)return
   item.entering=true
   clearTimeout(shapeTimer);movementEnvelope=true
   if(process.platform==='win32'&&config.mode==='shape')win.setShape(movementRegion())
   win.setOpacity(0);platform.move(win,dest.x,startY)
   let spring={position:startY,velocity:0},last=performance.now()
   const began=last
   const finish=(arrive:boolean)=>{
    clearInterval(ticker);item.entering=false;item.stopEntrance=undefined
    if(win.isDestroyed())return
    win.setOpacity(1)
    // Arriving lands exactly on the destination; an interruption (the user
    // grabbed the note mid-flight) keeps wherever the note is now.
    if(arrive)platform.move(win,dest.x,dest.y);else{capture();save()}
    win.webContents.send('settle')
    clearTimeout(shapeTimer);shapeTimer=setTimeout(()=>{movementEnvelope=false;if(!win.isDestroyed())platform.apply(win,config.angle,config.mode,config.curlSide)},1400)
   }
   const ticker=setInterval(()=>{
    if(win.isDestroyed()){clearInterval(ticker);return}
    const now=performance.now()
    spring=springStep(spring,dest.y,(now-last)/1000,13,.82);last=now
    win.setOpacity(Math.min(1,(now-began)/140))
    platform.move(win,dest.x,spring.position)
    win.webContents.send('motion',{angle:config.angle,curlSide:config.curlSide,grabX:180,grabY:66,vx:0,vy:spring.velocity})
    if(now-began>1500||(Math.abs(spring.position-dest.y)<.5&&Math.abs(spring.velocity)<10))finish(true)
   },8)
   item.stopEntrance=finish
  }
  win.on('hide',()=>item.stopEntrance?.(true))
  win.on('closed',()=>{clearTimeout(settleTimer);clearTimeout(shapeTimer);item.stopEntrance?.(true)})
  win.on('closed',()=>{notes.delete(id);if(drag?.id===id)drag=undefined})
  win.on('blur',()=>{if(drag?.id===id)drag=undefined;capture();flush()})
  win.on('close',event=>{if(!quitting){event.preventDefault();record.hidden=true;win.hide();capture();flush()}})
  win.webContents.on('context-menu',()=>Menu.buildFromTemplate([{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'},{type:'separator'},{label:'Paper color',submenu:COLORS.map(color=>({label:PALETTE[color].label,type:'radio' as const,checked:config.color===color,click:()=>setColor(item,color)}))},{label:'Drag sound',type:'checkbox',checked:data.settings.sound,click:menuItem=>setSound(menuItem.checked)},{type:'separator'},{label:'New note',click:()=>newNote(config.color)},{label:'Move to Trash',click:()=>deleteNote(item)},{label:'Hide note',click:()=>{record.hidden=true;win.hide();capture();flush()}}]).popup({window:win}))
  win.once('ready-to-show',()=>{if(!record.hidden){if(entrance)startEntrance();if(focus)win.show();else win.showInactive()}})
  try{await load(win,{})}catch(error){win.destroy();throw error}
}
async function start(){
 store=new NoteStore(join(app.getPath('userData'),'data'));data=store.load();persistenceReady=true
 if(store.recovered)void dialog.showMessageBox({type:'warning',message:'Stickee recovered your notes.',detail:'The primary notes file was unavailable or malformed. A valid backup was used when available. Malformed files are preserved beside notes.json for recovery.'})
 // A tiny local RGBA paper glyph, independent of network or asset paths.
 const pixels=Buffer.alloc(16*16*4)
 for(let y=2;y<14;y++)for(let x=2;x<14;x++){const i=(y*16+x)*4;pixels[i]=110;pixels[i+1]=218;pixels[i+2]=248;pixels[i+3]=255}
 tray=new Tray(nativeImage.createFromBitmap(pixels,{width:16,height:16,scaleFactor:1}))
 updateTrayTip()
 manager=createManager(snapshot,managerAction,win=>secure(win,false))
 buildTray()
 tray.on('double-click',()=>openManager())
 shortcutActive=globalShortcut.register(settings().shortcut,()=>newNote())
 if(!shortcutActive)void dialog.showMessageBox({type:'warning',message:`${settings().shortcut} is already in use.`,detail:'Create notes from the Stickee tray menu instead.'})
 movementRegion() // build the cached drag envelope before the first drag needs it
 for(const record of data.notes)if(record.deletedAt===undefined)await createWindow(record)
 if(data.notes.length===0)newNote()
 save()
 timer=setInterval(()=>{
  if(!drag&&![...notes.values()].some(item=>item.config.mode==='ignore'))return
  const cursor=screen.getCursorScreenPoint()
  if(drag){const item=notes.get(drag.id);if(item)platform.move(item.win,cursor.x-drag.dx,cursor.y-drag.dy)}
  for(const {win,config} of notes.values())if(config.mode==='ignore'&&process.platform==='win32'){
   const [x,y]=win.getPosition();win.setIgnoreMouseEvents(drag?.id===win.webContents.id?false:!contains({x:cursor.x-x,y:cursor.y-y},polygon(config.angle,config.curlSide)),{forward:true})
  }
 },16)
 screen.on('display-removed',recover);screen.on('display-metrics-changed',recover)
 openManager()
}
ipcMain.handle('config',event=>notes.get(event.sender.id)?.config??{curlSide:'right',text:'',color:DEFAULT_COLOR,angle:0,mode:'shape',nativeDrag:false,status:'Click-test panel',diagnostics,sound:false})
ipcMain.on('drag',(event,action:unknown)=>{
 const item=notes.get(event.sender.id);if(!item||event.senderFrame!==event.sender.mainFrame)return
 if(action==='start'&&!item.config.nativeDrag){const p=screen.getCursorScreenPoint(),[x,y]=item.win.getPosition();drag={id:event.sender.id,dx:p.x-x,dy:p.y-y}}
 if(action==='end'&&drag?.id===event.sender.id){drag=undefined;recover()}
})
ipcMain.handle('experiment',(event,mode:unknown,nativeDrag:unknown)=>{
 const item=notes.get(event.sender.id)
 if(!diagnostics||!item||event.senderFrame!==event.sender.mainFrame||!['shape','tight','ignore'].includes(String(mode))||typeof nativeDrag!=='boolean')return
 drag=undefined;item.config.mode=mode as Mode;item.config.nativeDrag=nativeDrag
 item.config.status=platform.apply(item.win,item.config.angle,item.config.mode,item.config.curlSide)
})
ipcMain.on('text',(event,value:unknown,immediate:unknown)=>{
 const item=notes.get(event.sender.id)
 if(!item||item.record.deletedAt!==undefined||event.senderFrame!==event.sender.mainFrame||typeof value!=='string'||value.length>1_000_000||typeof immediate!=='boolean')return
 item.record.text=value;item.config.text=value;if(immediate)flush();else save()
})
// A note made from another note starts on the same paper.
ipcMain.on('create',event=>{const item=notes.get(event.sender.id);if(item&&event.senderFrame===event.sender.mainFrame)newNote(item.config.color)})
ipcMain.on('color',(event,value:unknown)=>{const item=notes.get(event.sender.id);if(item&&event.senderFrame===event.sender.mainFrame&&isPaperColor(value))setColor(item,value)})
ipcMain.on('hide',event=>{const item=notes.get(event.sender.id);if(item&&event.senderFrame===event.sender.mainFrame){item.record.hidden=true;item.win.hide();capture();flush()}})
ipcMain.on('quit',event=>{if(notes.has(event.sender.id))app.quit()})
if(!app.requestSingleInstanceLock())app.quit()
else {
 app.whenReady().then(start).catch(error=>{dialog.showErrorBox('Stickee startup failed',String(error));app.quit()})
 app.on('second-instance',()=>openManager())
}
app.on('window-all-closed',()=>{})
app.on('before-quit',event=>{capture();if(!flush()){event.preventDefault();quitting=false;return}quitting=true})
app.on('will-quit',()=>{clearInterval(timer);clearTimeout(saveTimer);manager?.dispose();globalShortcut.unregisterAll();tray?.destroy()})
