import { expect, it } from 'vitest'
import { applyBatch, batchTargets } from '../src/main/batch'
import { emptyData, parseData } from '../src/main/store'
function setup(){const data=emptyData();data.notes=['a','b','c'].map((id,index)=>({id,text:`Note ${id} 日本語`,color:'mint',hidden:index===1,x:index*100,y:20,angle:0}));return data}
it('trashes a complete selection in one save and restores its original content across reload',()=>{
 const data=setup(),original=structuredClone(data.notes);let writes=0
 applyBatch(data,['b','a'],'trash',()=>{writes++;return true},100)
 expect(writes).toBe(1);expect(data.notes[2]).toEqual(original[2])
 const restarted=parseData(JSON.stringify(data))
 applyBatch(restarted,['b','a'],'restore',()=>true)
 expect(restarted.notes).toEqual(original.map(n=>({...n,hidden:false})))
})
it('rolls back every mutation while preserving native windows’ record references',()=>{
 for(const operation of ['show','hide','trash'] as const){
  const data=setup(),original=structuredClone(data),references=[...data.notes]
  expect(()=>applyBatch(data,['a','b'],operation,()=>false)).toThrow('Nothing was changed')
  expect(data).toEqual(original);expect(data.notes[0]).toBe(references[0]);expect(data.notes[1]).toBe(references[1])
 }
 const data=setup();applyBatch(data,['a','b'],'trash',()=>true,100)
 const before=structuredClone(data),array=data.notes
 expect(()=>applyBatch(data,['a','b'],'restore',()=>{throw new Error('Disk full')})).toThrow('Disk full')
 expect(data).toEqual(before)
 expect(()=>applyBatch(data,['a','b'],'delete-forever',()=>false)).toThrow()
 expect(data).toEqual(before);expect(data.notes).toBe(array)
})
it('validates the entire batch before any save or mutation',()=>{
 const data=setup(),original=structuredClone(data)
 for(const ids of [[],['a','a'],['a','missing'],[1],null,Array.from({length:1001},(_,i)=>String(i))])expect(()=>batchTargets(data,ids,'trash')).toThrow()
 expect(()=>applyBatch(data,['a','b'],'restore',()=>{throw new Error('Unexpected save')})).toThrow('changed')
 expect(()=>batchTargets(data,['a'],'arbitrary')).toThrow('Invalid')
 expect(data).toEqual(original)
})
it('permanently removes only selected trash and assigns stable reverse undo order',()=>{
 const data=setup();applyBatch(data,['a'],'trash',()=>true,200)
 applyBatch(data,['b'],'trash',()=>true,100)
 expect(data.notes[1].deletedAt).toBeGreaterThan(data.notes[0].deletedAt!)
 applyBatch(data,['a','b'],'delete-forever',()=>true)
 expect(data.notes.map(n=>n.id)).toEqual(['c'])
})
