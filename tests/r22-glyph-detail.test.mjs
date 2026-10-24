import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {detailHash,parseDetailHash,measureFontVariants,metricDelta,detailHTML,detailCopy,R22_FONTS} from '../engine/r22-glyph-detail.mjs';
import {readCollectionView} from '../engine/r21-glyph-collection.mjs';
const fromRoot=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const local={getItem:()=>null};
const metrics=mass=>({mass,balance:.55,tips:3,area:10,inertia:9,radius:4});
const mockLoader=async font=>{
 if(font==='gyosho')throw new Error('file not present');
 return {supports:()=>font!=='pop',get:()=>metrics(font==='gothic'?.35:2.1)};
};
test('R22 validates glyph/font deep links exactly, without truncation or path injection',()=>{
 for(const glyph of ['龍','文','A','☆','〇'])for(const font of R22_FONTS){assert.deepEqual(parseDetailHash(detailHash(glyph,font)),{glyph,font});}
 for(const bad of ['','文文','\n','  ', '<script>'])assert.equal(detailHash(bad),null);
 for(const bad of ['#glyph/%E0%A4%A/gothic','#glyph/%3Cscript%3E/gothic','#glyph/%E9%BE%8D/unlisted','#glyph/%E9%BE%8D/gothic/extra','#glyph/%E9%BE%8D/gothic?foo','#profile', '#glyph/%e9%be%8d/gothic'])assert.equal(parseDetailHash(bad),null);
});
test('all four fonts are checked independently with real derived metrics or explicit errors',async()=>{
 const result=await measureFontVariants('龍',{loader:mockLoader});
 assert.equal(result.status,'complete');assert.equal(result.rows.length,4);
 assert.deepEqual(result.rows.map(x=>x.status),['ready','ready','unsupported','unavailable']);
 for(const row of result.rows){if(row.status==='ready'){for(const key of ['speed','power','balance','hp'])assert.ok(Number.isFinite(row.stats[key]));}else assert.equal(row.stats,null);}
 assert.notEqual(result.rows[0].stats.speed,result.rows[1].stats.speed);
});
test('font rejection does not break the other rows, no fabricated fallback numbers',async()=>{
 const result=await measureFontVariants('文',{loader:async id=>{if(id==='gothic')throw Error('offline');return {supports:()=>false};}});
 assert.equal(result.rows[0].status,'unavailable');assert.deepEqual(result.rows.slice(1).map(r=>r.status),['unsupported','unsupported','unsupported']);
 assert.ok(result.rows.every(r=>r.stats===null));
});
test('invalid glyph is rejected before font loading',async()=>{
 let count=0;const result=await measureFontVariants('龍A',{loader:()=>{count++;return Promise.resolve({});}});
 assert.equal(result.status,'invalid');assert.equal(count,0);assert.deepEqual(result.rows,[]);
});
test('delta uses only two genuinely measured and supported font variants',async()=>{
 const rows=(await measureFontVariants('龍',{loader:mockLoader})).rows;
 assert.deepEqual(metricDelta(rows[0],rows[0]),{speed:0,power:0,balance:0,hp:0});
 assert.equal(metricDelta(rows[2],rows[0]),null);assert.equal(metricDelta(rows[0],rows[3]),null);
 assert.equal(metricDelta(rows[1],rows[0]).hp,rows[1].stats.hp-rows[0].stats.hp);
});
test('locale copy complete in Japanese Chinese English and Korean',()=>{
 for(const l of ['ja','zh','en','ko']){const c=detailCopy(l);for(const key of ['title','intro','back','loading','unsupported','unavailable','speed','power','balance','hp','diff','retry','warning'])assert.ok(c[key],`${l}:${key}`);}
});
test('detail page contains four font tabs, comparisons, real values and action controls',async()=>{
 const rows=(await measureFontVariants('文',{loader:mockLoader})).rows;
 const html=detailHTML({glyph:'文',font:'mincho',rows,items:readCollectionView(local).items},'zh');
 assert.match(html,/r22-detail/);assert.match(html,/文字详情/);assert.match(html,/data-r22-back/);
 assert.equal((html.match(/class="r22-tab /g)||[]).length,4);
 assert.match(html,/data-r22-favorite/);assert.match(html,/data-r22-use/);assert.match(html,/data-r22-share/);assert.match(html,/data-r22-retry/);
 assert.match(html,/原始字体资源不可用/);assert.match(html,/该字体不支持此文字/);
 assert.match(html,/相对当前字体的差值/);
});
test('pending or missing readings render dash rather than mocked stats',()=>{
 const html=detailHTML({glyph:'文',font:'gothic',loading:true,items:readCollectionView(local).items},'zh');
 assert.match(html,/正在读取四种字体/);assert.match(html,/data-r22-use disabled/);assert.doesNotMatch(html,/class="r22-numbers"/);
});
test('user-provided text is escaped in detail page and not promoted to raw markup',()=>{
 const html=detailHTML({glyph:'<',font:'gothic',items:[],rows:[]},'en');
 assert.match(html,/&lt;/);assert.doesNotMatch(html,/<script>/);
});
test('previous discovery and collection fields remain unmodified',()=>{
 const item={glyph:'文',font:'mincho',discovered:false,favorite:true,plays:0};
 const html=detailHTML({glyph:'文',font:'mincho',items:[item],rows:[]},'en');
 assert.match(html,/Not played/);assert.match(html,/Remove favorite/);
 assert.equal(item.discovered,false);
});
test('R21 and R22 linked in both entrypoints; original battle adapter unchanged',()=>{
 for(const entry of ['r9-index.html','src/styles.css'])assert.match(fromRoot(entry),/r22-glyph-detail\.css/);
 assert.match(fromRoot('engine/r21-glyph-collection.mjs'),/data-r22-open/);
 const flow=fromRoot('r2-flow.js');for(const phrase of ['parseDetailHash(location.hash)','measureFontVariants(glyph)','detailHTML(',"model.screen==='detail'",'detailRevision','data-r22-use','updateDetailFont','model.font=detailState.font'])assert.ok(flow.includes(phrase),phrase);
 assert.match(flow,/if\(rev!==detailRevision\|\|model\.screen!==\x27detail\x27/);
 assert.equal(fromRoot('engine/classic-v2-adapter.mjs').includes('r22-glyph-detail'),false);
});
