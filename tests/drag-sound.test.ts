import { afterEach,expect,it,vi } from 'vitest'
import { DragSound } from '../src/renderer/src/drag-sound'
const instances:FakeContext[]=[]
class FakeContext {
 state='running';sampleRate=48000;currentTime=0;destination={}
 suspend=vi.fn(async()=>{this.state='suspended'})
 resume=vi.fn(async()=>{this.state='running'})
 close=vi.fn(async()=>{this.state='closed'})
 source={connect:()=>this.filter,start:vi.fn(),stop:vi.fn(),buffer:null,loop:false}
 filter={connect:()=>this.gain,type:'',Q:{value:0},frequency:{cancelAndHoldAtTime:vi.fn(),setTargetAtTime:vi.fn()}}
 gain={connect:()=>this.destination,gain:{value:0,cancelAndHoldAtTime:vi.fn(),setTargetAtTime:vi.fn()}}
 createBuffer=vi.fn((_channels:number,length:number)=>({getChannelData:()=>new Float32Array(length)}))
 createBufferSource=vi.fn(()=>this.source)
 createBiquadFilter=()=>this.filter
 createGain=()=>this.gain
 constructor(){instances.push(this)}
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();instances.length=0})
it('allocates one voice, suspends after quiet, and reuses it on another drag',async()=>{
 vi.useFakeTimers();vi.stubGlobal('AudioContext',FakeContext)
 const sound=new DragSound()
 expect(instances).toHaveLength(0)
 for(let i=0;i<100;i++)sound.update(900)
 const context=instances[0]
 expect(context.createBufferSource).toHaveBeenCalledTimes(1)
 expect(context.createBuffer).toHaveBeenCalledTimes(1)
 await vi.advanceTimersByTimeAsync(400)
 expect(context.state).toBe('suspended')
 sound.update(600)
 expect(context.resume).toHaveBeenCalledTimes(1)
 expect(instances).toHaveLength(1)
 sound.dispose()
 expect(context.source.stop).toHaveBeenCalledTimes(1)
 expect(context.close).toHaveBeenCalledTimes(1)
 expect(vi.getTimerCount()).toBe(0)
})
it('creates no audio resources for muted or stationary notes',()=>{
 vi.stubGlobal('AudioContext',FakeContext)
 const sound=new DragSound();sound.update(0);sound.setEnabled(false);sound.update(2000)
 expect(instances).toHaveLength(0);sound.dispose()
})
