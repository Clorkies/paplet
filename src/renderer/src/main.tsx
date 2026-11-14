import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Config, Mode } from '../../shared/api'
import { COLORS, PALETTE, type PaperColor } from '../../shared/palette'
import { REST, REST_GRAB, reach, sheetShape, type Pose } from '../../shared/sheet'
import { createFlow, flowActive, flowPose, stepFlow } from '../../shared/flow'
import { settleAngle, springStep } from '../../shared/motion'
import './paper.css'
import { NoteAudio } from './note-audio'
function App(){
 const [config,setConfig]=useState<Config>(),[count,setCount]=useState(0),[point,setPoint]=useState(''),[debug,setDebug]=useState(false),[color,setColor]=useState<PaperColor>('yellow'),[picking,setPicking]=useState(false)
 const paper=useRef<HTMLDivElement>(null),active=useRef(false)
 const surface=useRef<SVGPathElement>(null),shade=useRef<SVGPathElement>(null),bendLight=useRef<SVGLinearGradientElement>(null),curl=useRef<SVGGElement>(null),content=useRef<HTMLDivElement>(null)
 const editor=useRef<HTMLTextAreaElement>(null)
 const restoreColorFocus=useRef(false)
 const [located,setLocated]=useState(false)
 // Locate feedback is independent of the approved paper dynamics and editor focus.
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  const off=window.stickee.onLocate(()=>{clearTimeout(timer);setLocated(true);timer=setTimeout(()=>setLocated(false),1800)})
  return()=>{off();clearTimeout(timer)}
 },[])

 const [overflow,setOverflow]=useState({above:false,below:false})
 const checkOverflow=()=>{const el=editor.current;if(el)setOverflow({above:el.scrollTop>2,below:el.scrollHeight-el.clientHeight-el.scrollTop>2})}
 useEffect(()=>{if(!config||!editor.current)return;checkOverflow();const observer=new ResizeObserver(checkOverflow);observer.observe(editor.current);return()=>observer.disconnect()},[!config])
 const sound=useRef<NoteAudio|null>(null)
 useEffect(()=>{
  const voice=new NoteAudio();sound.current=voice
  const offMotion=window.stickee.onMotion(({vx,vy})=>{try{voice.update(Math.hypot(vx,vy))}catch{voice.stop()}})
  const offDrag=window.stickee.onDragState(dragging=>{if(dragging)setPicking(false);try{voice.drag(dragging)}catch{voice.stop()}})
  // Colour and the sound preference are owned by the main process; it also
  // changes them from the context and tray menus.
  const offState=window.stickee.onState(state=>{setColor(state.color);voice.configure(state.sound,state.soundStyle)})
  const stop=()=>{voice.stop();setPicking(false)};window.addEventListener('blur',stop)
  return()=>{offMotion();offDrag();offState();window.removeEventListener('blur',stop);voice.dispose();sound.current=null}
 },[])
 const stopEditing=()=>{editor.current?.blur();paper.current?.focus({preventScroll:true})}
 const animation=useRef<Animation|null>(null)
 const curlSide:'left'|'right'=config?.curlSide??'right'
 useEffect(()=>{
  if(!config)return
  const flow=createFlow(),input={vx:0,vy:0,droop:0}
  let nativeDragging=false,moving=false,frame=0,last=0
  let side=curlSide,curlPhase=curlSide==='right'?1:-1,curlTarget=curlPhase
  let orientation=config.angle,orientationTarget=config.angle,angularVelocity=0
  // The pivot glides to a new pinch point so regrabbing a settling note is continuous.
  let grabX=REST_GRAB.x,grabY=REST_GRAB.y,pinchX=grabX,pinchY=grabY
  let quiet:ReturnType<typeof setTimeout>|undefined
  const reduced=matchMedia('(prefers-reduced-motion: reduce)')
  const draw=(pose:Pose,amount:number)=>{
   const shape=sheetShape(pose,side,amount)
   surface.current?.setAttribute('d',shape.path)
   shade.current?.setAttribute('d',shape.path)
   shade.current?.setAttribute('opacity',shape.bend.toFixed(3))
   curl.current?.setAttribute('transform',shape.curlTransform)
   // Light falls across the bend, running from the pinch toward the free end.
   const length=Math.hypot(180-pose.grabX,200-pose.grabY)||1,span=reach(pose.grabX,pose.grabY)
   const light=bendLight.current
   if(light){light.setAttribute('x1',pose.grabX.toFixed(1));light.setAttribute('y1',pose.grabY.toFixed(1));light.setAttribute('x2',(pose.grabX+(180-pose.grabX)/length*span).toFixed(1));light.setAttribute('y2',(pose.grabY+(200-pose.grabY)/length*span).toFixed(1))}
   // An untransformed text block at rest keeps glyph rendering crisp.
   if(content.current)content.current.style.transform=pose.mid||pose.tail||pose.stretch?shape.contentTransform:''
   paper.current?.style.setProperty('--lift',shape.bend.toFixed(3))
  }
  const tick=(time:number)=>{
   const elapsed=Math.min(.05,Math.max(0,(time-(last||time-16))/1000))
   last=time
   stepFlow(flow,input,elapsed)
   const glide=1-Math.exp(-elapsed/.05)
   grabX+=(pinchX-grabX)*glide;grabY+=(pinchY-grabY)*glide
   const angular=springStep({position:orientation,velocity:angularVelocity},orientationTarget,elapsed,15,.85)
   orientation=angular.position;angularVelocity=angular.velocity
   // Unroll to a flat corner before rolling up the other side. Signed
   // progress preserves continuity when the user reverses mid-transition.
   const difference=curlTarget-curlPhase
   curlPhase+=Math.sign(difference)*Math.min(Math.abs(difference),elapsed*3)
   side=curlPhase>=0?'right':'left'
   paper.current?.setAttribute('data-curl-side',side)
   const progress=Math.abs(curlPhase)
   draw({...flowPose(flow),grabX,grabY},progress*progress*(3-2*progress))
   if(paper.current)paper.current.style.transform=`rotate(${orientation}deg)`
   const awake=moving||flowActive(flow,input.droop)||Math.abs(curlTarget-curlPhase)>.001||Math.abs(orientationTarget-orientation)+Math.abs(angularVelocity)>.015||Math.abs(pinchX-grabX)+Math.abs(pinchY-grabY)>.2
   if(awake)frame=requestAnimationFrame(tick)
   else{
    frame=0;last=0
    // Residual motion is below a tenth of a pixel: land exactly on the rest shape.
    if(input.droop===0){flow.mid=flow.tail=flow.lift=flow.midV=flow.tailV=flow.liftV=0;draw({mid:0,tail:0,stretch:0,grabX,grabY},progress*progress*(3-2*progress))}
    if(!nativeDragging)paper.current?.removeAttribute('data-dragging')
   }
  }
  const wake=()=>{if(!frame)frame=requestAnimationFrame(tick)}
  // Window stopped: momentum carries the paper forward, then it settles.
  // While still pinched off-centre the sheet keeps hanging toward its weight.
  const release=()=>{moving=false;input.vx=0;input.vy=0;if(!nativeDragging)input.droop=0;wake()}
  const offMotion=window.stickee.onMotion(motion=>{
   orientationTarget=motion.angle
   curlTarget=motion.curlSide==='right'?1:-1
   if(reduced.matches){
    paper.current?.setAttribute('data-curl-side',motion.curlSide)
    curlPhase=curlTarget;side=motion.curlSide;orientation=orientationTarget
    draw(REST,1)
    paper.current!.style.transform=`rotate(${orientation}deg)`;return
   }
   // Cursor position in the sheet's own (tilted) coordinates.
   const a=-orientation*Math.PI/180,rx=motion.grabX-180,ry=motion.grabY-180
   pinchX=Math.max(40,Math.min(320,180+rx*Math.cos(a)-ry*Math.sin(a)))
   pinchY=Math.max(40,Math.min(110,180+rx*Math.sin(a)+ry*Math.cos(a)))
   if(!moving&&!flowActive(flow,input.droop)){grabX=pinchX;grabY=pinchY}
   moving=true;input.vx=motion.vx;input.vy=motion.vy
   // Pinched off-centre, the sheet's weight swings it slightly under the fingers.
   input.droop=7*Math.max(-1,Math.min(1,(pinchX-180)/140))
   clearTimeout(quiet);quiet=setTimeout(release,130);wake()
  })
  const offDrag=window.stickee.onDragState(dragging=>{
   nativeDragging=dragging
   if(dragging){stopEditing();paper.current?.setAttribute('data-dragging','true')}
   else if(reduced.matches)paper.current?.removeAttribute('data-dragging')
   else release()
  })
  const offSettle=window.stickee.onSettle(release)
  return()=>{offMotion();offSettle();offDrag();cancelAnimationFrame(frame);clearTimeout(quiet)}
 },[config?.angle,config?.curlSide])
 useEffect(()=>{window.stickee.config().then(initial=>{setColor(initial.color);sound.current?.configure(initial.sound,initial.soundStyle);setConfig(initial)})},[])
 useEffect(()=>{if(config)window.stickee.ready()},[!!config])
 useEffect(()=>{const stop=()=>{active.current=false;window.stickee.drag('end')};window.addEventListener('blur',stop);return()=>window.removeEventListener('blur',stop)},[])
 if(new URLSearchParams(location.search).has('panel'))return <main className="panel" onPointerDown={e=>{setCount(c=>c+1);setPoint(`${e.clientX}, ${e.clientY}`)}}><small>STICKEE / NATIVE WINDOW LAB</small><h1>Paper above.<br/>Desktop below.</h1><p>Click through the transparent corners of either note.<br/>This counter must advance when the background receives input.</p><output>{count} background presses</output><p>Last position: {point||'—'}</p><p>Move notes over this grid, then over Notepad. Close this window to quit.<br/>Notes are temporary: text is discarded on exit.</p><button onClick={()=>window.stickee.quit()}>Quit prototype</button></main>
 if(!config)return null
 const rest=sheetShape(REST,curlSide),tone=PALETTE[color]
 const closePicker=()=>{restoreColorFocus.current=true;setPicking(false)}
 const choose=(next:PaperColor)=>{setColor(next);window.stickee.color(next);closePicker()}
 const refresh=async(mode:Mode,nativeDrag:boolean)=>{try{await window.stickee.experiment(mode,nativeDrag);setConfig(await window.stickee.config())}catch(error){setConfig({...config,status:String(error)})}}
 const stop=()=>{if(!active.current)return;active.current=false;paper.current?.removeAttribute('data-dragging');window.stickee.drag('end');const element=paper.current;if(!element)return;const current=Number.parseFloat(element.style.transform.slice(7))||config.angle;element.style.transform=`rotate(${config.angle}deg)`;animation.current?.cancel();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)animation.current=element.animate(Array.from({length:31},(_,i)=>({transform:`rotate(${config.angle+settleAngle(current-config.angle,i/60)}deg)`})),{duration:500,easing:'linear'})}
 return <div className={debug?'bounds':''}><div ref={paper} tabIndex={-1} className="paper" data-located={located?'true':undefined} data-curl-side={curlSide} style={{transform:`rotate(${config.angle}deg)`,'--paper-a':tone.top,'--paper-b':tone.bottom,'--curl-a':tone.curlLight,'--curl-b':tone.curlMid,'--curl-c':tone.curlDark,'--ink':tone.ink} as React.CSSProperties}>
 <svg className="sheet" viewBox="0 0 360 360" aria-hidden="true"><defs><linearGradient id="paper" x2=".2" y2="1"><stop style={{stopColor:'var(--paper-a)'}}/><stop offset="1" style={{stopColor:'var(--paper-b)'}}/></linearGradient><linearGradient id="curl" gradientUnits="userSpaceOnUse" x1="283" y1="270" x2="305" y2="302"><stop style={{stopColor:'var(--curl-a)'}}/><stop offset=".48" style={{stopColor:'var(--curl-b)'}}/><stop offset=".75" style={{stopColor:'var(--curl-c)'}}/><stop offset="1" style={{stopColor:'var(--curl-a)'}}/></linearGradient><linearGradient ref={bendLight} id="bend" gradientUnits="userSpaceOnUse" x1="180" y1="65" x2="180" y2="330"><stop stopColor="#3a2a10" stopOpacity="0"/><stop offset=".3" stopColor="#3a2a10" stopOpacity=".07"/><stop offset=".6" stopColor="#fffdf2" stopOpacity=".2"/><stop offset=".88" stopColor="#3a2a10" stopOpacity=".06"/><stop offset="1" stopColor="#3a2a10" stopOpacity="0"/></linearGradient><filter id="curlShadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4"/></filter><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="3" stdDeviation="2.5" floodOpacity=".24"/></filter></defs><path id="paper-surface" ref={surface} d={rest.path} fill="url(#paper)" filter="url(#shadow)"/><path ref={shade} d={rest.path} fill="url(#bend)" opacity="0"/><g ref={curl} transform={rest.curlTransform}><path d="M255 320 Q285 309 320 265 Q312 297 269 320 Z" fill="#57462f" opacity=".24" filter="url(#curlShadow)"/><path d="M255 320 C282 312 305 283 320 265 C307 274 295 265 285 254 C282 282 271 305 255 320 Z" fill="url(#curl)"/><path d="M255 320 C282 312 305 283 320 265" fill="none" style={{stroke:'var(--curl-a)'}} strokeWidth=".7" opacity=".7"/></g></svg>
 <div className={config.nativeDrag?'grab native':'grab'} onPointerDown={e=>{if(e.button!==0||config.nativeDrag)return;stopEditing();animation.current?.cancel();active.current=true;paper.current?.setAttribute('data-dragging','true');e.currentTarget.setPointerCapture(e.pointerId);window.stickee.drag('start')}} onPointerMove={e=>{if(active.current&&!matchMedia('(prefers-reduced-motion: reduce)').matches)paper.current!.style.transform=`rotate(${config.angle+Math.max(-.65,Math.min(.65,e.movementX*.1))}deg)`}} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}><span className="grip" aria-hidden="true"/></div>
 <div ref={content} className="content"><div className="editor-wrap"><textarea ref={editor} onInput={e=>{checkOverflow();window.stickee.text(e.currentTarget.value)}} onBlur={e=>window.stickee.text(e.currentTarget.value,true)} onScroll={checkOverflow} onKeyUp={checkOverflow} aria-describedby="scroll-hint" aria-label="Note text" spellCheck={false} defaultValue={config.text} placeholder="Keep a thought here..." maxLength={1000000}/><span className={`scroll-cue above ${overflow.above?'visible':''}`} aria-hidden="true"/><span className={`scroll-cue below ${overflow.below?'visible':''}`} aria-hidden="true"/><span id="scroll-hint" className="sr-only">{overflow.above||overflow.below?'More text available. Scroll or use arrow keys to read.':''}</span></div>
 <div className="note-actions" onKeyDown={e=>{if(e.key==='Escape'&&picking){e.preventDefault();e.stopPropagation();closePicker()}}}>{picking
  ?<div className="swatches" role="radiogroup" aria-label="Paper color" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPicking(false)}}>{COLORS.map(option=><button key={option} role="radio" tabIndex={option===color?0:-1} aria-checked={option===color} onKeyDown={e=>{const delta=['ArrowRight','ArrowDown'].includes(e.key)?1:['ArrowLeft','ArrowUp'].includes(e.key)?-1:0;if(!delta)return;e.preventDefault();const next=COLORS[(COLORS.indexOf(option)+delta+COLORS.length)%COLORS.length];setColor(next);window.stickee.color(next);const buttons=e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');buttons?.[COLORS.indexOf(next)].focus()}} aria-label={PALETTE[option].label} title={PALETTE[option].label} className="swatch" style={{'--swatch':PALETTE[option].top} as React.CSSProperties} autoFocus={option===color} onClick={()=>choose(option)}/>)}</div>
  :<><button onClick={()=>window.stickee.create()} title="New note (Ctrl+Alt+N)">New</button><button onClick={()=>window.stickee.hide()} title="Hide note; restore from the tray">Hide</button><button className="swatch current" ref={button=>{if(button&&restoreColorFocus.current){restoreColorFocus.current=false;button.focus({preventScroll:true})}}} aria-label={`Paper color: ${tone.label}. Change`} title="Paper color" onClick={()=>setPicking(true)}/></>}</div>
 {config.diagnostics&&<button className="lab" onClick={()=>setDebug(!debug)} aria-expanded={debug}>Diagnostics · {config.mode}</button>}
 {config.diagnostics&&debug&&<div className="experiments"><select aria-label="Hit testing" value={config.mode} onChange={e=>refresh(e.target.value as Mode,config.nativeDrag)}><option value="shape">Shape + 10 DIP shadow</option><option value="tight">Tight shape (clips shadow)</option><option value="ignore">Whole-window ignore polling</option></select><label><input type="checkbox" checked={config.nativeDrag} onChange={e=>refresh(config.mode,e.target.checked)}/> OS native drag comparison</label><small>{config.status}</small></div>}
 </div></div></div>
}
createRoot(document.getElementById('root')!).render(<App/> )

