import {characterKind,shuffled} from './config.js';
import {FONTS} from './fonts.js';
import {OTHER_RANGES,EMOJI} from './challenge-catalog.js';

let graphicCandidates;
const prepared=new WeakMap(),otherGroups=new WeakMap();
const HANGUL_SHARE=.05;
function splitOther(pool){
 if(!otherGroups.has(pool))otherGroups.set(pool,{hangul:pool.filter(glyph=>/\p{Script=Hangul}/u.test(glyph)),other:pool.filter(glyph=>! /\p{Script=Hangul}/u.test(glyph))});
 return otherGroups.get(pool);
}
export function otherChallengeCandidates(){
 if(!graphicCandidates){
  const chars=new Set();
  for(const [start,end] of OTHER_RANGES)for(let code=start;code<=end;code++){const glyph=String.fromCodePoint(code).normalize('NFC');if(glyph!=='\ufffd'&&characterKind(glyph)!=='kanji')chars.add(glyph);}
  for(const emoji of EMOJI)chars.add(emoji);
  graphicCandidates=Object.freeze([...chars]);
 }
 return graphicCandidates;
}
export function challengePools(library){
 if(!prepared.has(library))prepared.set(library,{
  kanji:library.randomPools.kanji,
  nonKanji:[...new Set([...otherChallengeCandidates(),...library.randomPools.nonKanji])].filter(glyph=>glyph!=='\ufffd'),
 });
 return prepared.get(library);
}
// Sparse Fisher-Yates: visit a candidate at most once without copying a large
// catalogue or probing any glyphs until the caller actually needs them.
function* randomized(pool,random){
 const swaps=new Map();
 for(let left=pool.length;left>0;){
  const index=Math.min(left-1,Math.floor(random()*left)),chosen=swaps.get(index)??index;
  left--;swaps.set(index,swaps.get(left)??left);yield pool[chosen];
 }
}
export function* challengeCandidates(pools,{seen=new Set(),previous=null,random=Math.random,rare=null,key=member=>JSON.stringify([member.glyph,member.font])}={}){
 const categories=random()<.5?['kanji','nonKanji']:['nonKanji','kanji'];
 const fonts=Object.keys(pools).filter(font=>Object.hasOwn(FONTS,font));
 // Choose the category once. Unsupported/repeated glyphs never reroll 50/50.
 for(const category of categories){
  // Choose the script share once, before probing fonts or geometry. Failed
  // candidates stay in that group until every font has been exhausted.
  const groups=category==='kanji'?['kanji']:random()<HANGUL_SHARE?['hangul','other']:['other','hangul'];
  for(const group of groups)for(const font of shuffled(fonts,random)){
   const base=Array.isArray(pools[font])?pools[font].filter(glyph=>(characterKind(glyph)==='kanji')===(category==='kanji')):pools[font][category]||[];
   const pool=category==='kanji'?base:splitOther(base)[group];
   for(const glyph of randomized(pool,random)){const member=rare===null?{glyph,font}:{glyph,font,rare};if(glyph!==previous&&!seen.has(key(member)))yield member;}
  }
 }
}
export async function drawChallengeEnemy(libraries,options={}){
 const libs=new Map(libraries),pools=Object.fromEntries([...libs].map(([font,lib])=>[font,challengePools(lib)]));
 const pause=options.yieldControl||(()=>new Promise(resolve=>setTimeout(resolve,0)));let probes=0;
 for(const candidate of challengeCandidates(pools,options)){
  // Rasterize only sampled candidates. Missing system fonts and geometry that
  // cannot form a top are skipped; give WebViews time to draw between probes.
  if(++probes%8===0)await pause();
  const lib=libs.get(candidate.font);
  try{if(lib.supports(candidate.glyph)){lib.measure(candidate.glyph);return candidate;}}catch{/* Try another candidate in the same category. */}
 }
 return null;
}
