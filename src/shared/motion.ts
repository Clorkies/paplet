// Underdamped angular displacement; native window position never uses this spring.
export function settleAngle(displacement:number,seconds:number):number {
 return displacement*Math.exp(-14*seconds)*(Math.cos(22*seconds)+(14/22)*Math.sin(22*seconds))
}
export type Spring={position:number;velocity:number}
// Exact damped oscillator step: consistent across refresh rates and interruptions.
export function springStep(state:Spring,target:number,dt:number,frequency=14,damping=.65):Spring{
 const time=Math.max(0,Math.min(dt,.1)),decay=damping*frequency,w=frequency*Math.sqrt(1-damping*damping)
 const offset=state.position-target,b=(state.velocity+decay*offset)/w
 const c=Math.cos(w*time),s=Math.sin(w*time),e=Math.exp(-decay*time)
 return {position:target+e*(offset*c+b*s),velocity:e*((b*w-decay*offset)*c-(offset*w+decay*b)*s)}
}
