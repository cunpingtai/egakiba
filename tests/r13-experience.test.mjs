import test from 'node:test';import assert from 'node:assert/strict';
import {QUALITY_PRESETS,defaultQuality,viewportClass,FrameQualityController,renderDue} from '../engine/r13-quality.mjs';
import {feedbackDecision,hapticDuration,resultMotion} from '../engine/r13-feedback-policy.mjs';
import {targetRadius,gestureWithinBounds,touchIntent} from '../engine/r13-mobile.mjs';
test('mobile heuristic respects narrow, weak devices and save-data',()=>{
 assert.equal(defaultQuality({width:320,memory:8,cores:8}),'battery');
 assert.equal(defaultQuality({width:390,memory:4,cores:4}),'balanced');
 assert.equal(defaultQuality({width:1440,memory:8,cores:8}),'high');
 assert.equal(defaultQuality({width:1440,memory:8,cores:8,saveData:true}),'battery');
 assert.equal(viewportClass({width:800,height:400}),'landscape-short');
 assert.equal(viewportClass({width:320,height:620}),'compact');
});
test('quality auto degrades after persistent slow frames with cooldown',()=>{
 const g=new FrameQualityController('high',{sample:20,cooldownMs:100});
 let changed=null;for(let i=0;i<40;i++){const next=g.observe(40,i*40);if(next)changed=next;}
 assert.equal(changed,'balanced');assert.equal(g.level,'balanced');
});
test('quality manual mode does not adapt and renderer skip is presentation-only',()=>{
 const g=new FrameQualityController('high',{sample:20,cooldownMs:100});g.setMode('battery');
 for(let i=0;i<300;i++)assert.equal(g.observe(50,i*50),null);
 assert.equal(g.level,'battery');assert.equal(QUALITY_PRESETS.battery.renderFPS,30);
 assert.equal(renderDue(1000,985,30),false);assert.equal(renderDue(1020,985,30),true);
});
test('audio, visuals and haptics have independent cooldown, reduction',()=>{
 const a=feedbackDecision({now:500,lastAudio:480,lastVisual:100,lastHaptic:0,critical:true,intensity:1,level:'standard'});
 assert.equal(a.audio,false);assert.equal(a.visual,true);assert.equal(a.haptic,true);
 assert.equal(feedbackDecision({now:500,critical:true,level:'off'}).visual,false);
 assert.equal(hapticDuration({critical:true,level:'quiet'}),0);
 assert.equal(resultMotion({type:'win',reduced:true}).transitionMs,0);
});
test('touch targets operate in CSS pixels independent of DPR',()=>{
 assert.ok(targetRadius({width:320,height:570,pointerType:'touch'})>=52);
 assert.ok(targetRadius({width:390,height:844,pointerType:'touch'})<100);
 assert.ok(targetRadius({width:320,height:570,pointerType:'mouse'})<targetRadius({width:320,height:570,pointerType:'touch'}));
 assert.equal(touchIntent({distance:5,elapsed:700}),'long-press');
 assert.equal(touchIntent({distance:33,elapsed:110}),'drag');
 assert.equal(gestureWithinBounds({start:{x:130,y:160},end:{x:210,y:250},width:390,height:780}),true);
 assert.equal(gestureWithinBounds({start:{x:130,y:50},end:{x:210,y:250},width:390,height:780}),false);
});
