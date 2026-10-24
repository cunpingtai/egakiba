import {CONFIG,statGauges} from './config.js';
import {scoutPartyBonusValue} from './scout-party-bonus.js';

export const SCOUT_RARE=Object.freeze({chance:.03,scale:1.25,bonus:.20});
export const scoutMemberKey=member=>JSON.stringify([member.glyph,member.font,member.rare===true?'rare':'normal']);
export function scoutStats(metrics,rare=metrics.rare===true,partyBonus=metrics.partyBonus||0){
 const base=statGauges(metrics.baseGlyph||metrics),bonus=(rare?SCOUT_RARE.bonus:0)+scoutPartyBonusValue(partyBonus);
 return {speed:base.speed+bonus,power:base.power+bonus,balance:base.balance+bonus};
}
export function scoutSpeedRatio(baseSpeed,bonus=SCOUT_RARE.bonus){
 const curve=speed=>CONFIG.spinSpeedMin+(CONFIG.spinSpeedMax-CONFIG.spinSpeedMin)*speed;
 return curve(baseSpeed+bonus)/curve(baseSpeed);
}
const variants=new WeakMap();
function rareGlyph(glyph,member){
 const base=glyph.baseGlyph||glyph;if(!member?.rare)return base;
 if(!variants.has(base)){
  const scale=SCOUT_RARE.scale,point=p=>({...p,x:p.x*scale,y:p.y*scale});
  const geometry=base.geometry.clone();geometry.scale(scale,1,scale);geometry.computeBoundingSphere();
  variants.set(base,{...base,rare:true,baseGlyph:base,geometry,shapes:undefined,
   parts:base.parts.map(poly=>poly.map(point)),triangles:base.triangles.map(tri=>tri.map(point)),
   tipPoints:base.tipPoints?.map(point),criticalTipPoints:base.criticalTipPoints?.map(point),
   centroid:point(base.centroid),area:base.area*scale*scale,radius:geometry.boundingSphere.radius,
   textureScale:base.textureScale*scale,
  });
 }
 return variants.get(base);
}

// The wrapper shares geometry and is local to this battle. Its base remains immutable.
export function scoutGlyph(glyph,member,partyBonus=0){
 const variant=rareGlyph(glyph,member),bonus=scoutPartyBonusValue(partyBonus);
 return bonus?{...variant,baseGlyph:variant.baseGlyph||variant,partyBonus:bonus}:variant;
}
