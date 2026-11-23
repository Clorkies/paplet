import { BrowserWindow } from 'electron'
import { region } from '../shared/geometry'
import type { Mode } from '../shared/api'
export interface WindowPlatform { apply(win:BrowserWindow,angle:number,mode:Mode,side?:'left'|'right'):string; move(win:BrowserWindow,x:number,y:number):void; keepOnTop(win:BrowserWindow,raise?:boolean):void }
// Electron puts 'floating' HWNDs behind the taskbar. When the taskbar drops
// below a fullscreen browser, that placement can clear the note's topmost bit.
const noteLevel = process.platform === 'win32' ? 'pop-up-menu' : 'floating'
export const platform:WindowPlatform={
 apply(win,angle,mode,side){
   if(process.platform!=='win32')return 'UNSUPPORTED: Windows feasibility only; macOS requires separate hit testing'
   win.setIgnoreMouseEvents(false)
   win.setShape(mode==='ignore'?[]:region(angle,mode==='tight'?0:10,side))
   win.setAlwaysOnTop(true,noteLevel)
   return mode==='ignore'?'Whole-window ignore + main-process polygon polling (experimental)':`setShape: ${mode==='tight'?'0':'10'} DIP fringe; visuals AND input clipped`
 },
 keepOnTop(win,raise=false){
  if(win.isDestroyed()||!win.isVisible()||win.isMinimized())return
  win.setAlwaysOnTop(true,noteLevel)
  if(raise)win.moveTop()
 },
 move(win,x,y){win.setPosition(Math.round(x),Math.round(y),false)}
}
