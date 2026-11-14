// A small curated palette. IDs are stable and persisted; values are tuned as a
// set (paper, rolled underside, ink) so every colour keeps the same contrast.
export const COLORS=['yellow','peach','mint','lavender','blue'] as const
export type PaperColor=typeof COLORS[number]
export type Paper={label:string;top:string;bottom:string;curlLight:string;curlMid:string;curlDark:string;ink:string}
export const PALETTE:Record<PaperColor,Paper>={
 yellow:{label:'Yellow',top:'#fff0a6',bottom:'#efda82',curlLight:'#fff8d1',curlMid:'#e4d39b',curlDark:'#ac9b6e',ink:'#443a28'},
 peach:{label:'Peach',top:'#f8d8bd',bottom:'#edc5a6',curlLight:'#fff0df',curlMid:'#ead0b7',curlDark:'#bca08a',ink:'#47362a'},
 mint:{label:'Mint',top:'#d5efd7',bottom:'#bbdfc1',curlLight:'#eefaef',curlMid:'#c6e0ca',curlDark:'#8fae96',ink:'#2c4034'},
 lavender:{label:'Lavender',top:'#e4ddf6',bottom:'#d0c6ec',curlLight:'#f4f0fc',curlMid:'#d5cdea',curlDark:'#a096bd',ink:'#3a3350'},
 blue:{label:'Blue',top:'#d5e8f8',bottom:'#bad6f0',curlLight:'#edf6fd',curlMid:'#c5dbee',curlDark:'#8fa9c2',ink:'#2b3d4f'}
}
export const DEFAULT_COLOR:PaperColor='yellow'
export const isPaperColor=(value:unknown):value is PaperColor=>typeof value==='string'&&(COLORS as readonly string[]).includes(value)
/** Saves from schema 1 stored a numeric paper variant. */
export const legacyColor=(variant:unknown):PaperColor|undefined=>variant===0?'yellow':variant===1?'peach':undefined
/** WCAG relative-luminance contrast ratio of two #rrggbb colours. */
export function contrast(a:string,b:string):number{
 const luminance=(hex:string)=>{
  const [r,g,bl]=[1,3,5].map(i=>{const v=parseInt(hex.slice(i,i+2),16)/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)})
  return .2126*r+.7152*g+.0722*bl
 }
 const [hi,lo]=[luminance(a),luminance(b)].sort((x,y)=>y-x)
 return (hi+.05)/(lo+.05)
}
