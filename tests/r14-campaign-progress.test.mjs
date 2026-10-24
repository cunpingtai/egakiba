import test from 'node:test';
import assert from 'node:assert/strict';
import {readCampaignSnapshot,CAMPAIGN_STAGE_COUNT} from '../engine/r14-campaign-progress.mjs';
import {R10_SAVE_KEY} from '../engine/r10-arcade-save.mjs';

const makeStorage = data => ({getItem(key){assert.equal(key,R10_SAVE_KEY);return data===null?null:JSON.stringify({schema:1,revision:0,progress:data,battles:0,lastGlyph:'龍',lastFont:'gothic',updatedAt:null})}});
const saved = stars => Object.fromEntries(stars.map((n,i)=>[`01-0${i+1}`,{stars:n,bestSeconds:8+i}]));

test('new players see first playable stage and no false saved stars',()=>{
 const s=readCampaignSnapshot(makeStorage(null));
 assert.equal(CAMPAIGN_STAGE_COUNT,4);
 assert.equal(s.saveStatus,'new');assert.equal(s.nextLevelId,'01-01');assert.equal(s.clearedCount,0);
 assert.equal(s.hasProgress,false);assert.equal(s.allCleared,false);
 assert.equal(s.earnedStars,0);assert.equal(s.maxStars,12);
 assert.deepEqual(s.stages.map(x=>x.state),['next','locked','locked','locked']);
});

test('one cleared stage resumes at next unlocked real stage',()=>{
 const s=readCampaignSnapshot(makeStorage(saved([2])));
 assert.equal(s.nextLevelId,'01-02');assert.equal(s.clearedCount,1);assert.equal(s.earnedStars,2);
 assert.equal(s.hasProgress,true);assert.equal(s.lastGlyph,'龍');
 assert.deepEqual(s.stages.map(x=>x.state),['cleared','next','locked','locked']);
});

test('three clear stages navigate to boss, never the locked chapter 2',()=>{
 const s=readCampaignSnapshot(makeStorage(saved([3,2,1])));
 assert.equal(s.nextLevelId,'01-04');assert.equal(s.clearedCount,3);assert.equal(s.earnedStars,6);
});

test('finishing chapter returns replay path and earned stars',()=>{
 const s=readCampaignSnapshot(makeStorage(saved([3,3,2,1])));
 assert.equal(s.allCleared,true);assert.equal(s.nextLevelId,'01-04');assert.equal(s.clearedCount,4);
 assert.equal(s.earnedStars,9);assert.deepEqual(s.stages.map(x=>x.state),['cleared','cleared','cleared','cleared']);
});

test('out-of-order or invalid data is not presented as completed content',()=>{
 const s=readCampaignSnapshot(makeStorage({'01-02':{stars:3,bestSeconds:7},'01-04':{stars:3,bestSeconds:8}}));
 assert.equal(s.clearedCount,0);assert.equal(s.earnedStars,0);assert.equal(s.nextLevelId,'01-01');
});

test('storage failure is signalled without granting fake progress',()=>{
 const broken={getItem(){throw Error('Storage disabled')}};
 const s=readCampaignSnapshot(broken);
 assert.equal(s.saveStatus,'unavailable');assert.equal(s.available,false);
 assert.equal(s.nextLevelId,'01-01');assert.equal(s.hasProgress,false);
});
