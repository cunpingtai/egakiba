import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parse} from '../legacy-v2/vendor/opentype.js';
import {GlyphLibrary} from '../legacy-v2/glyph.js';
import {FONTS} from '../legacy-v2/fonts.js';
import {NATIVE_HP_RULESET,damageFromForce,deriveNativeStats,resolveNativeHp,applyImpactToHp} from '../engine/native-hp-rules.mjs';
import {createNativeHpBattle,simulateNativeHp} from '../engine/native-hp-adapter.mjs';
import {emptyNativeSave,commitNativeResult,loadNativeSave,R9_SAVE_KEY} from '../engine/r9-native-save.mjs';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),get raw(){return m;}};};
const fakeGlyph={char:'文'};
const fakeMetrics={speed:.5,power:.7,balance:.4};
test('R9 damage bounded and critical directional',()=>{
 const a=deriveNativeStats(fakeGlyph,fakeMetrics),b=deriveNativeStats(fakeGlyph,{...fakeMetrics,power:.3});
 assert.ok(a.maxHp>=65&&a.maxHp<=112);
 assert.ok(damageFromForce(4500,a,b)>damageFromForce(150,a,b));
 assert.ok(damageFromForce(1e30,a,b)<=48);
 assert.ok(damageFromForce(3000,a,b,{critical:true})>damageFromForce(3000,a,b));
 const hit=applyImpactToHp([80,80],[a,b],{force:3000,criticalAttackers:[0]});assert.ok(hit.damage[1]>hit.damage[0]);
 assert.throws(()=>damageFromForce(Number.NaN,a,b));
});
test('R9 deterministic outcome priority and simultaneous HP KO',()=>{
 assert.equal(resolveNativeHp({nativeResult:{winner:1,reason:'場外'},hp:[0,100]}).winner,1);
 assert.equal(resolveNativeHp({nativeResult:{winner:0,reason:'回転停止'},hp:[0,0]}).winner,0);
 assert.equal(resolveNativeHp({nativeResult:{winner:null,reason:'時間切れ'},hp:[0,0]}).reason,'double-ko');
 assert.equal(resolveNativeHp({hp:[0,0]}).winner,null);
 assert.equal(resolveNativeHp({hp:[1,0]}).winner,0);
 assert.equal(resolveNativeHp({hp:[1,1]}),null);
});
test('R9 isolated versioned saves and stage unlock',()=>{
 const m=store(),old=emptyNativeSave(),valid={kind:'unverified-local-native-hp',ranked:false,rulesetVersion:NATIVE_HP_RULESET,physicsVersion:'moji-blade-rapier021-r16-app-inner1',levelId:'01-01',finalStateHash:'123abc',frames:200,hp:[100,0],stats:[{maxHp:100},{maxHp:65}],result:{winner:0}};
 const action={angle:.2,power:.82,spinDirection:1};
 const result=commitNativeResult(old,{levelId:'01-01',trace:valid,action},m);assert.equal(result.status,'saved');assert.ok(result.save.progress['01-01'].stars);assert.equal(loadNativeSave(m).save.battles,1);assert.ok(m.raw.has(R9_SAVE_KEY));assert.ok(!m.raw.has('moji-blade.v3.r5.local-save.v1'));
 assert.throws(()=>commitNativeResult(old,{levelId:'01-02',trace:{...valid,levelId:'01-02'},action},m),/Locked/);
 assert.throws(()=>commitNativeResult(old,{levelId:'01-01',trace:{...valid,rulesetVersion:'arena-hp-r5-experimental'},action},m),/Invalid/);
 const fail={getItem:()=>null,setItem:()=>{throw Error('storage blocked');}};assert.equal(commitNativeResult(old,{levelId:'01-01',trace:valid,action},fail).status,'memory-only');
});
const fontPath=process.env.MOJI_V2_FONT_PATH;
test('R9 uses original Rapier outcomes; trace stable across replay', {skip:!fontPath?'Set MOJI_V2_FONT_PATH for native Rapier test':false},async()=>{
 const bytes=fs.readFileSync(fontPath),arr=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),lib=new GlyphLibrary(parse(arr,{lowMemory:true}),FONTS.gothic);
 const args={levelId:'01-01',player:'文',font:'gothic',enemy:'字',enemyFont:'gothic',library:lib,opponentLibrary:lib};
 const a=await simulateNativeHp(args,{action:{angle:0,power:.8,spinDirection:1}});
 const b=await simulateNativeHp(args,{action:{angle:0,power:.8,spinDirection:1}});
 assert.ok(a.complete);assert.deepEqual(a.result,b.result);assert.deepEqual(a.hp,b.hp);assert.deepEqual(a.events,b.events);assert.equal(a.summary.finalStateHash,b.summary.finalStateHash);
 assert.ok(a.events.length>0);assert.ok(a.events.some(x=>x.damage.some(d=>d>0)));assert.ok(a.summary.physicsVersion.includes('rapier'));
 const c=await createNativeHpBattle(args);assert.throws(()=>c.launch({angle:2* Math.PI,power:1,spinDirection:1}));c.dispose();
});
