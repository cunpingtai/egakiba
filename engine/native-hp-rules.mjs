/** Arena HP R9 rule layer. Rapier and glyph geometry are delegated unchanged to uploaded V2 Battle.
 * This module contains no browser APIs and no network trust claims.
 */
import {CLASSIC_V2_PHYSICS} from './classic-v2-adapter.mjs';
export const NATIVE_HP_RULESET='arena-hp-rapier-r9-local-v1';
export const NATIVE_HP_PHYSICS=CLASSIC_V2_PHYSICS;
export const DAMAGE_MODEL='impact-log-v1';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const finite=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value))throw Error(`Invalid ${label}`);return value;};
export function deriveNativeStats(glyph,metrics){
 if(!glyph||!metrics)throw Error('Glyph metrics required');
 const speed=clamp(finite(metrics.speed,'speed'),0,1),power=clamp(finite(metrics.power,'power'),0,1),balance=clamp(finite(metrics.balance,'balance'),0,1);
 const maxHp=Math.round(66+34*balance+10*power);
 return Object.freeze({speed:Math.round(speed*100),power:Math.round(power*100),balance:Math.round(balance*100),maxHp});
}
export function damageFromForce(force,attacker,defender,{critical=false}={}){
 finite(force,'contact force');if(force<0)throw Error('Negative contact force');
 if(!attacker||!defender)throw Error('Combatant stats required');
 // R8 local sample: ~159..6116 force, so linear force-to-HP would be disastrous.
 const base=5+9*Math.log1p(force/600);
 const factor=clamp(1+(attacker.power-defender.balance)*.0035,.72,1.28);
 return clamp(Math.round(base*factor*(critical?1.38:1)),1,48);
}
/** Exact V2 reason precedence: ring-out > native stop/tilt > HP > timeout. For same-frame double KO, draw. */
export function resolveNativeHp({nativeResult=null,hp=[100,100],time=0}={}){
 if(!Array.isArray(hp)||hp.length!==2||hp.some(x=>!Number.isFinite(x)))throw Error('Invalid HP');
 if(nativeResult?.reason&&nativeResult.reason!=='時間切れ')return Object.freeze({winner:nativeResult.winner,reason:nativeResult.reason,source:'native-v2'});
 const lost=hp.map(x=>x<=0);
 if(lost[0]&&lost[1])return Object.freeze({winner:null,reason:'double-ko',source:'native-hp'});
 if(lost[0]||lost[1])return Object.freeze({winner:lost[0]?1:0,reason:'hp-depleted',source:'native-hp'});
 if(nativeResult?.reason==='時間切れ')return Object.freeze({winner:null,reason:'時間切れ',source:'native-v2'});
 return null;
}
export function applyImpactToHp(hp,stats,event){
 if(!Array.isArray(hp)||hp.length!==2||!Array.isArray(stats)||stats.length!==2)throw Error('Expected two combatants');
 if(!event||!Number.isFinite(event.force)||event.force<=0)return {hp:[...hp],damage:[0,0]};
 const critical=event.criticalAttackers||[];
 const damage=[damageFromForce(event.force,stats[1],stats[0],{critical:critical.includes(1)}),damageFromForce(event.force,stats[0],stats[1],{critical:critical.includes(0)})];
 return {hp:hp.map((value,i)=>Math.max(0,value-damage[i])),damage};
}
