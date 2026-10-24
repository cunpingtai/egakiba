/** Native glyph stats for the story selector. Never show local raster demo values as native V2 values. */
import {loadClassicLibrary,classicGlyphMetrics} from './engine/classic-v2-adapter.mjs';
import {deriveNativeStats} from './engine/native-hp-rules.mjs';
let revision=0;
async function refresh(screen,payload){
 const req=++revision;if(window.MojiBladeR17Prepare)return;if(payload?.mode!=='story'||screen!=='prepare')return;
 const target=document.querySelector('#flow-content');if(!target)return;
 try{
  const library=await loadClassicLibrary(payload.player.fontId);const glyph=library.get(payload.player.char);
  const n=deriveNativeStats(glyph,classicGlyphMetrics(glyph));
  if(req!==revision)return;
  if(screen==='glyph'){
   const v=[n.speed,n.power,n.maxHp,n.balance],values=target.querySelectorAll('.r2-stat strong'),bars=target.querySelectorAll('.r2-stat i');
   v.forEach((number,i)=>{if(values[i])values[i].textContent=String(number);if(bars[i])bars[i].style.width=Math.min(100,number)+'%';});
   const note=target.querySelector('.stat-note');if(note)note.textContent='文字の形が強さを変える！書体も切り替えてみよう。';
   const badge=target.querySelector('.stats-title span');if(badge)badge.textContent='ARENA HP';
  }else{const value=target.querySelector('#r9-native-prepare-stats');if(value)value.textContent=`${n.speed} / ${n.power} / ${n.maxHp} · BAL ${n.balance}`;
   const note=target.querySelector('.prepare-summary .stat-note');if(note)note.textContent='文字の形から計算したバトル能力';
  }
 }catch(error){if(req!==revision)return;const note=target.querySelector('.stat-note');if(note)note.textContent='この文字を読み込めません。別の文字か書体を試してね。';const value=target.querySelector('#r9-native-prepare-stats');if(value)value.textContent='文字を準備できません';}
}
document.addEventListener('moji:r8-flow',e=>{void refresh(e.detail?.screen,e.detail?.payload);});
