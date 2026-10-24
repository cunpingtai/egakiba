/** V2 Rapier-backed story rule layer, isolated from untouched original Battle.
 * Every tick uses the actual original Battle.advance(); HP only consumes resolved contact events.
 */
import {createClassicBattle,classicGlyphMetrics} from './classic-v2-adapter.mjs';
import {NATIVE_HP_RULESET,NATIVE_HP_PHYSICS,DAMAGE_MODEL,deriveNativeStats,applyImpactToHp,resolveNativeHp} from './native-hp-rules.mjs';
import {LEVEL_CATALOG} from './level-catalog.mjs';
const validAction=a=>a&&Number.isFinite(a.angle)&&Math.abs(a.angle)<=Math.PI&&Number.isFinite(a.power)&&a.power>=.15&&a.power<=1&&[1,-1].includes(a.spinDirection);
export class NativeHpMatch{
 constructor(native,level,metadata){this.native=native;this.level=level;this.metadata=Object.freeze(metadata);this.stats=native.glyphs.map((g)=>deriveNativeStats(g,classicGlyphMetrics(g)));
  this.stats[1]=Object.freeze({...this.stats[1],maxHp:Math.max(30,Math.round(this.stats[1].maxHp*level.enemyHpMultiplier))});
  this.hp=this.stats.map(x=>x.maxHp);this.impactEvents=[];this.frames=0;this.action=null;this.result=null;this.disposed=false;this.finished=false;
 }
 launch(action){if(this.disposed||this.action||!validAction(action))throw Error('Invalid or duplicate launch');this.action={...action};this.native.launch(this.action);return this.snapshot();}
 stepFixed(){if(this.disposed||!this.action||this.finished)return [];
  const raw=this.native.stepFixed();this.frames++;
  const events=raw.map(event=>{
    const applied=applyImpactToHp(this.hp,this.stats,event);this.hp=applied.hp;
    const hit={tick:this.frames,time:this.native.battle.time,force:event.force,strength:event.strength,critical:event.critical,criticalAttackers:event.criticalAttackers,damage:applied.damage,hp:[...this.hp],position:event.position};
    this.impactEvents.push(hit);return hit;
  });
  const battle=this.native.battle;
  this.result=resolveNativeHp({nativeResult:battle.result,hp:this.hp,time:battle.time});
  this.finished=Boolean(this.result);
  if(this.finished){this.native.battle.running=false;this.native.finished=true;}
  return events;
 }
 snapshot(){if(this.disposed)throw Error('Disposed');const raw=this.native.snapshot();return {...raw,done:this.finished,result:this.result,hp:[...this.hp],stats:this.stats,eventsCount:this.impactEvents.length,frames:this.frames,physicsVersion:NATIVE_HP_PHYSICS,rulesetVersion:NATIVE_HP_RULESET,damageModel:DAMAGE_MODEL};}
 exportTrace(){const s=this.snapshot();return {kind:'unverified-local-native-hp',rulesetVersion:NATIVE_HP_RULESET,physicsVersion:NATIVE_HP_PHYSICS,damageModel:DAMAGE_MODEL,levelId:this.level.id,player:this.metadata.player,enemy:this.metadata.enemy,fonts:this.metadata.fonts,action:this.action,enemyAction:this.metadata.enemyAction,hp:s.hp,stats:this.stats,events:this.impactEvents,frames:this.frames,finalStateHash:s.stateHash,result:s.result,ranked:false};}
 dispose(){if(this.disposed)return;this.disposed=true;this.native.dispose();}
}
export async function createNativeHpBattle({levelId='01-01',player='文',font='gothic',enemy,enemyFont,library,opponentLibrary,enemyAction}={}){
 const level=LEVEL_CATALOG[levelId];if(!level)throw Error('Unknown Chapter 1 level');
 const action=enemyAction||{angle:level.id==='01-03'?.13:.02,power:level.enemyPower,spinDirection:1};
 if(!validAction(action))throw Error('Invalid enemy action');
 const rival=enemy||level.enemy;
 const native=await createClassicBattle({player,opponent:rival,font,opponentFont:enemyFont||level.enemyFont,library,opponentLibrary,enemyAction:action,stageId:'standard'});
 return new NativeHpMatch(native,level,{player,enemy:rival,fonts:[font,enemyFont||level.enemyFont],enemyAction:action});
}
export async function simulateNativeHp(options,{action={angle:0,power:.8,spinDirection:1},maxFrames=3500,sampleEvery=15}={}){
 if(!Number.isInteger(maxFrames)||maxFrames<1||maxFrames>5000||!Number.isInteger(sampleEvery)||sampleEvery<1)throw Error('Invalid simulation limits');
 const match=await createNativeHpBattle(options);try{match.launch(action);const samples=[];for(let i=0;i<maxFrames&&!match.finished;i++){
  match.stepFixed();if(i%sampleEvery===0||match.finished){const s=match.snapshot();samples.push({frame:i+1,time:s.time,hp:s.hp,stateHash:s.stateHash});}}
 const s=match.snapshot();return {result:s.result,hp:s.hp,time:s.time,complete:match.finished,events:match.impactEvents,trace:samples,summary:match.exportTrace()};
 }finally{match.dispose();}
}
