import type { SavedData } from './store'
type SetEdit={type:'create'|'rename'|'delete'|'add'|'remove';id:string;name?:unknown;ids?:unknown}
export function editSet(data:SavedData,edit:SetEdit,persist:()=>boolean){
 const old=data.sets,existing=old.find(set=>set.id===edit.id)
 if(edit.type==='create'?(existing||!edit.id||edit.id.length>128||old.length>=5000):!existing)throw new Error('Set is unavailable')
 let name=existing?.name??''
 if(edit.type==='create'||edit.type==='rename'){
  if(typeof edit.name!=='string'||!edit.name.trim()||edit.name.trim().length>60)throw new Error('Use a set name between 1 and 60 characters.')
  name=edit.name.trim()
 }
 let ids:string[]=[]
 if(['create','add','remove'].includes(edit.type)){
  const input=edit.ids??[]
  if(!Array.isArray(input)||input.length>1000||input.some(id=>typeof id!=='string')||new Set(input).size!==input.length)throw new Error('Invalid set members')
  const available=new Set(data.notes.map(note=>note.id))
  if(input.some(id=>!available.has(id)))throw new Error('A selected note is no longer available.')
  ids=input
 }
 if(edit.type==='create')data.sets=[...old,{id:edit.id,name,noteIds:ids}]
 else if(edit.type==='delete')data.sets=old.filter(set=>set.id!==edit.id)
 else data.sets=old.map(set=>{
  if(set.id!==edit.id)return set
  if(edit.type==='rename')return {...set,name}
  const noteIds=edit.type==='add'?[...new Set([...set.noteIds,...ids])]:set.noteIds.filter(id=>!ids.includes(id))
  if(noteIds.length>1000)throw new Error('A set can contain up to 1,000 notes.')
  return {...set,noteIds}
 })
 try{if(!persist())throw new Error('Set could not be saved. Nothing was changed.')}
 catch(error){data.sets=old;throw error}
 return edit.id
}
export function visibleSetMembers(data:SavedData,id:string){
 const set=data.sets.find(set=>set.id===id)
 if(!set)throw new Error('Set is unavailable')
 const members=new Set(set.noteIds)
 return data.notes.filter(note=>members.has(note.id)&&note.deletedAt===undefined).map(note=>note.id)
}
