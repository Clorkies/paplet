import { expect,it } from 'vitest'
import { speedTilt,springStep } from '../src/shared/motion'
import { movementRegion,SIZE } from '../src/shared/geometry'
it('retains subtle slow tilt and increases it smoothly for fast drags',()=>{
 expect(speedTilt(0)).toBe(0)
 expect(speedTilt(60)).toBeLessThan(.3)
 const values=[60,300,700,1400,3000].map(speedTilt)
 for(let i=1;i<values.length;i++)expect(values[i]).toBeGreaterThan(values[i-1])
 expect(speedTilt(3000)).toBeGreaterThan(6)
 expect(speedTilt(100000)).toBeLessThanOrEqual(6.5)
 expect(speedTilt(-1400)).toBe(-speedTilt(1400))
})
it('preserves a continuous reversal and settles after releasing a fast drag',()=>{
 let state={position:0,velocity:0}
 for(let i=0;i<30;i++)state=springStep(state,speedTilt(2000),1/60,16,.68)
 const before=state.position
 state=springStep(state,speedTilt(-2000),1/60,16,.68)
 expect(Math.abs(state.position-before)).toBeLessThan(1)
 for(let i=0;i<84;i++)state=springStep(state,0,1/60,16,.68)
 expect(Math.abs(state.position)).toBeLessThan(.001)
 expect(Math.abs(state.velocity)).toBeLessThan(.001)
})
it('keeps the cached movement envelope bounded and clear at distant corners',()=>{
 const rects=movementRegion()
 expect(movementRegion()).toBe(rects)
 expect(rects.length).toBeLessThanOrEqual(SIZE)
 for(const rect of rects){expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(SIZE)}
 for(const [x,y] of [[0,0],[359,0],[0,359],[359,359]])expect(rects.some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height)).toBe(false)
})
