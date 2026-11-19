import { InkPreview } from './InkPreview'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { CollectionNote, ManagerAction, ManagerSettings, ManagerSnapshot } from '../../shared/manager'
import { NoteAudio } from './note-audio'
import { recordedShortcut } from '../../shared/settings'
import type { NoteSet } from '../../shared/sets'
import { COLORS, PALETTE } from '../../shared/palette'
import './manager.css'
// Main sets ?glass=1 only when the window itself carries a system material.
if(new URLSearchParams(location.search).get('glass')==='1')document.documentElement.dataset.glass=''

type Filter='all'|'visible'|'hidden'|'trash'
type IconName='plus'|'search'|'settings'|'trash'|'arrow'|'close'|'undo'|'paper'|'check'|'locate'|'move'|'select'|'folder'|'stack'|'eye'|'eyeOff'|'gear'
const iconPaths:Record<IconName,React.ReactNode>={
  plus:<path d="M12 5v14M5 12h14"/>,search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
  settings:<><path d="M5 7h14M5 17h14"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></>,
  trash:<><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
  arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>,close:<path d="m6 6 12 12M6 18 18 6"/>,
  undo:<path d="M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12"/>,paper:<><path d="M5 3h14v13l-5 5H5zM14 21v-5h5M8 8h8M8 12h6"/></>,
  locate:<><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
  move:<><path d="M3 4h18v12H3zM8 21h8M12 16v5M8 10h8m-3-3 3 3-3 3"/></>,
  select:<><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/></>,
  check:<path d="m5 12 4 4L19 6"/>,
  folder:<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>,
  stack:<><path d="M8 4h12v12"/><path d="M4 8h12v12H4z"/></>,
  eye:<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff:<><path d="M10 5.7A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.3 7.3C3.9 9 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4-.9"/><path d="m3 3 18 18"/></>,
  gear:<><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></>
 }
