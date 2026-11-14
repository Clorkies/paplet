/** Narrow accelerator subset: deliberate modifier plus a letter, digit or F key. */
export function validShortcut(value:unknown):value is string{
 if(typeof value!=='string'||value.length>64)return false
 const parts=value.split('+'),key=parts.pop()!
 return parts.length>0&&parts.length<=3&&new Set(parts).size===parts.length&&parts.every(p=>['Control','Alt','Shift','Super'].includes(p))&&parts.some(p=>p!=='Shift')&&/^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4]))$/.test(key)
}
