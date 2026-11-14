// The visible sheet: one rest outline, warped around the pinched point.
// Every point rotates about the grab by an angle that changes linearly with its
// distance from the grab, so paper near the fingers stays planted while the far
// end trails and the edges bend continuously (including the top edge when a
// corner is pinched). At rest the outline equals the native hit-test polygon.
import type { Point } from './geometry'
import { COMPRESS_LIMIT,STRETCH_LIMIT,TAIL_LIMIT,type FlowPose } from './flow'

export type Side='left'|'right'
export type Pose=FlowPose&{grabX:number;grabY:number}
export type Matrix={a:number;b:number;c:number;d:number;e:number;f:number}
export const REST_GRAB={x:180,y:65}
export const REST:Pose={grabX:REST_GRAB.x,grabY:REST_GRAB.y,mid:0,tail:0,stretch:0}

const CORNERS=[[40,40],[320,40],[320,320],[40,320]]
const NEAR_LIMIT=.12 // radians

/** Rest silhouette, subdivided so warped edges render as smooth curves. */
export function restOutline(side:Side,curlAmount=1,segments=10):Point[]{
 const amount=Math.max(0,Math.min(1,curlAmount)),c=(value:number)=>320+(value-320)*amount
 const points:Point[]=[]
 const line=(x0:number,y0:number,x1:number,y1:number)=>{
  for(let i=0;i<segments;i++){const t=i/segments;points.push({x:x0+(x1-x0)*t,y:y0+(y1-y0)*t})}
 }
 line(40,40,320,40)
 line(320,40,320,c(265))
 // The curved cut-out that exposes the rolled underside.
 for(let i=0;i<12;i++){
  const t=i/12,u=1-t
  points.push({
   x:u*u*u*320+3*u*u*t*c(305)+3*u*t*t*c(282)+t*t*t*c(255),
   y:u*u*u*c(265)+3*u*u*t*c(283)+3*u*t*t*c(312)+t*t*t*320
  })
 }
 line(c(255),320,40,320)
 line(40,320,40,40)
 return side==='left'?points.map(p=>({x:360-p.x,y:p.y})):points
}

/** Distance from the grab to the farthest paper corner. */
export function reach(grabX:number,grabY:number):number{
 return Math.max(...CORNERS.map(([x,y])=>Math.hypot(x-grabX,y-grabY)))
}

export function warper(pose:Pose):(p:Point)=>Point{
 const {grabX,grabY}=pose,length=reach(grabX,grabY)
 // Displacement profile through 0 (grab), mid (half way) and tail (far end)
 // corresponds to an angle that is linear in distance.
 const near=Math.max(-NEAR_LIMIT,Math.min(NEAR_LIMIT,-(4*pose.mid-pose.tail)/length))
 const far=-pose.tail/length,stretch=pose.stretch/length
 return p=>{
  const rx=p.x-grabX,ry=p.y-grabY,w=Math.min(1,Math.hypot(rx,ry)/length)
  const angle=near+(far-near)*w,cos=Math.cos(angle),sin=Math.sin(angle),y=ry*(1+stretch*w)
  return {x:grabX+rx*cos-y*sin,y:grabY+rx*sin+y*cos}
 }
}

/** Best local affine map of a rest-space box, for content that must stay rectangular. */
export function affine(warp:(p:Point)=>Point,x:number,y:number,width:number,height:number):Matrix{
 const o=warp({x,y}),u=warp({x:x+width,y}),v=warp({x,y:y+height})
 const a=(u.x-o.x)/width,b=(u.y-o.y)/width,c=(v.x-o.x)/height,d=(v.y-o.y)/height
 return {a,b,c,d,e:o.x-a*x-c*y,f:o.y-b*x-d*y}
}

