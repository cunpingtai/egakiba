import assert from 'node:assert/strict';
import {ArenaSimulation,SIM_VERSION,MAX_TICKS} from '../engine/arena-sim.mjs';
import {measureBinaryMask,statsFromFeatures} from '../engine/glyph-stats.mjs';
import {emptySave,validateSave,commitBattle,loadSave,SAVE_KEY} from '../engine/local-save.mjs';
const player={glyph:'文',stats:{speed:69,power:62,balance:66,maxHp:120,pointiness:.3}};
const enemy={glyph:'字',stats:{speed:67,power:65,balance:61,maxHp:74,pointiness:.35}};
function sim(angle,power=.78){return new ArenaSimulation({player,enemy,playerAction:{angle,power,spinDirection:1},stage:'01-01'});}
const a=sim(0),b=sim(0);a.runToEnd();b.runToEnd();assert.deepEqual(a.snapshot(),b.snapshot(),'fixed-tick repeatability');assert.equal(a.result.simulationVersion,SIM_VERSION);assert.ok(a.result.winner===0||a.result.winner===1);assert.ok(a.events.some(e=>e.type==='damage'),'real HP damage emitted');assert.ok(a.tops[0].hp<120&&a.tops[1].hp<74,'collision reduces HP');assert.ok(a.result.tick<=MAX_TICKS);
const bad=sim(-.8);bad.runToEnd();assert.equal(bad.result.reason,'ring-out');assert.equal(bad.result.winner,1);
const miss=sim(.8);miss.runToEnd();assert.equal(miss.result.winner,null);assert.equal(miss.result.reason,'no-contact');
const mask=new Uint8Array(40*40);for(let y=10;y<30;y++)for(let x=10;x<30;x++)mask[y*40+x]=1;const features=measureBinaryMask(mask,40),s=statsFromFeatures(features);assert.ok(s.maxHp>0&&s.speed>0&&s.power>0);assert.equal(features.pixelCount,400);assert.throws(()=>measureBinaryMask([],30));
const storage={_:{},getItem(k){return this._[k]||null;},setItem(k,v){this._[k]=v;}};
let save=emptySave();const result={...a.result,playerMaxHp:120};let committed=commitBattle(save,{levelId:'01-01',result,glyph:'文',font:'mincho'},storage);assert.equal(committed.status,'saved');assert.ok(storage.getItem(SAVE_KEY));assert.equal(committed.save.battleCount,1);
assert.equal(loadSave(storage).save.battleCount,1);
assert.equal(validateSave(committed.save).lastFont,'mincho');
let losing=commitBattle(committed.save,{levelId:'01-01',result:{...bad.result,playerMaxHp:120}},storage);assert.equal(losing.save.battleCount,2);assert.deepEqual(losing.save.progress,committed.save.progress,'loss cannot erase stage progress');
const failed={getItem:()=>{throw Error('Storage off');},setItem:()=>{throw Error('Storage off');}};assert.equal(loadSave(failed).status,'unavailable');assert.equal(commitBattle(save,{result,levelId:'01-01'},failed).status,'memory-only');
console.log('R3 ENGINE TESTS: PASS — deterministic replay, shot-dependent outcomes, HP damage, no-contact, mask stats, local save, failure fallback');
