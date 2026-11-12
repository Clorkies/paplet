import { expect,it } from 'vitest'
import { randomAppearance } from '../src/shared/appearance'
import { springStep } from '../src/shared/motion'
function draws(...values:number[]){return ()=>values.shift()!}
it('allows a completely straight note with either curl side',()=>{
 expect(randomAppearance(draws(.1,.1))).toEqual({curlSide:'left',angle:0})
 expect(randomAppearance(draws(.9,.1))).toEqual({curlSide:'right',angle:0})
})
it('varies tilt independently of the curl side within the paper envelope',()=>{
 expect(randomAppearance(draws(.1,.8,0))).toEqual({curlSide:'left',angle:-2.3})
 expect(randomAppearance(draws(.9,.8,1))).toEqual({curlSide:'right',angle:2.3})
})
it('settles consistently at 30, 60 and 144 Hz without resetting release velocity',()=>{
 const results=[30,60,144].map(rate=>{let state={position:8,velocity:-12};for(let i=0;i<rate;i++)state=springStep(state,0,1/rate,12,.63);return state})
 for(const state of results){expect(state.position).toBeCloseTo(results[0].position,9);expect(state.velocity).toBeCloseTo(results[0].velocity,9);expect(Math.abs(state.position)).toBeLessThan(.02)}
})
