import type { SavedData, SavedNote } from './store'
export const BATCH_OPERATIONS=['show','hide','trash','restore','delete-forever'] as const
export type BatchOperation=typeof BATCH_OPERATIONS[number]
export function batchTargets(data:SavedData,ids:unknown,operation:unknown):SavedNote[]{
 if(!Array.isArray(ids)||!ids.length||ids.length>1000||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length||!BATCH_OPERATIONS.includes(operation as BatchOperation))throw new Error('Invalid note selection')
 const byId=new Map(data.notes.map(note=>[note.id,note]))
 return ids.map(id=>{
  const note=byId.get(id)
  if(!note)throw new Error('A selected note is no longer available. Select again.')
  const needsTrash=operation==='restore'||operation==='delete-forever'
  if((note.deletedAt!==undefined)!==needsTrash)throw new Error('A selected note changed. Select again.')
  return note
 })
}
/** One save for the complete batch. Preserve live record identities on rollback. */
export function applyBatch(data:SavedData,ids:unknown,operation:BatchOperation,persist:()=>boolean,now=Date.now()):SavedNote[]{
 const targets=batchTargets(data,ids,operation),original=data.notes
 const before=targets.map(note=>({note,hidden:note.hidden,deletedAt:note.deletedAt}))
 const rollback=()=>{data.notes=original;for(const {note,hidden,deletedAt} of before){note.hidden=hidden;if(deletedAt===undefined)delete note.deletedAt;else note.deletedAt=deletedAt}}
 if(operation==='delete-forever'){
  const removing=new Set(targets);data.notes=data.notes.filter(note=>!removing.has(note))
 }else{
  const last=data.notes.reduce((last,note)=>Math.max(last,note.deletedAt??-1),-1)
  targets.forEach((note,index)=>{
   if(operation==='trash')note.deletedAt=Math.max(now,last+1)+index
   else if(operation==='restore'){delete note.deletedAt;note.hidden=false}
   else note.hidden=operation==='hide'
  })
 }
 try{if(!persist())throw new Error('The selected notes could not be saved. Nothing was changed.')}
 catch(error){rollback();throw error}
 return targets
}
