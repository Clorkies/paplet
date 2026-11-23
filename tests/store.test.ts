import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NoteStore, type SavedData } from '../src/main/store'
import { setTrashed, trashed } from '../src/main/trash'
const directories:string[]=[]
function setup(){const dir=mkdtempSync(join(tmpdir(),'paplet-test-'));directories.push(dir);return new NoteStore(dir)}
const data:SavedData={schemaVersion:5,sets:[],settings:{sound:false},notes:[{curlSide:'left',id:'a',text:'First\n日本語',color:'mint',angle:-2,x:-100,y:40,hidden:false},{id:'b',text:'Second',color:'peach',angle:1.7,x:200,y:80,hidden:true}]}
afterEach(()=>{for(const dir of directories.splice(0))rmSync(dir,{recursive:true,force:true})})
it('round trips independent notes including Unicode, colours, settings, positions and hidden state',()=>{const store=setup();store.save(data);expect(store.load()).toEqual(data);expect(existsSync(store.path+'.tmp')).toBe(false)})
it('recovers a malformed primary from the last valid backup',()=>{const store=setup();store.save(data);store.save({...data,notes:data.notes.map(n=>({...n,text:'New text'}))});writeFileSync(store.path,'{"interrupted":');expect(store.load()).toEqual(data);store.save(data);expect(store.load()).toEqual(data)})
it('preserves a future schema instead of replacing it',()=>{const store=setup();const raw='{"schemaVersion":6,"notes":[]}';writeFileSync(store.path,raw);expect(()=>store.load()).toThrow('newer Paplet');expect(readFileSync(store.path,'utf8')).toBe(raw)})
it('rejects invalid state without damaging the last saved file',()=>{const store=setup();store.save(data);expect(()=>store.save({...data,notes:[{...data.notes[0],x:NaN}]})).toThrow();expect(store.load()).toEqual(data)})
it('migrates schema 1 paper variants to semantic colours and keeps the old file as backup',()=>{
 const store=setup()
 const old={schemaVersion:1,notes:[{curlSide:'right',id:'a',text:'Old yellow',note:0,angle:1,x:10,y:20,hidden:false},{id:'b',text:'Old peach',note:1,angle:0,x:30,y:40,hidden:true}]}
 writeFileSync(store.path,JSON.stringify(old))
 const loaded=store.load()
 expect(loaded.schemaVersion).toBe(5);expect(loaded.settings).toEqual({sound:true})
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
it('persists trash and restoration across actual store reloads',()=>{
 const store=setup(),state=structuredClone(data)
 store.save(state)
 expect(setTrashed(state.notes[0],true,()=>{store.save(state);return true},100)).toBe(true)
 const restarted=store.load()
 expect(trashed(restarted)[0]).toEqual({...data.notes[0],deletedAt:100})
 expect(setTrashed(restarted.notes[0],false,()=>{store.save(restarted);return true})).toBe(true)
 expect(store.load()).toEqual(data)
})
it('migrates schema 2 without inventing trash or losing settings and backs it up',()=>{
 const store=setup(),old={...data,schemaVersion:2}
 writeFileSync(store.path,JSON.stringify(old))
 const loaded=store.load()
 expect(loaded).toEqual(data)
 store.save(loaded)
 expect(JSON.parse(readFileSync(store.path+'.bak','utf8'))).toEqual(old)
})
it('preserves manager preferences and rejects invalid shortcuts and defaults',()=>{
 const store=setup(),state={...data,settings:{sound:false,defaultColor:'blue' as const,shortcut:'Control+Shift+F12'}}
 store.save(state);expect(store.load()).toEqual(state)
 for(const shortcut of ['N','Shift+N','Control+Control+N','Control+Alt+','Control+Delete'])expect(()=>store.save({...state,settings:{...state.settings,shortcut}})).toThrow('Invalid settings')
 expect(()=>store.save({...state,settings:{...state.settings,defaultColor:'red' as never}})).toThrow('Invalid settings')
 expect(store.load()).toEqual(state)
})
it('migrates schema 3 preserving trash and keeps its raw backup on the first schema 4 save',()=>{
 const store=setup(),old={schemaVersion:3,notes:[{...data.notes[0],deletedAt:100}],settings:{sound:true}}
 writeFileSync(store.path,JSON.stringify(old))
 const loaded=store.load();expect(loaded.schemaVersion).toBe(5);expect(loaded.sets).toEqual([]);expect(loaded.notes).toEqual(old.notes)
 loaded.sets.push({id:'work',name:'Work',noteIds:[loaded.notes[0].id]});loaded.settings.soundStyle='click-drop'
 store.save(loaded);expect(store.load()).toEqual(loaded)
 expect(JSON.parse(readFileSync(store.path+'.bak','utf8'))).toEqual(old)
 expect(()=>store.save({...loaded,settings:{...loaded.settings,soundStyle:'remote' as never}})).toThrow('Invalid sound style')
})
it('upgrades schema 4 and recovers ink, Trash and set membership from backup',()=>{
 const store=setup()
 const sets=[{id:'s',name:'Sketchbook',noteIds:['a']}]
 const old={...data,schemaVersion:4,sets}
 writeFileSync(store.path,JSON.stringify(old))
 const next=store.load()
 expect(next).toEqual({...data,sets})
 next.notes[0].ink=[{color:'ocean',width:4,points:[3,10,220,160]}]
 next.notes[0].deletedAt=100
 store.save(next)
 store.save({...next,notes:[] ,sets:[]})
 writeFileSync(store.path,'{')
 expect(store.load()).toEqual(next)
})
