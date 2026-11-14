import type { PaperColor } from './palette'

export type CollectionNote={id:string;text:string;color:PaperColor;hidden:boolean;deletedAt?:number}
export type ManagerSettings={sound:boolean;defaultColor:PaperColor;shortcut:string}
export type ManagerSnapshot={revision:number;notes:CollectionNote[];settings:ManagerSettings;storagePath:string;saveError:boolean}
export type ManagerAction=
 |{type:'create'|'show-all'|'hide-all'|'recover-all'|'undo-delete'}
 |{type:'show'|'hide'|'trash'|'restore'|'recover'|'delete-forever';id:string}
 |{type:'settings';sound:boolean;defaultColor:PaperColor;shortcut:string}
export type ManagerResult={ok:boolean;error?:string;id?:string}
export interface ManagerAPI{
 snapshot():Promise<ManagerSnapshot>
 action(action:ManagerAction):Promise<ManagerResult>
 onChange(callback:(snapshot:ManagerSnapshot)=>void):()=>void
}
declare global{interface Window{collection:ManagerAPI}}
