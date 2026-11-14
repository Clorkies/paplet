import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, copyFileSync, openSync, fsyncSync, closeSync } from 'node:fs'
import { join } from 'node:path'
import { isPaperColor, legacyColor, type PaperColor } from '../shared/palette'
import { validShortcut } from '../shared/settings'
export const SCHEMA_VERSION=3
export type SavedNote={curlSide?:'left'|'right';id:string;text:string;color:PaperColor;angle:number;x:number;y:number;hidden:boolean;deletedAt?:number}
export type Settings={sound:boolean;defaultColor?:PaperColor;shortcut?:string}
export type SavedData={schemaVersion:3;notes:SavedNote[];settings:Settings}
export const emptyData=():SavedData=>({schemaVersion:3,notes:[],settings:{sound:true}})
/** Validates current data and migrates schemas 1 (numeric paper variant) and 2 (no trash). */
export function parseData(raw:string):SavedData {
 const data=JSON.parse(raw)
 if(!data||![1,2,3].includes(data.schemaVersion)||!Array.isArray(data.notes))throw new Error('Unsupported or invalid notes file')
 const legacy=data.schemaVersion===1,ids=new Set<string>()
 const notes:SavedNote[]=data.notes.map((n:Record<string,unknown>)=>{
  const color=legacy?legacyColor(n?.note):n?.color
  if(!n||(n.curlSide!==undefined&&n.curlSide!=='left'&&n.curlSide!=='right')||typeof n.id!=='string'||ids.has(n.id)||typeof n.text!=='string'||n.text.length>1_000_000||!isPaperColor(color)||typeof n.angle!=='number'||!Number.isFinite(n.angle)||Math.abs(n.angle)>3||typeof n.x!=='number'||!Number.isFinite(n.x)||typeof n.y!=='number'||!Number.isFinite(n.y)||typeof n.hidden!=='boolean')throw new Error('Invalid note')
  if(data.schemaVersion===3&&n.deletedAt!==undefined&&(typeof n.deletedAt!=='number'||!Number.isSafeInteger(n.deletedAt)||n.deletedAt<0))throw new Error('Invalid deletion timestamp')
  ids.add(n.id)
  return {...(data.schemaVersion===3&&n.deletedAt!==undefined?{deletedAt:n.deletedAt as number}:{}),...(n.curlSide?{curlSide:n.curlSide}:{}),id:n.id,text:n.text,color,angle:n.angle,x:n.x,y:n.y,hidden:n.hidden}
 })
 if(!legacy&&(!data.settings||typeof data.settings.sound!=='boolean'))throw new Error('Invalid settings')
 if(!legacy&&((data.settings.defaultColor!==undefined&&!isPaperColor(data.settings.defaultColor))||(data.settings.shortcut!==undefined&&!validShortcut(data.settings.shortcut))))throw new Error('Invalid settings')
 return {schemaVersion:3,notes,settings:{sound:legacy?true:data.settings.sound,...(!legacy&&data.settings.defaultColor!==undefined?{defaultColor:data.settings.defaultColor}:{}),...(!legacy&&data.settings.shortcut!==undefined?{shortcut:data.settings.shortcut}:{})}}
}
export class NoteStore {
 readonly path:string
 recovered=false
 constructor(directory:string){mkdirSync(directory,{recursive:true});this.path=join(directory,'notes.json')}
 load():SavedData {
  if(!existsSync(this.path)){
   if(existsSync(this.path+'.bak')){this.recovered=true;return parseData(readFileSync(this.path+'.bak','utf8'))}
   return emptyData()
  }
  const raw=readFileSync(this.path,'utf8')
  // Never overwrite a future schema with an older app.
  try{const version=JSON.parse(raw).schemaVersion;if(typeof version==='number'&&version>SCHEMA_VERSION)throw new Error('Notes were saved by a newer Stickee version')}catch(error){if(error instanceof Error&&error.message.includes('newer Stickee'))throw error}
  try{return parseData(raw)}catch{
   const recovery=existsSync(this.path+'.bak')?parseData(readFileSync(this.path+'.bak','utf8')):emptyData()
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
