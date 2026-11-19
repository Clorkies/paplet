import { envelopeOutlines } from './sheet'
export type Point = { x: number; y: number }
export const SIZE = 360
export const edge: Point[] = [[40,40],[320,40],[320,320],[40,320]].map(([x,y])=>({x,y}))
export function polygon(angle:number,side:'left'|'right'=angle>0?'left':'right'):Point[] {
  const a=angle*Math.PI/180
  const curve=Array.from({length:13},(_,i)=>{
   const t=i/12,u=1-t
   return {x:u*u*u*320+3*u*u*t*305+3*u*t*t*282+t*t*t*255,y:u*u*u*265+3*u*u*t*283+3*u*t*t*312+t*t*t*320}
  })
  const outline=[{x:40,y:40},{x:320,y:40},...curve,{x:40,y:320}]
  return outline.map(p=>({x:side==='left'?360-p.x:p.x,y:p.y})).map(({x,y})=>({x:180+(x-180)*Math.cos(a)-(y-180)*Math.sin(a),y:180+(x-180)*Math.sin(a)+(y-180)*Math.cos(a)}))
}
export function contains(p:Point, points:Point[]):boolean {
  let inside=false
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j]
    if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside
  }
  return inside
}
type RegionRect={x:number;y:number;width:number;height:number}
// Consecutive scanlines with the same span describe a single native rectangle.
function appendBand(rects:RegionRect[],x:number,y:number,width:number,height:number){
 const previous=rects[rects.length-1]
 if(previous&&previous.x===x&&previous.width===width&&y<=previous.y+previous.height){
  previous.height=Math.max(previous.height,y+height-previous.y)
 }else rects.push({x,y,width,height})
}
// One-DIP scanlines; same rotated polygon as SVG. Padding reserves a shadow fringe.
export function region(angle:number,padding=0,side?:'left'|'right'){
  const points=polygon(angle,side), rects:RegionRect[]=[]
  for(let y=0;y<SIZE;y++){
    const xs:number[]=[]
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j], scan=y+0.5
      if((a.y>scan)!==(b.y>scan)) xs.push(a.x+(scan-a.y)*(b.x-a.x)/(b.y-a.y))
    }
    if(xs.length){const x=Math.max(0,Math.floor(Math.min(...xs))-padding),right=Math.min(SIZE,Math.ceil(Math.max(...xs))+padding)
      const top=Math.max(0,y-padding)
      appendBand(rects,x,top,right-x,Math.min(SIZE,y+1+padding)-top)}
  }
  return rects
}
export function clampPosition(p:Point,area:{x:number;y:number;width:number;height:number}):Point{
  return {x:Math.round(Math.max(area.x,Math.min(p.x,area.x+Math.max(0,area.width-SIZE)))),y:Math.round(Math.max(area.y,Math.min(p.y,area.y+Math.max(0,area.height-SIZE))))}
}
let dragEnvelope:ReturnType<typeof region>|undefined
export function movementRegion(){
 if(dragEnvelope)return dragEnvelope
 // Merge every extreme warped silhouette (all grab points, both curl sides,
 // resting tilts) into one scanline per DIP. This reserves drawing room for
 // the swinging, bending sheet without a rectangular overlay.
 const padding=10,rows=Array.from({length:SIZE},()=>({left:SIZE,right:0}))
 for(const points of envelopeOutlines()){
  for(let y=0;y<SIZE;y++){
   let min=Infinity,max=-Infinity
   const scan=y+.5
   for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j]
    if((a.y>scan)!==(b.y>scan)){const x=a.x+(scan-a.y)*(b.x-a.x)/(b.y-a.y);if(x<min)min=x;if(x>max)max=x}
   }
   if(max<min)continue
   const left=Math.max(0,Math.floor(min)-padding),right=Math.min(SIZE,Math.ceil(max)+padding)
   for(let row=Math.max(0,y-padding);row<Math.min(SIZE,y+1+padding);row++){
    if(left<rows[row].left)rows[row].left=left
    if(right>rows[row].right)rows[row].right=right
   }
  }
 }
 dragEnvelope=[]
 for(const [y,{left,right}] of rows.entries()){
  if(right>left)appendBand(dragEnvelope,left,y,right-left,1)
 }
 return dragEnvelope
}
