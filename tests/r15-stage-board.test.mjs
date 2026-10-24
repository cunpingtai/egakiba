import test from 'node:test';
import assert from 'node:assert/strict';
import {getStoryBoard,selectStoryStage,storyCopy,getStageMission} from '../engine/r15-stage-board.mjs';
import {LEVEL_CATALOG,LEVEL_ORDER,evaluateLevelResult} from '../engine/level-catalog.mjs';
import {R10_SAVE_KEY} from '../engine/r10-arcade-save.mjs';

const storage=(progress=null)=>({getItem(key){assert.equal(key,R10_SAVE_KEY);return progress===null?null:JSON.stringify({schema:1,revision:2,progress,battles:10,lastGlyph:'龍',lastFont:'gothic',updatedAt:null})}});
const entries=(...starCounts)=>Object.fromEntries(starCounts.map((stars,i)=>[`01-0${i+1}`,{stars,bestSeconds:6+i*3}]));

test('R15 initial stage board shows only four genuine playable story entries',()=>{
 const b=getStoryBoard(storage(), 'ja');
 assert.deepEqual(b.stages.map(x=>x.id),LEVEL_ORDER);
 assert.deepEqual(b.stages.map(x=>x.state),['next','locked','locked','locked']);
 assert.deepEqual(b.stages.map(x=>x.selectable),[true,false,false,false]);
 assert.equal(selectStoryStage(b,'01-04'),'01-01');
 assert.equal(selectStoryStage(b,'02-01'),'01-01');
 assert.equal(b.earnedStars,0);assert.equal(b.nextSelectableId,'01-01');
 assert.equal(b.stages.length,4);
 assert.equal('pending' in b.copy,false);
});

test('R15 progress gates, replay and historic best use only validated R10 save',()=>{
 const b=getStoryBoard(storage(entries(3,1)),'zh');
 assert.equal(b.clearedCount,2);assert.equal(b.earnedStars,4);
 assert.deepEqual(b.stages.map(x=>x.state),['cleared','cleared','next','locked']);
 assert.equal(b.stages[0].bestSeconds,6);assert.equal(b.stages[1].bestSeconds,9);
 assert.equal(b.stages[2].bestSeconds,null);assert.equal(b.stages[3].stars,0);
 assert.equal(selectStoryStage(b,'01-01'),'01-01');
 assert.equal(selectStoryStage(b,'01-03'),'01-03');
 assert.equal(selectStoryStage(b,'01-04'),'01-03');
});

test('R15 all-clear still exposes replay, not a phantom next chapter',()=>{
 const b=getStoryBoard(storage(entries(3,3,2,1)),'en');
 assert.equal(b.allCleared,true);
 assert.equal(b.nextSelectableId,'01-04');
 assert.equal(b.stages.every(s=>s.selectable),true);
 assert.equal(selectStoryStage(b,'02-01'),'01-04');
});

test('R15 corrupted/out of order saves never make a stage clickable',()=>{
 const b=getStoryBoard(storage({'01-03':{stars:3,bestSeconds:6}}),'ja');
 assert.equal(b.clearedCount,0);
 assert.equal(b.stages[2].state,'locked');
 assert.equal(selectStoryStage(b,'01-03'),'01-01');
});

test('R15 local storage disabled is explicit and stage 1 remains playable',()=>{
 const b=getStoryBoard({getItem(){throw new Error('denied')}},'en');
 assert.equal(b.available,false);
 assert.equal(b.stages[0].selectable,true);
 assert.equal(b.stages[1].selectable,false);
 assert.match(b.copy.storage,/unavailable/);
});

test('R15 mission contracts match the active evaluator in all four stages',()=>{
 for(const id of LEVEL_ORDER){
  const level=LEVEL_CATALOG[id];
  const mission=getStageMission(id,'en');
  assert.equal(mission.targetSeconds,level.targetSeconds);
  assert.equal(mission.minimumHpRatio,.55);
  assert.equal(mission.conditions.length,3);
  assert.deepEqual(mission.conditions.map(c=>c.star),[1,2,3]);
  const outcome=evaluateLevelResult(level,{winner:0,hp:[60,0],playerMaxHp:100,durationSeconds:level.targetSeconds},{power:1,angle:.2});
  assert.equal(outcome.cleared,true);assert.equal(outcome.stars,3);
  const slow=evaluateLevelResult(level,{winner:0,hp:[54,0],playerMaxHp:100,durationSeconds:level.targetSeconds+.01},{power:1,angle:.2});
  assert.equal(slow.stars,1);
 }
 assert.equal(getStageMission('01-02','en').requiredPower,.65);
 assert.equal(getStageMission('01-03','ja').requiredAngleDegrees,9);
 assert.equal(getStageMission('02-01','en'),null);
});

test('R15 stars require clearing the objective even if HP/time are sufficient',()=>{
 for(const id of LEVEL_ORDER){
  const level=LEVEL_CATALOG[id];
  const action={power:level.objective==='power-control'?.64:1,angle:level.objective==='angle-control'?.14:.2};
  const invalid=evaluateLevelResult(level,{winner:0,hp:[95,0],playerMaxHp:100,durationSeconds:1},action);
  if(['power-control','angle-control'].includes(level.objective))assert.deepEqual(invalid,{cleared:false,stars:0,objectiveMet:false});
  const loss=evaluateLevelResult(level,{winner:1,hp:[99,1],playerMaxHp:100,durationSeconds:1},{power:1,angle:.2});
  assert.equal(loss.stars,0);
 }
});

test('R15 stage translations do not silently fallback for supported locales',()=>{
 for(const lang of ['ja','en','zh','ko']){
  assert.equal(storyCopy(lang).names.length,4);
  for(const id of LEVEL_ORDER){const m=getStageMission(id,lang);assert.equal(m.conditions.length,3);assert.ok(m.main.length);assert.ok(m.instructions.length);}
 }
 assert.equal(storyCopy('not-a-locale'),storyCopy('ja'));
});
