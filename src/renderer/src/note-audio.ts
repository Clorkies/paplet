import { DragSound } from './drag-sound'
import { ClickDropSound } from './click-drop-sound'
import type { SoundStyle } from '../../shared/settings'
export class NoteAudio{
 private rustle=new DragSound()
 private tactile=new ClickDropSound()
 private enabled=true
 private style:SoundStyle='rustle'
 private held=false
 configure(enabled:boolean,style:SoundStyle){if(this.enabled!==enabled||this.style!==style)this.stop();this.enabled=enabled;this.style=style;this.rustle.setEnabled(enabled&&style==='rustle')}
 visibility(kind:'hide'|'show'){if(this.enabled)this.tactile.play(kind)}
 update(speed:number){if(this.enabled&&this.style==='rustle')this.rustle.update(speed)}
 drag(held:boolean){
  if(held===this.held)return
  const wasHeld=this.held;this.held=held
  if(this.enabled&&this.style==='click-drop'&&(held||wasHeld))this.tactile.play(held?'grab':'drop')
  if(!held)this.rustle.stop()
 }
 stop(){this.held=false;this.rustle.stop();this.tactile.stop()}
 dispose(){this.held=false;this.rustle.dispose();this.tactile.dispose()}
}
