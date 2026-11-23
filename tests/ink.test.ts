import { expect, it } from 'vitest'
import { MAX_POINTS, MAX_STROKES, MAX_TOTAL_POINTS, strokePath, validInk, type Stroke } from '../src/shared/ink'

const dot: Stroke = {color:'graphite', width:2, points:[0,170]}
it('accepts dots and paper-edge coordinates and gives a dot a round-capped path',()=>{
 expect(validInk([dot,{color:'berry', width:6, points:[232,0,0,170]}])).toBe(true)
 expect(strokePath(dot.points)).toBe('M0 170h.01')
})
it('rejects unsupported tools and malformed geometry',()=>{
 for(const stroke of [null, {...dot,color:'toString'}, {...dot,width:3},
  ...[[],[0],[0,171],[233,0],[-1,0],[0.5,0],[NaN,0],[0,Infinity],Array(2)].map(points=>({...dot,points}))]) {
  expect(validInk([stroke])).toBe(false)
 }
})
it('bounds each stroke, the number of strokes, and the entire drawing',()=>{
 const full = {...dot,points:Array(MAX_POINTS*2).fill(1)}
 expect(validInk(Array(MAX_TOTAL_POINTS/MAX_POINTS).fill(full))).toBe(true)
 expect(validInk([...Array(MAX_TOTAL_POINTS/MAX_POINTS).fill(full),dot])).toBe(false)
 expect(validInk([{...full,points:[...full.points,0,0]}])).toBe(false)
 expect(validInk(Array(MAX_STROKES+1).fill(dot))).toBe(false)
})
