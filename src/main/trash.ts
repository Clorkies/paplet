import type { SavedData, SavedNote } from './store'

// No automatic expiry: trash remains recoverable across restarts.
export function trashed(data:SavedData):SavedNote[]{
 return [...data.notes].reverse().filter(note=>note.deletedAt!==undefined).sort((a,b)=>b.deletedAt!-a.deletedAt!)
}

/** Commit state before changing native windows; a failed write rolls back. */
export function setTrashed(note:SavedNote,deleted:boolean,persist:()=>boolean,now=Date.now()):boolean{
 if((note.deletedAt!==undefined)===deleted)return false
 const previous=note.deletedAt
 if(deleted)note.deletedAt=now;else delete note.deletedAt
 try{if(persist())return true} catch(error){
  if(previous===undefined)delete note.deletedAt;else note.deletedAt=previous
  throw error
 }
 if(previous===undefined)delete note.deletedAt;else note.deletedAt=previous
 return false
}
