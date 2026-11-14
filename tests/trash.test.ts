import { expect, it } from 'vitest'
import { emptyData, parseData, type SavedNote } from '../src/main/store'
import { setTrashed, trashed } from '../src/main/trash'

const note=():SavedNote=>({id:'a',text:'Keep me 日本語',color:'mint',angle:1,x:-800,y:50,hidden:true,curlSide:'left'})
it('preserves content, identity, placement and visibility through delete, restart and restore',()=>{
 const data=emptyData(),original=note();data.notes.push({...original})
 expect(setTrashed(data.notes[0],true,()=>true,100)).toBe(true)
 const loaded=parseData(JSON.stringify(data))
 expect(trashed(loaded)).toHaveLength(1)
 expect(setTrashed(loaded.notes[0],false,()=>true)).toBe(true)
 expect(loaded.notes[0]).toEqual(original)
})
it('rolls back failed deletion and restoration without losing content',()=>{
 const saved=note()
 expect(setTrashed(saved,true,()=>false,100)).toBe(false)
 expect(saved).toEqual(note())
 setTrashed(saved,true,()=>true,100)
 expect(setTrashed(saved,false,()=>false)).toBe(false)
 expect(saved.deletedAt).toBe(100)
 expect(()=>setTrashed(saved,false,()=>{throw new Error('Disk full')})).toThrow('Disk full')
 expect(saved.deletedAt).toBe(100)
})
it('undoes multiple deletions in reverse order and ignores repeated actions',()=>{
 const data=emptyData();data.notes.push(note(),{...note(),id:'b'})
 setTrashed(data.notes[0],true,()=>true,100)
 setTrashed(data.notes[1],true,()=>true,200)
 expect(setTrashed(data.notes[1],true,()=>{throw new Error('unexpected save')})).toBe(false)
 expect(trashed(data).map(n=>n.id)).toEqual(['b','a'])
 setTrashed(trashed(data)[0],false,()=>true)
 expect(trashed(data).map(n=>n.id)).toEqual(['a'])
})
it('migrates schema 2 and rejects invalid trash metadata',()=>{
 const data={...emptyData(),notes:[note()]}
 expect(parseData(JSON.stringify({...data,schemaVersion:2}))).toEqual(data)
 for(const deletedAt of [-1,1.5,'100',null])expect(()=>parseData(JSON.stringify({...data,notes:[{...note(),deletedAt}]}))).toThrow()
})
