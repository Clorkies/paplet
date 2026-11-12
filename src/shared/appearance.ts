export function randomAppearance(random:()=>number=Math.random){
 const curlSide=random()<.5?'left' as const:'right' as const
 const angle=random()<.25?0:Number(((random()*2-1)*2.3).toFixed(2))
 return {curlSide,angle}
}
