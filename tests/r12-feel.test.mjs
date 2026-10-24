import test from 'node:test';import assert from 'node:assert/strict';
import {impactTier,gestureFinish} from '../engine/r12-feedback.mjs';
import {assessPull,hitTarget} from '../engine/r12-touch.mjs';
test('tier scales by actual event magnitude and critical always wins',()=>{
 assert.equal(impactTier({force:1,strength:.1,damage:[1,1]}).tier,'normal');
 assert.equal(impactTier({force:1000,strength:1,damage:[25,25]}).tier,'heavy');
 assert.equal(impactTier({force:0,strength:0,critical:true}).tier,'critical');
 assert.ok(impactTier({force:1e12,strength:1000}).intensity<=1);
});
test('pull requires deliberate movement; return to origin cancels',()=>{
 assert.equal(assessPull({dx:3,dy:9,release:true}).outcome,'cancel');
 assert.equal(assessPull({dx:75,dy:110,release:true}).outcome,'fire');
 assert.equal(assessPull({dx:0,dy:22,release:true}).outcome,'fire');
 assert.equal(assessPull({dx:75,dy:110,release:true,precision:true}).outcome,'aim');
 assert.equal(assessPull({dx:2,dy:3,everArmed:true,release:true}).outcome,'cancel');
 assert.equal(assessPull({dx:75,dy:110,release:true,pointerCancelled:true}).outcome,'cancel');
 assert.equal(hitTarget({x:10,y:10,centerX:20,centerY:20}),true);
 assert.equal(hitTarget({x:900,y:900,centerX:20,centerY:20}),false);
 assert.equal(gestureFinish({distance:100,withinCancel:true}),'cancel');
});
