import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NoteStore, type SavedData } from '../src/main/store'
const directories:string[]=[]
function setup(){const dir=mkdtempSync(join(tmpdir(),'stickee-test-'));directories.push(dir);return new NoteStore(dir)}
const data:SavedData={schemaVersion:2,settings:{sound:false},notes:[{curlSide:'left',id:'a',text:'First\n日本語',color:'mint',angle:-2,x:-100,y:40,hidden:false},{id:'b',text:'Second',color:'peach',angle:1.7,x:200,y:80,hidden:true}]}
afterEach(()=>{for(const dir of directories.splice(0))rmSync(dir,{recursive:true,force:true})})
it('round trips independent notes including Unicode, colours, settings, positions and hidden state',()=>{const store=setup();store.save(data);expect(store.load()).toEqual(data);expect(existsSync(store.path+'.tmp')).toBe(false)})
it('recovers a malformed primary from the last valid backup',()=>{const store=setup();store.save(data);store.save({...data,notes:data.notes.map(n=>({...n,text:'New text'}))});writeFileSync(store.path,'{"interrupted":');expect(store.load()).toEqual(data);store.save(data);expect(store.load()).toEqual(data)})
it('preserves a future schema instead of replacing it',()=>{const store=setup();const raw='{"schemaVersion":3,"notes":[]}';writeFileSync(store.path,raw);expect(()=>store.load()).toThrow('newer Stickee');expect(readFileSync(store.path,'utf8')).toBe(raw)})
it('rejects invalid state without damaging the last saved file',()=>{const store=setup();store.save(data);expect(()=>store.save({...data,notes:[{...data.notes[0],x:NaN}]})).toThrow();expect(store.load()).toEqual(data)})
it('migrates schema 1 paper variants to semantic colours and keeps the old file as backup',()=>{
 const store=setup()
 const old={schemaVersion:1,notes:[{curlSide:'right',id:'a',text:'Old yellow',note:0,angle:1,x:10,y:20,hidden:false},{id:'b',text:'Old peach',note:1,angle:0,x:30,y:40,hidden:true}]}
 writeFileSync(store.path,JSON.stringify(old))
 const loaded=store.load()
 expect(loaded.schemaVersion).toBe(2);expect(loaded.settings).toEqual({sound:true})
 expect(loaded.notes[0]).toEqual({curlSide:'right',id:'a',text:'Old yellow',color:'yellow',angle:1,x:10,y:20,hidden:false})
 expect(loaded.notes[1].color).toBe('peach')
 expect(store.recovered).toBe(false)
 store.save(loaded)
 expect(JSON.parse(readFileSync(store.path+'.bak','utf8')).schemaVersion).toBe(1)
 expect(store.load()).toEqual(loaded)
})
it('rejects unknown colours and missing settings',()=>{
 const store=setup()
 expect(()=>store.save({...data,notes:[{...data.notes[0],color:'crimson' as never}]})).toThrow()
 expect(()=>store.save({...data,settings:undefined as never})).toThrow()
})
