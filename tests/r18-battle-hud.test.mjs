import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battlePhaseView,dashStatusView,healthStatusView,pauseActionsCopy} from '../engine/r18-battle-hud.mjs';
const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('all live phases have localized player-facing text in four languages',()=>{
 for(const locale of ['ja','zh','en','ko'])for(const phase of ['loading','ready','battle','paused','settling','result']){
  const v=battlePhaseView({locale,phase});assert.equal(v.phase,phase);assert.ok(v.title.length>0);assert.ok(v.detail.length>0);assert.ok(v.clock.length>0);
 }
 assert.equal(battlePhaseView({locale:'en',phase:'bad'}).phase,'loading');
 assert.equal(battlePhaseView({locale:'en',mode:'quick'}).mode,'classic');
});
test('dash never reports ready before launch, during pause, or result',()=>{
 for(const phase of ['loading','ready','paused','settling','result'])assert.equal(dashStatusView({phase,canDash:{ok:true}}).enabled,false);
 assert.equal(dashStatusView({phase:'battle',canDash:{ok:true}}).key,'ready');
});
test('dash status distinguishes actual mechanical block reasons without inventing remaining time',()=>{
 const conditions=[['cooldown','cooldown'],['low-spin','low-spin'],['speed','speed'],['disabled','unavailable']];
 for(const [reason,key] of conditions){const result=dashStatusView({locale:'zh',phase:'battle',canDash:{ok:false,reason},remainingFrames:120});assert.equal(result.key,key);assert.equal(result.enabled,false);}
 const cool=dashStatusView({locale:'en',phase:'battle',canDash:{reason:'cooldown'},remainingFrames:90});assert.match(cool.label,/1\.5s/);
 assert.equal(dashStatusView({locale:'en',phase:'battle',canDash:{reason:'cooldown'}}).label.includes('NaN'),false);
});
test('HP alerts are calculated from snapshot ratios and only in story',()=>{
 const player=healthStatusView({locale:'en',playerHp:20,playerMaxHp:100,rivalHp:100,rivalMaxHp:100});assert.equal(player.key,'player');
 assert.equal(healthStatusView({playerHp:100,playerMaxHp:100,rivalHp:25,rivalMaxHp:100}).key,'rival');
 assert.equal(healthStatusView({playerHp:90,playerMaxHp:100,rivalHp:60,rivalMaxHp:100}).key,'ok');
 assert.equal(healthStatusView({playerHp:10,playerMaxHp:0,rivalHp:50,rivalMaxHp:0}).key,'ok');
});
test('pause leave needs a second confirmation and is localized',()=>{
 for(const locale of ['ja','zh','en','ko']){const x=pauseActionsCopy(locale);assert.ok(x.exit.length);assert.ok(x.exitConfirm.length);assert.notEqual(x.exit,x.exitConfirm);assert.ok(x.exitWarning.length);}
});
test('actual Story runtime wires phases, cooldown, low HP, pause exit and focus',()=>{
 const file=src('r9-story-screen.mjs');
 for(const id of ['r18-phase-chip','r18-coach-title','r18-coach-detail','r18-dash-feedback','r18-health-feedback','r18-exit'])assert.match(file,new RegExp(id));
 for(const state of ["this.phase('loading')","this.phase('ready')","this.phase('battle')","this.phase('settling')","this.phase('result')"])assert.ok(file.includes(state),state);
 assert.match(file,/this\.exitArmed=true/);
 assert.match(file,/remainingFrames:remaining/);
 assert.match(file,/this\.\$\('r9-pause'\)\.disabled=true/);
});
test('Classic uses actual pause flag to stop Rapier steps, preserves no-HP semantics',()=>{
 const file=src('r8-classic-screen.mjs');
 assert.match(file,/!this\.paused\)\{this\.acc\+=dt/);
 assert.match(file,/r18-classic-pause-layer/);
 assert.match(file,/togglePause\(\)/);
 assert.match(file,/this\.exitArmed=true/);
 assert.doesNotMatch(file,/maxHp|hp-depleted/);
});
test('static and React entries both load the same R18 stylesheet',()=>{
 assert.match(src('r9-index.html'),/r18-battle\.css/);
 assert.match(src('src/styles.css'),/r18-battle\.css/);
 assert.match(src('r18-battle.css'),/prefers-reduced-motion/);
});
