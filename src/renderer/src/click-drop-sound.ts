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
 /** Clean tonal cues in the system-sound idiom: no noise, no hiss.
  *  Grab: a crisp, glassy tick (short high partials over a small wooden body).
  *  Drop: a rounded "pop" whose pitch falls as it lands, with a soft bell glint. */
 private makeBuffer(context:AudioContext,kind:'grab'|'drop'){
  const drop=kind==='drop',duration=drop?.22:.05,rate=context.sampleRate
  const buffer=context.createBuffer(1,Math.ceil(rate*duration),rate),samples=buffer.getChannelData(0)
  const tau=2*Math.PI
  let pop=0,pop2=0
  // A decaying sine partial that starts at t0 with a click-free 1 ms attack.
  const partial=(t:number,t0:number,freq:number,decay:number,gain:number)=>{const d=t-t0;return d<0?0:gain*Math.sin(tau*freq*d)*Math.exp(-d/decay)*(1-Math.exp(-d/.0009))}
  for(let i=0;i<samples.length;i++){
   const t=i/rate
   let v:number
   if(drop){
    // Pitch glides 520 -> 290 Hz in ~35 ms: the "landing" that makes a pop feel physical.
    const f=290+230*Math.exp(-t/.012)
    pop+=tau*f/rate;pop2+=tau*f*2.01/rate
    const env=Math.exp(-t/.034)*(1-Math.exp(-t/.0012))
    v=Math.sin(pop)*env*1+Math.sin(pop2)*env*.22*Math.exp(-t/.01)
    // Bell glint just after contact: slightly inharmonic partials, quiet and short.
    v+=partial(t,.008,2093,.075,.16)+partial(t,.008,3176,.04,.07)+partial(t,.008,5250,.016,.035)
   }else{
    v=partial(t,0,4300,.0016,.55)+partial(t,0,1850,.0055,.8)+partial(t,0,960,.009,.45)
   }
   samples[i]=v*Math.min(1,(duration-t)/.01)
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
