import {performanceValue,PERFORMANCE_SORTS} from './encyclopedia-performance.js';
import {otherChallengeCandidates} from './challenge-random.js';
import {encyclopediaSummary} from './encyclopedia-store.js';
import {ENCYCLOPEDIA_CATEGORIES} from './encyclopedia-schema.js';
export {ENCYCLOPEDIA_CATEGORIES};
export {characterCategory as encyclopediaCategory} from './character-category.js';
import {characterCategory as encyclopediaCategory} from './character-category.js';
let searchSegmenter;
const catalogCache=new WeakMap();
export function buildEncyclopediaCatalog(libraries){
 const sources=[...libraries.values()],cached=catalogCache.get(libraries);if(cached&&cached.sources.length===sources.length&&sources.every((lib,i)=>lib===cached.sources[i]))return cached.catalog;
 const all=new Set(otherChallengeCandidates());
 for(const lib of libraries.values())for(const pool of Object.values(lib.randomPools))for(const glyph of pool)all.add(glyph.normalize('NFC'));
 const catalog=Object.freeze([...all].sort(compareGlyphs));catalogCache.set(libraries,{sources,catalog});return catalog;
}
// Unicode scalar order, including supplementary characters and emoji sequences.
function compareUnicode(a,b){
 let i=0,j=0;while(i<a.length&&j<b.length){const x=a.codePointAt(i),y=b.codePointAt(j);if(x!==y)return x-y;i+=x>0xffff?2:1;j+=y>0xffff?2:1;}return (i<a.length?1:0)-(j<b.length?1:0);
}
export function compareGlyphs(a,b){return ENCYCLOPEDIA_CATEGORIES.indexOf(encyclopediaCategory(a))-ENCYCLOPEDIA_CATEGORIES.indexOf(encyclopediaCategory(b))||(a<b?-1:a>b?1:0);}
// Derive grey discovery hints from real encounters/uses. Never persist fake
// counters or feed hints back as discoveries: each real glyph reveals one step.
// The base catalog is already in fixed character-type order.
export function encyclopediaNeighborHints(catalog,entries){
 const known=new Set(catalog),extras=Object.keys(entries).filter(glyph=>!known.has(glyph));
 const ordered=extras.length?[...catalog,...extras].sort(compareGlyphs):catalog,hints=new Set();
 for(let i=0;i<ordered.length;i++){
  const glyph=ordered[i];if(!Object.hasOwn(entries,glyph)||!encyclopediaSummary(entries[glyph]).seen)continue;
  if(i>0)hints.add(ordered[i-1]);if(i+1<ordered.length)hints.add(ordered[i+1]);
 }
 return hints;
}
export function filterEncyclopedia(catalog,entries,{query='',category='',status='',star=false,sort='fixed',direction='default',eligible=()=>true,hints=null}={},scores=new Map()){
 const summary=new Map(Object.entries(entries).map(([glyph,entry])=>[glyph,encyclopediaSummary(entry)]));
 const all=[...new Set([...catalog,...Object.keys(entries)])],q=query.trim().normalize('NFC');
 // Match complete user-perceived characters, keeping emoji/combining marks together.
 const search=q?new Set(Array.from((searchSegmenter??=new Intl.Segmenter('ja',{granularity:'grapheme'})).segment(q),part=>part.segment).filter(glyph=>glyph.trim())):null;
 const list=all.filter(glyph=>{
  const s=summary.get(glyph),seen=s?.seen||hints?.has(glyph);
  return eligible(glyph)&&(!search||search.has(glyph))&&(!category||encyclopediaCategory(glyph)===category)&&(!star||s?.rareDefeated)&&
   (!status||(status==='unseen'?!seen:status==='seen'?seen&&!s?.unlocked:s?.unlocked));
 });
 return list.sort((a,b)=>{
  if(sort==='fixed'){const order=compareUnicode(a,b);return direction==='desc'?-order:order;}
  const sa=summary.get(a),sb=summary.get(b);
  // Other sorts keep discovery groups fixed: blue, grey (including hints), then unknown.
  const groupA=sa?.unlocked?0:(sa?.seen||hints?.has(a)?1:2),groupB=sb?.unlocked?0:(sb?.seen||hints?.has(b)?1:2);
  if(groupA!==groupB)return groupA-groupB;
  if(PERFORMANCE_SORTS.has(sort)){if(!sa?.unlocked)return compareGlyphs(a,b);const va=performanceValue(scores.get(a),sort),vb=performanceValue(scores.get(b),sort);if(va===null&&vb!==null)return 1;if(vb===null&&va!==null)return -1;if(va!==null&&vb!==null&&va!==vb)return direction==='asc'?va-vb:vb-va;return compareGlyphs(a,b);}
  if(sort==='recent'){const delta=(sb?.seen?sb.order:0)-(sa?.seen?sa.order:0);if(delta)return direction==='asc'?-delta:delta;}
  if(sort==='uses'){const delta=(sb?.uses||0)-(sa?.uses||0);if(delta)return direction==='asc'?-delta:delta;}
  return compareGlyphs(a,b);
 });
}
export function encyclopediaProgress(catalog,entries,category=''){
 const glyphs=[...new Set([...catalog,...Object.keys(entries)])].filter(glyph=>!category||encyclopediaCategory(glyph)===category),total=glyphs.length;
 const completed=Object.entries(entries).filter(([glyph,entry])=>(!category||encyclopediaCategory(glyph)===category)&&encyclopediaSummary(entry).unlocked).length;
 return {completed,total,percent:total?completed/total*100:0};
}
export function encyclopediaWindow({scrollTop,height,rowHeight,count,overscan=3}){
 const rows=Math.ceil(count/5),start=Math.max(0,Math.floor(scrollTop/rowHeight)-overscan),end=Math.min(rows,Math.ceil((scrollTop+height)/rowHeight)+overscan);
 return {start:start*5,end:end*5,offset:start*rowHeight,total:rows*rowHeight};
}
