import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, copyFileSync, openSync, fsyncSync, closeSync } from 'node:fs'
import { join } from 'node:path'
export type SavedNote={id:string;text:string;note:number;angle:number;x:number;y:number;hidden:boolean}
export type SavedData={schemaVersion:1;notes:SavedNote[]}
export function parseData(raw:string):SavedData {
 const data=JSON.parse(raw) as SavedData
 if(data.schemaVersion!==1||!Array.isArray(data.notes))throw new Error('Unsupported or invalid notes file')
 const ids=new Set<string>()
 for(const n of data.notes){
  if(typeof n.id!=='string'||ids.has(n.id)||typeof n.text!=='string'||n.text.length>1_000_000||![0,1].includes(n.note)||!Number.isFinite(n.angle)||Math.abs(n.angle)>3||!Number.isFinite(n.x)||!Number.isFinite(n.y)||typeof n.hidden!=='boolean')throw new Error('Invalid note')
  ids.add(n.id)
 }
 return data
}
export class NoteStore {
 readonly path:string
 recovered=false
 constructor(directory:string){mkdirSync(directory,{recursive:true});this.path=join(directory,'notes.json')}
 load():SavedData {
  if(!existsSync(this.path)){
   if(existsSync(this.path+'.bak')){this.recovered=true;return parseData(readFileSync(this.path+'.bak','utf8'))}
   return {schemaVersion:1,notes:[]}
  }
  const raw=readFileSync(this.path,'utf8')
  // Never overwrite a future schema with an older app.
  try{const version=JSON.parse(raw).schemaVersion;if(typeof version==='number'&&version>1)throw new Error('Notes were saved by a newer Stickee version')}catch(error){if(error instanceof Error&&error.message.includes('newer Stickee'))throw error}
  try{return parseData(raw)}catch{
   const recovery=existsSync(this.path+'.bak')?parseData(readFileSync(this.path+'.bak','utf8')):{schemaVersion:1 as const,notes:[]}
   renameSync(this.path,this.path+`.corrupt-${Date.now()}`)
   this.recovered=true
   return recovery
  }
 }
 save(data:SavedData){
  const raw=JSON.stringify(data,null,2);parseData(raw)
  const temp=this.path+'.tmp'
  writeFileSync(temp,raw,'utf8')
  const fd=openSync(temp,'r+');try{fsyncSync(fd)}finally{closeSync(fd)}
  if(existsSync(this.path)){parseData(readFileSync(this.path,'utf8'));copyFileSync(this.path,this.path+'.bak')}
  renameSync(temp,this.path)
 }
}
