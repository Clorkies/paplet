import { expect,it } from 'vitest'
import { COLORS,PALETTE,contrast,isPaperColor,legacyColor } from '../src/shared/palette'
it('keeps ink strongly readable on every paper, including its darkest area',()=>{
 for(const color of COLORS){
  const paper=PALETTE[color]
  expect(contrast(paper.ink,paper.bottom)).toBeGreaterThan(7)
  expect(contrast(paper.ink,paper.top)).toBeGreaterThan(7)
 }
})
it('validates colour IDs and maps legacy variants',()=>{
 expect(COLORS).toEqual(['yellow','peach','mint','lavender','blue'])
 expect(isPaperColor('mint')).toBe(true);expect(isPaperColor('red')).toBe(false);expect(isPaperColor(0)).toBe(false)
 expect(legacyColor(0)).toBe('yellow');expect(legacyColor(1)).toBe('peach');expect(legacyColor(2)).toBeUndefined()
})