/** Affine map carrying three rest points exactly onto their warped positions. */
export function affineThrough(warp:(p:Point)=>Point,p0:Point,p1:Point,p2:Point):Matrix{
 const q0=warp(p0),q1=warp(p1),q2=warp(p2)
 const ux=p1.x-p0.x,uy=p1.y-p0.y,vx=p2.x-p0.x,vy=p2.y-p0.y,det=ux*vy-uy*vx
 const Ux=q1.x-q0.x,Uy=q1.y-q0.y,Vx=q2.x-q0.x,Vy=q2.y-q0.y
 const a=(Ux*vy-Vx*uy)/det,c=(Vx*ux-Ux*vx)/det,b=(Uy*vy-Vy*uy)/det,d=(Vy*ux-Uy*vx)/det
 return {a,b,c,d,e:q0.x-a*p0.x-c*p0.y,f:q0.y-b*p0.x-d*p0.y}
}

const n=(value:number)=>value.toFixed(2)
const matrix=(m:Matrix)=>`matrix(${m.a.toFixed(5)} ${m.b.toFixed(5)} ${m.c.toFixed(5)} ${m.d.toFixed(5)} ${n(m.e)} ${n(m.f)})`

export const CONTENT_BOX={x:64,y:92,width:232,height:220}

export function sheetShape(pose:Pose,side:Side,curlAmount=1){
 const warp=warper(pose),amount=Math.max(0,Math.min(1,curlAmount))
 const points=restOutline(side,amount).map(warp)
 const path='M'+points.map(p=>`${n(p.x)} ${n(p.y)}`).join('L')+'Z'
 // The curl artwork is drawn for the right corner; mirror it for the left.
 // Fit its transform to the two ends of the cut plus the corner, so the rolled
 // edge stays joined to the sheet however the corner moves.
 const fit=Math.max(amount,.25),c=(value:number)=>320+(value-320)*fit,mx=(x:number)=>side==='left'?360-x:x
 const corner=affineThrough(warp,{x:mx(320),y:c(265)},{x:mx(c(255)),y:320},{x:mx(320),y:320})
 const curlTransform=`${matrix(corner)}${side==='left'?' translate(360 0) scale(-1 1)':''} translate(320 320) scale(${amount.toFixed(4)}) translate(-320 -320)`
 const box=affine(warp,CONTENT_BOX.x,CONTENT_BOX.y,CONTENT_BOX.width,CONTENT_BOX.height)
 // CSS matrix relative to the content element's own top-left corner.
 const o=warp({x:CONTENT_BOX.x,y:CONTENT_BOX.y})
 const contentTransform=`matrix(${box.a.toFixed(5)},${box.b.toFixed(5)},${box.c.toFixed(5)},${box.d.toFixed(5)},${n(o.x-CONTENT_BOX.x)},${n(o.y-CONTENT_BOX.y)})`
 // How strongly the sheet is curved (not merely swung), for shading and lift.
 const bend=Math.min(1,Math.abs(pose.tail-2*pose.mid)/24+Math.max(0,-pose.stretch)/14+Math.abs(pose.tail)/80)
 return {path,curlTransform,contentTransform,bend}
}

/** Extreme silhouettes the animation can reach; reserves native drawing room. */
export function envelopeOutlines():Point[][]{
 const outlines:Point[][]=[]
 const poses:[number,number][]=[]
 for(const s of [-1,1])poses.push([15*s,TAIL_LIMIT*s],[0,TAIL_LIMIT*s],[8*s,TAIL_LIMIT*s],[16*s,10*s])
 for(const grabX of [40,180,320])for(const grabY of [40,92])for(const [mid,tail] of poses)for(const stretch of [STRETCH_LIMIT,-COMPRESS_LIMIT/2])for(const side of ['left','right'] as const){
  const warped=restOutline(side,1,4).map(warper({grabX,grabY,mid,tail,stretch}))
  for(const degrees of [-2.5,2.5]){
   const a=degrees*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a)
   outlines.push(warped.map(({x,y})=>({x:180+(x-180)*cos-(y-180)*sin,y:180+(x-180)*sin+(y-180)*cos})))
  }
 }
 return outlines
}
