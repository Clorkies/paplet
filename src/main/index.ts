import { validInk } from '../shared/ink'
import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut, dialog, systemPreferences } from 'electron'
import { centeredNote, exitSample, presentNote } from './visibility'
import { applyBatch, batchTargets, type BatchOperation } from './batch'
import { createManager } from './manager'
import { editSet, visibleSetMembers } from './sets'
import { validShortcut, validSoundStyle } from '../shared/settings'
import type { ManagerResult, ManagerSnapshot } from '../shared/manager'
import { setTrashed, trashed } from './trash'
import { randomAppearance } from '../shared/appearance'
import { randomUUID } from 'node:crypto'
import { NoteStore, emptyData, type SavedNote, type SavedData } from './store'
import { COLORS, DEFAULT_COLOR, PALETTE, isPaperColor, type PaperColor } from '../shared/palette'
import { springStep } from '../shared/motion'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { clampPosition, contains, polygon, region, movementRegion, SIZE } from '../shared/geometry'
import { platform } from './platform'
import type { Config, Mode } from '../shared/api'
type Item={win:BrowserWindow;config:Config;record:SavedNote;retainEditor?:boolean;entering:boolean;exiting?:boolean;rendererReady?:()=>void;appear?:(focus:boolean,animate:boolean)=>Promise<void>;dismiss?:()=>void;stopExit?:(hide:boolean)=>{y:number;opacity:number}|undefined;locateReady?:boolean;pendingLocate?:boolean;stopEntrance?:(arrive:boolean,captureInterrupted?:boolean)=>void}
const notes=new Map<number,Item>() // keyed by IPC sender
const windowsByNote=new Map<string,Item>() // keyed by persisted note ID
// Hit-testing experiments are developer tools, not part of an ordinary note.
const diagnostics=process.env.STICKEE_DIAGNOSTICS==='1'||process.argv.includes('--diagnostics')
// Opt-in, bounded event history. Saved locally on exit or from the tray.
const traceEvents:string[]|undefined=process.argv.includes('--trace-visibility')?[]:undefined
function appendTrace(window:number,event:string,state:object){
 if(!traceEvents)return
 traceEvents.push(JSON.stringify({time:new Date().toISOString(),window,event,...state}))
 if(traceEvents.length>2048)traceEvents.shift()
}
function traceWindow(item:Item,event:string){
 if(!traceEvents)return
 const {win,record,entering,exiting}=item
 const state=win.isDestroyed()?{destroyed:true}:{
  hwnd:win.getNativeWindowHandle().toString('hex'),mode:item.config.mode,
  visible:win.isVisible(),minimized:win.isMinimized(),focused:win.isFocused(),topmost:win.isAlwaysOnTop(),
  opacity:win.getOpacity(),bounds:win.getBounds(),workArea:screen.getDisplayMatching(win.getBounds()).workArea,
  crashed:win.webContents.isCrashed()
 }
 appendTrace(win.id,event,{hidden:record.hidden,entering,exiting:!!exiting,...state})
}
function saveVisibilityTrace(){
 if(!traceEvents)return
 for(const item of notes.values())traceWindow(item,'snapshot')
 try{writeFileSync(join(app.getPath('userData'),'visibility-trace.jsonl'),traceEvents.join('\n')+'\n')}
 catch(error){console.error('Could not save visibility trace',error)}
}
let manager:ReturnType<typeof createManager>|undefined,shortcutActive=false,recordingShortcut=false
const DEFAULT_SHORTCUT='Control+Alt+N'
const settings=()=>({sound:data.settings.sound,soundStyle:data.settings.soundStyle??'rustle',defaultColor:data.settings.defaultColor??DEFAULT_COLOR,shortcut:data.settings.shortcut??DEFAULT_SHORTCUT})
const changed=()=>manager?.notify()
let store:NoteStore,data:SavedData=emptyData(),tray:Tray,quitting=false,saveTimer:ReturnType<typeof setTimeout>|undefined,saveWarning=false,persistenceReady=false
function flush(){
 clearTimeout(saveTimer);saveTimer=undefined
 if(!persistenceReady)return true
 try{store.save(data);saveWarning=false;changed();return true}catch(error){console.error(error);if(!saveWarning){saveWarning=true;dialog.showErrorBox('Stickee could not save notes',String(error)+'\nKeep Stickee open and check disk access.')}changed();return false}
}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(flush,250)}
function save(){scheduleSave();changed()}
// A note that is still rising into place keeps its destination as its saved position.
function captureNote({win,record,config,entering,exiting}:Item){
 if(record.deletedAt!==undefined)return false
 let changed=record.angle!==config.angle||record.curlSide!==config.curlSide
 if(!entering&&!exiting){
  const {x,y}=win.getBounds()
  changed=changed||record.x!==x||record.y!==y
  record.x=x;record.y=y
 }
 record.angle=config.angle;record.curlSide=config.curlSide
 return changed
}
function capture(){for(const item of notes.values())captureNote(item)}
function pushState(item:Item){item.config.sound=data.settings.sound;item.config.soundStyle=settings().soundStyle;if(!item.win.isDestroyed())item.win.webContents.send('state',{color:item.config.color,sound:item.config.sound,soundStyle:item.config.soundStyle})}
// A batch of notes shares one audible visibility transition.
const lastCue={show:-Infinity,hide:-Infinity}
function visibilityCue(win:BrowserWindow,kind:'show'|'hide'){
 const now=performance.now()
 if(!settings().sound||now-lastCue[kind]<120)return
 lastCue[kind]=now
 win.webContents.send('visibility-cue',kind)
}
function setColor(item:Item,color:PaperColor){item.record.color=color;item.config.color=color;pushState(item);save()}
function setSound(enabled:boolean){data.settings.sound=enabled;for(const item of notes.values())pushState(item);buildTray();save()}
function buildTray(){
 tray?.setContextMenu(Menu.buildFromTemplate([{label:'Open Stickee',click:()=>openManager()},{type:'separator'},{label:'Create Note',click:()=>newNote()},{label:'Show All',click:showAll},{label:'Hide All',click:hideAll},{type:'separator'},{label:'Undo delete',enabled:trashed(data).length>0,click:()=>{const note=trashed(data)[0];if(note)void restoreNote(note).catch(error=>dialog.showErrorBox('Could not restore note',String(error)))}},{label:'Trash',submenu:trashed(data).length?trashed(data).map(note=>({label:(note.text.trim().split('\n')[0]||'Untitled note').slice(0,60).replace(/&/g,'&&'),click:()=>{void restoreNote(note).catch(error=>dialog.showErrorBox('Could not restore note',String(error)))}})):[{label:'Trash is empty',enabled:false}]},{type:'separator'},{label:'Drag sound',type:'checkbox',checked:data.settings.sound,click:item=>setSound(item.checked)},{type:'separator'},...(traceEvents?[{label:'Save visibility trace',click:saveVisibilityTrace}]:[]),{label:'Quit',click:()=>app.quit()}]))
}
async function presentRecord(record:SavedNote,focus:boolean){
 const item=windowsByNote.get(record.id)
 return item?item.appear?.(focus,true):createWindow(record,focus,true,true)
}
function showAll(){
 for(const record of data.notes){
  if(record.deletedAt!==undefined)continue
  record.hidden=false
  void presentRecord(record,false).catch(error=>dialog.showErrorBox('Could not show note',String(error)))
 }
 save()
}
function hideAll(){capture();const active=[...notes.values()].filter(item=>item.record.deletedAt===undefined),old=active.map(item=>item.record.hidden);for(const item of active)item.record.hidden=true;if(!flush()){active.forEach((item,i)=>item.record.hidden=old[i]);return}for(const item of active)item.dismiss?.()}
function deleteNote(item:Item){return trashRecord(item.record)}
function trashRecord(record:SavedNote){
 capture()
 const deletedAt=Math.max(Date.now(),(trashed(data)[0]?.deletedAt??-1)+1)
 if(!setTrashed(record,true,flush,deletedAt))return false
 const item=windowsByNote.get(record.id)
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
function newNote(color:PaperColor=settings().defaultColor,setId?:string,center=false){
 const cursor=screen.getCursorScreenPoint(),bounds=manager?.bounds(),area=center&&bounds?screen.getDisplayMatching(bounds).workArea:screen.getDisplayNearestPoint(cursor).workArea,p=center?centeredNote(area):clampPosition({x:cursor.x-180,y:cursor.y-90},area)
 const record:SavedNote={id:randomUUID(),text:'',color,...randomAppearance(),...p,hidden:false}
 data.notes.push(record);if(setId)data.sets.find(set=>set.id===setId)?.noteIds.push(record.id);save();void createWindow(record,true,true).catch(error=>dialog.showErrorBox('Could not open note',String(error)))
 return record.id
}
async function showNote(record:SavedNote){
 const wasHidden=record.hidden;record.hidden=false
 if(!flush()){record.hidden=wasHidden;throw new Error('Could not save note visibility')}
 await presentRecord(record,true)
 changed()
}
async function batchAction(ids:unknown,operation:unknown):Promise<ManagerResult>{
 let targets=batchTargets(data,ids,operation)
 if(operation==='delete-forever'){
  const result=await dialog.showMessageBox({type:'warning',message:`Delete ${targets.length===1?'this note':`these ${targets.length} notes`} permanently?`,detail:'This cannot be undone. Other notes stay untouched.',buttons:['Cancel','Delete permanently'],defaultId:0,cancelId:0,noLink:true})
  if(result.response!==1)return {ok:true,cancelled:true}
  targets=batchTargets(data,ids,operation)
 }
 capture()
 targets=applyBatch(data,ids,operation as BatchOperation,flush)
 // Native effects follow the durable transaction, never a half-saved batch.
 const results=await Promise.allSettled(targets.map(async record=>{
  const item=windowsByNote.get(record.id)
  if(operation==='trash'){if(item){item.win.hide();item.win.destroy()}}
  else if(operation==='hide')item?.dismiss?.()
  else if(operation==='show'||operation==='restore'){
   if(item)await item.appear?.(false,true)
   else await createWindow(record,false,true,true)
  }
 }))
 buildTray();changed()
 if(results.some(result=>result.status==='rejected'))return {ok:true,warning:'Notes were saved. A window could not open; use Edit desktop note to retry.'}
 return {ok:true}
}
async function locateNote(record:SavedNote,moveHere:boolean):Promise<ManagerResult>{
 let item=windowsByNote.get(record.id)
 if(item?.entering||item?.exiting)return {ok:false,error:'Let this note finish moving before locating it.'}
 const bounds=manager?.bounds(),destination=bounds?screen.getDisplayMatching(bounds):screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
 const old={x:record.x,y:record.y,hidden:record.hidden}
 // A disconnected display is recovered; otherwise Find preserves exact position.
 const reachable=screen.getAllDisplays().some(display=>{const b=display.workArea;return record.x+SIZE-40>b.x&&record.x+40<b.x+b.width&&record.y+SIZE-40>b.y&&record.y+40<b.y+b.height})
 const moved=moveHere||!reachable
 if(moved){const p=clampPosition({x:destination.workArea.x+80,y:destination.workArea.y+80},destination.workArea);record.x=p.x;record.y=p.y}
 record.hidden=false
 if(!flush()){Object.assign(record,old);return {ok:false,error:'Could not save note visibility or position.'}}
 if(!item){await createWindow(record);item=windowsByNote.get(record.id)}
 if(!item)return {ok:false,error:'Could not open this note.'}
 if(moved)platform.move(item.win,record.x,record.y)
 item.win.showInactive();platform.keepOnTop(item.win,true)
 if(item.locateReady)item.win.webContents.send('locate');else item.pendingLocate=true
 changed();return {ok:true,message:moved?(moveHere?'Moved here and highlighted.':'Display unavailable. Note moved here and highlighted.'):'Highlighted on its display.'}
}
function openManager(){void manager?.open().catch(error=>dialog.showErrorBox('Could not open Stickee',String(error)))}
function snapshot():ManagerSnapshot{return {revision:0,sets:data.sets,notes:data.notes.map(({id,text,color,hidden,deletedAt,ink})=>({id,text,color,hidden,...(ink?.length?{ink}:{}),...(deletedAt!==undefined?{deletedAt}:{})})),settings:settings(),storagePath:store.path,saveError:saveWarning}}
async function managerAction(value:unknown):Promise<ManagerResult>{
 if(!value||typeof value!=='object'||!('type' in value)||typeof value.type!=='string')return {ok:false,error:'Invalid action'}
 const input=value as Record<string,unknown>
 if(input.type==='batch')return batchAction(input.ids,input.operation)
 if(input.type==='record-shortcut'){
  if(typeof input.active!=='boolean')return {ok:false,error:'Invalid recording state'}
  if(input.active){if(!recordingShortcut){recordingShortcut=true;if(shortcutActive)globalShortcut.unregister(settings().shortcut);shortcutActive=false;manager?.ignoreMenuShortcuts(true)}}
  else resumeShortcut()
  return {ok:true}
 }
 if(input.type==='create'){
  if(input.setId!==undefined&&(typeof input.setId!=='string'||!data.sets.some(set=>set.id===input.setId)))return {ok:false,error:'Set is unavailable'}
  return {ok:true,id:newNote(settings().defaultColor,input.setId as string|undefined,true)}
 }
 if(input.type==='set-create')return {ok:true,setId:editSet(data,{type:'create',id:randomUUID(),name:input.name,ids:input.ids},flush)}
 if(['set-rename','set-delete','set-add','set-remove','set-show'].includes(input.type as string)){
  if(typeof input.id!=='string')return {ok:false,error:'Choose a set'}
  if(input.type==='set-show'){const ids=visibleSetMembers(data,input.id);return ids.length?batchAction(ids,'show'):{ok:true,message:'This set has no active notes.'}}
  const kind=input.type==='set-rename'?'rename':input.type==='set-delete'?'delete':input.type==='set-add'?'add':'remove'
  editSet(data,{type:kind,id:input.id,name:input.name,ids:input.ids},flush);changed();return {ok:true}
 }
 if(input.type==='show-all'){const ids=data.notes.filter(n=>n.deletedAt===undefined).map(n=>n.id);return ids.length?batchAction(ids,'show'):{ok:true}}
 if(input.type==='hide-all'){const ids=data.notes.filter(n=>n.deletedAt===undefined).map(n=>n.id);return ids.length?batchAction(ids,'hide'):{ok:true}}
 if(input.type==='recover-all'){if([...notes.values()].some(item=>item.entering))return {ok:false,error:'Let new notes arrive before recovering their positions.'};recover();capture();return {ok:flush()}}
 if(input.type==='undo-delete'){const note=trashed(data)[0];return {ok:note?await restoreNote(note):false}}
 if(input.type==='settings'){
  if(typeof input.sound!=='boolean'||!validSoundStyle(input.soundStyle)||!isPaperColor(input.defaultColor)||!validShortcut(input.shortcut))return {ok:false,error:'Use a modifier and a letter, number or F key for the shortcut.'}
  resumeShortcut()
  const old=data.settings,oldShortcut=settings().shortcut,next=input.shortcut,different=next!==oldShortcut
  if((different||!shortcutActive)&&!globalShortcut.register(next,()=>newNote()))return {ok:false,error:'That shortcut is already in use. Choose another combination.'}
  data.settings={sound:input.sound,soundStyle:input.soundStyle,defaultColor:input.defaultColor,shortcut:next}
  if(!flush()){data.settings=old;if(different)globalShortcut.unregister(next);return {ok:false,error:'Settings could not be saved.'}}
  if(different&&shortcutActive)globalShortcut.unregister(oldShortcut)
  shortcutActive=true;for(const item of notes.values())pushState(item);buildTray();updateTrayTip();changed();return {ok:true}
 }
 if(typeof input.id!=='string')return {ok:false,error:'Choose a note.'}
 const record=data.notes.find(note=>note.id===input.id)
 if(!record)return {ok:false,error:'This note is no longer available.'}
 if(input.type==='delete-forever')return batchAction([record.id],'delete-forever')
 if(input.type==='restore')return {ok:await restoreNote(record)}
 if(record.deletedAt!==undefined)return {ok:false,error:'Restore this note from Trash first.'}
 if(input.type==='trash')return {ok:trashRecord(record)}
 if(input.type==='show'){await showNote(record);return {ok:true}}
 const item=windowsByNote.get(record.id)
 if(input.type==='hide'){
  const hidden=record.hidden;record.hidden=true
  if(!flush()){record.hidden=hidden;return {ok:false,error:'Could not save note visibility.'}}
  item?.dismiss?.();capture();changed();return {ok:true}
 }
 if(input.type==='recover'||input.type==='locate')return locateNote(record,input.type==='recover')
 return {ok:false,error:'Unknown action'}
}
function resumeShortcut(){
 if(!recordingShortcut)return
 recordingShortcut=false;if(quitting)return;manager?.ignoreMenuShortcuts(false)
 shortcutActive=globalShortcut.register(settings().shortcut,()=>newNote())
 if(!shortcutActive)void dialog.showMessageBox({type:'warning',message:'The create shortcut is unavailable.',detail:'Choose a new shortcut in Preferences. Tray creation still works.'})
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
function recover(){for(const item of notes.values()){item.stopEntrance?.(true);item.stopExit?.(true);const b=item.win.getBounds(),area=screen.getDisplayMatching(b).workArea,p=clampPosition(b,area);platform.move(item.win,p.x,p.y)}capture();save()}
async function createWindow(record:SavedNote,focus=false,entrance=false,playShowCue=false){
 const area=screen.getDisplayMatching({x:record.x,y:record.y,width:SIZE,height:SIZE}).workArea
 const p=clampPosition(record,area);record.x=p.x;record.y=p.y
  const win=new BrowserWindow({...p,width:SIZE,height:SIZE,frame:false,transparent:true,thickFrame:false,skipTaskbar:true,backgroundColor:'#00000000',hasShadow:false,resizable:false,maximizable:false,fullscreenable:false,show:false,alwaysOnTop:true,webPreferences:{preload:join(__dirname,'../preload/index.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,autoplayPolicy:'no-user-gesture-required'}})
  const config:Config={curlSide:record.curlSide??(record.angle>0?'left':'right'),text:record.text,ink:record.ink,color:record.color,angle:record.angle,mode:'shape',nativeDrag:true,status:'',diagnostics,sound:data.settings.sound,soundStyle:settings().soundStyle}
  try{config.status=platform.apply(win,config.angle,config.mode,config.curlSide)}catch(error){config.status=`FAILED: ${String(error)}`}
  const id=win.webContents.id
  const item:Item={win,config,record,entering:false}
  if(traceEvents){
   const windowId=win.id
   win.on('close',()=>traceWindow(item,'close-request'))
   win.once('closed',()=>appendTrace(windowId,'closed',{destroyed:true}))
   win.on('focus',()=>traceWindow(item,'focus'))
   win.on('blur',()=>traceWindow(item,'blur'))
   win.on('show',()=>traceWindow(item,'show'))
   win.on('hide',()=>traceWindow(item,'hide'))
   win.on('restore',()=>traceWindow(item,'restore'))
   win.on('minimize',()=>traceWindow(item,'minimize'))
   win.on('always-on-top-changed',()=>traceWindow(item,'always-on-top-changed'))
   win.on('unresponsive',()=>traceWindow(item,'unresponsive'))
   win.on('responsive',()=>traceWindow(item,'responsive'))
   win.webContents.on('render-process-gone',(_event,details)=>traceWindow(item,'renderer-'+details.reason))
  }
  let painted=false,rendered=false,readyResolve!:()=>void,readyReject!:(error:Error)=>void
  const ready=new Promise<void>((resolve,reject)=>{readyResolve=resolve;readyReject=reject})
  const checkReady=()=>{if(painted&&rendered)readyResolve()}
  item.rendererReady=()=>{rendered=true;checkReady()}
  win.once('ready-to-show',()=>{painted=true;checkReady()})
  const readyTimeout=setTimeout(()=>readyReject(new Error('Note renderer did not become ready')),15000)
  void ready.then(()=>clearTimeout(readyTimeout),()=>clearTimeout(readyTimeout))
  notes.set(id,item);windowsByNote.set(record.id,item);secure(win)
  win.webContents.on('did-start-loading',()=>{item.locateReady=false})
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
  let movementEnvelope=false,traceFirstMove=false
  const interruptHide=()=>{if(!item.exiting)return;item.stopExit?.(false);record.hidden=false;win.setOpacity(1);capture();save()}
  if(process.platform==='win32'){
   win.hookWindowMessage(0x0231,()=>{if(traceEvents){traceWindow(item,'drag-enter');traceFirstMove=true}interruptHide();item.stopEntrance?.(false);previous=win.getBounds();lastMotion=performance.now();directionDistance=0;clearTimeout(shapeTimer);movementEnvelope=true;if(config.mode==='shape'){win.setShape(movementRegion());platform.keepOnTop(win)}win.webContents.send('drag-state',true)})
   win.hookWindowMessage(0x0232,()=>{if(traceEvents){traceWindow(item,'drag-exit');traceFirstMove=false}win.webContents.send('drag-state',false);win.webContents.send('settle');clearTimeout(shapeTimer);shapeTimer=setTimeout(()=>{movementEnvelope=false;if(!win.isDestroyed())platform.apply(win,config.angle,config.mode,config.curlSide)},1400)})
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
  win.on('move',()=>{if(traceFirstMove){traceFirstMove=false;traceWindow(item,'first-drag-move')}if(!item.entering&&!item.exiting&&captureNote(item))scheduleSave();if(!config.nativeDrag)return;clearTimeout(settleTimer);settleTimer=setTimeout(()=>{if(!win.isDestroyed())win.webContents.send('settle')},100)})
  // New notes rise from the lower edge of the work area and settle at their
  // destination. The spring runs here because the window itself moves; the
  // renderer receives the same motion samples as a drag, so the paper flexes.
  const startEntrance=(resume?:{y:number;opacity:number})=>{
   if(systemPreferences.getAnimationSettings().prefersReducedMotion){win.setOpacity(1);platform.move(win,record.x,record.y);movementEnvelope=false;platform.apply(win,config.angle,config.mode,config.curlSide);return}
   const area=screen.getDisplayMatching({x:record.x,y:record.y,width:SIZE,height:SIZE}).workArea
   const dest={x:record.x,y:record.y},startY=resume?.y??area.y+area.height-100
   if(!resume&&startY-dest.y<60)return
   item.entering=true
   clearTimeout(shapeTimer);movementEnvelope=true
   if(process.platform==='win32'&&config.mode==='shape')win.setShape(movementRegion())
   win.setOpacity(resume?.opacity??0);platform.move(win,dest.x,startY)
   let spring={position:startY,velocity:0},last=performance.now()
   const began=last
   const finish=(arrive:boolean,captureInterrupted=true)=>{
    clearInterval(ticker);item.entering=false;item.stopEntrance=undefined
    if(win.isDestroyed())return
    if(arrive||captureInterrupted)win.setOpacity(1)
    // Arriving lands exactly on the destination; an interruption (the user
    // grabbed the note mid-flight) keeps wherever the note is now.
    if(arrive)platform.move(win,dest.x,dest.y);else if(captureInterrupted){capture();save()}
    win.webContents.send('settle')
    clearTimeout(shapeTimer);shapeTimer=setTimeout(()=>{movementEnvelope=false;if(!win.isDestroyed())platform.apply(win,config.angle,config.mode,config.curlSide)},1400)
   }
   const ticker=setInterval(()=>{
    if(win.isDestroyed()){clearInterval(ticker);return}
    const now=performance.now()
    spring=springStep(spring,dest.y,(now-last)/1000,13,.82);last=now
    win.setOpacity((resume?.opacity??0)+(1-(resume?.opacity??0))*Math.min(1,(now-began)/140))
    platform.move(win,dest.x,spring.position)
    win.webContents.send('motion',{angle:config.angle,curlSide:config.curlSide,grabX:180,grabY:66,vx:0,vy:spring.velocity})
    if(now-began>1500||(Math.abs(spring.position-dest.y)<.5&&Math.abs(spring.velocity)<10))finish(true)
   },8)
   item.stopEntrance=finish
  }
  item.dismiss=()=>{
   if(item.exiting||win.isDestroyed()||!win.isVisible())return
   visibilityCue(win,'hide')
   item.stopEntrance?.(false,false)
   if(systemPreferences.getAnimationSettings().prefersReducedMotion){win.hide();win.setOpacity(1);platform.move(win,record.x,record.y);return}
   const start=win.getBounds(),area=screen.getDisplayMatching(start).workArea,endY=area.y+area.height+20,began=performance.now(),opacity=win.getOpacity()
   item.exiting=true;clearTimeout(shapeTimer);movementEnvelope=true
   if(process.platform==='win32'&&config.mode==='shape')win.setShape(movementRegion())
   const finish=(hide:boolean)=>{
    clearInterval(ticker);item.exiting=false;item.stopExit=undefined
    if(win.isDestroyed())return
    const resume={y:win.getBounds().y,opacity:win.getOpacity()}
    if(hide){win.hide();win.setOpacity(1);platform.move(win,record.x,record.y);movementEnvelope=false;platform.apply(win,config.angle,config.mode,config.curlSide)}
    return resume
   }
   const ticker=setInterval(()=>{
    if(win.isDestroyed()){finish(false);return}
    const sample=exitSample(start.y,endY,performance.now()-began)
    platform.move(win,start.x,sample.y);win.setOpacity(opacity*sample.opacity)
    win.webContents.send('motion',{angle:config.angle,curlSide:config.curlSide,grabX:180,grabY:66,vx:0,vy:sample.velocity})
    if(sample.done)finish(true)
   },8)
   item.stopExit=finish
  }
  let loaded=playShowCue
  item.appear=(focus,animate)=>presentNote({ready,destroyed:()=>win.isDestroyed(),visible:()=>win.isVisible(),focused:()=>win.isFocused(),entering:()=>item.entering,interruptExit:()=>item.stopExit?.(false),entrance:resume=>{if(loaded)visibilityCue(win,'show');startEntrance(resume)},show:focus=>{if(focus)win.show();else win.showInactive()},focus:()=>{if(win.isMinimized())win.restore();win.focus()}},focus,animate)
  const hideNote=()=>{capture();const hidden=record.hidden;record.hidden=true;if(flush())item.dismiss?.();else record.hidden=hidden}
  let discardTimer:ReturnType<typeof setTimeout>|undefined
  win.on('show',()=>clearTimeout(discardTimer))
  win.on('hide',()=>{
   item.stopEntrance?.(true);item.stopExit?.(true)
   clearTimeout(discardTimer)
   if(record.hidden&&!item.retainEditor&&!diagnostics){
    // Keep recent hides warm. An untouched editor can be recreated from the
    // main-owned record. A used editor owns Chromium selection and undo state.
    discardTimer=setTimeout(()=>{
     if(!quitting&&!win.isDestroyed()&&!win.isVisible()&&record.hidden&&!item.retainEditor&&!saveWarning){
      if(traceEvents)traceWindow(item,'discard-hidden')
      win.destroy()
     }
    },30_000)
   }
  })
  win.on('closed',()=>{clearTimeout(discardTimer);readyReject(new Error('Note window closed'));clearTimeout(readyTimeout);clearTimeout(settleTimer);clearTimeout(shapeTimer);item.stopEntrance?.(true);item.stopExit?.(false);notes.delete(id);windowsByNote.delete(record.id);if(drag?.id===id)drag=undefined})
  win.on('blur',()=>{if(drag?.id===id)drag=undefined;if(captureNote(item)||saveTimer||saveWarning)flush()})
  win.on('close',event=>{if(!quitting){event.preventDefault();hideNote()}})
  win.webContents.on('context-menu',()=>Menu.buildFromTemplate([{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'},{type:'separator'},{label:'Paper color',submenu:COLORS.map(color=>({label:PALETTE[color].label,type:'radio' as const,checked:config.color===color,click:()=>setColor(item,color)}))},{label:'Drag sound',type:'checkbox',checked:data.settings.sound,click:menuItem=>setSound(menuItem.checked)},{type:'separator'},{label:'New note',click:()=>newNote(config.color)},{label:'Move to Trash',click:()=>deleteNote(item)},{label:'Hide note',click:hideNote}]).popup({window:win}))
  try{await load(win,{});await ready;if(!record.hidden)await item.appear(focus,entrance);loaded=true}catch(error){if(!win.isDestroyed())win.destroy();throw error}
}
async function start(){
 store=new NoteStore(join(app.getPath('userData'),'data'));data=store.load();persistenceReady=true
 if(store.recovered)void dialog.showMessageBox({type:'warning',message:'Stickee recovered your notes.',detail:'The primary notes file was unavailable or malformed. A valid backup was used when available. Malformed files are preserved beside notes.json for recovery.'})
 // A tiny local RGBA paper glyph, independent of network or asset paths.
 const pixels=Buffer.alloc(16*16*4)
 for(let y=2;y<14;y++)for(let x=2;x<14;x++){const i=(y*16+x)*4;pixels[i]=110;pixels[i+1]=218;pixels[i+2]=248;pixels[i+3]=255}
 tray=new Tray(nativeImage.createFromBitmap(pixels,{width:16,height:16,scaleFactor:1}))
 updateTrayTip()
 manager=createManager(snapshot,managerAction,win=>secure(win,false),resumeShortcut)
 buildTray()
 tray.on('double-click',()=>openManager())
 shortcutActive=globalShortcut.register(settings().shortcut,()=>newNote())
 if(!shortcutActive)void dialog.showMessageBox({type:'warning',message:`${settings().shortcut} is already in use.`,detail:'Create notes from the Stickee tray menu instead.'})
 movementRegion() // build the cached drag envelope before the first drag needs it
 for(const record of data.notes)if(record.deletedAt===undefined&&!record.hidden&&!windowsByNote.has(record.id))await createWindow(record)
 if(data.notes.length===0)newNote()
 save()
 if(diagnostics)timer=setInterval(()=>{
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
ipcMain.handle('config',event=>notes.get(event.sender.id)?.config??{curlSide:'right',text:'',color:DEFAULT_COLOR,angle:0,mode:'shape',nativeDrag:false,status:'Click-test panel',diagnostics,sound:false,soundStyle:'rustle'})
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
ipcMain.on('note-ready',event=>{const item=notes.get(event.sender.id);if(item&&event.senderFrame===event.sender.mainFrame)item.rendererReady?.()})
ipcMain.on('locate-ready',event=>{const item=notes.get(event.sender.id);if(!item||event.senderFrame!==event.sender.mainFrame)return;item.locateReady=true;if(item.pendingLocate){item.pendingLocate=false;item.win.webContents.send('locate')}})
ipcMain.on('retain-editor',event=>{
 const item=notes.get(event.sender.id)
 if(item&&event.senderFrame===event.sender.mainFrame)item.retainEditor=true
})
ipcMain.on('ink',(event,value:unknown)=>{
 const item=notes.get(event.sender.id)
 if(!item||item.record.deletedAt!==undefined||event.senderFrame!==event.sender.mainFrame||!validInk(value))return
 item.config.ink=item.record.ink=value.map(({color,width,points})=>({color,width,points}))
 item.retainEditor=true
 save()
})
ipcMain.on('text',(event,value:unknown,immediate:unknown)=>{
 const item=notes.get(event.sender.id)
 if(!item||item.record.deletedAt!==undefined||event.senderFrame!==event.sender.mainFrame||typeof value!=='string'||value.length>1_000_000||typeof immediate!=='boolean')return
 item.retainEditor=true
 if(item.record.text===value){if(immediate&&(saveTimer||saveWarning))flush();return}
 item.record.text=value;item.config.text=value
 if(immediate)flush();else save()
})
// A note made from another note starts on the same paper.
ipcMain.on('create',event=>{const item=notes.get(event.sender.id);if(item&&event.senderFrame===event.sender.mainFrame)newNote(item.config.color)})
ipcMain.on('color',(event,value:unknown)=>{const item=notes.get(event.sender.id);if(item&&event.senderFrame===event.sender.mainFrame&&isPaperColor(value))setColor(item,value)})
ipcMain.on('hide',event=>{const item=notes.get(event.sender.id);if(item&&event.senderFrame===event.sender.mainFrame){capture();const hidden=item.record.hidden;item.record.hidden=true;if(flush())item.dismiss?.();else item.record.hidden=hidden}})
ipcMain.on('quit',event=>{if(notes.has(event.sender.id))app.quit()})
if(!app.requestSingleInstanceLock())app.quit()
else {
 app.whenReady().then(start).catch(error=>{dialog.showErrorBox('Stickee startup failed',String(error));app.quit()})
 app.on('second-instance',()=>openManager())
}
app.on('window-all-closed',()=>{})
app.on('before-quit',event=>{capture();if(!flush()){event.preventDefault();quitting=false;return}quitting=true})
app.on('will-quit',()=>{saveVisibilityTrace();clearInterval(timer);clearTimeout(saveTimer);manager?.dispose();globalShortcut.unregisterAll();tray?.destroy()})
