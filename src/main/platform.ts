import { BrowserWindow } from 'electron'
import { region } from '../shared/geometry'
import type { Mode } from '../shared/api'
export interface WindowPlatform { apply(win:BrowserWindow,angle:number,mode:Mode):string; move(win:BrowserWindow,x:number,y:number):void; keepOnTop(win:BrowserWindow,raise?:boolean):void }
export const platform:WindowPlatform={
 apply(win,angle,mode){
   if(process.platform!=='win32')return 'UNSUPPORTED: Windows feasibility only; macOS requires separate hit testing'
   win.setIgnoreMouseEvents(false)
   win.setShape(mode==='ignore'?[]:region(angle,mode==='tight'?0:10))
   win.setAlwaysOnTop(true,'floating')
   return mode==='ignore'?'Whole-window ignore + main-process polygon polling (experimental)':`setShape: ${mode==='tight'?'0':'10'} DIP fringe; visuals AND input clipped`
 },
 keepOnTop(win,raise=false){
  if(win.isDestroyed()||!win.isVisible()||win.isMinimized())return
  win.setAlwaysOnTop(true,'floating')
  if(raise)win.moveTop()
 },
 move(win,x,y){win.setPosition(Math.round(x),Math.round(y),false)}
}
