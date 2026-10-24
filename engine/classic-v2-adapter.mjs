/** R8. Original uploaded V2 Rapier physics, isolated from the V3 experimental HP ruleset.
 * This is a genuine local classic battle, NOT a server-verified ranked result.
 */
import {initPhysics,Battle} from '../legacy-v2/physics.js';
import {GlyphLibrary} from '../legacy-v2/glyph.js';
import {CONFIG,PHYSICS_VERSION,statGauges,validateCharacter} from '../legacy-v2/config.js';
import {validFont,FONTS} from '../legacy-v2/fonts.js';
import {getStage} from '../legacy-v2/stages.js';

export const CLASSIC_V2_RULESET='classic-v2';
export const CLASSIC_V2_PHYSICS=PHYSICS_VERSION;
const fontCache=new Map();
const actionsValidated=(value)=>{
  const a=Number(value?.angle),p=Number(value?.power),dir=value?.spinDirection;
  if(!Number.isFinite(a)||Math.abs(a)>Math.PI||!Number.isFinite(p)||p<.15||p>1||![1,-1].includes(dir))throw Error('Invalid launch action');
  return {angle:a,power:p,spinDirection:dir};
};
export async function loadClassicLibrary(fontId='gothic'){
  const font=fontId==='gyosho'?'brush':validFont(fontId);
  if(!fontCache.has(font))fontCache.set(font,GlyphLibrary.load(font).catch(error=>{fontCache.delete(font);throw new Error(`V2 font ${FONTS[font].file} unavailable: ${error.message}`);}));
  return fontCache.get(font);
}
export function classicGlyphMetrics(glyph){
  const gauge=statGauges(glyph);
  return {speed:gauge.speed,power:gauge.power,balance:gauge.balance,area:glyph.area,mass:glyph.mass,inertia:glyph.inertia,radius:glyph.radius};
}
export async function createClassicBattle({player='文',opponent='字',font='gothic',opponentFont=font,enemyAction={angle:.08,power:.8,spinDirection:1},stageId='standard',library,opponentLibrary}={}){
  await initPhysics();
  const pLib=library||await loadClassicLibrary(font);
  const eLib=opponentLibrary||(opponentFont===font?pLib:await loadClassicLibrary(opponentFont));
  const p=validateCharacter(player,'mixed',pLib.supports),e=validateCharacter(opponent,'mixed',eLib.supports);
  const glyphs=[pLib.get(p),eLib.get(e)];
  const battle=new Battle(glyphs,actionsValidated(enemyAction),{stageId:getStage(stageId).id});
  return new ClassicV2Match(battle,{glyphs,player:p,opponent:e,font,opponentFont,stageId:battle.stage.id});
}
export class ClassicV2Match{
  constructor(battle,metadata){this.battle=battle;this.meta=Object.freeze({...metadata,glyphs:undefined,ruleset:CLASSIC_V2_RULESET,physicsVersion:CLASSIC_V2_PHYSICS,ranked:false});this.glyphs=metadata.glyphs;this.finished=false;this.disposed=false;this.action=null;this.lastEvents=[];}
  launch(value){if(this.disposed||this.action)throw Error('Match already started/disposed');this.action=actionsValidated(value);if(!this.battle.launch(this.action.angle,this.action.power,this.action.spinDirection))throw Error('Launch failed');return this.snapshot();}
  stepFixed(){if(!this.action||this.disposed)return [];
    this.battle.advance(1/60);const ev=this.battle.events.splice(0).map(e=>({time:this.battle.time,strength:e.strength,force:e.force,critical:e.critical===true,criticalAttackers:[...(e.criticalAttackers||[])],position:e.position}));
    this.lastEvents=ev;this.finished=Boolean(this.battle.result);return ev;}
  snapshot(){if(this.disposed)throw Error('Match disposed');return {time:this.battle.time,done:Boolean(this.battle.result),result:this.battle.result?{...this.battle.result}:null,stateHash:this.battle.stateHash(),tops:this.battle.tops.map(top=>{const pose=top.body.translation(),quat=top.body.rotation(),v=top.body.linvel(),state=this.battle.state(top);return {glyph:top.glyph.char,position:{...pose},rotation:{...quat},velocity:{...v},spin:state.spin,tilt:state.tilt,initialOmega:top.initialOmega,stats:classicGlyphMetrics(top.glyph)};})};}
  dispose(){if(this.disposed)return;this.battle.dispose();this.disposed=true;}
}

/** Native classic trace. Sample cadence is fixed; no input-dependent randomization. */
export async function simulateClassicTrace(options,{action={angle:0,power:.8,spinDirection:1},maxFrames=4000,sampleEvery=30}={}){
  if(!Number.isInteger(maxFrames)||maxFrames<1||maxFrames>5000||!Number.isInteger(sampleEvery)||sampleEvery<1)throw Error('Invalid trace limits');
  const game=await createClassicBattle(options);
  try{
    game.launch(action);const frames=[];let count=0;
    for(;count<maxFrames&&!game.finished;count++){
      game.stepFixed();if(count%sampleEvery===0||game.finished){const s=game.snapshot();frames.push({frame:count+1,time:s.time,stateHash:s.stateHash,positions:s.tops.map(t=>t.position),spin:s.tops.map(t=>t.spin)});}
    }
    const result=game.snapshot();return {version:CLASSIC_V2_PHYSICS,ruleset:CLASSIC_V2_RULESET,metadata:game.meta,action:game.action,frames,steps:count,result:result.result,finalStateHash:result.stateHash,complete:result.done};
  }finally{game.dispose();}
}
export function classifyClassicOutcome(result){return result?.winner===null?'draw':result?.winner===0?'win':'loss';}
