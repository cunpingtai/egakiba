import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveBattleDraft,preflightKey,createBattlePreflight,createBattleLaunchLock} from '../engine/r17-preflight.mjs';
const user={char:'龍',fontId:'gothic'};
test('Story always uses catalog opponent AND opponent font, not player style or edited rival',()=>{
 const v=resolveBattleDraft({mode:'story',levelId:'01-03',player:user,opponent:{char:'假',fontId:'pop'}},{'01-01':{stars:1},'01-02':{stars:1}});
 assert.equal(v.ok,true);assert.equal(v.selection.rival,'山');assert.equal(v.selection.rivalFont,'mincho');assert.equal(v.selection.ruleset,'arena-hp-v3');
});
test('Story rejects locked, unknown stages, and unsupported modes',()=>{
 assert.equal(resolveBattleDraft({mode:'story',levelId:'01-02',player:user},{}).reason,'locked');
 assert.equal(resolveBattleDraft({mode:'story',levelId:'03-01',player:user},{}).reason,'stage');
 assert.equal(resolveBattleDraft({mode:'scout',player:user}).reason,'mode');
 assert.equal(resolveBattleDraft({mode:'story',levelId:'01-01',player:user},{}).ok,true);
});
test('Classic requires a real single visible opponent and retains no HP rules',()=>{
 const make=char=>resolveBattleDraft({mode:'quick',player:user,opponent:{char,fontId:'mincho'}});
 assert.equal(make('文剣').reason,'rival-multiple');
 assert.equal(make('\u200b').reason,'rival-invisible');
 assert.equal(make('').reason,'rival-empty');
 const good=make('字');assert.equal(good.ok,true);
 assert.equal(good.selection.rival,'字');assert.equal(good.selection.rivalFont,'mincho');assert.equal(good.selection.ruleset,'classic-v2');
});
test('same battle config has same fingerprint; changing rival, font or stage differs',()=>{
 const a=resolveBattleDraft({mode:'quick',player:user,opponent:{char:'字'}}).selection;
 assert.notEqual(preflightKey(a),preflightKey({...a,rival:'花'}));
 assert.notEqual(preflightKey(a),preflightKey({...a,playerFont:'pop'}));
 assert.notEqual(preflightKey(a),preflightKey({...a,levelId:'01-01'}));
});
test('native pair inspection blocks launch until current request resolves',async()=>{
 let release;const gate=createBattlePreflight(()=>new Promise(resolve=>release=resolve));
 const x={mode:'quick',rival:'字'};const task=gate.verify(x);
 assert.equal(gate.isReady(x),false);assert.equal(gate.snapshot().status,'checking');
 release({player:{speed:50},rival:{speed:20}});await task;
 assert.equal(gate.isReady(x),true);assert.equal(gate.snapshot().data.rival.speed,20);
});
test('fast opponent change makes stale validation ineligible',async()=>{
 const resolve=[];const gate=createBattlePreflight(()=>new Promise(r=>resolve.push(r)));
 const a={rival:'文'},b={rival:'字'};const p1=gate.verify(a),p2=gate.verify(b);
 resolve[1]({rival:{power:33}});await p2;resolve[0]({rival:{power:99}});await p1;
 assert.equal(gate.isReady(b),true);assert.equal(gate.isReady(a),false);assert.equal(gate.snapshot().data.rival.power,33);
 gate.invalidate();assert.equal(gate.isReady(b),false);
});
test('explicit glyph/font error reason preserved and never ready',async()=>{
 const gate=createBattlePreflight(async()=>{throw Object.assign(new Error('missing'),{reason:'rival-font-unavailable'});});
 assert.equal((await gate.verify({rival:'字'})).reason,'rival-font-unavailable');
 assert.equal(gate.isReady({rival:'字'}),false);
});
test('launch lock prevents concurrent bridge calls, releases on failure',async()=>{
 const lock=createBattleLaunchLock();let calls=0,release;
 const first=lock.run(async()=>{calls++;await new Promise(r=>release=r);return {status:'started'};});
 assert.equal(lock.isBusy(),true);
 assert.deepEqual(await lock.run(()=>{calls++;return {status:'started'};}),{status:'busy'});
 release();assert.equal((await first).status,'started');assert.equal(calls,1);
 await assert.rejects(lock.run(async()=>{throw Error('failed');}),/failed/);
 assert.equal(lock.isBusy(),false);
});
