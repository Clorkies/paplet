export type Mode='shape'|'tight'|'ignore'
export type Config={curlSide:'left'|'right';text:string;note:number;angle:number;mode:Mode;nativeDrag:boolean;status:string}
export interface StickeeAPI {
 config():Promise<Config>
 text(value:string,flush?:boolean):void
 create():void
 hide():void
 drag(action:'start'|'end'):void
 experiment(mode:Mode,nativeDrag:boolean):Promise<void>
 quit():void
 onDragState(callback:(dragging:boolean)=>void):()=>void
 onSettle(callback:()=>void):()=>void
 onMotion(callback:(motion:{dx:number;dy:number;grabX:number;grabY:number;angle:number;curlSide:'left'|'right'})=>void):()=>void
}
declare global { interface Window { stickee:StickeeAPI } }
