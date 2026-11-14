import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { CollectionNote, ManagerAction, ManagerSettings, ManagerSnapshot } from '../../shared/manager'
import { COLORS, PALETTE } from '../../shared/palette'
import './manager.css'

type Filter='all'|'visible'|'hidden'|'trash'
type IconName='plus'|'search'|'settings'|'trash'|'arrow'|'close'|'undo'|'paper'|'check'|'locate'|'move'|'select'
function Icon({name}:{name:IconName}){
 const paths:Record<IconName,React.ReactNode>={
  plus:<path d="M12 5v14M5 12h14"/>,search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
  settings:<><path d="M5 7h14M5 17h14"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></>,
  trash:<><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
  arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>,close:<path d="m6 6 12 12M6 18 18 6"/>,
  undo:<path d="M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12"/>,paper:<><path d="M5 3h14v13l-5 5H5zM14 21v-5h5M8 8h8M8 12h6"/></>,
  locate:<><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
  move:<><path d="M3 4h18v12H3zM8 21h8M12 16v5M8 10h8m-3-3 3 3-3 3"/></>,
  select:<><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/></>,
  check:<path d="m5 12 4 4L19 6"/>
 }
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
const title=(note:CollectionNote)=>note.text.trim().split('\n')[0]||'Untitled note'
const paperStyle=(note:CollectionNote)=>({'--paper':PALETTE[note.color].top,'--paper-bottom':PALETTE[note.color].bottom,'--ink':PALETTE[note.color].ink} as React.CSSProperties)
function Settings({settings,onSave,onBack,busy,storagePath}:{storagePath:string;settings:ManagerSettings;onSave:(value:ManagerSettings)=>Promise<boolean>;onBack:()=>void;busy:boolean}){
 const [draft,setDraft]=useState(settings),[saved,setSaved]=useState(false)
 const dirty=JSON.stringify(draft)!==JSON.stringify(settings)
 useEffect(()=>setDraft(settings),[settings.sound,settings.defaultColor,settings.shortcut])
 return <section className="preferences" aria-labelledby="preferences-title">
  <button className="text-button back" onClick={onBack}><span aria-hidden="true">&#8592;</span> Your notes</button>
  <h1 id="preferences-title">A little more yours.</h1><p className="intro">A few thoughtful defaults for your desktop.</p>
  <form onSubmit={async e=>{e.preventDefault();setSaved(await onSave(draft))}} onChange={()=>setSaved(false)}>
   <div className="setting-row"><div><label htmlFor="sound">Paper sound</label><p>A soft rustle when you move a note.</p></div><input id="sound" type="checkbox" role="switch" checked={draft.sound} onChange={e=>setDraft({...draft,sound:e.target.checked})}/></div>
   <fieldset className="setting-row colour-setting"><legend>Default paper</legend><p>For notes made here, from the tray or with your shortcut.</p><div className="colour-options">{COLORS.map(color=><label key={color} style={{background:PALETTE[color].top,color:PALETTE[color].ink}}><input type="radio" name="default-color" value={color} checked={draft.defaultColor===color} onChange={()=>setDraft({...draft,defaultColor:color})}/><span>{PALETTE[color].label}</span></label>)}</div></fieldset>
   <div className="setting-row shortcut-setting"><div><label htmlFor="shortcut">Create shortcut</label><p>Use Control, Alt, Shift or Super plus a letter, number or F key.</p></div><input id="shortcut" spellCheck={false} autoComplete="off" value={draft.shortcut} onChange={e=>setDraft({...draft,shortcut:e.target.value})} aria-describedby="shortcut-help"/><small id="shortcut-help">For example: Control+Alt+N. Your current shortcut stays active if the new one is unavailable.</small></div>
   <div className="setting-row"><div><span className="setting-label">Motion</span><p>Follows your system's reduced-motion preference.</p></div><span className="quiet">System</span></div>
   <div className="storage-info"><h2>Only on this computer.</h2><p>Your notes are stored locally. Stickee keeps a backup beside the notes file for recovery.</p><code>{storagePath}</code></div>
   <div className="settings-footer"><button className="primary" disabled={busy||!dirty} type="submit">{busy?'Saving...':'Save preferences'}</button><span role="status">{saved?'Preferences saved':dirty?'Unsaved changes':''}</span></div>
  </form>
 </section>
}
const removedISO=(note:CollectionNote)=>{const date=new Date(note.deletedAt??NaN);return Number.isNaN(date.valueOf())?undefined:date.toISOString()}
const removedDate=(note:CollectionNote)=>removedISO(note)?new Date(note.deletedAt!).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Unknown date'
function Collection(){
 const [state,setState]=useState<ManagerSnapshot>(),[error,setError]=useState(''),[filter,setFilter]=useState<Filter>('all'),[query,setQuery]=useState(''),[selected,setSelected]=useState<string>(),[preferences,setPreferences]=useState(false),[busy,setBusy]=useState(false),[undoIds,setUndoIds]=useState<string[]>([]),[message,setMessage]=useState('')
 const [selecting,setSelecting]=useState(false),[checked,setChecked]=useState<Set<string>>(()=>new Set())
 const search=useRef<HTMLInputElement>(null),locked=useRef(false),anchor=useRef<string|undefined>(undefined)
 const update=(next:ManagerSnapshot)=>setState(current=>!current||next.revision>=current.revision?next:current)
 const clearSelection=()=>{setSelecting(false);setChecked(new Set());anchor.current=undefined}
 const visible=(state?.notes??[]).filter(note=>(filter==='trash'?note.deletedAt!==undefined:note.deletedAt===undefined&&(filter==='all'||(filter==='hidden'?note.hidden:!note.hidden)))&&note.text.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice().sort((a,b)=>filter==='trash'?(b.deletedAt??0)-(a.deletedAt??0):0)
 if(filter!=='trash')visible.reverse()
 const chosen=visible.filter(note=>checked.has(note.id)),detail=visible.find(note=>note.id===selected)??visible[0]
 useEffect(()=>{
  const off=window.collection.onChange(update)
  window.collection.snapshot().then(update).catch(error=>setError(String(error)))
  return off
 },[])
 useEffect(()=>{const available=new Set(visible.map(note=>note.id));setChecked(previous=>{const next=new Set([...previous].filter(id=>available.has(id)));return next.size===previous.size?previous:next})},[state,filter,query])
 useEffect(()=>{
  const listener=(event:KeyboardEvent)=>{
   if(event.ctrlKey&&event.key.toLowerCase()==='f'){event.preventDefault();setPreferences(false);requestAnimationFrame(()=>search.current?.focus())}
   if(event.key==='Escape'){if(preferences)setPreferences(false);else if(selecting){clearSelection();requestAnimationFrame(()=>search.current?.focus())}else if(query)setQuery('')}
  }
  window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)
 },[preferences,selecting,query])
 const run=async(action:ManagerAction)=>{
  if(locked.current)return false
  locked.current=true;setBusy(true);setError('')
  try{
   const result=await window.collection.action(action)
   if(!result.ok){setError(result.error||'The change could not be saved. Please try again.');return false}
   if(result.cancelled)return false
   update(await window.collection.snapshot())
   if(result.message)setMessage(result.message)
   if(result.warning)setError(result.warning)
   if(result.id){setFilter('all');setQuery('');setSelected(result.id);clearSelection()}
   return true
  }catch(error){setError(String(error));return false}finally{locked.current=false;setBusy(false)}
 }
 const changeFilter=(next:Filter)=>{setFilter(next);setSelected(undefined);clearSelection();setMessage('');setUndoIds([])}
 const selectAll=()=>{if(visible.length>1000){setError('Select up to 1,000 notes at a time. Narrow your search first.');return}setSelecting(true);setChecked(new Set(visible.map(n=>n.id)))}
 const toggleNote=(note:CollectionNote,event:React.MouseEvent|React.KeyboardEvent)=>{
  if(selecting||event.ctrlKey||event.metaKey||event.shiftKey){
   setSelecting(true)
   setChecked(previous=>{
    const next=new Set(previous),from=visible.findIndex(n=>n.id===anchor.current),to=visible.findIndex(n=>n.id===note.id)
    if(event.shiftKey&&from>=0)for(const member of visible.slice(Math.min(from,to),Math.max(from,to)+1))next.add(member.id)
    else if(next.has(note.id))next.delete(note.id);else next.add(note.id)
    return next
   })
   if(!event.shiftKey)anchor.current=note.id
  }
  setSelected(note.id)
 }
 const batch=async(operation:'show'|'hide'|'trash'|'restore'|'delete-forever',ids=chosen.map(n=>n.id))=>{
  if(await run({type:'batch',operation,ids})){
   clearSelection();requestAnimationFrame(()=>search.current?.focus())
   if(operation==='trash'){setUndoIds(ids);setMessage(`${ids.length===1?'Note':`${ids.length} notes`} moved to Trash`)}
   else if(operation==='restore'){setUndoIds([]);setMessage(`${ids.length===1?'Note':`${ids.length} notes`} restored`)}
   else if(operation==='delete-forever'){setUndoIds([]);setMessage('Permanently deleted')}
  }
 }
 const navigate=(event:React.KeyboardEvent<HTMLDivElement>)=>{
  const target=event.target as HTMLElement
  if(!target.matches('.note-preview,.trash-row'))return
  if(event.key===' '&&event.shiftKey){event.preventDefault();const note=visible.find(n=>n.id===target.dataset.note);if(note)toggleNote(note,event);return}
  if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key))return
  const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-note]')),index=buttons.indexOf(target as HTMLButtonElement)
  const columns=filter==='trash'?1:buttons.filter(button=>button.offsetTop===buttons[0]?.offsetTop).length||1
  const step=event.key==='ArrowUp'?-columns:event.key==='ArrowDown'?columns:event.key==='ArrowLeft'?-1:1
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+step))
  event.preventDefault();buttons[next]?.focus()
  if(visible[next]){if(event.shiftKey){if(!anchor.current)anchor.current=visible[index]?.id;toggleNote(visible[next],event)}else setSelected(visible[next].id)}
 }
 if(!state)return <main className="loading"><Icon name="paper"/><p>{error||'Opening your notes...'}</p>{error&&<button onClick={()=>location.reload()}>Try again</button>}</main>
 const canBatch=chosen.length>0&&chosen.length<=1000
 const recoverableUndo=undoIds.filter(id=>state.notes.some(note=>note.id===id&&note.deletedAt!==undefined))
 const active=state.notes.filter(n=>n.deletedAt===undefined),trash=state.notes.filter(n=>n.deletedAt!==undefined)
 const selectionMark=(note:CollectionNote)=><span className={`selection-mark ${checked.has(note.id)?'checked':''}`} aria-hidden="true">{checked.has(note.id)&&<Icon name="check"/>}</span>
 return <div className={`collection-app ${filter==='trash'?'trash-view':''}`} onKeyDown={event=>{
  const target=event.target as HTMLElement
  if(!preferences&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'&&!target.closest('input,textarea,[contenteditable=true]')){event.preventDefault();selectAll()}
 }}>
  <header className="app-header">
   <button className="wordmark" onClick={()=>setPreferences(false)} aria-label="Stickee, your notes"><span className="brand-paper" aria-hidden="true"/>Stickee<span className="wordmark-divider"/><span>Your notes</span></button>
   <div className="header-actions"><button className={`icon-button ${preferences?'active':''}`} aria-label="Preferences" aria-pressed={preferences} onClick={()=>{setPreferences(!preferences);setError('')}}><Icon name="settings"/></button><button className="primary" disabled={busy} onClick={()=>{setPreferences(false);void run({type:'create'})}}><Icon name="plus"/>New note</button></div>
  </header>
  {(error||state.saveError)&&<div className="error-banner" role="alert"><span>{error||'Your latest changes could not be saved. Keep Stickee open and check disk access.'}</span>{error&&<button className="icon-button" aria-label="Dismiss message" onClick={()=>setError('')}><Icon name="close"/></button>}</div>}
  {preferences?<Settings storagePath={state.storagePath} settings={state.settings} busy={busy} onBack={()=>setPreferences(false)} onSave={value=>run({type:'settings',...value})}/>:<>
   <div className="collection-toolbar">
    <nav className="filters" aria-label="Note collection">{(['all','visible','hidden'] as const).map(item=><button key={item} aria-pressed={filter===item} onClick={()=>changeFilter(item)}>{item==='all'?'All notes':item==='visible'?'On screen':'Hidden'}<span>{active.filter(n=>item==='all'||(item==='hidden'?n.hidden:!n.hidden)).length}</span></button>)}</nav>
    <button className="trash-filter" aria-pressed={filter==='trash'} onClick={()=>changeFilter('trash')}><Icon name="trash"/>Trash{trash.length>0&&<span>{trash.length}</span>}</button>
   </div>
   <div className="collection-body">
    <section className="shelf" aria-label={filter==='trash'?'Trash':'Notes'}>
     <div className="shelf-heading"><div>{filter==='trash'&&<span className="section-eyebrow">THE RECOVERY DRAWER</span>}<h1>{filter==='trash'?'A second chance.':filter==='hidden'?'Tucked away.':filter==='visible'?'Out in the open.':'Thoughts, within reach.'}</h1><p>{filter==='trash'?'Kept safely until you restore or permanently delete them.':filter==='hidden'?'Still yours. Ready whenever you are.':'A place for the things you want to keep close.'}</p></div></div>
     <div className="shelf-tools"><label className="search"><Icon name="search"/><input ref={search} type="search" placeholder={filter==='trash'?'Search Trash':'Find a thought...'} aria-label="Search note text" value={query} onChange={e=>{setQuery(e.target.value);clearSelection()}}/><kbd>Ctrl F</kbd></label><button className={`select-toggle ${selecting?'active':''}`} aria-pressed={selecting} onClick={()=>{if(selecting)clearSelection();else setSelecting(true)}}><Icon name="select"/>{selecting?'Done':'Select'}</button></div>
     {selecting&&<div className="selection-summary"><span role="status">{chosen.length} selected</span><button className="text-button" onClick={selectAll}>Select all {visible.length}</button>{chosen.length>0&&<button className="text-button" onClick={()=>setChecked(new Set())}>Clear</button>}</div>}
     {visible.length?<div className={filter==='trash'?'trash-list':`note-grid ${selecting?'selecting':''}`} onKeyDown={navigate}>
      {filter==='trash'&&<div className="trash-list-heading"><span>NOTE</span><span>REMOVED</span></div>}
      {visible.map(note=>filter==='trash'?<button key={note.id} data-note={note.id} className={`trash-row ${detail?.id===note.id?'selected':''} ${checked.has(note.id)?'is-checked':''}`} role={selecting?'checkbox':undefined} aria-checked={selecting?checked.has(note.id):undefined} aria-pressed={!selecting?detail?.id===note.id:undefined} aria-label={`${title(note).slice(0,100)}, removed ${removedDate(note)}`} onClick={event=>toggleNote(note,event)}>
       {selecting?selectionMark(note):<span className="trash-paper-token" style={paperStyle(note)}><Icon name="paper"/></span>}
       <span className="trash-excerpt"><strong>{title(note)}</strong><span>{note.text.trim().split('\n').slice(1).join(' ').slice(0,100)||'No additional text'}</span></span><time dateTime={removedISO(note)}>{removedDate(note)}</time>
      </button>:<button key={note.id} data-note={note.id} className={`note-preview ${detail?.id===note.id?'selected':''} ${checked.has(note.id)?'is-checked':''}`} role={selecting?'checkbox':undefined} aria-checked={selecting?checked.has(note.id):undefined} aria-pressed={!selecting?detail?.id===note.id:undefined} aria-label={`${title(note).slice(0,100)}, ${note.hidden?'hidden':'on screen'}`} onClick={event=>toggleNote(note,event)} onDoubleClick={()=>{if(!selecting)void run({type:'show',id:note.id})}} style={paperStyle(note)}>
       {selecting&&selectionMark(note)}<span className="preview-paper"><span className={`preview-text ${!note.text.trim()?'blank':''}`}>{note.text.trim().slice(0,220)||'A little space for a thought.'}</span><span className="preview-curl" aria-hidden="true"/></span><span className="preview-meta"><span className={`visibility-dot ${note.hidden?'hidden':''}`} aria-hidden="true"/>{note.hidden?'Hidden':'On screen'}</span>
      </button>)}
     </div>:<div className="empty-state"><Icon name={filter==='trash'?'trash':query?'search':'paper'}/><h2>{query?'No matching thoughts.':filter==='trash'?'Nothing to recover.':filter==='hidden'?'Nothing tucked away.':filter==='visible'?'A clear desktop.':'Make a little room.'}</h2><p>{query?'Try a different word or clear your search.':filter==='trash'?'This drawer holds notes you set aside. Nothing expires automatically.':filter==='hidden'?'Hide a desktop note to keep it here.':'Start with one thing you would like to remember.'}</p>{query?<button onClick={()=>setQuery('')}>Clear search</button>:filter!=='trash'&&<button disabled={busy} onClick={()=>void run({type:'create'})}><Icon name="plus"/>New note</button>}</div>}
     {filter==='trash'&&visible.length>0&&<p className="retention-note">No expiry date. Restore whenever you are ready.</p>}
    </section>
    <aside className="reading-pane" aria-label="Selected note">
     {selecting?<div className="batch-pane"><span className="batch-emblem"><Icon name="select"/></span><span className="section-eyebrow">A LITTLE ORDER</span><h2>{chosen.length?`${chosen.length} ${chosen.length===1?'thought':'thoughts'}, together.`:'Choose your notes.'}</h2><p>{filter==='trash'?'Restore a few thoughts at once, or let them go for good.':'Choose notes from the collection, then give them a little direction.'}</p><div className="batch-actions">{filter==='trash'?<><button className="primary" disabled={busy||!canBatch} onClick={()=>void batch('restore')}><Icon name="undo"/>Restore selected</button><button className="text-button danger" disabled={busy||!canBatch} onClick={()=>void batch('delete-forever')}>Delete permanently...</button></>:<><button className="primary" disabled={busy||!canBatch} onClick={()=>void batch('show')}>Show on desktop<Icon name="arrow"/></button><button disabled={busy||!canBatch} onClick={()=>void batch('hide')}>Hide selected</button><button className="text-button" disabled={busy||!canBatch} onClick={()=>void batch('trash')}><Icon name="trash"/>Move to Trash</button></>}</div><small>Ctrl-click to pick. Shift-click for a range.<br/>Escape to leave selection.</small></div>:detail?<>
      <div className="detail-heading"><span>{filter==='trash'?'SAVED FOR RECOVERY':detail.hidden?'HIDDEN NOTE':'ON YOUR DESKTOP'}</span><span className="paper-name">{PALETTE[detail.color].label}</span></div>
      <div className="reading-paper" style={paperStyle(detail)}><div key={detail.id} tabIndex={0} aria-label="Full note text" className={`full-note ${!detail.text.trim()?'blank':''}`}>{detail.text||'A little space for a thought.'}</div><div className="reading-curl" aria-hidden="true"/></div>
      <div className="detail-actions">{filter==='trash'?<><button className="primary" disabled={busy} onClick={()=>void batch('restore',[detail.id])}><Icon name="undo"/>Restore note</button><p className="detail-hint">Removed {removedDate(detail)}. Nothing here expires.</p><button className="text-button danger" disabled={busy} onClick={()=>void batch('delete-forever',[detail.id])}>Delete permanently...</button></>:<>
       <button className="primary" disabled={busy} onClick={()=>void run({type:'show',id:detail.id})}>{detail.hidden?'Show & edit note':'Edit desktop note'}<Icon name="arrow"/></button>
       <div className="locate-actions"><button disabled={busy} onClick={()=>{setUndoIds([]);void run({type:'locate',id:detail.id})}} title="Show and highlight on its existing display. Keeps this window focused."><Icon name="locate"/>Find on desktop</button><button disabled={busy} onClick={()=>{setUndoIds([]);void run({type:'recover',id:detail.id})}} title="Move to the display containing Stickee, then highlight."><Icon name="move"/>Move here</button></div>
       <div className="secondary-actions"><button disabled={busy||detail.hidden} onClick={()=>void run({type:'hide',id:detail.id})}>Hide note</button><button disabled={busy} onClick={()=>void batch('trash',[detail.id])}><Icon name="trash"/>Trash note</button></div><p className="detail-hint">Find keeps its place. Move here uses this display.</p>
      </>}</div>
     </>:<div className="pane-placeholder"><Icon name={filter==='trash'?'undo':'paper'}/><p>{filter==='trash'?'A clean slate.':'A thought, up close.'}</p></div>}
    </aside>
   </div>
   <footer className="app-footer"><span title={state.storagePath}>Saved on this computer</span><div>{message&&<span className="undo-message" role="status">{message}{recoverableUndo.length>0&&<button disabled={busy} onClick={()=>void batch('restore',recoverableUndo)}>Undo</button>}<button className="icon-button" aria-label="Dismiss notification" onClick={()=>{setMessage('');setUndoIds([])}}><Icon name="close"/></button></span>}<button className="text-button" disabled={busy||!active.length} onClick={()=>void run({type:'show-all'})}>Show all</button><button className="text-button" disabled={busy||!active.length} onClick={()=>void run({type:'hide-all'})}>Hide all</button></div></footer>
  </>}
 </div>
}
createRoot(document.getElementById('root')!).render(<Collection/> )
