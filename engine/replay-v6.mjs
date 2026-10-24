/** R6 portable offline battle replay, NOT a trusted/signed ranking proof.
 * Can reproduce a match from two frozen raster snapshots and action vectors
 * in this experimental JS simulator. Anyone can forge an entire capsule.
 */
import {packGlyphSnapshot,unpackGlyphSnapshot} from './glyph-snapshot-v6.mjs';
import {ShapeSimulationV5,SHAPE_SIM_VERSION,SHAPE_RULE_VERSION} from './shape-sim-v5.mjs';
import {GEOMETRY_VERSION} from './glyph-geometry.mjs';
import {normalizeAction} from './arena-sim.mjs';
export const REPLAY_SCHEMA=1;
const LIMIT_BYTES=220000;
const stable = value => JSON.stringify(value);
const rnd=v=>Math.round(v*1e6)/1e6;
function hash(data){let h=2166136261>>>0;for(let i=0;i<data.length;i++)h=Math.imul(h^data.charCodeAt(i),16777619)>>>0;return h.toString(16).padStart(8,'0');}
function topFrame(sim){return [sim.tick,...sim.tops.flatMap(s=>[rnd(s.x),rnd(s.y),rnd(s.angle),s.hp,rnd(s.spin)])];}
const resultDigest=result=>({winner:result.winner,reason:result.reason,tick:result.tick,hp:result.hp,spin:result.spin,contactCount:result.contactCount});
function stableEvents(events){return events.filter(e=>e.type==='collision'||e.type==='damage'||e.type==='ring-out').map(e=>e.type==='collision'?[e.type,e.tick,e.impulse,e.critical,e.contact,e.normal,e.angular]:e.type==='damage'?[e.type,e.tick,e.slot,e.amount,e.hpAfter]:[e.type,e.tick,e.slot]);}
function createSimulation(init){
 const gs=init.geometries.map(unpackGlyphSnapshot);
 const participants=init.participants.map((p,i)=>({glyph:p.glyph,stats:p.stats,geometry:gs[i]}));
 return new ShapeSimulationV5({player:participants[0],enemy:participants[1],playerAction:init.actions[0],enemyLaunch:init.actions[1],stage:init.stage,stageConfig:init.stageConfig});
}
function produce(init){
 const sim=createSimulation(init),frames=[topFrame(sim)];
 while(!sim.done){sim.step();if(sim.tick%2===0||sim.done)frames.push(topFrame(sim));}
 const events=stableEvents(sim.events),result=resultDigest(sim.result);
 const digest=hash(stable([result,events,frames]));
 return {digest,result,events,frames};
}
export function recordBattleReplay({geometries,participants,actions,stage,stageConfig={},originalResult=null}={}){
 if(!Array.isArray(geometries)||geometries.length!==2||!Array.isArray(participants)||participants.length!==2||!Array.isArray(actions)||actions.length!==2)throw Error('Replay needs exactly two participants');
 const init={geometries:geometries.map(packGlyphSnapshot),participants:participants.map(p=>({glyph:p.glyph,stats:{...p.stats}})),actions:actions.map(normalizeAction),stage:String(stage||''),stageConfig:structuredClone(stageConfig)};
 const trial=produce(init);
 if(originalResult&&stable(resultDigest(originalResult))!==stable(trial.result))throw Error('Live result differs from replayed result');
 return {schema:REPLAY_SCHEMA,verified:false,provenance:'local-experimental-only',versions:{geometry:GEOMETRY_VERSION,simulation:SHAPE_SIM_VERSION,rules:SHAPE_RULE_VERSION},init,digest:trial.digest,result:trial.result,events:trial.events,frames:trial.frames};
}
export function verifyBattleReplay(capsule){
 if(!capsule||typeof capsule!=='object'||Array.isArray(capsule)||JSON.stringify(capsule).length>LIMIT_BYTES)throw Error('Replay size or payload invalid');
 if(capsule.schema!==REPLAY_SCHEMA||capsule.verified!==false||capsule.provenance!=='local-experimental-only'||capsule.versions?.geometry!==GEOMETRY_VERSION||capsule.versions?.simulation!==SHAPE_SIM_VERSION||capsule.versions?.rules!==SHAPE_RULE_VERSION)throw Error('Replay version/provenance not supported');
 if(!Array.isArray(capsule.init?.actions)||capsule.init.actions.length!==2||!Array.isArray(capsule.init?.participants)||capsule.init.participants.length!==2||!Array.isArray(capsule.init?.geometries)||capsule.init.geometries.length!==2)throw Error('Invalid replay participants');
 if(!/^[0-9]{2}-[0-9]{2}$/.test(capsule.init.stage)||JSON.stringify(capsule.init.stageConfig).length>5000)throw Error('Invalid stage');
 for(const a of capsule.init.actions)if(!Number.isFinite(a.angle)||!Number.isFinite(a.power)||Math.abs(a.angle)>1.3||a.power<.15||a.power>1||![1,-1].includes(a.spinDirection))throw Error('Invalid replay action');
 for(const p of capsule.init.participants){if(typeof p.glyph!=='string'||p.glyph.length>16||!p.stats||!['speed','power','balance','maxHp','pointiness'].every(k=>Number.isFinite(p.stats[k])))throw Error('Invalid participant');}
 const produced=produce(capsule.init);
 if(produced.digest!==capsule.digest||stable(produced.result)!==stable(capsule.result)||stable(produced.events)!==stable(capsule.events)||stable(produced.frames)!==stable(capsule.frames))throw Error('Replay re-simulation mismatch');
 return {consistent:true,competitiveVerification:false,result:produced.result,frames:produced.frames.length,eventCount:produced.events.length};
}
export function summarizeBattleEvents(events=[]){
 const collisions=events.filter(e=>e.type==='collision'),damages=events.filter(e=>e.type==='damage');
 return {collisions:collisions.length,critical:collisions.filter(e=>e.critical).length,damageTaken:damages.filter(e=>e.slot===0).reduce((s,e)=>s+e.amount,0),damageDealt:damages.filter(e=>e.slot===1).reduce((s,e)=>s+e.amount,0),firstContactTick:collisions[0]?.tick??null};
}
