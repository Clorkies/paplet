import { expect, it, vi } from 'vitest'
import { centeredNote, exitSample, presentNote } from '../src/main/visibility'

it('waits for rendered content and opens once across concurrent requests',async()=>{
 let ready!:()=>void,visible=false,focused=false
 const view={ready:new Promise<void>(resolve=>ready=resolve),destroyed:()=>false,visible:()=>visible,focused:()=>focused,entering:()=>false,interruptExit:()=>undefined,entrance:vi.fn(),show:vi.fn((focus:boolean)=>{visible=true;focused=focus}),focus:vi.fn(()=>focused=true)}
 const first=presentNote(view,true,true),second=presentNote(view,true,true)
 expect(view.show).not.toHaveBeenCalled();expect(view.entrance).not.toHaveBeenCalled()
 ready();await Promise.all([first,second])
 expect(view.entrance).toHaveBeenCalledTimes(1);expect(view.show).toHaveBeenCalledTimes(1)
 expect(view.focus).not.toHaveBeenCalled()
 await presentNote(view,true,true)
 expect(view.show).toHaveBeenCalledTimes(1);expect(view.entrance).toHaveBeenCalledTimes(1)
})
it('resumes an interrupted exit without hiding or flashing at the destination',async()=>{
 const resume={y:800,opacity:.4},entrance=vi.fn(),show=vi.fn()
 await presentNote({ready:Promise.resolve(),destroyed:()=>false,visible:()=>true,focused:()=>true,entering:()=>false,interruptExit:()=>resume,entrance,show,focus:vi.fn()},true,true)
 expect(entrance).toHaveBeenCalledWith(resume);expect(show).not.toHaveBeenCalled()
})
it('does not show destroyed windows or replay an entrance already in progress',async()=>{
 const show=vi.fn(),entrance=vi.fn(),view={ready:Promise.resolve(),destroyed:()=>true,visible:()=>false,focused:()=>false,entering:()=>true,interruptExit:()=>undefined,entrance,show,focus:vi.fn()}
 await expect(presentNote(view,false,true)).rejects.toThrow('closed')
 expect(show).not.toHaveBeenCalled()
 view.destroyed=()=>false
 await presentNote(view,false,true)
 expect(entrance).not.toHaveBeenCalled();expect(show).toHaveBeenCalledWith(false)
})
it('keeps downward exit samples bounded with a complete fade, including negative display coordinates',()=>{
 let previous=-700
 for(let time=0;time<=280;time+=7){const sample=exitSample(-700,-20,time);expect(sample.y).toBeGreaterThanOrEqual(previous);expect(sample.y).toBeLessThanOrEqual(-20);expect(sample.opacity).toBeGreaterThanOrEqual(0);expect(sample.opacity).toBeLessThanOrEqual(1);previous=sample.y}
 expect(exitSample(-700,-20,500)).toMatchObject({y:-20,opacity:0,done:true})
 expect(exitSample(-700,-20,0)).toMatchObject({y:-700,opacity:1,done:false})
})
it('centers manager-created notes within usable display bounds',()=>{
 expect(centeredNote({x:-1920,y:40,width:1920,height:1040})).toEqual({x:-1140,y:380})
 expect(centeredNote({x:0,y:0,width:300,height:280})).toEqual({x:0,y:0})
})
