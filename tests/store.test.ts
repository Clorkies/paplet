import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NoteStore, type SavedData } from '../src/main/store'
const directories:string[]=[]
function setup(){const dir=mkdtempSync(join(tmpdir(),'stickee-test-'));directories.push(dir);return new NoteStore(dir)}
const data:SavedData={schemaVersion:1,notes:[{curlSide:'left',id:'a',text:'First\n日本語',note:0,angle:-2,x:-100,y:40,hidden:false},{id:'b',text:'Second',note:1,angle:1.7,x:200,y:80,hidden:true}]}
afterEach(()=>{for(const dir of directories.splice(0))rmSync(dir,{recursive:true,force:true})})
it('round trips independent notes including Unicode, positions and hidden state',()=>{const store=setup();store.save(data);expect(store.load()).toEqual(data);expect(existsSync(store.path+'.tmp')).toBe(false)})
it('recovers a malformed primary from the last valid backup',()=>{const store=setup();store.save(data);store.save({...data,notes:data.notes.map(n=>({...n,text:'New text'}))});writeFileSync(store.path,'{"interrupted":');expect(store.load()).toEqual(data);store.save(data);expect(store.load()).toEqual(data)})
it('preserves a future schema instead of replacing it',()=>{const store=setup();const raw='{"schemaVersion":2,"notes":[]}';writeFileSync(store.path,raw);expect(()=>store.load()).toThrow('newer Stickee');expect(readFileSync(store.path,'utf8')).toBe(raw)})
it('rejects invalid state without damaging the last saved file',()=>{const store=setup();store.save(data);expect(()=>store.save({...data,notes:[{...data.notes[0],x:NaN}]})).toThrow();expect(store.load()).toEqual(data)})
