/** Reference-physics adapter contract, NOT an original-V2 implementation. */
import {SHAPE_SIM_VERSION,SHAPE_RULE_VERSION} from './shape-sim-v5.mjs';
export const ENGINE_CONTRACTS=Object.freeze({
 'experimental-hp-r5':Object.freeze({simulation:SHAPE_SIM_VERSION,rules:SHAPE_RULE_VERSION,ranked:false}),
 'classic-v2':Object.freeze({simulation:'external-reference-required',rules:'classic-v2',ranked:false,status:'unavailable'})
});
const validNum=n=>typeof n==='number'&&Number.isFinite(n);
/** Extract comparable final state only; by default exact (zero tolerance) for frozen traces. */
export function compareBattleTrace(expected,actual,{tolerance=0}={}){
 if(!expected||!actual||!validNum(tolerance)||tolerance<0||tolerance>.01)throw Error('Invalid parity comparison');
 if(expected.engine!==actual.engine||expected.rules!==actual.rules)throw Error('Physics/rules version mismatch');
 const differences=[];
 for(const key of ['winner','reason','tick','contactCount'])if(expected.result?.[key]!==actual.result?.[key])differences.push({path:`result.${key}`,expected:expected.result?.[key],actual:actual.result?.[key]});
 for(const key of ['hp','spin']){
  const a=expected.result?.[key],b=actual.result?.[key];
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==2||b.length!==2){differences.push({path:`result.${key}`,expected:a,actual:b});continue;}
  a.forEach((v,i)=>{if(!validNum(v)||!validNum(b[i])||Math.abs(v-b[i])>tolerance)differences.push({path:`result.${key}[${i}]`,expected:v,actual:b[i]});});
 }
 return {passed:differences.length===0,differences};
}
export async function runParityCases(cases,adapter,{tolerance=0}={}){
 if(!Array.isArray(cases)||!adapter||typeof adapter.simulate!=='function')throw Error('Reference traces and adapter required');
 const reports=[];
 for(const item of cases){
  if(!item?.id||!item?.expected?.engine||!item?.input)throw Error('Malformed parity fixture');
  const actual=await adapter.simulate(item.input);
  reports.push({id:item.id,...compareBattleTrace(item.expected,actual,{tolerance})});
 }
 return {passed:reports.every(r=>r.passed),count:reports.length,reports};
}
