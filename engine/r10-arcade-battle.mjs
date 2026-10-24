/** R10 arcade addition to real V2 Rapier physics. Classic V2 is not modified.
 * Dash changes outcomes and therefore has a dedicated local-only ruleset/trace.
 */
import {createNativeHpBattle} from './native-hp-adapter.mjs';
export const ARCADE_RULESET='arena-hp-rapier-r10-dash-local-v1';
export const ARCADE_TRACE_KIND='unverified-local-native-hp-arcade';
export const DASH_COOLDOWN_FRAMES=180;
export const DASH_SPIN_FRACTION=.075;
export const DASH_SPEED_GAIN=2.15;
export const DASH_SPEED_CAP=12;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function evaluateDash({frame,lastFrame,spin,initialOmega,velocity,heading=null,finished=false}){
 if(finished)return {ok:false,reason:'finished'};
 if(frame<1)return {ok:false,reason:'not-started'};
 if(frame-lastFrame<DASH_COOLDOWN_FRAMES)return {ok:false,reason:'cooldown',framesRemaining:DASH_COOLDOWN_FRAMES-(frame-lastFrame)};
 if(!finite(spin)||!finite(initialOmega)||initialOmega<=0||Math.abs(spin)/initialOmega<.2)return {ok:false,reason:'low-spin'};
 if(!velocity||![velocity.x,velocity.z].every(finite))return {ok:false,reason:'bad-velocity'};
 const currentSpeed=Math.hypot(velocity.x,velocity.z);
 if(currentSpeed<.18||currentSpeed>=DASH_SPEED_CAP)return {ok:false,reason:'speed'};
 if(heading!==null&&!finite(heading))return {ok:false,reason:'bad-heading'};
 const radians=heading===null?Math.atan2(velocity.x,velocity.z):heading;
 const speed=clamp(currentSpeed+DASH_SPEED_GAIN,0,DASH_SPEED_CAP);
 return {ok:true,heading:radians,velocity:{x:Math.sin(radians)*speed,y:velocity.y,z:Math.cos(radians)*speed},spinMultiplier:1-DASH_SPIN_FRACTION};
}
export class ArcadeHpMatch {
 constructor(match){this.base=match;this.lastDashFrame=-DASH_COOLDOWN_FRAMES;this.dashes=[];this.rulesetVersion=ARCADE_RULESET;}
 get native(){return this.base.native;}get level(){return this.base.level;}get metadata(){return this.base.metadata;}
 get stats(){return this.base.stats;}get hp(){return this.base.hp;}get frames(){return this.base.frames;}
 get action(){return this.base.action;}get finished(){return this.base.finished;}get impactEvents(){return this.base.impactEvents;}
 launch(action){return this.base.launch(action);}
 stepFixed(){return this.base.stepFixed();}
 snapshot(){return {...this.base.snapshot(),rulesetVersion:ARCADE_RULESET,dashCount:this.dashes.length,nextDashFrame:this.lastDashFrame+DASH_COOLDOWN_FRAMES};}
 canDash(){const top=this.native?.battle?.tops?.[0];if(!top?.body?.isEnabled())return {ok:false,reason:'disabled'};
 const angular=this.native.battle.state(top).spin;
 return evaluateDash({frame:this.frames,lastFrame:this.lastDashFrame,spin:angular,initialOmega:top.initialOmega,velocity:top.body.linvel(),finished:this.finished});}
 dash(heading=null){const top=this.native?.battle?.tops?.[0];if(!top?.body?.isEnabled())return {ok:false,reason:'disabled'};
 const body=top.body,rot=body.angvel();const spin=this.native.battle.state(top).spin;
 const checked=evaluateDash({frame:this.frames,lastFrame:this.lastDashFrame,spin,initialOmega:top.initialOmega,velocity:body.linvel(),heading,finished:this.finished});
 if(!checked.ok)return checked;
 body.setLinvel(checked.velocity,true);
 body.setAngvel({x:rot.x*checked.spinMultiplier,y:rot.y*checked.spinMultiplier,z:rot.z*checked.spinMultiplier},true);
 this.lastDashFrame=this.frames;
 this.dashes.push({frame:this.frames,heading:checked.heading});
 return {ok:true,frame:this.frames,heading:checked.heading,nextFrame:this.frames+DASH_COOLDOWN_FRAMES};}
 exportTrace(){return {...this.base.exportTrace(),kind:ARCADE_TRACE_KIND,rulesetVersion:ARCADE_RULESET,arcadeActions:this.dashes.map(x=>({...x})),ranked:false};}
 dispose(){this.base.dispose();}
}
export async function createArcadeBattle(options={}){return new ArcadeHpMatch(await createNativeHpBattle(options));}
/** Replays every dash at the same fixed-step frame, before advancing to frame + 1. */
export async function replayArcadeBattle(options,{launch,dashes=[],maxFrames=4200}={}){
 if(!launch||!Array.isArray(dashes)||dashes.some(x=>!Number.isInteger(x.frame)||x.frame<1||!finite(x.heading)))throw Error('Invalid arcade action list');
 const match=await createArcadeBattle(options);try{
  match.launch(launch);let next=0;
  while(match.frames<maxFrames&&!match.finished){while(next<dashes.length&&dashes[next].frame===match.frames){const result=match.dash(dashes[next].heading);if(!result.ok)throw Error(`Invalid dash: ${result.reason}`);next++;}match.stepFixed();}
  if(next<dashes.length)throw Error('Unconsumed dash action');
  return {snapshot:match.snapshot(),trace:match.exportTrace()};
 }finally{match.dispose();}
}
