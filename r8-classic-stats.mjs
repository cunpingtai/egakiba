/** Original V2 measured statistics. These are not V3 HP values. */
import {loadClassicLibrary} from './engine/classic-v2-adapter.mjs';
import {statGauges} from './legacy-v2/config.js';
let revision=0;
async function refresh(screen,payload){
 const req=++revision;if(window.MojiBladeR17Prepare)return;if(payload?.mode!=='quick'||screen!=='prepare')return;
 const target=document.querySelector('#flow-content');if(!target)return;
 try{
  const library=await loadClassicLibrary(payload.player.fontId);
  const metrics=library.measure(payload.player.char,'mixed');const stats=statGauges(metrics);
  if(req!==revision||document.hidden&&screen==='glyph')return;
  const numbers=[stats.speed,stats.power,null,stats.balance].map(x=>x===null?null:Math.round(x*100));
  if(screen==='glyph'){
   const values=target.querySelectorAll('.r2-stat strong'),bars=target.querySelectorAll('.r2-stat i');numbers.forEach((x,i)=>{if(values[i])values[i].textContent=x===null?'—':String(x);if(bars[i])bars[i].style.width=x===null?'0%':x+'%';});
   const note=target.querySelector('.stat-note');if(note)note.textContent='文字のカタチから強さが決まる。クラシックにはHPがありません。';
   const tag=target.querySelector('.stats-title span');if(tag)tag.textContent='CLASSIC';
  }else{
   const display=target.querySelector('#r8-native-prepare-stats');if(display)display.textContent=`${numbers[0]} / ${numbers[1]} / — (no HP) · Balance ${numbers[3]}`;
  }
 }catch(error){
  if(req!==revision)return;
  const note=target.querySelector('.stat-note');if(note)note.textContent='この文字を読み込めません。別の文字か書体を試してね。';
  const display=target.querySelector('#r8-native-prepare-stats');if(display)display.textContent='文字を準備できません';
 }
}
document.addEventListener('moji:r8-flow',event=>{void refresh(event.detail?.screen,event.detail?.payload);});
