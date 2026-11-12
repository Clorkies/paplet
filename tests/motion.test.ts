import { expect,it } from 'vitest'
import { settleAngle } from '../src/shared/motion'
it('starts continuously and settles within half a second',()=>{
 expect(settleAngle(.65,0)).toBe(.65)
 expect(Math.abs(settleAngle(.65,.5))).toBeLessThan(.002)
 expect(Math.abs(settleAngle(0,.2))).toBe(0)
})
