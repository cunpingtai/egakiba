import test from 'node:test';import assert from 'node:assert/strict';
import {pullAim,swipeDash,shouldCaptureGameplayKey,compactOutcome} from '../engine/r11-input.mjs';
test('pull controls produce bounded aim and power',()=>{assert.equal(pullAim(5,5),null);let a=pullAim(100,120);assert.ok(a.angle<0);assert.ok(a.power>0&&a.power<=1);assert.ok(pullAim(-100,120).angle>0);assert.ok(pullAim(500,1).angle<=80*Math.PI/180+1e-6);});
test('dash gestures are directional with cancellation threshold',()=>{assert.equal(swipeDash(8,8),null);assert.ok(Math.abs(swipeDash(60,0).heading-Math.PI/2)<.01);assert.ok(Math.abs(swipeDash(0,-60).heading)<.01);});
test('keyboard does not steal typing',()=>{assert.equal(shouldCaptureGameplayKey({closest:()=>({})}),false);assert.equal(shouldCaptureGameplayKey({closest:()=>null}),true);assert.equal(compactOutcome('win'),'VICTORY');});
