import { afterEach, expect, it, vi } from 'vitest'
import { NoteAudio } from '../src/renderer/src/note-audio'
const contexts:FakeContext[]=[]
class FakeContext{
 state='running';sampleRate=48000;destination={};sources:any[]=[]
 suspend=vi.fn(async()=>{this.state='suspended'});resume=vi.fn(async()=>{this.state='running'});close=vi.fn(async()=>{this.state='closed'})
 createBuffer=vi.fn((_channels:number,length:number)=>{const samples=new Float32Array(length);return {getChannelData:()=>samples}})
 createBufferSource=vi.fn(()=>{const source={connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null as null|(()=>void),buffer:null};this.sources.push(source);return source})
 constructor(){contexts.push(this)}
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();contexts.length=0})
it('plays one grab and drop per native gesture, caches buffers and suspends at idle',async()=>{
 vi.useFakeTimers();vi.stubGlobal('AudioContext',FakeContext)
 const sound=new NoteAudio();sound.configure(true,'click-drop')
 sound.update(1500);expect(contexts).toHaveLength(0)
 sound.drag(true);sound.drag(true);sound.drag(false);sound.drag(false)
 const context=contexts[0]
 expect(context.createBuffer).toHaveBeenCalledTimes(2);expect(context.sources).toHaveLength(2)
 for(const source of context.sources){const samples=source.buffer.getChannelData(0) as Float32Array;expect([...samples].every(Number.isFinite)).toBe(true);expect(Math.max(...samples.map(Math.abs))).toBeLessThan(.5);source.onended()}
 await vi.advanceTimersByTimeAsync(200);expect(context.state).toBe('suspended')
 sound.drag(true);expect(context.resume).toHaveBeenCalledTimes(1);expect(context.createBuffer).toHaveBeenCalledTimes(2)
 sound.dispose();expect(context.close).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0)
})
it('does not allocate while muted and cancels active cues on mute, blur or mode change',()=>{
 vi.stubGlobal('AudioContext',FakeContext)
 const sound=new NoteAudio();sound.configure(false,'click-drop');sound.drag(true);sound.drag(false)
 expect(contexts).toHaveLength(0)
 sound.configure(true,'click-drop');sound.drag(true)
 const source=contexts[0].sources[0]
 sound.configure(false,'click-drop');expect(source.stop).toHaveBeenCalledTimes(1)
 sound.drag(false);expect(contexts[0].sources).toHaveLength(1)
 sound.configure(true,'click-drop');sound.drag(true);sound.stop();sound.drag(false)
 expect(contexts[0].sources).toHaveLength(2)
 sound.configure(true,'rustle');sound.dispose()
})
