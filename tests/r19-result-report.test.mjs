import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVEL_ORDER,LEVEL_CATALOG,evaluateLevelResult} from '../engine/level-catalog.mjs';
import {buildStoryReport,storyResultHTML,classicResultHTML,resultCopy,writeBattleJournal,readBattleJournal,R19_HISTORY_KEY,HISTORY_LIMIT} from '../engine/r19-result-report.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const fakeStorage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),data};};
const make=(id='01-01',{winner=0,frames=480,hp=80,maxHp=100,power=.8,angle=.20,prior={},status='saved'}={})=>{
 const trace={result:{winner,reason:'場外'},frames,hp:[hp,30],stats:[{maxHp}],arcadeActions:[{frame:10,heading:.1}],events:[{type:'contact'},{type:'contact'}],rulesetVersion:'arena-hp-rapier-r10-dash-local-v1'};
 const action={power,angle,spinDirection:1};const level=LEVEL_CATALOG[id];const evaluation=evaluateLevelResult(level,{winner,hp:trace.hp,playerMaxHp:maxHp,durationSeconds:frames/60},action);
 return buildStoryReport({levelId:id,trace,action,evaluation,previousProgress:prior,saveStatus:status,locale:'zh',glyph:'龍',font:'mincho'});
};
test('all four playable level objectives derive conditions from authoritative evaluator',()=>{
 for(const id of LEVEL_ORDER){const v=make(id);assert.equal(v.cleared,true);assert.equal(v.stars,3);assert.equal(v.checks.length,3);assert.deepEqual(v.checks.map(c=>c.passed),[true,true,true]);assert.equal(v.dashCount,1);assert.equal(v.contactEvents,2);}
 assert.equal(make('01-02',{power:.6}).stars,0);
 assert.equal(make('01-03',{angle:.05}).cleared,false);
 assert.equal(make('01-04',{frames:1800,hp:30}).stars,1);
});
test('a win with unmet main objective is not a cleared stage',()=>{
 const v=make('01-02',{power:.4,frames:500});assert.equal(v.outcome,'win');assert.equal(v.cleared,false);assert.equal(v.stars,0);assert.deepEqual(v.checks.map(x=>x.passed),[false,false,false]);
});
test('loss and draw earn no story stars even if HP and duration satisfy bonus thresholds',()=>{
 for(const winner of [1,null]){const v=make('01-01',{winner,frames:120,hp:90});assert.equal(v.cleared,false);assert.equal(v.stars,0);assert.deepEqual(v.checks.map(x=>x.passed),[false,false,false]);}
});
test('new records only when persisted improvement; previous best retained',()=>{
 const prior={'01-01':{stars:3,bestSeconds:5}};
 assert.equal(make('01-01',{prior,frames:600}).newTimeRecord,false);
 assert.equal(make('01-01',{prior,frames:600}).newStarRecord,false);
 const better=make('01-01',{prior:{'01-01':{stars:1,bestSeconds:18}},frames:480});assert.equal(better.newStarRecord,true);assert.equal(better.newTimeRecord,true);
 assert.equal(make('01-01',{status:'memory-only'}).newTimeRecord,false);
 assert.equal(make('01-01',{status:'memory-only'}).newStarRecord,false);
});
test('report uses real trace frame count / HP and actual event fields',()=>{
 const v=make('01-01',{frames:375,hp:54,maxHp:100});assert.equal(v.time,6.25);assert.equal(v.stars,2);assert.equal(v.hpRatio,.54);
 const html=storyResultHTML(v,{reason:'出界'});assert.match(html,/6\.3s/);assert.match(html,/54 \/ 100/);assert.match(html,/DASH/);assert.match(html,/接触事件/);
});
test('four supported languages have full result copy, user glyphs and reasons are HTML escaped',()=>{
 for(const locale of ['ja','zh','en','ko'])for(const key of ['main','extra','miss','met','noRank','history','memory'])assert.ok(resultCopy(locale)[key]);
 const r=make();const html=storyResultHTML({...r,locale:'en',reason:'<img src=x>'},{reason:'<script>alert(1)</script>',recent:[{version:1,mode:'story',levelId:'01-01',glyph:'<svg onload=x>',outcome:'win',stars:1,durationSeconds:6.2}]});
 assert.doesNotMatch(html,/<script>|<svg onload=/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;svg/);
 assert.match(classicResultHTML({locale:'en',type:'win',duration:3.15,reason:'ring out',contactEvents:8}),/3\.1s/);
 assert.doesNotMatch(classicResultHTML({locale:'zh',type:'loss',duration:9,contactEvents:10}),/剩余 HP|三星/);
});
test('journal remains separate from R10 save, capped at 30 valid records and graceful on storage failure',()=>{
 const storage=fakeStorage();const entry=make().journalEntry;
 for(let i=0;i<35;i++){const out=writeBattleJournal({...entry,playedAt:`2026-10-24T00:${String(i).padStart(2,'0')}:00.000Z`},storage);assert.equal(out.status,'saved');}
 const history=readBattleJournal(storage);assert.equal(history.length,HISTORY_LIMIT);assert.equal(history[0].playedAt,'2026-10-24T00:34:00.000Z');
 assert.equal(storage.data.size,1);assert.ok(storage.data.has(R19_HISTORY_KEY));
 assert.equal(writeBattleJournal({...entry,levelId:'99-99'},storage).status,'invalid');
 const blocked={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
 assert.deepEqual(readBattleJournal(blocked),[]);assert.equal(writeBattleJournal(entry,blocked).status,'unavailable');
});
test('actual Story and Classic modules wire R19 report without touching physics engine',()=>{
 const story=read('r9-story-screen.mjs'),classic=read('r8-classic-screen.mjs');
 for(const symbol of ['buildStoryReport','storyResultHTML','writeBattleJournal','readBattleJournal'])assert.ok(story.includes(symbol));
 assert.match(story,/const previousProgress=this\.save\?\.progress/);assert.match(story,/outcome\.status==='saved'\?writeBattleJournal/);
 assert.match(classic,/classicResultHTML/);assert.match(classic,/this\.contactEvents\+=events\.length/);
 for(const file of ['r9-index.html','src/styles.css'])assert.match(read(file),/r19-result\.css/);
 assert.match(read('r19-result.css'),/prefers-reduced-motion/);
});
