/** Two short, locally synthesized tactile cues. Buffers are reused, never looped. */
export class ClickDropSound{
 private context?:AudioContext
 private buffers?:Record<'grab'|'drop',AudioBuffer>
 private playing=new Set<AudioBufferSourceNode>()
 private timer?:ReturnType<typeof setTimeout>
 private closed=false
 play(kind:'grab'|'drop'){
  if(this.closed)return
  clearTimeout(this.timer)
  const context=this.context??=new AudioContext({latencyHint:'interactive'})
  if(!this.buffers)this.buffers={grab:this.makeBuffer(context,'grab'),drop:this.makeBuffer(context,'drop')}
  if(context.state==='suspended')void context.resume().catch(()=>{})
  const source=context.createBufferSource();source.buffer=this.buffers[kind]
  source.connect(context.destination);this.playing.add(source)
  source.onended=()=>{source.disconnect();this.playing.delete(source);if(!this.playing.size)this.timer=setTimeout(()=>{if(context.state==='running')void context.suspend().catch(()=>{})},180)}
  source.start()
 }
 /** Paper, not a beep: a pad of paper lifted, then laid down with a soft slap and a short settle. */
 private makeBuffer(context:AudioContext,kind:'grab'|'drop'){
  const drop=kind==='drop',duration=drop?.2:.095,rate=context.sampleRate
  const buffer=context.createBuffer(1,Math.ceil(rate*duration),rate),samples=buffer.getChannelData(0)
  let seed=drop?9173:4217,low=0,slow=0,phase=0
  for(let i=0;i<samples.length;i++){
   const t=i/rate
   seed=(Math.imul(seed,1664525)+1013904223)>>>0
   const noise=seed/2147483648-1
   // Band-limited noise: the difference of two one-pole filters keeps the papery 1-4 kHz band.
   low+=(drop?.34:.5+.3*Math.min(1,t/.06))*(noise-low);slow+=.07*(noise-slow)
   const band=low-slow
   let v:number
   if(drop){
    const slap=(t0:number,gain:number)=>{const d=t-t0;return d<0?0:gain*(band*Math.exp(-d/.011)*(1-Math.exp(-d/.0006)))}
    phase+=2*Math.PI*(190-80*Math.min(1,t/.05))/rate
    const thump=Math.sin(phase)*Math.exp(-t/.02)*(1-Math.exp(-t/.0007))
    const rustle=slow*Math.exp(-t/.05)*(1-Math.exp(-t/.004))
    v=thump*.26+slap(0,1.5)+slap(.034,.55)+slap(.071,.22)+rustle*.9
   }else{
    // A quick lift: a brief swell of paper noise with a soft leading tick.
    const swell=Math.min(1,t/.012)*Math.exp(-t/.032)
    v=band*swell*1.5+Math.exp(-t/.0015)*band*.5
   }
   samples[i]=v*Math.min(1,(duration-t)/.012)
  }
  // Normalise so the cue is clearly audible yet never harsh: drop is the more present cue.
  let peak=0;for(const x of samples)peak=Math.max(peak,Math.abs(x))
  const gain=peak>0?(drop?.44:.3)/peak:0
  for(let i=0;i<samples.length;i++)samples[i]*=gain
  return buffer
 }
 stop(){
  clearTimeout(this.timer)
  for(const source of this.playing){source.onended=null;source.stop();source.disconnect()}
  this.playing.clear()
  if(this.context?.state==='running')void this.context.suspend().catch(()=>{})
 }
 dispose(){this.closed=true;this.stop();if(this.context)void this.context.close().catch(()=>{})}
}
