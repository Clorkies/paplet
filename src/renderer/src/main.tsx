import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Config, Mode } from '../../shared/api'
import { paperSurface } from '../../shared/paper'
import { settleAngle, springStep, speedTilt } from '../../shared/motion'
import './paper.css'
function App(){
 const [config,setConfig]=useState<Config>(),[count,setCount]=useState(0),[point,setPoint]=useState(''),[debug,setDebug]=useState(false)
 const paper=useRef<HTMLDivElement>(null),active=useRef(false)
 const surface=useRef<SVGPathElement>(null),curl=useRef<SVGGElement>(null),content=useRef<HTMLDivElement>(null)
 const editor=useRef<HTMLTextAreaElement>(null)
 const [overflow,setOverflow]=useState({above:false,below:false})
 const checkOverflow=()=>{const el=editor.current;if(el)setOverflow({above:el.scrollTop>2,below:el.scrollHeight-el.clientHeight-el.scrollTop>2})}
 useEffect(()=>{if(!config||!editor.current)return;checkOverflow();const observer=new ResizeObserver(checkOverflow);observer.observe(editor.current);return()=>observer.disconnect()},[config?.note])
 const animation=useRef<Animation|null>(null)
 const curlSide:'left'|'right'=config?.curlSide??'right'
 useEffect(()=>{
  if(!config)return
  let nativeDragging=false,swing={position:0,velocity:0},swingTarget=0
  let midX={position:0,velocity:0},midY={position:0,velocity:0},tailX={position:0,velocity:0},tailY={position:0,velocity:0}
  let side=curlSide,curlPhase=curlSide==='right'?1:-1,curlTarget=curlPhase,orientation=config.angle,orientationTarget=config.angle,angularVelocity=0
  let frame=0,last=0,x=0,y=0,vx=0,vy=0,tx=0,ty=0,grabX=180,grabY=65,moving=false
  let quiet:ReturnType<typeof setTimeout>|undefined
  const reduced=matchMedia('(prefers-reduced-motion: reduce)')
  const tick=(time:number)=>{
   const elapsed=(time-(last||time-16))/1000
   last=time
   midX=springStep(midX,tx,elapsed,19,.78);midY=springStep(midY,ty,elapsed,21,.8)
   tailX=springStep(tailX,midX.position,elapsed,12,.63);tailY=springStep(tailY,midY.position,elapsed,14,.68)
   swing=springStep(swing,swingTarget,elapsed,16,.68)
   x=tailX.position;y=tailY.position;vx=tailX.velocity;vy=tailY.velocity
   const angular=springStep({position:orientation,velocity:angularVelocity},orientationTarget,elapsed,15,.85)
   orientation=angular.position;angularVelocity=angular.velocity
   // Unroll to a flat corner before rolling up the other side. Signed
   // progress preserves continuity when the user reverses mid-transition.
   const difference=curlTarget-curlPhase
   curlPhase+=Math.sign(difference)*Math.min(Math.abs(difference),Math.min(elapsed,.1)*3)
   side=curlPhase>=0?'right':'left'
   paper.current?.setAttribute('data-curl-side',side)
   const progress=Math.abs(curlPhase)
   const amount=progress*progress*(3-2*progress)
   const shape=paperSurface(x,y,grabX,grabY,side,amount,midX.position,midY.position)
   surface.current?.setAttribute('d',shape.path)
   curl.current?.setAttribute('transform',shape.curlTransform)
   if(content.current){content.current.style.transformOrigin=`${grabX-64}px ${grabY-53}px`;content.current.style.transform=`skewX(${midX.position*.07}deg) rotate(${midX.position*.025}deg)`}
   if(paper.current){paper.current.style.setProperty('--lift',String(Math.min(1,Math.abs(x)/5+Math.abs(y)/5)));paper.current.style.transform=`rotate(${orientation+Math.max(-7,Math.min(7,swing.position))-x*.065}deg)`}
   if(moving||Math.abs(swing.position)+Math.abs(swing.velocity)>.015||Math.abs(curlTarget-curlPhase)>.001||Math.abs(midX.velocity)+Math.abs(midY.velocity)+Math.abs(midX.position)+Math.abs(midY.position)+Math.abs(x)+Math.abs(y)+Math.abs(vx)+Math.abs(vy)+Math.abs(orientationTarget-orientation)+Math.abs(angularVelocity)>.015)frame=requestAnimationFrame(tick)
   else{frame=0;last=0;if(!nativeDragging)paper.current?.removeAttribute('data-dragging')}
  }
  const wake=()=>{if(!frame)frame=requestAnimationFrame(tick)}
  const release=()=>{moving=false;tx=0;ty=0;swingTarget=0;wake()}
  const offMotion=window.stickee.onMotion(motion=>{
   orientationTarget=motion.angle
   curlTarget=motion.curlSide==='right'?1:-1
   if(reduced.matches){
    paper.current?.setAttribute('data-curl-side',motion.curlSide)
    curlPhase=curlTarget;side=motion.curlSide;orientation=orientationTarget
    const shape=paperSurface(0,0,motion.grabX,motion.grabY,side)
    surface.current?.setAttribute('d',shape.path);curl.current?.setAttribute('transform',shape.curlTransform)
    paper.current!.style.transform=`rotate(${orientation}deg)`;return
   }
   grabX=motion.grabX;grabY=motion.grabY;moving=true
   swingTarget=speedTilt(motion.dx*62.5)
   tx=-8*Math.tanh(motion.dx/9);ty=-6*Math.tanh(motion.dy/10)
   clearTimeout(quiet);quiet=setTimeout(release,130);wake()
  })
  const offDrag=window.stickee.onDragState(dragging=>{
   nativeDragging=dragging
   if(dragging)paper.current?.setAttribute('data-dragging','true')
   else if(reduced.matches)paper.current?.removeAttribute('data-dragging')
   else release()
  })
  const offSettle=window.stickee.onSettle(release)
  return()=>{offMotion();offSettle();offDrag();cancelAnimationFrame(frame);clearTimeout(quiet)}
 },[config?.angle,config?.curlSide])
 useEffect(()=>{window.stickee.config().then(setConfig)},[])
 useEffect(()=>{if(config)editor.current?.focus()},[config?.note])
 useEffect(()=>{const stop=()=>{active.current=false;window.stickee.drag('end')};window.addEventListener('blur',stop);return()=>window.removeEventListener('blur',stop)},[])
 if(new URLSearchParams(location.search).has('panel'))return <main className="panel" onPointerDown={e=>{setCount(c=>c+1);setPoint(`${e.clientX}, ${e.clientY}`)}}><small>STICKEE / NATIVE WINDOW LAB</small><h1>Paper above.<br/>Desktop below.</h1><p>Click through the transparent corners of either note.<br/>This counter must advance when the background receives input.</p><output>{count} background presses</output><p>Last position: {point||'—'}</p><p>Move notes over this grid, then over Notepad. Close this window to quit.<br/>Notes are temporary: text is discarded on exit.</p><button onClick={()=>window.stickee.quit()}>Quit prototype</button></main>
 if(!config)return null
 const refresh=async(mode:Mode,nativeDrag:boolean)=>{try{await window.stickee.experiment(mode,nativeDrag);setConfig(await window.stickee.config())}catch(error){setConfig({...config,status:String(error)})}}
 const stop=()=>{if(!active.current)return;active.current=false;paper.current?.removeAttribute('data-dragging');window.stickee.drag('end');const element=paper.current;if(!element)return;const current=Number.parseFloat(element.style.transform.slice(7))||config.angle;element.style.transform=`rotate(${config.angle}deg)`;animation.current?.cancel();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)animation.current=element.animate(Array.from({length:31},(_,i)=>({transform:`rotate(${config.angle+settleAngle(current-config.angle,i/60)}deg)`})),{duration:500,easing:'linear'})}
 return <div className={debug?'bounds':''}><div ref={paper} className={`paper color-${config.note}`} data-curl-side={curlSide} style={{transform:`rotate(${config.angle}deg)`}}>
 <svg className="sheet" viewBox="0 0 360 360" aria-hidden="true"><defs><linearGradient id="paper" x2=".2" y2="1"><stop stopColor={config.note?'#f8d8bd':'#fff0a6'}/><stop offset="1" stopColor={config.note?'#edc5a6':'#efda82'}/></linearGradient><linearGradient id="curl" gradientUnits="userSpaceOnUse" x1="283" y1="270" x2="305" y2="302"><stop stopColor={config.note?'#fff0df':'#fff8d1'}/><stop offset=".48" stopColor={config.note?'#ead0b7':'#e4d39b'}/><stop offset=".75" stopColor={config.note?'#bca08a':'#ac9b6e'}/><stop offset="1" stopColor="#fff7df"/></linearGradient><filter id="curlShadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4"/></filter><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="3" stdDeviation="2.5" floodOpacity=".24"/></filter></defs><path ref={surface} d={paperSurface(0,0,180,65,curlSide).path} fill="url(#paper)" filter="url(#shadow)"/><g ref={curl} transform={paperSurface(0,0,180,65,curlSide).curlTransform}><path d="M255 320 Q285 309 320 265 Q312 297 269 320 Z" fill="#57462f" opacity=".24" filter="url(#curlShadow)"/><path d="M255 320 C282 312 305 283 320 265 C307 274 295 265 285 254 C282 282 271 305 255 320 Z" fill="url(#curl)"/><path d="M255 320 C282 312 305 283 320 265" fill="none" stroke="#fff9dc" strokeWidth=".7" opacity=".7"/></g></svg>
 <div ref={content} className="content"><div className={config.nativeDrag?'grab native':'grab'} onPointerDown={e=>{if(e.button!==0||config.nativeDrag)return;animation.current?.cancel();active.current=true;paper.current?.setAttribute('data-dragging','true');e.currentTarget.setPointerCapture(e.pointerId);window.stickee.drag('start')}} onPointerMove={e=>{if(active.current&&!matchMedia('(prefers-reduced-motion: reduce)').matches)paper.current!.style.transform=`rotate(${config.angle+Math.max(-.65,Math.min(.65,e.movementX*.1))}deg)`}} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} title="Drag paper here"><span className="grip" aria-hidden="true"/></div>
 <div className="editor-wrap"><textarea ref={editor} onInput={e=>{checkOverflow();window.stickee.text(e.currentTarget.value)}} onBlur={e=>window.stickee.text(e.currentTarget.value,true)} onScroll={checkOverflow} onKeyUp={checkOverflow} aria-describedby="scroll-hint" aria-label={`Note ${config.note+1}`} spellCheck={false} defaultValue={config.text} placeholder="Keep a thought here..." maxLength={1000000}/><span className={`scroll-cue above ${overflow.above?'visible':''}`} aria-hidden="true"/><span className={`scroll-cue below ${overflow.below?'visible':''}`} aria-hidden="true"/><span id="scroll-hint" className="sr-only">{overflow.above||overflow.below?'More text available. Scroll or use arrow keys to read.':''}</span></div>
 <div className="note-actions"><button onClick={()=>window.stickee.create()} title="New note (Ctrl+Alt+N)">New</button><button onClick={()=>window.stickee.hide()} title="Hide note; restore from tray">Hide</button></div><button className="lab" onClick={()=>setDebug(!debug)} aria-expanded={debug}>Phase 0 · {config.mode} · experiments</button>
 {debug&&<div className="experiments"><select aria-label="Hit testing" value={config.mode} onChange={e=>refresh(e.target.value as Mode,config.nativeDrag)}><option value="shape">Shape + 10 DIP shadow</option><option value="tight">Tight shape (clips shadow)</option><option value="ignore">Whole-window ignore polling</option></select><label><input type="checkbox" checked={config.nativeDrag} onChange={e=>refresh(config.mode,e.target.checked)}/> OS native drag comparison</label><small>{config.status}</small></div>}
 </div></div></div>
}
createRoot(document.getElementById('root')!).render(<App/> )

