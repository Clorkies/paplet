import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { CollectionNote, ManagerAction, ManagerSettings, ManagerSnapshot } from '../../shared/manager'
import { COLORS, PALETTE } from '../../shared/palette'
import './manager.css'

type Filter='all'|'visible'|'hidden'|'trash'
type IconName='plus'|'search'|'settings'|'trash'|'arrow'|'close'|'undo'|'paper'|'check'
function Icon({name}:{name:IconName}){
 const paths:Record<IconName,React.ReactNode>={
  plus:<path d="M12 5v14M5 12h14"/>,search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
  settings:<><path d="M5 7h14M5 17h14"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></>,
  trash:<><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
  arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>,close:<path d="m6 6 12 12M6 18 18 6"/>,
  undo:<path d="M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12"/>,paper:<><path d="M5 3h14v13l-5 5H5zM14 21v-5h5M8 8h8M8 12h6"/></>,
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
function Collection(){
 const [state,setState]=useState<ManagerSnapshot>(),[error,setError]=useState(''),[filter,setFilter]=useState<Filter>('all'),[query,setQuery]=useState(''),[selected,setSelected]=useState<string>(),[preferences,setPreferences]=useState(false),[busy,setBusy]=useState(false),[undoId,setUndoId]=useState<string>(),[message,setMessage]=useState('')
 const search=useRef<HTMLInputElement>(null),locked=useRef(false)
 useEffect(()=>{
  const update=(next:ManagerSnapshot)=>setState(current=>!current||next.revision>=current.revision?next:current)
  const off=window.collection.onChange(update)
  window.collection.snapshot().then(update).catch(error=>setError(String(error)))
  return off
 },[])
 useEffect(()=>{const listener=(event:KeyboardEvent)=>{if(event.ctrlKey&&event.key.toLowerCase()==='f'){event.preventDefault();setPreferences(false);requestAnimationFrame(()=>search.current?.focus())}if(event.key==='Escape'){if(preferences)setPreferences(false);else if(query)setQuery('')}};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)},[preferences,query])
 const run=async(action:ManagerAction)=>{
  if(locked.current)return false
  locked.current=true;setBusy(true);setError('')
  try{const result=await window.collection.action(action);if(!result.ok){setError(result.error||'The change could not be saved. Please try again.');return false}if(result.id){setFilter('all');setQuery('');setSelected(result.id)}return true}
  catch(error){setError(String(error));return false}finally{locked.current=false;setBusy(false)}
 }
 if(!state)return <main className="loading"><Icon name="paper"/><p>{error||'Opening your notes...'}</p>{error&&<button onClick={()=>location.reload()}>Try again</button>}</main>
 const active=state.notes.filter(n=>n.deletedAt===undefined),trash=state.notes.filter(n=>n.deletedAt!==undefined)
 const visible=state.notes.filter(note=>(filter==='trash'?note.deletedAt!==undefined:note.deletedAt===undefined&&(filter==='all'||(filter==='hidden'?note.hidden:!note.hidden)))&&note.text.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice().reverse()
 const detail=visible.find(note=>note.id===selected)??visible[0]
 const remove=async(note:CollectionNote)=>{if(await run({type:'trash',id:note.id})){setUndoId(note.id);setMessage('Moved to Trash')}}
 const changeFilter=(next:Filter)=>{setFilter(next);setSelected(undefined);setMessage('')}
 const navigate=(event:React.KeyboardEvent<HTMLDivElement>)=>{
  if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key))return
  const target=event.target as HTMLElement;if(!target.matches('.note-preview'))return
  const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.note-preview')),index=buttons.indexOf(target as HTMLButtonElement)
  const step=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1,next=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+step))
  event.preventDefault();buttons[next]?.focus();if(visible[next])setSelected(visible[next].id)
 }
 return <div className="collection-app">
  <header className="app-header"><button className="wordmark" onClick={()=>setPreferences(false)} aria-label="Stickee, your notes"><span className="brand-paper" aria-hidden="true"/>Stickee<span className="wordmark-divider"/><span>Your notes</span></button><div className="header-actions"><button className={`icon-button ${preferences?'active':''}`} aria-label="Preferences" aria-pressed={preferences} onClick={()=>{setPreferences(!preferences);setError('')}}><Icon name="settings"/></button><button className="primary" disabled={busy} onClick={()=>{setPreferences(false);void run({type:'create'})}}><Icon name="plus"/>New note</button></div></header>
  {(error||state.saveError)&&<div className="error-banner" role="alert"><span>{error||'Your latest changes could not be saved. Keep Stickee open and check disk access.'}</span>{error&&<button className="icon-button" aria-label="Dismiss message" onClick={()=>setError('')}><Icon name="close"/></button>}</div>}
  {preferences?<Settings storagePath={state.storagePath} settings={state.settings} busy={busy} onBack={()=>setPreferences(false)} onSave={value=>run({type:'settings',...value})}/>:<>
   <div className="collection-toolbar"><nav className="filters" aria-label="Note collection">{(['all','visible','hidden'] as const).map(item=><button key={item} aria-pressed={filter===item} onClick={()=>changeFilter(item)}>{item==='all'?'All notes':item==='visible'?'On screen':'Hidden'}<span>{active.filter(n=>item==='all'||(item==='hidden'?n.hidden:!n.hidden)).length}</span></button>)}</nav><button className="trash-filter" aria-pressed={filter==='trash'} onClick={()=>changeFilter('trash')}><Icon name="trash"/>Trash{trash.length>0&&<span>{trash.length}</span>}</button></div>
   <div className="collection-body"><section className="shelf" aria-label={filter==='trash'?'Trash':'Notes'}><div className="shelf-heading"><div><h1>{filter==='trash'?'Room for second thoughts.':filter==='hidden'?'Tucked away.':filter==='visible'?'Out in the open.':'Thoughts, within reach.'}</h1><p>{filter==='trash'?'Kept here until you restore or delete them.':filter==='hidden'?'Still yours. Ready whenever you are.':'A place for the things you want to keep close.'}</p></div></div>
    <label className="search"><Icon name="search"/><input ref={search} type="search" placeholder={filter==='trash'?'Search Trash':'Find a thought...'} aria-label="Search note text" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>Ctrl F</kbd></label>
    {visible.length?<div className="note-grid" onKeyDown={navigate}>{visible.map(note=><button key={note.id} className={`note-preview ${detail?.id===note.id?'selected':''}`} aria-pressed={detail?.id===note.id} aria-label={`${title(note).slice(0,100)}, ${note.deletedAt!==undefined?'in Trash':note.hidden?'hidden':'on screen'}`} onClick={()=>setSelected(note.id)} onDoubleClick={()=>{if(note.deletedAt===undefined)void run({type:'show',id:note.id})}} style={paperStyle(note)}><span className="preview-paper"><span className={`preview-text ${!note.text.trim()?'blank':''}`}>{note.text.trim().slice(0,220)||'A little space for a thought.'}</span><span className="preview-curl" aria-hidden="true"/></span><span className="preview-meta"><span className={`visibility-dot ${note.hidden?'hidden':''}`} aria-hidden="true"/>{note.deletedAt!==undefined?'In Trash':note.hidden?'Hidden':'On screen'}</span></button>)}</div>:<div className="empty-state"><Icon name={filter==='trash'?'trash':query?'search':'paper'}/><h2>{query?'No matching thoughts.':filter==='trash'?'Nothing thrown away.':filter==='hidden'?'Nothing tucked away.':filter==='visible'?'A clear desktop.':'Make a little room.'}</h2><p>{query?'Try a different word or clear your search.':filter==='trash'?'Notes you move to Trash will stay here.':filter==='hidden'?'Hide a desktop note to keep it here.':'Start with one thing you would like to remember.'}</p>{query?<button onClick={()=>setQuery('')}>Clear search</button>:filter!=='trash'&&<button disabled={busy} onClick={()=>void run({type:'create'})}><Icon name="plus"/>New note</button>}</div>}
   </section>
   <aside className="reading-pane" aria-label="Selected note">{detail?<><div className="detail-heading"><span>{detail.deletedAt!==undefined?'IN TRASH':detail.hidden?'HIDDEN NOTE':'ON YOUR DESKTOP'}</span><span className="paper-name">{PALETTE[detail.color].label}</span></div><div className="reading-paper" style={paperStyle(detail)}><div tabIndex={0} aria-label="Full note text" className={`full-note ${!detail.text.trim()?'blank':''}`}>{detail.text||'A little space for a thought.'}</div><div className="reading-curl" aria-hidden="true"/></div><div className="detail-actions">{detail.deletedAt!==undefined?<><button className="primary" disabled={busy} onClick={()=>void run({type:'restore',id:detail.id})}><Icon name="undo"/>Restore to desktop</button><p className="detail-hint">Your text, paper colour and placement come back with it.</p><button className="text-button danger" disabled={busy} onClick={()=>void run({type:'delete-forever',id:detail.id})}>Delete permanently...</button></>:<><button className="primary" disabled={busy} onClick={()=>void run({type:'show',id:detail.id})}>{detail.hidden?'Show on desktop':'Open desktop note'}<Icon name="arrow"/></button><div className="secondary-actions"><button disabled={busy||detail.hidden} onClick={()=>void run({type:'hide',id:detail.id})}>Hide note</button><button disabled={busy} onClick={()=>void remove(detail)}><Icon name="trash"/>Move to Trash</button></div><button className="text-button" disabled={busy} onClick={()=>void run({type:'recover',id:detail.id})}>Bring to this display</button><p className="detail-hint">Edit on the desktop. Your note stays independent.</p></>}</div></>:<div className="pane-placeholder"><Icon name="paper"/><p>A thought, up close.</p></div>}</aside></div>
   <footer className="app-footer"><span title={state.storagePath}>Saved on this computer</span><div>{message&&<span className="undo-message" role="status">{message}{undoId&&<button disabled={busy} onClick={async()=>{if(await run({type:'restore',id:undoId})){setUndoId(undefined);setMessage('Note restored')}}}>Undo</button>}<button className="icon-button" aria-label="Dismiss notification" onClick={()=>{setMessage('');setUndoId(undefined)}}><Icon name="close"/></button></span>}<button className="text-button" disabled={busy||!active.length} onClick={()=>void run({type:'show-all'})}>Show all</button><button className="text-button" disabled={busy||!active.length} onClick={()=>void run({type:'hide-all'})}>Hide all</button></div></footer>
  </>}
 </div>
}
createRoot(document.getElementById('root')!).render(<Collection/> )
