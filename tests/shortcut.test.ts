import { expect, it } from 'vitest'
import { recordedShortcut } from '../src/shared/settings'
const key={key:'n',code:'KeyN',ctrlKey:true,altKey:true,shiftKey:false,metaKey:false}
it('captures supported physical combinations with canonical modifiers',()=>{
 expect(recordedShortcut(key)).toBe('Control+Alt+N')
 expect(recordedShortcut({...key,ctrlKey:false,altKey:false,metaKey:true,key:'F12',code:'F12'})).toBe('Super+F12')
 expect(recordedShortcut({...key,shiftKey:true,key:'!',code:'Digit1'})).toBe('Control+Alt+Shift+1')
})
it('ignores modifier-only, unmodified, composing, repeated and unsupported keys',()=>{
 for(const event of [{...key,ctrlKey:false,altKey:false},{...key,repeat:true},{...key,isComposing:true},{...key,key:'Control',code:'ControlLeft'},{...key,key:'Escape',code:'Escape'},{...key,key:'Tab',code:'Tab'},{...key,key:'a',code:'KeyA',ctrlKey:false,altKey:false,shiftKey:true}])expect(recordedShortcut(event)).toBeUndefined()
})
