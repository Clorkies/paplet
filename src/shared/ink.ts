export const INK_WIDTH = 232
export const INK_HEIGHT = 170
export const MAX_STROKES = 128
export const MAX_POINTS = 1024
export const MAX_TOTAL_POINTS = 16384
export const inkColors = { graphite: '#383532', ocean: '#214f87', berry: '#963955' }
export type InkColor = keyof typeof inkColors
export type Stroke = { color: InkColor; width: 2 | 4 | 6; points: number[] }

export function validInk(value: unknown): value is Stroke[] {
 if (!Array.isArray(value) || value.length > MAX_STROKES) return false
 let total = 0
 for (const stroke of value) {
  if (!stroke || typeof stroke.color !== 'string' || !Object.hasOwn(inkColors, stroke.color) ||
      ![2, 4, 6].includes(stroke.width) || !Array.isArray(stroke.points)) return false
  const points = stroke.points
  total += points.length / 2
  if (total > MAX_TOTAL_POINTS || points.length < 2 || points.length > MAX_POINTS * 2 || points.length % 2) return false
  for (let i = 0; i < points.length; i++) {
   const n = points[i]
   if (!Number.isInteger(n) || n < 0 || n > (i % 2 ? INK_HEIGHT : INK_WIDTH)) return false
  }
 }
 return true
}

export function strokePath(points: number[]): string {
 if (points.length === 2) return 'M' + points.join(' ') + 'h.01'
 return 'M' + points.join(' ')
}
