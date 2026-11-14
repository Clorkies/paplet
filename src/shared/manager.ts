import type { PaperColor } from './palette'
import type { SoundStyle } from './settings'
import type { NoteSet } from './sets'

export type CollectionNote={id:string;text:string;color:PaperColor;hidden:boolean;deletedAt?:number}
export type ManagerSettings={sound:boolean;soundStyle:SoundStyle;defaultColor:PaperColor;shortcut:string}
export type ManagerSnapshot={revision:number;notes:CollectionNote[];sets:NoteSet[];settings:ManagerSettings;storagePath:string;saveError:boolean}
export type ManagerAction=
 |{type:'show-all'|'hide-all'|'recover-all'|'undo-delete'}
 |{type:'create';setId?:string}
 |{type:'record-shortcut';active:boolean}
 |{type:'set-create';name:string;ids:string[]}
 |{type:'set-rename';id:string;name:string}
 |{type:'set-delete'|'set-show';id:string}
 |{type:'set-add'|'set-remove';id:string;ids:string[]}
 |{type:'show'|'hide'|'trash'|'restore'|'recover'|'locate'|'delete-forever';id:string}
 |{type:'batch';operation:'show'|'hide'|'trash'|'restore'|'delete-forever';ids:string[]}
 |{type:'settings';sound:boolean;soundStyle:SoundStyle;defaultColor:PaperColor;shortcut:string}
export type ManagerResult={ok:boolean;error?:string;warning?:string;id?:string;setId?:string;message?:string;cancelled?:boolean}
export interface ManagerAPI{
 snapshot():Promise<ManagerSnapshot>
 action(action:ManagerAction):Promise<ManagerResult>
 onChange(callback:(snapshot:ManagerSnapshot)=>void):()=>void
}
declare global{interface Window{collection:ManagerAPI}}
