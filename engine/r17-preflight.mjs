/** R17: Battle-prepare contract. Pure shape/stage checks and cancellable async validation.
 * No combat physics, rewards, storage formats or ruleset constants are changed here.
 */
import {LEVEL_CATALOG,isUnlocked} from './level-catalog.mjs';
import {parseGlyphDraft,R16_FONTS} from './r16-glyph-contract.mjs';

export function resolveBattleDraft(draft, progress={}){
 const mode=draft?.mode;
 if(!['story','quick'].includes(mode))return {ok:false,reason:'mode'};
 const p=parseGlyphDraft(draft?.player?.char);
 if(!p.ok)return {ok:false,reason:'player-'+p.reason};
 const font=draft?.player?.fontId;
 if(!R16_FONTS.includes(font))return {ok:false,reason:'font'};
 if(mode==='story'){
  const level=LEVEL_CATALOG[draft?.levelId];
  if(!level)return {ok:false,reason:'stage'};
  if(!isUnlocked(level.id,progress))return {ok:false,reason:'locked'};
  return {ok:true,selection:Object.freeze({mode,levelId:level.id,player:p.glyph,playerFont:font,rival:level.enemy,rivalFont:level.enemyFont,ruleset:'arena-hp-v3'})};
 }
 const rival=parseGlyphDraft(draft?.opponent?.char);
 if(!rival.ok)return {ok:false,reason:'rival-'+rival.reason};
 const rivalFont=draft?.opponent?.fontId||font;
 if(!R16_FONTS.includes(rivalFont))return {ok:false,reason:'rival-font'};
 return {ok:true,selection:Object.freeze({mode,levelId:null,player:p.glyph,playerFont:font,rival:rival.glyph,rivalFont,ruleset:'classic-v2'})};
}
export function preflightKey(selection){return JSON.stringify([selection.mode,selection.levelId,selection.player,selection.playerFont,selection.rival,selection.rivalFont,selection.ruleset]);}
export function createBattlePreflight(inspect){
 let revision=0, state=Object.freeze({status:'idle',key:null,data:null});
 return {
  snapshot:()=>state,
  invalidate(){revision++;state=Object.freeze({status:'idle',key:null,data:null});return state;},
  isReady(selection){return Boolean(selection)&&state.status==='ready'&&state.key===preflightKey(selection);},
  async verify(selection){
   const id=++revision,key=preflightKey(selection);
   state=Object.freeze({status:'checking',key,data:null});
   try{
    const data=await inspect(selection);
    if(id!==revision)return state;
    state=Object.freeze({status:'ready',key,data});return state;
   }catch(error){
    if(id!==revision)return state;
    state=Object.freeze({status:'invalid',key,data:null,reason:error?.reason||'unavailable'});return state;
   }
  }
 };
}
/** Multiple taps in one startup must not call the physics bridge twice. */
export function createBattleLaunchLock(){
 let busy=false;
 return {
  isBusy:()=>busy,
  async run(start){
   if(busy)return {status:'busy'};
   busy=true;
   try{return await start();}finally{busy=false;}
  }
 };
}
