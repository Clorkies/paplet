import { expect,it } from 'vitest'
import { createFlow,flowActive,flowPose,stepFlow,TAIL_LIMIT,MID_LIMIT,COMPRESS_LIMIT,STRETCH_LIMIT } from '../src/shared/flow'
const still={vx:0,vy:0,droop:0}
function sweep(vx:number,frames=60,rate=60){
 const state=createFlow();let peak=0
 for(let i=0;i<frames;i++){stepFlow(state,{vx,vy:0,droop:0},1/rate);peak=Math.max(peak,Math.abs(flowPose(state).tail))}
 return {state,peak}
}
it('stays asleep at rest',()=>{
 const state=createFlow();stepFlow(state,still,1/60)
 expect(flowPose(state)).toEqual({mid:0,tail:0,stretch:0});expect(flowActive(state)).toBe(false)
})
it('trails opposite to travel, more for faster starts, with smooth saturation',()=>{
 const peaks=[150,500,1000,2000,4000,100000].map(v=>sweep(v).peak)
 for(let i=1;i<peaks.length;i++)expect(peaks[i]).toBeGreaterThan(peaks[i-1])
 expect(peaks[0]).toBeLessThan(4)
 expect(peaks[3]).toBeGreaterThan(15)
 expect(peaks[5]).toBeLessThanOrEqual(TAIL_LIMIT)
 const {state}=sweep(1000,6)
 expect(flowPose(state).tail).toBeLessThan(0)
 expect(Math.abs(flowPose(sweep(100000).state).mid)).toBeLessThanOrEqual(MID_LIMIT)
})
it('relaxes during sustained constant-speed travel',()=>{
 const {state,peak}=sweep(1000,120)
 expect(Math.abs(flowPose(state).tail)).toBeLessThan(peak*.5)
})
it('bends: the free end lags further than a rigid swing',()=>{
 const state=createFlow();let bend=0
 for(let i=0;i<20;i++){stepFlow(state,{vx:1500,vy:0,droop:0},1/60);const p=flowPose(state);bend=Math.max(bend,Math.abs(p.tail-2*p.mid))}
 expect(bend).toBeGreaterThan(4)
})
it('carries momentum through a reversal without a jump, then settles after release',()=>{
 const {state}=sweep(2000,30)
 let previous=flowPose(state).tail,largest=0,swungThrough=false
 for(let i=0;i<30;i++){stepFlow(state,{vx:-2000,vy:0,droop:0},1/60);const tail=flowPose(state).tail;largest=Math.max(largest,Math.abs(tail-previous));previous=tail;if(tail>5)swungThrough=true}
 expect(largest).toBeLessThan(9)
 expect(swungThrough).toBe(true)
 let frames=0
 while(flowActive(state)&&frames<240){stepFlow(state,still,1/60);frames++}
 expect(frames).toBeLessThan(80)
 expect(Math.abs(flowPose(state).tail)).toBeLessThan(.1)
})
it('responds identically at 60 Hz and 144 Hz',()=>{
 expect(Math.abs(sweep(1200,60,60).peak-sweep(1200,144,144).peak)).toBeLessThan(.5)
})
it('billows when pushed down and barely stretches when pulled up',()=>{
 const run=(vy:number)=>{const state=createFlow();let low=0,high=0;for(let i=0;i<40;i++){stepFlow(state,{vx:0,vy,droop:0},1/60);const s=flowPose(state).stretch;low=Math.min(low,s);high=Math.max(high,s)}return {low,high}}
 expect(run(2000).low).toBeLessThan(-3);expect(run(100000).low).toBeGreaterThanOrEqual(-COMPRESS_LIMIT)
 expect(run(-2000).high).toBeGreaterThan(1);expect(run(-100000).high).toBeLessThanOrEqual(STRETCH_LIMIT)
})
it('hangs toward its weight while pinched off-centre and recovers on release',()=>{
 const state=createFlow()
 for(let i=0;i<120;i++)stepFlow(state,{vx:0,vy:0,droop:-7},1/60)
 expect(flowPose(state).tail).toBeCloseTo(-7,0);expect(flowActive(state,-7)).toBe(false)
 for(let i=0;i<120;i++)stepFlow(state,still,1/60)
 expect(Math.abs(flowPose(state).tail)).toBeLessThan(.1)
})
it('ignores invalid samples',()=>{
 const state=createFlow();stepFlow(state,{vx:NaN,vy:Infinity,droop:0},1/60)
 expect(Number.isFinite(flowPose(state).tail+flowPose(state).stretch)).toBe(true)
})
