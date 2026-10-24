/** First four V3 story stages, local offline prototype; stages 02–03 are still previews.
 * Changing objectives or enemy parameters requires a new rules version, not rewriting leaderboard history.
 */
export const LEVEL_CATALOG=Object.freeze({
 '01-01':Object.freeze({id:'01-01',arena:'classic',enemy:'字',enemyFont:'gothic',seed:'r5-first-launch',enemyHpMultiplier:.74,enemyPower:.70,objective:'win',targetSeconds:16,state:'playable-local'}),
 '01-02':Object.freeze({id:'01-02',arena:'classic',enemy:'力',enemyFont:'gothic',seed:'r5-power-control',enemyHpMultiplier:.83,enemyPower:.79,objective:'power-control',minPower:.65,targetSeconds:19,state:'playable-local'}),
 '01-03':Object.freeze({id:'01-03',arena:'classic',enemy:'山',enemyFont:'mincho',seed:'r5-angle-control',enemyHpMultiplier:.86,enemyPower:.82,objective:'angle-control',minAngle:.15,targetSeconds:20,state:'playable-local'}),
 '01-04':Object.freeze({id:'01-04',arena:'classic',enemy:'剣',enemyFont:'gothic',seed:'r5-boss-trial',enemyHpMultiplier:1.05,enemyPower:.87,objective:'win',targetSeconds:24,state:'playable-local',boss:true})
});
export const LEVEL_ORDER=Object.freeze(Object.keys(LEVEL_CATALOG));
export const isPlayable=id=>Object.hasOwn(LEVEL_CATALOG,id);
export function isUnlocked(id,progress={}){
 if(!isPlayable(id))return false;
 const idx=LEVEL_ORDER.indexOf(id);
 return idx===0||Boolean(progress[LEVEL_ORDER[idx-1]]?.stars);
}
export function evaluateLevelResult(level,result,action){
 if(!level||!result||result.winner!==0)return {cleared:false,stars:0,objectiveMet:false};
 const objectiveMet=level.objective==='power-control'?action.power>=level.minPower:level.objective==='angle-control'?Math.abs(action.angle)>=level.minAngle:true;
 if(!objectiveMet)return {cleared:false,stars:0,objectiveMet:false};
 const hpRatio=result.hp[0]/Math.max(1,result.playerMaxHp||100);
 const stars=1+(hpRatio>=.55?1:0)+(result.durationSeconds<=level.targetSeconds?1:0);
 return {cleared:true,stars,objectiveMet:true};
}
