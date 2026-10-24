#!/usr/bin/env node
/** Verifies deterministic replay for a local R9 trace with licensed fonts installed.
 * NOT an anti-cheat verdict; authentic server results require independent trusted inputs.
 */
import fs from 'node:fs';
import {parse} from '../legacy-v2/vendor/opentype.js';
import {GlyphLibrary} from '../legacy-v2/glyph.js';
import {FONTS} from '../legacy-v2/fonts.js';
import {simulateNativeHp} from '../engine/native-hp-adapter.mjs';
import {NATIVE_HP_RULESET,NATIVE_HP_PHYSICS,DAMAGE_MODEL} from '../engine/native-hp-rules.mjs';
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/verify_native_hp_trace.mjs /path/to/trace.json');process.exit(2);}
try{
 const bytes=fs.readFileSync(path);if(bytes.length>8*1024*1024)throw Error('Trace too large');const trace=JSON.parse(bytes.toString('utf8'));
 if(trace?.kind!=='unverified-local-native-hp'||trace.ranked!==false||trace.rulesetVersion!==NATIVE_HP_RULESET||trace.physicsVersion!==NATIVE_HP_PHYSICS||trace.damageModel!==DAMAGE_MODEL)throw Error('Incompatible rules or version');
 if(!Array.isArray(trace.fonts)||trace.fonts.length!==2||!trace.fonts.every(x=>Object.hasOwn(FONTS,x)||x==='gyosho'))throw Error('Unknown font');
 const libraries=new Map();for(const id of trace.fonts){const key=id==='gyosho'?'brush':id;if(libraries.has(id))continue;const file=new URL('../legacy-v2/fonts/'+FONTS[key].file,import.meta.url);const b=fs.readFileSync(file),arr=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);libraries.set(id,new GlyphLibrary(parse(arr,{lowMemory:true}),FONTS[key]));}
 const output=await simulateNativeHp({levelId:trace.levelId,player:trace.player,font:trace.fonts[0],enemy:trace.enemy,enemyFont:trace.fonts[1],library:libraries.get(trace.fonts[0]),opponentLibrary:libraries.get(trace.fonts[1]),enemyAction:trace.enemyAction},{action:trace.action});
 if(!output.complete)throw Error('Replayed battle incomplete');const expected=output.summary;
 for(const key of ['finalStateHash','frames'])if(JSON.stringify(trace[key])!==JSON.stringify(expected[key]))throw Error(`Mismatch: ${key}`);
 for(const key of ['hp','result','events','stats'])if(JSON.stringify(trace[key])!==JSON.stringify(expected[key]))throw Error(`Mismatch: ${key}`);
 console.log(`LOCAL REPLAY MATCH: ${trace.levelId}, ${expected.frames} frames, native hash ${expected.finalStateHash}. Not server-verified.`);
}catch(error){console.error('R9 replay verification FAILED:',error.message);process.exitCode=1;}
