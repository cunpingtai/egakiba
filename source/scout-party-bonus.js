import {FONTS} from './fonts.js';
import {characterCategory} from './character-category.js';
import {cachedGlyphSymmetry} from './glyph-symmetry.js';
import {scoutRadical} from './scout-radicals.js';
import {statGauges} from './config.js';
export const SCOUT_PARTY_BONUS=Object.freeze({font:.05,kanji:.05,category:.10,radical:.10,rare:.10,performance:.05,threshold:.70,wins:Object.freeze({1:.05,3:.10,5:.15,7:.20,10:.25}),bench:.05,benchThreshold:10,line:.05,point:.05,max:.85});
// Derived from the current three occupied slots. Never write boosts to units or saves.
export function scoutPartyBonus(party,measure=null){
 const stats={speed:false,power:false,balance:false},symmetry={line:false,point:false},none={amount:0,font:null,category:null,rare:false,stats,victoryTier:0,symmetry,radical:0};
 if(!Array.isArray(party)||party.length!==3||party.some(m=>!m||typeof m.glyph!=='string'||!m.glyph||!Object.hasOwn(FONTS,m.font)))return none;
 const font=party.every(m=>m.font===party[0].font)?party[0].font:null;
 const kind=characterCategory(party[0].glyph),category=party.every(m=>characterCategory(m.glyph)===kind)?kind:null;
 let radical=0;if(category==='kanji'){const ids=party.map(m=>scoutRadical(m.glyph));if(ids[0]&&ids.every(id=>id===ids[0]))radical=ids[0];}
 // Eligibility always uses original geometry metrics, excluding rare and formation boosts.
 if(measure){const metrics=party.map(measure),bases=metrics.map(m=>m?statGauges(m.baseGlyph||m):null),shapes=metrics.map(cachedGlyphSymmetry);
  for(const key of Object.keys(symmetry))symmetry[key]=shapes.every(shape=>shape?.[key]===true);
  for(const key of Object.keys(stats))stats[key]=bases.every(base=>base&&Number.isFinite(base[key])&&base[key]>SCOUT_PARTY_BONUS.threshold);
 }
 const leastWins=Math.min(...party.map(m=>Number.isSafeInteger(m.battleWins)&&m.battleWins>0?m.battleWins:0)),victoryTier=Number(Object.keys(SCOUT_PARTY_BONUS.wins).reverse().find(tier=>leastWins>=Number(tier)))||0;
 const rare=party.every(m=>m.rare===true),amount=(font?SCOUT_PARTY_BONUS.font:0)+(category?(category==='kanji'?SCOUT_PARTY_BONUS.kanji:SCOUT_PARTY_BONUS.category):0)+(radical?SCOUT_PARTY_BONUS.radical:0)+(rare?SCOUT_PARTY_BONUS.rare:0)+Object.values(stats).filter(Boolean).length*SCOUT_PARTY_BONUS.performance+(SCOUT_PARTY_BONUS.wins[victoryTier]||0)+(symmetry.line?SCOUT_PARTY_BONUS.line:0)+(symmetry.point?SCOUT_PARTY_BONUS.point:0);
 return {amount:Math.round(amount*100)/100,font,category,rare,stats,victoryTier,symmetry,radical};
}
export function scoutPartyBonusValue(value){
 const points=Math.round(value*100);
 return Number.isFinite(value)&&points>=0&&points<=SCOUT_PARTY_BONUS.max*100&&points%5===0&&Math.abs(value-points/100)<1e-8?points/100:0;
}

// This belongs to one current member, independently of the three-slot formation.
export function scoutBenchBonus(member){return Number.isSafeInteger(member?.benchBattles)&&member.benchBattles>=SCOUT_PARTY_BONUS.benchThreshold?SCOUT_PARTY_BONUS.bench:0;}
