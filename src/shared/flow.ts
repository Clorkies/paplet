// Decorative paper dynamics, simulated in the window's own frame of reference.
// The native window is authoritative and follows the cursor exactly; this model
// only decides how far the loose paper trails behind the pinched point.
//
// Two lagging stages hang from the grab: `mid` (paper near the fingers) and
// `tail` (the free end, which rests at twice the mid displacement so a rigid
// swing is a straight sheet and any extra tail lag reads as a bend). Both are
// forced by window ACCELERATION, so constant-speed travel relaxes, plus a small
// air-drag term so a fast sweep still trails slightly.
export type FlowState={
 svx:number;svy:number           // low-passed window velocity, DIP/s
 mid:number;midV:number          // lateral displacement near the grab, px
 tail:number;tailV:number        // lateral displacement of the free end, px
 lift:number;liftV:number        // vertical lag; negative compresses (billow)
}
export type FlowInput={vx:number;vy:number;droop:number}
export type FlowPose={mid:number;tail:number;stretch:number}

export const TAIL_LIMIT=30,MID_LIMIT=16,STRETCH_LIMIT=5,COMPRESS_LIMIT=14

const SMOOTHING=.03              // seconds; filters 60 Hz native samples
const MAX_SPEED=6000
const MID_K=196,MID_C=15.4       // 14 rad/s, damping ratio .55
const TAIL_K=144,TAIL_C=14.4     // 12 rad/s, damping ratio .6
const LIFT_K=324,LIFT_C=25.2     // 18 rad/s, damping ratio .7
const MID_INERTIA=.125,TAIL_INERTIA=.1,LIFT_INERTIA=.11
const MID_DRAG=.49,TAIL_DRAG=.2,LIFT_DRAG=.3
const STEP=.004

export function createFlow():FlowState{
 return {svx:0,svy:0,mid:0,midV:0,tail:0,tailV:0,lift:0,liftV:0}
}

const bound=(value:number)=>Math.max(-MAX_SPEED,Math.min(MAX_SPEED,Number.isFinite(value)?value:0))

/** Advance in place. Fixed substeps keep the result refresh-rate independent. */
export function stepFlow(state:FlowState,input:FlowInput,seconds:number):void{
 const total=Math.max(0,Math.min(seconds,.1))
 if(total===0)return
 const steps=Math.max(1,Math.ceil(total/STEP)),h=total/steps
 const vx=bound(input.vx),vy=bound(input.vy)
 const blend=1-Math.exp(-h/SMOOTHING)
 for(let i=0;i<steps;i++){
  const ax=(vx-state.svx)/SMOOTHING,ay=(vy-state.svy)/SMOOTHING
  state.svx+=(vx-state.svx)*blend;state.svy+=(vy-state.svy)*blend
  // A hardening spring keeps extreme flicks bounded so recovery stays prompt.
  const offset=state.mid-input.droop/2,hard=1+(offset/22)*(offset/22)
  state.midV+=h*(-MID_K*offset*hard-MID_C*state.midV-MID_INERTIA*ax-MID_DRAG*state.svx)
  state.mid+=h*state.midV
  const gap=state.tail-2*state.mid,stiff=1+(gap/26)*(gap/26)
  state.tailV+=h*(-TAIL_K*gap*stiff-TAIL_C*(state.tailV-2*state.midV)-TAIL_INERTIA*ax-TAIL_DRAG*state.svx)
  state.tail+=h*state.tailV
  state.liftV+=h*(-LIFT_K*state.lift*(1+(state.lift/16)*(state.lift/16))-LIFT_C*state.liftV-LIFT_INERTIA*ay-LIFT_DRAG*state.svy)
  state.lift+=h*state.liftV
 }
}

/** Smoothly saturated displacements for rendering; never a hard stop. */
export function flowPose(state:FlowState):FlowPose{
 return {
  mid:MID_LIMIT*Math.tanh(state.mid/MID_LIMIT),
  tail:TAIL_LIMIT*Math.tanh(state.tail/TAIL_LIMIT),
  // Paper cannot stretch: pulling it taut barely shows, pushing it billows.
  stretch:state.lift>0?STRETCH_LIMIT*Math.tanh(state.lift/STRETCH_LIMIT):COMPRESS_LIMIT*Math.tanh(state.lift/COMPRESS_LIMIT)
 }
}

/** True while there is visible displacement or momentum left to play out. */
export function flowActive(state:FlowState,droop=0):boolean{
 return Math.abs(state.mid-droop/2)+Math.abs(state.tail-droop)+Math.abs(state.lift)>.08
  ||Math.abs(state.midV)+Math.abs(state.tailV)+Math.abs(state.liftV)>1
  ||Math.abs(state.svx)+Math.abs(state.svy)>1
}
