/** Uses the exact native GlyphLibrary/font assets consumed by both battle engines. */
import {loadClassicLibrary,classicGlyphMetrics} from './classic-v2-adapter.mjs';
import {deriveNativeStats} from './native-hp-rules.mjs';

export async function inspectBattlePair(selection){
 const evaluate=async (glyph,font,side)=>{
  let lib;
  try{lib=await loadClassicLibrary(font);}catch{throw Object.assign(new Error('font unavailable'),{reason:`${side}-font-unavailable`});}
  if(!lib.supports(glyph))throw Object.assign(new Error('glyph unsupported'),{reason:`${side}-unsupported`});
  const shape=lib.get(glyph,'mixed');
  const derived=deriveNativeStats(shape,classicGlyphMetrics(shape));
  return Object.freeze({speed:derived.speed,power:derived.power,balance:derived.balance,hp:selection.mode==='story'?derived.maxHp:null});
 };
 const player=await evaluate(selection.player,selection.playerFont,'player');
 const rival=await evaluate(selection.rival,selection.rivalFont,'rival');
 return Object.freeze({player,rival});
}