function Icon({name}:{name:IconName}){
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>
}
const title=(note:CollectionNote)=>note.text.trim().split('\n',1)[0]||'Untitled note'
const paperStyle=(note:CollectionNote)=>({'--paper':PALETTE[note.color].top,'--paper-bottom':PALETTE[note.color].bottom,'--ink':PALETTE[note.color].ink} as React.CSSProperties)
function ShortcutRecorder({value,onChange,disabled,onRecording}:{value:string;onChange:(value:string)=>void;disabled:boolean;onRecording:(active:boolean)=>void}){
 const [recording,setRecording]=useState(false),[hint,setHint]=useState(''),[starting,setStarting]=useState(false)
 const input=useRef<HTMLInputElement>(null),mounted=useRef(true)
 const stop=()=>{setRecording(false);onRecording(false);void window.collection.action({type:'record-shortcut',active:false}).catch(()=>{})}
 useEffect(()=>()=>{mounted.current=false;void window.collection.action({type:'record-shortcut',active:false}).catch(()=>{})},[])
 const start=async()=>{
  setStarting(true);setHint('')
  try{const result=await window.collection.action({type:'record-shortcut',active:true});if(!mounted.current)return;if(!result.ok){setHint(result.error||'Could not record shortcut.');return}setRecording(true);onRecording(true);requestAnimationFrame(()=>input.current?.focus())}
  catch{if(mounted.current)setHint('Could not record shortcut.')}
  finally{if(mounted.current)setStarting(false)}
 }
 return <div className="shortcut-recorder"><div className="shortcut-capture"><input ref={input} id="shortcut" readOnly value={recording?'Press a key combination...':value.replace('Control','Ctrl').replace('Super','Win')} aria-label="Create note shortcut" aria-describedby="shortcut-help" onBlur={()=>{if(recording)stop()}} onKeyDown={event=>{
  if(!recording)return
  if(event.key==='Tab'){stop();return}
  event.preventDefault();event.stopPropagation()
  if(event.key==='Escape'){stop();return}
  const next=recordedShortcut(event)
  if(next){onChange(next);setHint('Shortcut captured. Save preferences to apply it.');stop()}
  else if(!['Control','Shift','Alt','Meta'].includes(event.key))setHint('Use Ctrl, Alt or Win with a letter, number or F key.')
 }}/><button type="button" disabled={disabled||starting} className={recording?'recording':''} onClick={()=>{if(recording)stop();else void start()}}>{recording?'Cancel':starting?'Starting...':'Record'}</button></div><small id="shortcut-help" role="status">{hint||(recording?'Listening. Escape cancels.':'Select Record, then press your shortcut.')}</small></div>
}
function Settings({settings,onSave,onBack,busy,storagePath}:{storagePath:string;settings:ManagerSettings;onSave:(value:ManagerSettings)=>Promise<boolean>;onBack:()=>void;busy:boolean}){
 const [draft,setDraft]=useState(settings),[saved,setSaved]=useState(false),[recording,setRecording]=useState(false)
 const preview=useRef<NoteAudio|null>(null),previewTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 const dirty=JSON.stringify(draft)!==JSON.stringify(settings)
 useEffect(()=>setDraft(settings),[settings.sound,settings.soundStyle,settings.defaultColor,settings.shortcut])
 useEffect(()=>{preview.current=new NoteAudio();return()=>{clearTimeout(previewTimer.current);preview.current?.dispose()}},[])
 const listen=()=>{clearTimeout(previewTimer.current);preview.current?.stop();preview.current?.configure(true,draft.soundStyle);preview.current?.drag(true);preview.current?.update(900);previewTimer.current=setTimeout(()=>preview.current?.drag(false),280)}
 return <section className="preferences" aria-labelledby="preferences-title">
  <button className="text-button back" onClick={onBack}><span aria-hidden="true">&#8592;</span> Notes</button>
  <h1 id="preferences-title">Preferences</h1>
  <form onSubmit={async event=>{event.preventDefault();if(!recording)setSaved(await onSave(draft))}} onChange={()=>setSaved(false)}>
   <div className="setting-row"><div><label htmlFor="sound">Paper sound</label></div><input id="sound" type="checkbox" role="switch" checked={draft.sound} onChange={event=>setDraft({...draft,sound:event.target.checked})}/></div>
   <fieldset className="sound-setting"><legend>Sound style</legend><div className="sound-options">{([{id:'rustle',name:'Rustle',description:'During movement'},{id:'click-drop',name:'Soft tones',description:'On grab and release'}] as const).map(option=><label key={option.id} className={draft.soundStyle===option.id?'selected':''}><input type="radio" name="sound-style" checked={draft.soundStyle===option.id} onChange={()=>setDraft({...draft,soundStyle:option.id})}/><span><strong>{option.name}</strong><small>{option.description}</small></span></label>)}</div><button type="button" className="text-button" onClick={listen}>Preview grab and drop</button>{(['show','hide'] as const).map(kind=><button key={kind} type="button" className="text-button" onClick={()=>{clearTimeout(previewTimer.current);preview.current?.stop();preview.current?.configure(true,draft.soundStyle);preview.current?.visibility(kind)}}>Preview {kind}</button>)}</fieldset>
   <fieldset className="setting-row colour-setting"><legend>Default paper</legend><div className="colour-options">{COLORS.map(color=><label key={color} style={{background:PALETTE[color].top,color:PALETTE[color].ink}}><input type="radio" name="default-color" value={color} checked={draft.defaultColor===color} onChange={()=>setDraft({...draft,defaultColor:color})}/><span>{PALETTE[color].label}</span></label>)}</div></fieldset>
   <div className="setting-row shortcut-setting"><label htmlFor="shortcut">Create shortcut</label><ShortcutRecorder value={draft.shortcut} disabled={busy} onRecording={setRecording} onChange={shortcut=>{setSaved(false);setDraft({...draft,shortcut})}}/></div>
   <div className="setting-row"><span className="setting-label">Reduced motion</span><span className="quiet">System preference</span></div>
   <div className="storage-info"><h2>Storage</h2><code>{storagePath}</code><p>A backup of the previous save is kept alongside this file.</p></div>
   <div className="settings-footer"><button className="primary" disabled={busy||!dirty||recording} type="submit">{busy?'Saving...':'Save preferences'}</button><span role="status">{saved?'Saved':dirty?'Unsaved changes':''}</span></div>
  </form>
 </section>
}
function SetDialog({mode,current,sets,count,busy,error,onClose,onSubmit}:{error?:string;mode:'create'|'manage'|'add';current?:NoteSet;sets:NoteSet[];count:number;busy:boolean;onClose:()=>void;onSubmit:(value:{name:string;id?:string;remove?:boolean})=>Promise<boolean>}){
 const dialog=useRef<HTMLDialogElement>(null),[name,setName]=useState(current?.name??''),[target,setTarget]=useState(sets[0]?.id??''),[confirm,setConfirm]=useState(false)
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[])
 return <dialog ref={dialog} className="set-dialog" onCancel={event=>{event.preventDefault();onClose()}}><form onSubmit={async event=>{event.preventDefault();if(await onSubmit({name,id:mode==='add'?target:current?.id}))onClose()}}>
  <div className="dialog-heading"><h2>{mode==='create'?'New set':mode==='add'?'Add to set':'Edit set'}</h2><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><Icon name="close"/></button></div>
  {mode==='add'?<><p>{count} {count===1?'note':'notes'} selected</p><label className="field-label" htmlFor="set-target">Set</label><select id="set-target" value={target} onChange={event=>setTarget(event.target.value)} autoFocus>{sets.map(set=><option key={set.id} value={set.id}>{set.name}</option>)}</select></>:<><label className="field-label" htmlFor="set-name">Name</label><input id="set-name" value={name} maxLength={60} onChange={event=>setName(event.target.value)} autoFocus required/>{mode==='create'&&count>0&&<p>Includes {count} selected {count===1?'note':'notes'}.</p>}</>}
  {error&&<p role="alert" className="dialog-error">{error}</p>}
  {confirm&&<p role="alert">Delete this set? Its notes will be kept.</p>}
  <div className="dialog-actions">{mode==='manage'&&<button type="button" className="text-button danger" disabled={busy} onClick={async()=>{if(!confirm)setConfirm(true);else if(await onSubmit({name,id:current?.id,remove:true}))onClose()}}>{confirm?'Confirm delete':'Delete set'}</button>}<button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={busy||(mode==='add'?!target:!name.trim())}>{mode==='create'?'Create set':mode==='add'?'Add notes':'Save name'}</button></div>
 </form></dialog>
}
const removedISO=(note:CollectionNote)=>{const date=new Date(note.deletedAt??NaN);return Number.isNaN(date.valueOf())?undefined:date.toISOString()}
const removedDate=(note:CollectionNote)=>removedISO(note)?new Date(note.deletedAt!).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Unknown date'
function Collection(){
 const [state,setState]=useState<ManagerSnapshot>(),[error,setError]=useState(''),[filter,setFilter]=useState<Filter>('all'),[query,setQuery]=useState(''),[selected,setSelected]=useState<string>(),[preferences,setPreferences]=useState(false),[busy,setBusy]=useState(false),[undoIds,setUndoIds]=useState<string[]>([]),[message,setMessage]=useState('')
 const [setId,setSetId]=useState<string>(),[setDialog,setSetDialog]=useState<'create'|'manage'|'add'>()
 const [allSets,setAllSets]=useState(false)
 const [folderCapacity,setFolderCapacity]=useState(1)
 const [dropTarget,setDropTarget]=useState<string>()
 const draggedNote=useRef<string|undefined>(undefined)
 const folderRow=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const row=folderRow.current
  if(!row)return
  const measure=()=>setFolderCapacity(getComputedStyle(row).gridTemplateColumns.split(' ').length)
  measure()
  const observer=new ResizeObserver(measure)
  observer.observe(row)
  return()=>observer.disconnect()
 },[Boolean(state),preferences,allSets,filter,query,setId])
 const activeSet=state?.sets.find(set=>set.id===setId)
 const [searchOpen,setSearchOpen]=useState(false),[scrolled,setScrolled]=useState(false)
 const [selecting,setSelecting]=useState(false),[checked,setChecked]=useState<Set<string>>(()=>new Set())
 const search=useRef<HTMLInputElement>(null),locked=useRef(false),anchor=useRef<string|undefined>(undefined)
 const update=(next:ManagerSnapshot)=>setState(current=>!current||next.revision>=current.revision?next:current)
 const clearSelection=()=>{setSelecting(false);setChecked(new Set());anchor.current=undefined}
 const activeIds=useMemo(()=>activeSet?new Set(activeSet.noteIds):undefined,[activeSet])
 const visible=useMemo(()=>{
  const term=query.toLocaleLowerCase()
  const matches=(state?.notes??[]).filter(note=>{
   if(filter==='trash'){if(note.deletedAt===undefined)return false}
   else if(note.deletedAt!==undefined||(activeIds&&!activeIds.has(note.id))||
    (filter==='visible'&&note.hidden)||(filter==='hidden'&&!note.hidden))return false
   return !term||note.text.toLocaleLowerCase().includes(term)
  })
  return filter==='trash'?matches.sort((a,b)=>(b.deletedAt??0)-(a.deletedAt??0)):matches.reverse()
 },[state?.notes,activeIds,filter,query])
 const live=useMemo(()=>state?.notes.filter(note=>note.deletedAt===undefined)??[],[state?.notes])
 const folderMembers=useMemo(()=>{
  const order=new Map(live.map((note,index)=>[note.id,{note,index}]))
  return new Map(state?.sets.map(set=>[set.id,set.noteIds.flatMap(id=>{
   const member=order.get(id)
   return member?[member]:[]
  }).sort((a,b)=>a.index-b.index).map(member=>member.note)]))
 },[state?.sets,live])
 const chosen=visible.filter(note=>checked.has(note.id)),detail=visible.find(note=>note.id===selected)??visible[0]
 useEffect(()=>{
  const off=window.collection.onChange(update)
  window.collection.snapshot().then(update).catch(error=>setError(String(error)))
  return off
 },[])
 useEffect(()=>{const available=new Set(visible.map(note=>note.id));setChecked(previous=>{const next=new Set([...previous].filter(id=>available.has(id)));return next.size===previous.size?previous:next})},[state,filter,query,setId])
 useEffect(()=>{
  const listener=(event:KeyboardEvent)=>{
   if(!event.defaultPrevented&&event.ctrlKey&&event.key.toLowerCase()==='f'){event.preventDefault();setPreferences(false);setAllSets(false);setSearchOpen(true);requestAnimationFrame(()=>search.current?.focus())}
   if(event.defaultPrevented||setDialog)return
   if(event.key==='Escape'){if(preferences)setPreferences(false);else if(allSets)setAllSets(false);else if(selecting){clearSelection();requestAnimationFrame(()=>search.current?.focus())}else if(query)setQuery('')}
  }
  window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)
 },[preferences,allSets,selecting,query,setDialog])
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
   if(result.setId){setAllSets(false);setSetId(result.setId);setFilter('all');setQuery('');clearSelection()}
   if(result.id){setFilter('all');setQuery('');setSelected(result.id);clearSelection()}
   return true
  }catch(error){setError(String(error));return false}finally{locked.current=false;setBusy(false)}
 }
 const chooseSet=(id?:string)=>{setAllSets(false);setSetId(id);setFilter('all');setQuery('');setSelected(undefined);clearSelection();setMessage('');setUndoIds([])}
 const createNote=()=>run({type:'create',...(activeSet?{setId:activeSet.id}:{})})
 const changeFilter=(next:Filter)=>{if(next==='trash')setSetId(undefined);setFilter(next);setSelected(undefined);clearSelection();setMessage('');setUndoIds([])}
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
 const active=activeSet?(folderMembers.get(activeSet.id)??[]):live,trash=state.notes.filter(n=>n.deletedAt!==undefined)
 const members=(set:NoteSet)=>folderMembers.get(set.id)??[]
 const heading=preferences?'Preferences':allSets?'All sets':filter==='trash'?'Trash':activeSet?.name??(filter==='hidden'?'Hidden':filter==='visible'?'On screen':'All notes')
 const showFolders=!activeSet&&filter==='all'&&!query
 const selectionMark=(note:CollectionNote)=><span className={`selection-mark ${checked.has(note.id)?'checked':''}`} aria-hidden="true">{checked.has(note.id)&&<Icon name="check"/>}</span>
 const library=[['all','All notes','stack',live.length],['visible','On screen','eye',live.filter(n=>!n.hidden).length],['hidden','Hidden','eyeOff',live.filter(n=>n.hidden).length],['trash','Trash','trash',trash.length]] as const
 const searchVisible=searchOpen||query.length>0
 const openSearch=()=>{setSearchOpen(true);requestAnimationFrame(()=>search.current?.focus())}
 const goLibrary=(id:Filter)=>{setAllSets(false);setPreferences(false);setSetId(undefined);changeFilter(id)}
 const folderDrop=(set:NoteSet)=>({
  onDragOver:(event:React.DragEvent)=>{if(draggedNote.current&&!busy){event.preventDefault();event.dataTransfer.dropEffect='copy';setDropTarget(set.id)}},
  onDragLeave:(event:React.DragEvent)=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setDropTarget(undefined)},
  onDrop:async(event:React.DragEvent)=>{
   event.preventDefault()
   const id=draggedNote.current
   setDropTarget(undefined)
   if(id&&await run({type:'set-add',id:set.id,ids:[id]}))setMessage(`Added to ${set.name}`)
  },
  'data-drop-target':dropTarget===set.id||undefined
 })
 return <div className={`app ${filter==='trash'?'trash-view':''}`} onKeyDown={event=>{
  const target=event.target as HTMLElement
  if(!preferences&&!allSets&&!setDialog&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'&&!target.closest('input,textarea,[contenteditable=true]')){event.preventDefault();selectAll()}
 }}>
  <aside className="sidebar" aria-label="Stickee">
   <div className="brand"><span className="brand-paper" aria-hidden="true"/>Stickee</div>
   <nav className="side-group" aria-label="Library">
    {library.map(([id,label,icon,count])=>{const current=!preferences&&!allSets&&!activeSet&&filter===id;return <button aria-label={label} title={label} key={id} className={`side-item ${current?'current':''}`} aria-current={current?'page':undefined} onClick={()=>goLibrary(id)}><Icon name={icon}/><span className="side-label">{label}</span><span className="side-count">{count||''}</span></button>})}
   </nav>
   <nav className="side-group side-sets" aria-labelledby="sets-heading">
    <div className="side-heading"><span id="sets-heading">Sets</span><button className="side-add" aria-label="New set" title="New set" onClick={()=>{setError('');setSetDialog('create')}}><Icon name="plus"/></button></div>
    {state.sets.length?state.sets.map(set=>{const current=!preferences&&activeSet?.id===set.id;return <button key={set.id} {...folderDrop(set)} className={`side-item ${current?'current':''}`} aria-current={current?'page':undefined} title={set.name} onClick={()=>{setPreferences(false);chooseSet(set.id)}}><Icon name="folder"/><span className="side-label">{set.name}</span><span className="side-count">{members(set).length||''}</span></button>}):<p className="side-empty">Group notes you use together.</p>}
   </nav>
   <button aria-label="Preferences" title="Preferences" className={`side-item side-foot ${preferences?'current':''}`} aria-current={preferences?'page':undefined} onClick={()=>{setPreferences(!preferences);setError('')}}><Icon name="gear"/><span className="side-label">Preferences</span></button>
  </aside>
  <main className="content">
   <header className={`toolbar ${scrolled&&!preferences?'scrolled':''}`}>
    <span className="toolbar-title" aria-hidden={!scrolled||preferences}>{heading}</span>
    {!preferences&&!allSets&&<div className="toolbar-actions">
     {searchVisible?<label className="search"><Icon name="search"/><input ref={search} type="search" placeholder={filter==='trash'?'Search Trash':'Search notes'} aria-label="Search note text" value={query} onChange={e=>{setQuery(e.target.value);clearSelection()}} onBlur={()=>{if(!query)setSearchOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'&&!query){e.preventDefault();setSearchOpen(false)}}}/></label>
     :<button className="tool-button" aria-label="Search notes" title="Search (Ctrl+F)" onClick={openSearch}><Icon name="search"/></button>}

     {filter!=='trash'&&<button className="primary" disabled={busy} onClick={()=>void createNote()}><Icon name="plus"/>New note</button>}
    </div>}
   </header>
   {(error||state.saveError)&&<div className="error-banner" role="alert"><span>{error||'Your latest changes could not be saved. Keep Stickee open and check disk access.'}</span>{error&&<button className="tool-button" aria-label="Dismiss message" onClick={()=>setError('')}><Icon name="close"/></button>}</div>}
   {preferences?<Settings storagePath={state.storagePath} settings={state.settings} busy={busy} onBack={()=>setPreferences(false)} onSave={value=>run({type:'settings',...value})}/>:<div className={`content-body ${allSets?'sets-only':''}`}>
    <section className="scroller" aria-label={heading} onScroll={event=>{const top=event.currentTarget.scrollTop>40;if(top!==scrolled)setScrolled(top);if(top&&!query&&document.activeElement!==search.current)setSearchOpen(false)}}>
     <div className="page-heading">
      <h1>{heading}</h1>
      {!allSets&&<div className="page-meta"><span>{visible.length} {visible.length===1?'note':'notes'}{query?` matching "${query.slice(0,40)}"`:''}</span>
       {activeSet&&filter!=='trash'&&<><button className="link" disabled={busy||!active.length} onClick={()=>void run({type:'set-show',id:activeSet.id})}>Show set</button><button className="link" disabled={busy||!active.length} onClick={()=>void batch('hide',active.map(note=>note.id))}>Hide set</button><button className="link" onClick={()=>{setError('');setSetDialog('manage')}}>Rename or delete</button></>}
       {!activeSet&&filter!=='trash'&&<><button className="link" disabled={busy||!live.length} onClick={()=>void run({type:'show-all'})}>Show all</button><button className="link" disabled={busy||!live.length} onClick={()=>void run({type:'hide-all'})}>Hide all</button></>}
      </div>}
      {activeSet&&filter!=='trash'&&<nav className="scope" aria-label="Filter this set">{(['all','visible','hidden'] as const).map(item=><button key={item} aria-pressed={filter===item} onClick={()=>changeFilter(item)}>{item==='all'?'All':item==='visible'?'On screen':'Hidden'}</button>)}</nav>}
     </div>
     {showFolders&&<section className="folders" aria-label="Sets">
      {!allSets&&<div className="section-heading"><h2 id="folders-title" className="section-title">Sets</h2><button className="link" onClick={()=>{clearSelection();setAllSets(true)}}>See all sets</button></div>}
      <div className="folder-grid" ref={folderRow}>
       {(allSets?state.sets:state.sets.slice(0,folderCapacity)).map(set=>{const list=members(set);return <button key={set.id} className="folder" {...folderDrop(set)} onClick={()=>chooseSet(set.id)} title={set.name}>
        <span className="folder-art" aria-hidden="true"><span className="folder-back"/><span className="folder-papers">{list.slice(-3).map((note,i)=><i key={note.id} style={{...paperStyle(note),'--i':i} as React.CSSProperties}/>)}</span><span className="folder-front"><span className="folder-badge">{list.length}</span></span></span>
        <span className="folder-name">{set.name}</span><span className="folder-meta">{list.length} {list.length===1?'note':'notes'}, {list.filter(n=>!n.hidden).length} on screen</span>
       </button>})}
       {(allSets||state.sets.length<folderCapacity)&&<button className="folder new-folder" onClick={()=>{setError('');setSetDialog('create')}}><span className="folder-art" aria-hidden="true"><span className="folder-back"/><span className="folder-front"><Icon name="plus"/></span></span><span className="folder-name">New set</span><span className="folder-meta">Group notes together</span></button>}
      </div>

     </section>}
     {!allSets&&<><div className="section-heading"><h2 className="section-title">{filter==='trash'?'Removed notes':'Notes'}</h2><button className={`tool-button ${selecting?'on':''}`} aria-pressed={selecting} title={selecting?'Done selecting':'Select notes'} aria-label={selecting?'Done selecting':'Select notes'} onClick={()=>{if(selecting)clearSelection();else setSelecting(true)}}><Icon name="select"/></button></div>
     {visible.length?<div className={filter==='trash'?'trash-list':`note-grid ${selecting?'selecting':''}`} onKeyDown={navigate}>
      {visible.map(note=>filter==='trash'?<button key={note.id} data-note={note.id} className={`trash-row ${detail?.id===note.id?'selected':''} ${checked.has(note.id)?'is-checked':''}`} role={selecting?'checkbox':undefined} aria-checked={selecting?checked.has(note.id):undefined} aria-pressed={!selecting?detail?.id===note.id:undefined} aria-label={`${title(note).slice(0,100)}, removed ${removedDate(note)}`} onClick={event=>toggleNote(note,event)}>
       {selecting?selectionMark(note):<span className="trash-paper-token" style={paperStyle(note)}/>}
       <span className="trash-excerpt"><strong>{title(note)}</strong><span>{note.text.trim().split('\n').slice(1).join(' ').slice(0,100)||'No additional text'}</span></span><time dateTime={removedISO(note)}>{removedDate(note)}</time>
      </button>:<button key={note.id} data-note={note.id} draggable={!activeSet&&filter==='all'&&!busy} onDragStart={event=>{draggedNote.current=note.id;event.dataTransfer.effectAllowed='copy';event.dataTransfer.setData('application/x-stickee-note',note.id)}} onDragEnd={()=>{draggedNote.current=undefined;setDropTarget(undefined)}} className={`note-preview ${detail?.id===note.id?'selected':''} ${checked.has(note.id)?'is-checked':''}`} role={selecting?'checkbox':undefined} aria-checked={selecting?checked.has(note.id):undefined} aria-pressed={!selecting?detail?.id===note.id:undefined} aria-label={`${title(note).slice(0,100)}, ${note.hidden?'hidden':'on screen'}`} onClick={event=>toggleNote(note,event)} onDoubleClick={()=>{if(!selecting)void run({type:'show',id:note.id})}} style={paperStyle(note)}>
       {selecting&&selectionMark(note)}<span className="preview-paper"><span className={`preview-text ${!note.text.trim()?'blank':''}`}>{note.text.trim().slice(0,220)||(note.ink?.length?'':'Empty note')}</span><InkPreview ink={note.ink}/><span className="preview-curl" aria-hidden="true"/></span><span className="preview-meta"><span className={`visibility-dot ${note.hidden?'hidden':''}`} aria-hidden="true"/>{note.hidden?'Hidden':'On screen'}</span>
      </button>)}
     </div>:<div className="empty-state"><Icon name={filter==='trash'?'trash':query?'search':'paper'}/><h2>{query?'No results':filter==='trash'?'Trash is empty':filter==='hidden'?'No hidden notes':filter==='visible'?'No notes on screen':'No notes yet'}</h2>{query?<button onClick={()=>setQuery('')}>Clear search</button>:filter!=='trash'&&<button className="primary" disabled={busy} onClick={()=>void createNote()}><Icon name="plus"/>New note</button>}</div>}
    </>}
    </section>
    {!allSets&&<aside className="inspector" aria-label="Selected note">
     {detail?<>
      <div className="detail-heading"><span>{filter==='trash'?`Removed ${removedDate(detail)}`:detail.hidden?'Hidden':'On your desktop'}</span><span className="paper-name"><i style={{background:PALETTE[detail.color].top}}/>{PALETTE[detail.color].label}</span></div>
      <div className="reading-paper" style={paperStyle(detail)}><div key={detail.id} tabIndex={0} aria-label="Full note text" className={`full-note ${!detail.text.trim()?'blank':''}`}>{detail.text||(detail.ink?.length?'':'Empty note')}</div><InkPreview ink={detail.ink}/><div className="reading-curl" aria-hidden="true"/></div>
      <div className="detail-actions">{filter==='trash'?<><button className="primary wide" disabled={busy} onClick={()=>void batch('restore',[detail.id])}><Icon name="undo"/>Restore note</button><button className="link danger" disabled={busy} onClick={()=>void batch('delete-forever',[detail.id])}>Delete permanently...</button></>:<>
       <button className="primary wide" disabled={busy} onClick={()=>void run({type:'show',id:detail.id})}>{detail.hidden?'Show and edit':'Edit on desktop'}<Icon name="arrow"/></button>
       <div className="action-list">
        <button disabled={busy} onClick={()=>{setUndoIds([]);void run({type:'locate',id:detail.id})}} title="Show and highlight on its existing display. Keeps this window focused."><Icon name="locate"/>Find on desktop</button>
        <button disabled={busy} onClick={()=>{setUndoIds([]);void run({type:'recover',id:detail.id})}} title="Move to the display containing Stickee, then highlight."><Icon name="move"/>Move to this screen</button>
        <button disabled={busy||detail.hidden} onClick={()=>void run({type:'hide',id:detail.id})}><Icon name="eyeOff"/>Hide</button>
        <button onClick={()=>{setChecked(new Set([detail.id]));setError('');setSetDialog(state.sets.length?'add':'create')}}><Icon name="folder"/>Add to set</button>
        {activeSet&&<button disabled={busy} onClick={()=>void run({type:'set-remove',id:activeSet.id,ids:[detail.id]})}><Icon name="close"/>Remove from set</button>}
        <button className="danger" disabled={busy} onClick={()=>void batch('trash',[detail.id])}><Icon name="trash"/>Move to Trash</button>
       </div>
      </>}</div>
     </>:<div className="pane-placeholder"><Icon name={filter==='trash'?'undo':'paper'}/><p>{filter==='trash'?'Nothing selected':'Select a note to read it here'}</p></div>}
    </aside>}
   </div>}
   {!preferences&&(selecting||message)&&<div className="dock" role="toolbar" aria-label={selecting?'Selected notes':'Notification'}>
    {selecting?<>
     <span className="dock-count" role="status">{chosen.length?`${chosen.length} selected`:'Select notes'}</span>
     <button className="link" onClick={selectAll}>All {visible.length}</button>
     <span className="dock-rule" aria-hidden="true"/>
     {filter==='trash'?<><button className="link danger" disabled={busy||!canBatch} onClick={()=>void batch('delete-forever')}>Delete...</button><button className="primary" disabled={busy||!canBatch} onClick={()=>void batch('restore')}><Icon name="undo"/>Restore</button></>:<>
      <button className="link" disabled={busy||!canBatch} onClick={()=>void batch('hide')}>Hide</button>
      <button className="link" disabled={busy||!canBatch} onClick={()=>{setError('');setSetDialog(state.sets.length?'add':'create')}}>Add to set</button>
      {activeSet&&<button className="link" disabled={busy||!canBatch} onClick={async()=>{if(await run({type:'set-remove',id:activeSet.id,ids:chosen.map(note=>note.id)}))clearSelection()}}>Remove from set</button>}
      <button className="link danger" disabled={busy||!canBatch} onClick={()=>void batch('trash')}>Trash</button>
      <button className="primary" disabled={busy||!canBatch} onClick={()=>void batch('show')}>Show<Icon name="arrow"/></button>
     </>}
     <button className="tool-button" aria-label="Done selecting" onClick={clearSelection}><Icon name="close"/></button>
    </>:<><span className="dock-count" role="status">{message}</span>{recoverableUndo.length>0&&<button className="primary" disabled={busy} onClick={()=>void batch('restore',recoverableUndo)}><Icon name="undo"/>Undo</button>}<button className="tool-button" aria-label="Dismiss notification" onClick={()=>{setMessage('');setUndoIds([])}}><Icon name="close"/></button></>}
   </div>}
  </main>
  {setDialog&&<SetDialog key={setDialog==='manage'?`manage-${activeSet?.id??''}`:setDialog} mode={setDialog} current={setDialog==='manage'?activeSet:undefined} sets={state.sets} count={chosen.length} busy={busy} error={error} onClose={()=>{setSetDialog(undefined);setError('')}} onSubmit={async value=>{
   const ids=chosen.map(note=>note.id)
   if(setDialog==='create')return run({type:'set-create',name:value.name,ids})
   if(setDialog==='manage'&&value.id){const ok=await run(value.remove?{type:'set-delete',id:value.id}:{type:'set-rename',id:value.id,name:value.name});if(ok&&value.remove)chooseSet();return ok}
   if(value.id){const ok=await run({type:'set-add',id:value.id,ids});if(ok){clearSelection();setMessage('Added to set')}return ok}
   return false
  }}/>}
 </div>
}
createRoot(document.getElementById('root')!).render(<Collection/> )
