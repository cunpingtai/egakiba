import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_LAB,LAB_FONTS,labCopy,labHash,parseLabHash,validateLabSelection,inspectLab,labDelta,createLabInspector,labHTML} from '../engine/r23-glyph-lab.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const pair={a:'龍',fontA:'gothic',b:'剣',fontB:'mincho'};
const metrics=mass=>({mass,balance:.55,tips:2,area:10,inertia:9,radius:4});
const loader=async f=>({supports:()=>true,get:()=>metrics(f==='gothic'?.4:2.1)});
test('R23 four font choices and exact single glyph pair validation',()=>{
 assert.equal(LAB_FONTS.length,4);
 assert.deepEqual(validateLabSelection(pair),{ok:true,selection:pair});
 for(const s of [{...pair,a:'龍剣'},{...pair,b:'\n'},{...pair,fontB:'evil'},{...pair,a:'\u200b'},null])assert.equal(validateLabSelection(s).ok,false);
});
test('R23 deep link roundtrips unicode, same glyph and mixed fonts',()=>{
 for(const x of [pair,{a:'A',fontA:'pop',b:'☆',fontB:'gyosho'},DEFAULT_LAB])assert.deepEqual(parseLabHash(labHash(x)),x);
 assert.deepEqual(parseLabHash('#lab'),DEFAULT_LAB);
 for(const h of ['#lab/%E9%BE%8D/gothic/%FF/mincho','#lab/%E9%BE%8D/nope/%E5%89%A3/pop','#lab/%e9%be%8d/gothic/%E5%89%A3/mincho','#lab/a/gothic/b/mincho/extra','#lab/%E9%BE%8D/gothic/AAA/mincho','#lab/a/gothic/b/mincho?x','#glyph/'])assert.equal(parseLabHash(h),null,h);
});
test('R23 separately loads each font and returns native-derived metrics without winner claims',async()=>{
 const called=[];const result=await inspectLab(pair,{loader:async font=>{called.push(font);return loader(font);}});
 assert.deepEqual(called,['gothic','mincho']);assert.equal(result.status,'ready');
 for(const p of ['a','b'])for(const value of Object.values(result.sides[p].stats))assert.ok(Number.isFinite(value));
 assert.equal(labDelta(result).speed,result.sides.a.stats.speed-result.sides.b.stats.speed);
 assert.equal(result.sides.a.stats.speed===result.sides.b.stats.speed,false);
});
test('R23 same-font same-glyph yields exactly zero delta (no arbitrary bonus)',async()=>{
 const result=await inspectLab({a:'文',fontA:'gothic',b:'文',fontB:'gothic'},{loader});
 assert.deepEqual(labDelta(result),{speed:0,power:0,balance:0,hp:0});
});
test('R23 unsupported opponent disables duel, not a fabricated winner or guessed metric',async()=>{
 const result=await inspectLab(pair,{loader:async f=>({supports:()=>f==='gothic',get:()=>metrics(1)})});
 assert.equal(result.status,'incomplete');assert.equal(result.sides.a.status,'ready');assert.equal(result.sides.b.status,'unsupported');
 assert.equal(result.sides.b.stats,null);assert.equal(labDelta(result),null);
 const html=labHTML({selection:pair,result},'zh');assert.match(html,/该字体不支持这个文字/);assert.match(html,/data-r23-battle disabled/);assert.doesNotMatch(html,/获胜概率|胜率\s*\d+%/);
});
test('R23 per-font loading failures do not impact separate original library result',async()=>{
 const result=await inspectLab(pair,{loader:async f=>{if(f==='mincho')throw Error('missing file');return loader(f);}});
 assert.equal(result.status,'incomplete');assert.equal(result.sides.a.status,'ready');assert.equal(result.sides.b.status,'unavailable');assert.equal(result.sides.b.stats,null);
});
test('R23 invalid input stops before accessing font files',async()=>{
 let called=0;const r=await inspectLab({...pair,a:'XY'},{loader:()=>{called++;return loader('gothic');}});
 assert.equal(r.status,'invalid');assert.equal(called,0);
});
test('R23 asynchronous stale requests cannot override newer selections',async()=>{
 const done=[];const inspector=createLabInspector(s=>new Promise(resolve=>done.push({s,resolve})));
 const one=inspector.verify(pair);const two=inspector.verify({...pair,b:'山'});
 done[1].resolve({status:'ready',selection:done[1].s,sides:{a:{status:'ready',stats:{}},b:{status:'ready',stats:{}}}});await two;
 done[0].resolve({status:'invalid'});await one;
 assert.equal(inspector.snapshot().selection.b,'山');
 inspector.invalidate();assert.equal(inspector.snapshot().status,'idle');
});
test('R23 renderer escapes user input, marks values pending until verified, and shows both fonts',()=>{
 const html=labHTML({selection:{a:'<',fontA:'gothic',b:'&',fontB:'mincho'},loading:true},'en');
 assert.match(html,/&lt;/);assert.match(html,/&amp;/);assert.match(html,/data-r23-battle disabled/);assert.match(html,/r23-b-font/);
 assert.match(html,/MINCHO/);assert.match(html,/GOTHIC/);assert.doesNotMatch(html,/<script>/);
});
test('R23 renderer provides four metrics and verified battle CTA when both sides pass',async()=>{
 const result=await inspectLab(pair,{loader});const html=labHTML({selection:pair,result},'zh');
 for(const text of ['速度','力量','平衡','HP','data-r23-battle','data-r23-swap','data-r23-verify','data-r23-share','data-r23-back'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/data-r23-battle disabled/);assert.match(html,/A − B/);
});
test('R23 four languages provide clear caveat and full controls',()=>{
 for(const lang of ['ja','zh','en','ko']){const c=labCopy(lang);for(const k of ['title','note','caution','invalid','unsupported','unavailable','battle','swap','loading','ready','glyph','font'])assert.ok(c[k],`${lang} ${k}`);}
});
test('R23 cumulative entrypoints and battle preflight transmit rival font correctly without changing physics',()=>{
 assert.match(read('r9-index.html'),/r23-glyph-lab\.css/);assert.match(read('src/styles.css'),/r23-glyph-lab\.css/);
 const flow=read('r2-flow.js');for(const token of ['parseLabHash(location.hash)','data-r23-battle','function labBattle()','createLabInspector','model.opponentFont=checked.selection.fontB','fontId:model.opponentFont||model.font','data-r23-open','r23-opponent-font','data-r23-swap','function changeLabField','r23-a-glyph'])assert.ok(flow.includes(token),token);
 assert.match(read('engine/r21-glyph-collection.mjs'),/data-r23-open/);assert.match(read('engine/r22-glyph-detail.mjs'),/data-r23-open/);
 assert.doesNotMatch(read('engine/classic-v2-adapter.mjs'),/r23-glyph-lab/);
});
