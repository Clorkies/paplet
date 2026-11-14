import type { Point } from '../shared/geometry'
import { clampPosition, SIZE } from '../shared/geometry'
export type WorkArea={x:number;y:number;width:number;height:number}
export const centeredNote=(area:WorkArea):Point=>clampPosition({x:area.x+(area.width-SIZE)/2,y:area.y+(area.height-SIZE)/2},area)
/** Accelerating exit, followed by a short fade. No paper-physics parameters. */
export function exitSample(start:number,end:number,elapsed:number){
 const t=Math.min(1,Math.max(0,elapsed/280))
 return {y:start+(end-start)*t*t,velocity:2*(end-start)*t/.28,opacity:t===1?0:1-Math.max(0,(t-.55)/.45),done:t===1}
}
type Presentation={
 ready:Promise<void>;destroyed:()=>boolean;visible:()=>boolean;focused:()=>boolean;
 entering:()=>boolean;interruptExit:()=>{y:number;opacity:number}|undefined;
 entrance:(resume?:{y:number;opacity:number})=>void;
 show:(focus:boolean)=>void;focus:()=>void
}
/** Await painted content; repeated opens focus without replaying or re-showing. */
export async function presentNote(view:Presentation,focus:boolean,animate:boolean){
 await view.ready
 if(view.destroyed())throw new Error('Note window was closed')
 const resume=view.interruptExit(),visible=view.visible()
 if(animate&&(!visible||resume)&&!view.entering())view.entrance(resume)
 if(!visible)view.show(focus)
 else if(focus&&!view.focused())view.focus()
}
