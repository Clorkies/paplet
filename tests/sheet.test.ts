import { expect,it } from 'vitest'
import { affine,envelopeOutlines,REST,restOutline,sheetShape,warper } from '../src/shared/sheet'
import { contains,movementRegion,polygon,SIZE } from '../src/shared/geometry'
it('is exactly the native rest silhouette when undisturbed',()=>{
 for(const side of ['left','right'] as const){
  const native=polygon(0,side),warp=warper(REST)
  for(const p of restOutline(side)){
   const q=warp(p);expect(q.x).toBeCloseTo(p.x,9);expect(q.y).toBeCloseTo(p.y,9)
   // Every rendered vertex lies on or within half a pixel of the hit polygon.
   expect([[0,0],[.5,0],[-.5,0],[0,.5],[0,-.5],[.5,.5],[-.5,.5],[.5,-.5],[-.5,-.5]].some(([dx,dy])=>contains({x:p.x+dx,y:p.y+dy},native))).toBe(true)
  }
 }
 const m=affine(warper(REST),64,92,232,220)
 expect([m.a,m.b,m.c,m.d,m.e,m.f].map(v=>Math.round(v*1e6)/1e6)).toEqual([1,0,0,1,0,0])
 expect(sheetShape(REST,'right').bend).toBe(0)
})
it('keeps the pinched point planted while the far end trails and curves',()=>{
 const pose={grabX:60,grabY:50,mid:4,tail:24,stretch:-6},warp=warper(pose)
 expect(warp({x:60,y:50})).toEqual({x:60,y:50})
 const near=warp({x:90,y:60}),far=warp({x:320,y:320})
 expect(Math.hypot(near.x-90,near.y-60)).toBeLessThan(2)
 expect(Math.hypot(far.x-320,far.y-320)).toBeGreaterThan(18)
 // The top edge is no longer a rigid line when a corner is pinched.
 const a=warp({x:40,y:40}),b=warp({x:180,y:40}),c=warp({x:320,y:40})
 expect(Math.abs((b.y-a.y)*(c.x-a.x)-(c.y-a.y)*(b.x-a.x))).toBeGreaterThan(1)
})
it('keeps the rolled corner joined to the cut edge',()=>{
 const pose={grabX:40,grabY:40,mid:15,tail:30,stretch:5},warp=warper(pose)
 for(const side of ['left','right'] as const){
  const numbers=sheetShape(pose,side).curlTransform.match(/matrix\(([^)]+)\)/)![1].split(' ').map(Number)
  const [a,b,c,d,e,f]=numbers,mx=(x:number)=>side==='left'?360-x:x
  for(const [x,y] of [[320,265],[255,320]]){const q=warp({x:mx(x),y});expect(a*mx(x)+c*y+e).toBeCloseTo(q.x,1);expect(b*mx(x)+d*y+f).toBeCloseTo(q.y,1)}
 }
 expect(sheetShape(REST,'right').curlTransform.startsWith('matrix(1.00000 0.00000 0.00000 1.00000 0.00 0.00)')).toBe(true)
})
it('twists asymmetrically for a corner pinch and evenly for a centre pinch',()=>{
 const move=(grabX:number,x:number)=>{const q=warper({grabX,grabY:50,mid:10,tail:20,stretch:0})({x,y:320});return Math.hypot(q.x-x,q.y-320)}
 expect(Math.abs(move(180,40)-move(180,320))).toBeLessThan(.001)
 expect(move(40,320)).toBeGreaterThan(move(40,40)*1.2)
})
it('mirrors left and right curls',()=>{
 const right=restOutline('right'),left=restOutline('left')
 right.forEach((p,i)=>{expect(left[i].x).toBeCloseTo(360-p.x);expect(left[i].y).toBe(p.y)})
 expect(restOutline('right',0).every(p=>p.x<=320&&p.y<=320)).toBe(true)
})
it('never draws outside the window, and the drag envelope covers every extreme',()=>{
 const rects=movementRegion()
 expect(movementRegion()).toBe(rects)
 expect(rects.length).toBeLessThanOrEqual(SIZE)
 for(const rect of rects){expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(SIZE)}
 for(const [x,y] of [[0,0],[359,0],[0,359],[359,359]])expect(rects.some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height)).toBe(false)
 const rows=new Map<number,(typeof rects)[number]>()
 for(const rect of rects)for(let y=rect.y;y<rect.y+rect.height;y++)rows.set(y,rect)
 for(const outline of envelopeOutlines())for(const p of outline){
  expect(p.x).toBeGreaterThan(2);expect(p.x).toBeLessThan(SIZE-2);expect(p.y).toBeGreaterThan(2);expect(p.y).toBeLessThan(SIZE-2)
  const row=rows.get(Math.min(SIZE-1,Math.floor(p.y)))!
  expect(p.x).toBeGreaterThanOrEqual(row.x);expect(p.x).toBeLessThanOrEqual(row.x+row.width)
 }
})
