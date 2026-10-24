import fs from 'node:fs';
import {parse} from '../legacy-v2/vendor/opentype.js';
import {GlyphLibrary} from '../legacy-v2/glyph.js';
import {FONTS} from '../legacy-v2/fonts.js';
import {createClassicBattle} from '../engine/classic-v2-adapter.mjs';
const caches={};
for(const [k,s] of Object.entries(FONTS)){
 const path=new URL('../legacy-v2/fonts/'+s.file, import.meta.url); const b=fs.readFileSync(path);const arr=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);caches[k]=new GlyphLibrary(parse(arr,{lowMemory:true}),s);
}
for(const [a,b,c,d] of [['文','字','gothic',0],['田','力','gothic',.15],['文','字','gothic',-.25],['山','剣','mincho',.16],['龍','剣','pop',0]]){
 const game=await createClassicBattle({player:a,opponent:b,font:c,opponentFont:c,library:caches[c],opponentLibrary:caches[c],enemyAction:{angle:d,power:.78,spinDirection:1}});
 game.launch({angle:d,power:.8,spinDirection:1});const events=[];
 for(let k=0;k<4000&&!game.finished;k++){for(const e of game.stepFixed())events.push({time:e.time,force:e.force,critical:e.critical,attackers:e.criticalAttackers});}
 const values=events.map(e=>e.force).sort((a,b)=>a-b);const at=p=>values[Math.min(values.length-1,Math.max(0,Math.floor(values.length*p)))];console.log(a,b,c,events.length,'min/median/p90/max',[at(0),at(.5),at(.9),at(.999)], 'critical',events.filter(e=>e.critical).length,'result',game.snapshot().result,'sec',game.battle.time.toFixed(2));game.dispose();
}
