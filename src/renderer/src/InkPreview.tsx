import React, { memo } from 'react'
import { inkColors, strokePath, type Stroke } from '../../shared/ink'

export const InkStroke = memo(function InkStroke({stroke, index}: {stroke: Stroke; index: number}) {
 return <path data-stroke={index} d={strokePath(stroke.points)} fill="none" stroke={inkColors[stroke.color]}
  strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round"/>
})

export function InkPreview({ink}: {ink?: Stroke[]}) {
 if (!ink?.length) return null
 return <svg className="ink-preview" viewBox="0 0 232 170" role="img" aria-label="Handwritten drawing">
  {ink.map((stroke, i) => <InkStroke key={i} index={i} stroke={stroke}/>)}
 </svg>
}
