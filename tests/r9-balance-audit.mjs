/** Engineering sample only; not a certification of fair battle outcomes. */
import fs from 'node:fs';
import {parse} from '../legacy-v2/vendor/opentype.js';
import {GlyphLibrary} from '../legacy-v2/glyph.js';
import {FONTS} from '../legacy-v2/fonts.js';
import {simulateNativeHp} from '../engine/native-hp-adapter.mjs';
import {LEVEL_CATALOG} from '../engine/level-catalog.mjs';
const libs={};
for(const f of ['gothic','mincho']){const buff=fs.readFileSync(new URL(`../legacy-v2/fonts/${FONTS[f].file}`,import.meta.url));libs[f]=new GlyphLibrary(parse(buff.buffer.slice(buff.byteOffset,buff.byteOffset+buff.byteLength),{lowMemory:true}),FONTS[f]);}
const attempts=[];
for(const level of Object.values(LEVEL_CATALOG)){
 const rows=[];
 for(const angle of [-.25,0,.25])for(const power of [.7,.95]){
  const r=await simulateNativeHp({levelId:level.id,player:'田',font:'gothic',library:libs.gothic,opponentLibrary:libs[level.enemyFont]},{action:{angle,power,spinDirection:1}});
  rows.push({angle,power,winner:r.result?.winner,reason:r.result?.reason,sec:Number(r.time.toFixed(2)),hits:r.events.length,hp:r.hp});
 }
 attempts.push({level:level.id,trials:rows,wins:rows.filter(r=>r.winner===0).length,losses:rows.filter(r=>r.winner===1).length,draws:rows.filter(r=>r.winner===null).length,hpKo:rows.filter(r=>r.reason==='hp-depleted').length});
 console.log(level.id,attempts.at(-1).wins,'wins',attempts.at(-1).losses,'losses',attempts.at(-1).draws,'draws',attempts.at(-1).hpKo,'HP KOs');
}
fs.writeFileSync(new URL('../docs/R9_BALANCE_SAMPLE.json',import.meta.url),JSON.stringify({label:'nonrepresentative engineering sample; one glyph, two fonts, six actions per level, original V2 physics',attempts},null,2));
