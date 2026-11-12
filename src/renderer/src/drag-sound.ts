/** One reusable filtered-noise voice per used note. No audio work while idle. */
export class DragSound {
 private context?:AudioContext
 private source?:AudioBufferSourceNode
 private filter?:BiquadFilterNode
 private gain?:GainNode
 private quiet?:ReturnType<typeof setTimeout>
 private suspendTimer?:ReturnType<typeof setTimeout>
 private enabled=true
 setEnabled(enabled:boolean){this.enabled=enabled;if(!enabled)this.stop()}
 update(speed:number){
  if(!this.enabled||!Number.isFinite(speed))return
  const intensity=Math.min(1,Math.max(0,(speed-45)/1700))
  if(intensity===0){this.stop();return}
  if(!this.context){
   const context=new AudioContext({latencyHint:'interactive'});this.context=context
   const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.5),context.sampleRate)
   const samples=buffer.getChannelData(0)
   // Generated once, never per movement event or animation frame.
   for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.65
   this.source=context.createBufferSource();this.source.buffer=buffer;this.source.loop=true
   this.filter=context.createBiquadFilter();this.filter.type='bandpass';this.filter.Q.value=.65
   this.gain=context.createGain();this.gain.gain.value=0
   this.source.connect(this.filter).connect(this.gain).connect(context.destination);this.source.start()
  }
  clearTimeout(this.quiet);clearTimeout(this.suspendTimer)
  const context=this.context
  if(context.state==='suspended')void context.resume().catch(()=>{})
  const time=context.currentTime
  this.gain!.gain.cancelAndHoldAtTime(time)
  this.gain!.gain.setTargetAtTime(.13*Math.pow(intensity,.7),time,.045)
  this.filter!.frequency.cancelAndHoldAtTime(time)
  this.filter!.frequency.setTargetAtTime(320+intensity*1400,time,.065)
  this.quiet=setTimeout(()=>this.stop(),140)
 }
 stop(){
  clearTimeout(this.quiet);clearTimeout(this.suspendTimer)
  if(!this.context||!this.gain)return
  const context=this.context,time=context.currentTime
  this.gain.gain.cancelAndHoldAtTime(time);this.gain.gain.setTargetAtTime(0,time,.035)
  this.suspendTimer=setTimeout(()=>{if(context.state==='running')void context.suspend().catch(()=>{})},220)
 }
 dispose(){clearTimeout(this.quiet);clearTimeout(this.suspendTimer);this.source?.stop();if(this.context)void this.context.close().catch(()=>{})}
}
