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
 private makeBuffer(context:AudioContext,kind:'grab'|'drop'){
  const duration=kind==='grab'?.075:.17,buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),samples=buffer.getChannelData(0)
  let seed=4217,phase=0,softNoise=0
  for(let i=0;i<samples.length;i++){
   const t=i/context.sampleRate,drop=kind==='drop',attack=1-Math.exp(-t/.0008)
   seed=(Math.imul(seed,1664525)+1013904223)>>>0
   const noise=seed/2147483648-1;softNoise+=.2*(noise-softNoise)
   phase+=2*Math.PI*(drop?82+85*Math.exp(-t/ .014):350+900*Math.exp(-t/.004))/context.sampleRate
   const body=Math.sin(phase)*Math.exp(-t/(drop?.031:.012))
   const overtone=Math.sin(phase*(drop?2.38:1.71))*Math.exp(-t/.009)
   const tick=(drop?softNoise:noise)*Math.exp(-t/(drop?.008:.002))
   samples[i]=attack*(body*(drop?.28:.15)+overtone*.055+tick*.11)*Math.min(1,(duration-t)/.008)
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
