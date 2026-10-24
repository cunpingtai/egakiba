import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPlayerProfile,filterPlayerHistory,renderPlayerProfile,profileCopy} from '../engine/r20-player-profile.mjs';
import {R10_SAVE_KEY} from '../engine/r10-arcade-save.mjs';
import {R19_HISTORY_KEY} from '../engine/r19-result-report.mjs';
const file=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
function store(progress={},entries=[],battles=44){const data=new Map([
 [R10_SAVE_KEY,JSON.stringify({schema:1,revision:10,progress,battles,lastGlyph:'龍',lastFont:'mincho',updatedAt:'2026-10-24T00:00:00Z'})],
 [R19_HISTORY_KEY,JSON.stringify(entries)]
]);return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};}
const entry=(i,{stage='01-01',outcome='win',glyph='龍',cleared=true}={})=>({version:1,mode:'story',levelId:stage,glyph,font:'mincho',outcome,cleared,stars:cleared?2:0,durationSeconds:8.3+i,hpRemaining:50,dashCount:1,contactEvents:2,ruleset:'local-v1',playedAt:new Date(Date.UTC(2026,9,24,0,i)).toISOString()});
test('lifetime battle counter never used as win-rate denominator',()=>{
 const p=readPlayerProfile(store({'01-01':{stars:3,bestSeconds:9},'01-02':{stars:1,bestSeconds:18}},[entry(0),entry(1,{outcome:'loss',cleared:false}),entry(2,{outcome:'draw',cleared:false})],120));
 assert.equal(p.storyBattles,120);assert.equal(p.history.length,3);assert.equal(p.recentWinRate,33);assert.equal(p.wins,1);assert.equal(p.clearedCount,2);assert.equal(p.stages[0].stars,3);assert.equal(p.stages[1].bestSeconds,18);
 const html=renderPlayerProfile(p,{locale:'en'});assert.match(html,/120/);assert.match(html,/33%/);assert.match(html,/latest 30 saved Story matches/);
});
test('filter combinations match only the actual R19 journal entries',()=>{
 const p=readPlayerProfile(store({},[entry(0),entry(1,{stage:'01-02',outcome:'loss',cleared:false}),entry(2,{stage:'01-02',outcome:'draw',cleared:false})]));
 assert.deepEqual(filterPlayerHistory(p.history,{stage:'01-02',outcome:'loss'}).map(x=>x.outcome),['loss']);
 assert.equal(filterPlayerHistory(p.history,{stage:'01-01',outcome:'draw'}).length,0);
 assert.equal(filterPlayerHistory(p.history,{stage:'impossible',outcome:'all'}).length,0);
 assert.equal(filterPlayerHistory(p.history,{stage:'all',outcome:'other'}).length,0);
 assert.match(renderPlayerProfile(p,{locale:'zh',stage:'01-02',outcome:'loss'}),/筛选结果/);
 assert.match(renderPlayerProfile(p,{locale:'en',stage:'01-01',outcome:'draw'}),/No matches match these filters/);
});
test('empty/legacy save is honest; newer journal is optional and no fake Classic records',()=>{
 const p=readPlayerProfile(store({},[],23));assert.equal(p.storyBattles,23);assert.equal(p.recentWinRate,null);
 const out=renderPlayerProfile(p,{locale:'zh'});assert.match(out,/23/);assert.match(out,/无法补回/);assert.match(out,/Classic 对战尚未记录/);
 assert.doesNotMatch(out,/23%/);
});
test('inaccessible and damaged R10 storage fails safely, not fake zero authoritative totals',()=>{
 const blocked={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
 const result=readPlayerProfile(blocked);assert.equal(result.storageStatus,'unavailable');assert.equal(result.storyBattles,null);
 assert.match(renderPlayerProfile(result,{locale:'en'}),/Local storage is unavailable/);
 const damaged={getItem:k=>k===R10_SAVE_KEY?'{bad':null};const d=readPlayerProfile(damaged);
 assert.equal(d.storageStatus,'unavailable');assert.equal(d.clearedCount,0);
});
test('glyph popularity comes only from capped recent valid Story journal',()=>{
 const p=readPlayerProfile(store({},[entry(0),entry(1),entry(2,{glyph:'文'}),entry(3,{glyph:'剣'})]));
 assert.deepEqual(p.favorites.map(v=>[v.glyph,v.count]),[['龍',2],['剣',1],['文',1]]);
});
test('all supported languages are complete and safely escape poisoned journal text',()=>{
 for(const lang of ['ja','zh','en','ko'])for(const key of ['title','sample','missing','blocked','filterStage','filterOutcome','note'])assert.ok(profileCopy(lang)[key]);
 const p=readPlayerProfile(store({},[entry(0,{glyph:'<img src=x onerror=alert(1)>'})]));
 const html=renderPlayerProfile(p,{locale:'en'});assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img/);
 assert.doesNotMatch(html,/undefined|NaN%/);
});
test('static and React entries expose the real local profile and remove unimplemented account navigation',()=>{
 for(const f of ['r9-index.html','src/styles.css'])assert.match(file(f),/r20-profile\.css/);
 for(const f of ['r9-index.html','src/routes/index.tsx']){assert.match(file(f),/data-panel="profile"/);assert.match(file(f),/data-panel="collection"/);assert.doesNotMatch(file(f),/data-panel="account"|data-panel="leaderboard"|data-panel="local"/);}
 const flow=file('r2-flow.js'),app=file('app.js');
 assert.match(flow,/renderPlayerProfile\(readPlayerProfile\(\)/);assert.match(flow,/r20-filter-stage/);assert.match(flow,/r20-filter-outcome/);
 assert.match(flow,/data-r20-story/);assert.match(flow,/data-r20-home/);
 assert.match(app,/\['profile','collection'\]\.includes\(target\)/);assert.doesNotMatch(app,/account linking|cloud sync are planned/);
 for(const f of ['r8-classic-screen.mjs','r9-story-screen.mjs'])assert.ok(!file(f).includes('r20-player-profile'));
});
