type Cue = 'grab' | 'drop' | 'show' | 'hide'
/** Local interface cues for note gestures and visibility. Buffers are reused, never looped. */
export class ClickDropSound{
 private context?:AudioContext
 private buffers:Partial<Record<Cue,AudioBuffer>>={}
 private playing=new Set<AudioBufferSourceNode>()
 private timer?:ReturnType<typeof setTimeout>
 private closed=false
 play(kind:Cue){
  if(this.closed)return
  clearTimeout(this.timer)
  const context=this.context??=new AudioContext({latencyHint:'interactive'})
  const buffer=this.buffers[kind]??=this.makeBuffer(context,kind)
  if(context.state==='suspended')void context.resume().catch(()=>{})
  const source=context.createBufferSource();source.buffer=buffer
  source.connect(context.destination);this.playing.add(source)
  source.onended=()=>{source.disconnect();this.playing.delete(source);if(!this.playing.size)this.timer=setTimeout(()=>{if(context.state==='running')void context.suspend().catch(()=>{})},180)}
  source.start()
 }
 private makeBuffer(context:AudioContext,kind:Cue){
  const rate=context.sampleRate
  const visibility=kind==='show'||kind==='hide'
  const duration={grab:.062,drop:.075,show:.18,hide:.15}[kind]
  const buffer=context.createBuffer(1,Math.round(rate*duration),rate)
  const samples=buffer.getChannelData(0)
  if(visibility){
   // A soft band of moving air. Crossfade two filtered noise bands through
   // a rounded envelope so the transition has no struck attack or bass hit.
   let seed=7813,low=0,mid=0,high=0
   const coefficient=(hz:number)=>1-Math.exp(-2*Math.PI*hz/rate)
   const a=coefficient(650),b=coefficient(1350),c=coefficient(2800)
   for(let i=0;i<samples.length;i++){
    const progress=i/(samples.length-1)
    const open=kind==='show'?progress:1-progress
    seed=(Math.imul(seed,1664525)+1013904223)>>>0
    const noise=seed/2147483648-1
    low+=a*(noise-low);mid+=b*(noise-mid);high+=c*(noise-high)
    const air=(mid-low)*(1-open)+(high-mid)*open
    samples[i]=air*Math.sin(Math.PI*progress)**2*(kind==='show'?.32:.26)
   }
  }else{
   // Stable pitches and a soft crossfade give the two gestures a related voice.
   const grab=kind==='grab'
   const pitches=grab?[698.46,880]:[659.25,523.25]
   for(let i=0;i<samples.length;i++){
    const t=i/rate,progress=i/(samples.length-1)
    const mix=.16+.62*progress
    const tone=(1-mix)*Math.sin(2*Math.PI*pitches[0]*t)+mix*Math.sin(2*Math.PI*pitches[1]*t)
    const envelope=Math.sin(Math.PI*progress)**2*(1-.42*progress)
    samples[i]=tone*envelope*(grab?.15:.12)
   }
  }
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
