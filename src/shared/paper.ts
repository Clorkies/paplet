// A restrained flexible surface: the grabbed edge stays planted while the free
// edge bows. The curved cut-out exposes the rolled underside, not a painted mark.
export function paperSurface(x:number,y:number,grabX:number,grabY:number,side:'left'|'right',curlAmount=1){
 const amount=Math.max(0,Math.min(1,curlAmount))
 const cx=(value:number)=>320+(value-320)*amount
 const cy=cx
 const distance=Math.max(.25,Math.min(1,(320-grabY)/255))
 const bend=Math.max(-9,Math.min(9,x))*distance
 const sag=Math.max(-7,Math.min(7,y))*distance
 const bias=Math.max(-1,Math.min(1,(grabX-180)/140))
 const left=bend*(1+bias*.25),right=bend*(1-bias*.25)
 const cut=side==='right'
  ?`L ${320+right} ${cy(265)+sag} C ${cx(305)+right} ${cy(283)+sag} ${cx(282)+right} ${cy(312)+sag} ${cx(255)+right} ${320+sag} L ${40+left} ${320+sag}`
  :`L ${320+right} ${320+sag} L ${360-cx(255)+left} ${320+sag} C ${360-cx(282)+left} ${cy(312)+sag} ${360-cx(305)+left} ${cy(283)+sag} ${40+left} ${cy(265)+sag}`
 return {path:`M40 40 H320 C320 120 ${320+right} 180 ${320+right} ${side==='right'?cy(265)+sag:320+sag} ${cut} C ${40+left} 180 40 120 40 40 Z`,curlTransform:side==='right'?`translate(${right} ${sag}) translate(320 320) scale(${amount}) translate(-320 -320)`:`translate(${360+left} ${sag}) scale(-1 1) translate(320 320) scale(${amount}) translate(-320 -320)`}
}
