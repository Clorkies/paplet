export type Mode='shape'|'tight'|'ignore'
import type { PaperColor } from './palette'
import type { SoundStyle } from './settings'
export type Config={curlSide:'left'|'right';text:string;color:PaperColor;angle:number;mode:Mode;nativeDrag:boolean;status:string;diagnostics:boolean;sound:boolean;soundStyle:SoundStyle}
/** Main-owned state pushed to a note when it changes outside the renderer. */
export type NoteState={color:PaperColor;sound:boolean;soundStyle:SoundStyle}
/** Native drag sample. Velocity is DIP/second; grab is window-relative DIP. */
export type Motion={vx:number;vy:number;grabX:number;grabY:number;angle:number;curlSide:'left'|'right'}
export interface StickeeAPI {
 config():Promise<Config>
 text(value:string,flush?:boolean):void
 create():void
 hide():void
 color(value:PaperColor):void
 onState(callback:(state:NoteState)=>void):()=>void
 drag(action:'start'|'end'):void
 experiment(mode:Mode,nativeDrag:boolean):Promise<void>
 quit():void
 onDragState(callback:(dragging:boolean)=>void):()=>void
 onSettle(callback:()=>void):()=>void
 onLocate(callback:()=>void):()=>void
 onMotion(callback:(motion:Motion)=>void):()=>void
}
declare global { interface Window { stickee:StickeeAPI } }
