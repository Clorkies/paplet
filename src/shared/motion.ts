// Underdamped angular displacement; native window position never uses this spring.
export function settleAngle(displacement:number,seconds:number):number {
 return displacement*Math.exp(-14*seconds)*(Math.cos(22*seconds)+(14/22)*Math.sin(22*seconds))
}
