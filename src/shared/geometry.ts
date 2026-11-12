export type Point = { x: number; y: number }
export const SIZE = 360
export const edge: Point[] = [[40,40],[320,40],[320,320],[40,320]].map(([x,y])=>({x,y}))
export function polygon(angle:number):Point[] {
  const a=angle*Math.PI/180
  const curve=Array.from({length:13},(_,i)=>{
   const t=i/12,u=1-t
   return {x:u*u*u*320+3*u*u*t*305+3*u*t*t*282+t*t*t*255,y:u*u*u*265+3*u*u*t*283+3*u*t*t*312+t*t*t*320}
  })
  const outline=[{x:40,y:40},{x:320,y:40},...curve,{x:40,y:320}]
  return outline.map(p=>({x:angle>0?360-p.x:p.x,y:p.y})).map(({x,y})=>({x:180+(x-180)*Math.cos(a)-(y-180)*Math.sin(a),y:180+(x-180)*Math.sin(a)+(y-180)*Math.cos(a)}))
}
export function contains(p:Point, points:Point[]):boolean {
  let inside=false
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j]
    if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside
  }
  return inside
}
// One-DIP scanlines; same rotated polygon as SVG. Padding reserves a shadow fringe.
export function region(angle:number,padding=0){
  const points=polygon(angle), rects:{x:number;y:number;width:number;height:number}[]=[]
  for(let y=0;y<SIZE;y++){
    const xs:number[]=[]
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j], scan=y+0.5
      if((a.y>scan)!==(b.y>scan)) xs.push(a.x+(scan-a.y)*(b.x-a.x)/(b.y-a.y))
    }
    if(xs.length){const x=Math.max(0,Math.floor(Math.min(...xs))-padding),right=Math.min(SIZE,Math.ceil(Math.max(...xs))+padding)
      rects.push({x,y:Math.max(0,y-padding),width:right-x,height:Math.min(SIZE,y+1+padding)-Math.max(0,y-padding)})}
  }
  return rects
}
export function clampPosition(p:Point,area:{x:number;y:number;width:number;height:number}):Point{
  return {x:Math.round(Math.max(area.x,Math.min(p.x,area.x+Math.max(0,area.width-SIZE)))),y:Math.round(Math.max(area.y,Math.min(p.y,area.y+Math.max(0,area.height-SIZE))))}
}
