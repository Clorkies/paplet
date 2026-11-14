import { expect, it } from 'vitest'
import { applyBatch } from '../src/main/batch'
import { editSet, visibleSetMembers } from '../src/main/sets'
import { emptyData, parseData } from '../src/main/store'
function setup(){const data=emptyData();data.notes=['a','b','c'].map((id,index)=>({id,text:`Note ${id}`,hidden:index!==0,color:'blue',angle:0,x:index*150,y:40}));return data}
it('loads overlapping sets additively without cloning records or hiding existing notes',()=>{
 const data=setup(),references=[...data.notes]
 editSet(data,{type:'create',id:'work',name:'Work',ids:['b']},()=>true)
 editSet(data,{type:'create',id:'later',name:'Later',ids:['b','c']},()=>true)
 applyBatch(data,visibleSetMembers(data,'work'),'show',()=>true)
 expect(data.notes.map(n=>n.hidden)).toEqual([false,false,true])
 applyBatch(data,visibleSetMembers(data,'later'),'show',()=>true)
 const before=structuredClone(data)
 applyBatch(data,visibleSetMembers(data,'later'),'show',()=>true)
 expect(data).toEqual(before);expect(data.notes).toHaveLength(3)
 for(let i=0;i<3;i++)expect(data.notes[i]).toBe(references[i])
})
it('preserves membership through trash/restart/restore and removes dangling IDs on permanent delete',()=>{
 const data=setup();editSet(data,{type:'create',id:'s',name:'Notes',ids:['a','b']},()=>true)
 applyBatch(data,['b'],'trash',()=>true)
 const restarted=parseData(JSON.stringify(data))
 expect(visibleSetMembers(restarted,'s')).toEqual(['a'])
 expect(restarted.sets[0].noteIds).toEqual(['a','b'])
 applyBatch(restarted,['b'],'restore',()=>true)
 expect(visibleSetMembers(restarted,'s')).toEqual(['a','b'])
 applyBatch(restarted,['b'],'trash',()=>true)
 expect(()=>applyBatch(restarted,['b'],'delete-forever',()=>false)).toThrow()
 expect(restarted.sets[0].noteIds).toEqual(['a','b'])
 applyBatch(restarted,['b'],'delete-forever',()=>true)
 expect(parseData(JSON.stringify(restarted)).sets[0].noteIds).toEqual(['a'])
})
it('edits sets transactionally and deleting a set keeps its notes',()=>{
 const data=setup(),originalNotes=structuredClone(data.notes)
 editSet(data,{type:'create',id:'s',name:'  Work  ',ids:['a']},()=>true)
 editSet(data,{type:'add',id:'s',ids:['a','b']},()=>true)
 expect(data.sets[0]).toEqual({id:'s',name:'Work',noteIds:['a','b']})
 const before=structuredClone(data)
 for(const type of ['rename','delete','add','remove'] as const){expect(()=>editSet(data,{type,id:'s',name:'New',ids:['c']},()=>false)).toThrow();expect(data).toEqual(before)}
 expect(()=>editSet(data,{type:'create',id:'x',name:'New',ids:[]},()=>{throw new Error('Disk full')})).toThrow()
 expect(data).toEqual(before)
 editSet(data,{type:'remove',id:'s',ids:['a']},()=>true)
 editSet(data,{type:'delete',id:'s'},()=>true)
 expect(data.sets).toEqual([]);expect(data.notes).toEqual(originalNotes)
})
it('rejects invalid names, membership and saved references',()=>{
 const data=setup()
 for(const name of ['', '  ', 'x'.repeat(61),null])expect(()=>editSet(data,{type:'create',id:'s',name},()=>true)).toThrow()
 expect(()=>editSet(data,{type:'create',id:'s',name:'Work',ids:['missing']},()=>true)).toThrow()
 expect(()=>editSet(data,{type:'create',id:'s',name:'Work',ids:['a','a']},()=>true)).toThrow()
 for(const sets of [[{id:'s',name:'Work',noteIds:['missing']}],[{id:'s',name:'Work',noteIds:['a','a']}],[{id:'s',name:'Work',noteIds:['a']},{id:'s',name:'Again',noteIds:[]}]])expect(()=>parseData(JSON.stringify({...data,sets}))).toThrow('Invalid note set')
})
