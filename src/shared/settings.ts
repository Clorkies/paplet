/** Narrow accelerator subset: deliberate modifier plus a letter, digit or F key. */
export type SoundStyle='rustle'|'click-drop'
export const validSoundStyle=(value:unknown):value is SoundStyle=>value==='rustle'||value==='click-drop'
export type ShortcutKey={key:string;code:string;ctrlKey:boolean;altKey:boolean;shiftKey:boolean;metaKey:boolean;repeat?:boolean;isComposing?:boolean}
export function recordedShortcut(event:ShortcutKey):string|undefined{
 if(event.repeat||event.isComposing)return
 const key=/^Key[A-Z]$/.test(event.code)?event.code.slice(3):/^Digit[0-9]$/.test(event.code)?event.code.slice(5):/^F(?:[1-9]|1[0-9]|2[0-4])$/.test(event.key)?event.key:undefined
 if(!key)return
 const value=[event.ctrlKey?'Control':'',event.altKey?'Alt':'',event.shiftKey?'Shift':'',event.metaKey?'Super':'',key].filter(Boolean).join('+')
 return validShortcut(value)?value:undefined
}
export function validShortcut(value:unknown):value is string{
 if(typeof value!=='string'||value.length>64)return false
 const parts=value.split('+'),key=parts.pop()!
 return parts.length>0&&parts.length<=3&&new Set(parts).size===parts.length&&parts.every(p=>['Control','Alt','Shift','Super'].includes(p))&&parts.some(p=>p!=='Shift')&&/^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4]))$/.test(key)
}
