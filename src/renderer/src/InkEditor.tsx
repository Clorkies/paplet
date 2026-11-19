import React, { useEffect, useRef, useState } from 'react'
import { INK_WIDTH, INK_HEIGHT, MAX_POINTS, MAX_TOTAL_POINTS, MAX_STROKES, inkColors, strokePath, type Stroke, type InkColor } from '../../shared/ink'
import { InkStroke } from './InkPreview'

const paths = {
 pencil: 'M3 16.5V21l4.5-1 12-12-3.5-3.5z M14 6.5l3.5 3.5',
 eraser: 'm4 13 9-10 7 6-10 11H8z M8 9l7 6 M10 20h11',
 undo: 'm8 5-5 5 5 5 M4 10h10a6 6 0 0 1 0 12',
 redo: 'm16 5 5 5-5 5 M20 10H10a6 6 0 0 0 0 12',
 clear: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7'
}
export function InkIcon({name}: {name: keyof typeof paths}) {
 return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>
}

type Gesture = { id: number; points: number[]; capacity: number; matrix: DOMMatrix }
type Props = { initial?: Stroke[]; active: boolean; exit: () => void }
export function InkEditor({initial, active, exit}: Props) {
 const [ink, setInk] = useState<Stroke[]>(initial ?? [])
 const [color, setColor] = useState<InkColor>('graphite')
 const [width, setWidth] = useState<Stroke['width']>(2)
 const [erase, setErase] = useState(false)
 const [message, setMessage] = useState('')
 const undo = useRef<Stroke[][]>([]), redo = useRef<Stroke[][]>([])
 const draft = useRef<SVGPathElement>(null), gesture = useRef<Gesture | null>(null), frame = useRef(0)
 function cancel() {
  gesture.current = null
  cancelAnimationFrame(frame.current)
  frame.current = 0
  draft.current?.removeAttribute('d')
 }
 function persist(next: Stroke[]) {
  setInk(next)
  window.stickee.ink(next)
  setMessage('')
 }
 function change(next: Stroke[]) {
  undo.current = [...undo.current.slice(-31), ink]
  redo.current = []
  persist(next)
 }
 function history(back: boolean) {
  const from = back ? undo : redo, to = back ? redo : undo
  const next = from.current.pop()
  if (next) { cancel(); to.current.push(ink); persist(next) }
 }
 useEffect(() => {
  if (!active) return
  const key = (e: KeyboardEvent) => {
   if (e.key === 'Escape') { e.preventDefault(); cancel(); exit() }
   if (e.ctrlKey && ['z','y'].includes(e.key.toLowerCase())) {
    e.preventDefault(); history(e.key.toLowerCase() === 'z' && !e.shiftKey)
   }
  }
  window.addEventListener('keydown', key)
  return () => window.removeEventListener('keydown', key)
 })
 useEffect(() => {
  if (!active) return
  window.addEventListener('blur', cancel)
  return () => { window.removeEventListener('blur', cancel); cancel() }
 }, [active])
 function sample(g: Gesture, event: PointerEvent) {
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(g.matrix)
  const x = Math.round(Math.max(0, Math.min(INK_WIDTH, p.x)))
  const y = Math.round(Math.max(0, Math.min(INK_HEIGHT, p.y)))
  const a = g.points
  if (a.length && Math.hypot(x-a[a.length-2], y-a[a.length-1]) < 1.5) return
  // Thin an exceptionally long continuous stroke while retaining its endpoints.
  if (a.length >= g.capacity * 2) g.points = a.filter((_, i) => i % 4 < 2)
  g.points.push(x,y)
 }
 function start(e: React.PointerEvent<SVGSVGElement>) {
  if (!active || !e.isPrimary || e.button !== 0 || gesture.current) return
  if (erase) {
   const index = (e.target as Element).getAttribute('data-stroke')
   if (index !== null) change(ink.filter((_, i) => i !== Number(index)))
   return
  }
  const capacity = Math.min(MAX_POINTS, MAX_TOTAL_POINTS - ink.reduce((n,s) => n+s.points.length/2,0))
  if (ink.length >= MAX_STROKES || capacity < 2) { setMessage('Drawing full. Erase a stroke to continue.'); return }
  const matrix = e.currentTarget.getScreenCTM()
  if (!matrix) return
  e.currentTarget.setPointerCapture(e.pointerId)
  const g = {id:e.pointerId, points:[], capacity, matrix:matrix.inverse()}
  gesture.current = g
  sample(g,e.nativeEvent)
  draft.current?.setAttribute('d',strokePath(g.points))
 }
 function move(e: React.PointerEvent<SVGSVGElement>) {
  const g = gesture.current
  if (!g || g.id !== e.pointerId) return
  for (const event of e.nativeEvent.getCoalescedEvents()) sample(g,event)
  sample(g,e.nativeEvent)
  if (!frame.current) frame.current = requestAnimationFrame(() => {
   frame.current = 0
   draft.current?.setAttribute('d',strokePath(g.points))
  })
 }
 function finish(e: React.PointerEvent<SVGSVGElement>) {
  const g = gesture.current
  if (!g || g.id !== e.pointerId) return
  sample(g,e.nativeEvent)
  cancel()
  change([...ink,{color,width,points:g.points}])
 }
 if (!active && !ink.length) return null
 return <>
  <svg className="ink-surface" data-active={active || undefined} data-erase={active && erase || undefined}
   viewBox="0 0 232 170" role="img" aria-label="Note drawing" onPointerDown={start} onPointerMove={move}
   onPointerUp={finish} onPointerCancel={e=>{if(gesture.current?.id===e.pointerId)cancel()}} onLostPointerCapture={e=>{if(gesture.current?.id===e.pointerId)cancel()}}>
   {ink.map((stroke,i)=><InkStroke key={i} index={i} stroke={stroke}/>)}
   {active && <path ref={draft} fill="none" stroke={inkColors[color]} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none"/>}
  </svg>
  {active && <div className="ink-tools" role="group" aria-label="Drawing tools">
   {(Object.keys(inkColors) as InkColor[]).map(c=><button key={c} title={c+' ink'} aria-label={c+' ink'} aria-pressed={!erase && color===c} onClick={()=>{setColor(c);setErase(false)}}><i style={{background:inkColors[c]}}/></button>)}
   <button title={'Pen width: '+width+' px. Click to change'} aria-label={'Pen width '+width} onClick={()=>{setWidth(width===2?4:width===4?6:2);setErase(false)}}><i style={{width:width+2,height:width+2,background:'currentColor'}}/></button>
   <button title="Erase a stroke" aria-label="Erase a stroke" aria-pressed={erase} onClick={()=>setErase(!erase)}><InkIcon name="eraser"/></button>
   <button title="Undo (Ctrl+Z)" aria-label="Undo drawing" disabled={!undo.current.length} onClick={()=>history(true)}><InkIcon name="undo"/></button>
   <button title="Redo (Ctrl+Y)" aria-label="Redo drawing" disabled={!redo.current.length} onClick={()=>history(false)}><InkIcon name="redo"/></button>
   <button title="Clear drawing" aria-label="Clear drawing" disabled={!ink.length} onClick={()=>change([])}><InkIcon name="clear"/></button>
  </div>}
  {active && message && <small className="ink-message" role="status">{message}</small>}
 </>
}
