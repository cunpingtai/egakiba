import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_RANKING, R24_METRICS, R24_CATEGORIES, R24_SAMPLE_GLYPHS, normalizeRankingOptions, rankGlyphs, createRankingInspector, rankingCopy, rankingHTML } from '../engine/r24-glyph-ranking.mjs';
const read = f => readFileSync(new URL('../'+f, import.meta.url), 'utf8');
const shapeFor = glyph => {
 const masses = {'文':.4,'剣':1.2,'龍':2.5,'A':.8,'あ':1.6,'☆':.9};
 const balances = {'文':.25,'剣':.6,'龍':.95,'A':.5,'あ':.7,'☆':.4};
 const tips = {'文':1,'剣':2,'龍':7,'A':3,'あ':4,'☆':1};
 return {mass:masses[glyph]??1,balance:balances[glyph]??.5,tips:tips[glyph]??2,area:10,inertia:8,radius:4};
};
const loader = async font => ({font,supports:g=>g!=='☆',get:g=>shapeFor(g)});

test('R24 options accept only supported fonts, metrics, categories and directions',()=>{
 assert.deepEqual(normalizeRankingOptions(),DEFAULT_RANKING);
 assert.deepEqual(normalizeRankingOptions({font:'bad',metric:'wins',category:'evil',direction:'sideways',query:'  龍  '}),{...DEFAULT_RANKING,font:'gothic',metric:'power',category:'all',direction:'desc',query:'龍'});
 assert.deepEqual(R24_METRICS,['speed','power','balance','hp']);
 assert.deepEqual(R24_CATEGORIES,['all','han','kana','latin','other']);
});

test('R24 uses a finite curated candidate set rather than claiming to cover Unicode',()=>{
 assert.equal(R24_SAMPLE_GLYPHS.length,34);
 assert.equal(new Set(R24_SAMPLE_GLYPHS).size,R24_SAMPLE_GLYPHS.length);
 assert.ok(R24_SAMPLE_GLYPHS.includes('文')&&R24_SAMPLE_GLYPHS.includes('A')&&R24_SAMPLE_GLYPHS.includes('☆'));
});

test('R24 ranking orders only native-verified metrics and provides competition ranks for ties',async()=>{
 const result=await rankGlyphs({font:'gothic',metric:'power',category:'all',direction:'desc'},{loader,glyphs:['文','剣','龍']});
 assert.equal(result.status,'complete');assert.equal(result.candidateCount,3);assert.equal(result.verifiedCount,3);
 assert.equal(result.rows[0].glyph,'龍');assert.equal(result.rows[0].rank,1);
 assert.ok(result.rows[0].stats.power>result.rows.at(-1).stats.power);
 const tied=await rankGlyphs({metric:'power'},{loader:async()=>({supports:()=>true,get:()=>({mass:1,balance:.5,tips:2,area:10,inertia:8,radius:4})}),glyphs:['文','剣','龍']});
 assert.deepEqual(tied.rows.map(r=>r.rank),[1,1,1]);
});

test('R24 supports ascending order and selected metric changes the ranking',async()=>{
 const high=await rankGlyphs({metric:'power',direction:'desc'},{loader,glyphs:['文','剣','龍']});
 const low=await rankGlyphs({metric:'power',direction:'asc'},{loader,glyphs:['文','剣','龍']});
 assert.equal(high.rows[0].glyph,'龍');assert.equal(low.rows[0].glyph,'文');
 const speed=await rankGlyphs({metric:'speed',direction:'desc'},{loader,glyphs:['文','剣','龍']});
 assert.equal(speed.rows[0].glyph,'文');
});

test('R24 filters by script category and candidate search before loading data',async()=>{
 let loads=0;const injected=async font=>{loads++;return loader(font);};
 const result=await rankGlyphs({category:'han',query:'文'},{loader:injected,glyphs:['文','剣','A','あ','☆']});
 assert.equal(result.candidateCount,1);assert.equal(result.rows[0].glyph,'文');assert.equal(loads,1);
 const empty=await rankGlyphs({category:'latin',query:'龍'},{loader:injected,glyphs:['文','剣','A','あ']});
 assert.equal(empty.status,'empty');assert.equal(empty.rows.length,0);assert.equal(loads,1);
});

test('R24 unsupported glyphs have no stats and never receive a rank',async()=>{
 const result=await rankGlyphs({metric:'balance'},{loader,glyphs:['文','☆','剣']});
 const unsupported=result.rows.find(r=>r.glyph==='☆');
 assert.equal(unsupported.status,'unsupported');assert.equal(unsupported.stats,null);assert.equal(unsupported.rank,null);
 assert.equal(result.unsupportedCount,1);assert.equal(result.verifiedCount,2);
});

test('R24 missing original font fails closed without fallback values or ranking',async()=>{
 const result=await rankGlyphs({font:'pop'},{loader:async()=>{throw Error('font missing');},glyphs:['文','剣']});
 assert.equal(result.status,'unavailable');assert.equal(result.verifiedCount,0);assert.equal(result.unavailableCount,2);
 assert.ok(result.rows.every(r=>r.stats===null&&r.rank===null));
});

test('R24 per-glyph measurement exceptions do not erase other verified candidates',async()=>{
 const result=await rankGlyphs({metric:'speed'},{loader:async()=>({supports:()=>true,get:g=>{if(g==='剣')throw Error('bad outline');return shapeFor(g);}}),glyphs:['文','剣','龍']});
 assert.equal(result.status,'complete');assert.equal(result.verifiedCount,2);assert.equal(result.unavailableCount,1);
 const broken=result.rows.find(r=>r.glyph==='剣');assert.equal(broken.stats,null);assert.equal(broken.rank,null);
});

test('R24 inspector prevents stale asynchronous scan from replacing latest filters',async()=>{
 const pending=[];const inspector=createRankingInspector(options=>new Promise(resolve=>pending.push({options,resolve})));
 const a=inspector.run({font:'gothic',metric:'power'});const b=inspector.run({font:'mincho',metric:'speed'});
 pending[1].resolve({status:'complete',options:pending[1].options,rows:[],verifiedCount:0});await b;
 pending[0].resolve({status:'unavailable',options:pending[0].options,rows:[],verifiedCount:0});await a;
 assert.equal(inspector.snapshot().options.font,'mincho');assert.equal(inspector.snapshot().options.metric,'speed');
 inspector.invalidate();assert.equal(inspector.snapshot().status,'idle');
});

test('R24 HTML includes honest scope, verified values only, filters and detail/lab actions',async()=>{
 const result=await rankGlyphs({metric:'power'},{loader,glyphs:['文','剣','龍']});
 const html=rankingHTML({options:{...DEFAULT_RANKING,metric:'power'},result},'zh');
 for(const text of ['最强与最弱文字属性研究','样本内名次','r24-font','r24-metric','r24-category','r24-direction','r24-query','data-r24-detail','data-r24-compare','data-r24-lab','不是实际对战胜率'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/全宇宙最强|胜率\s*\d+%|获胜概率/);
 const pending=rankingHTML({options:DEFAULT_RANKING,loading:true},'en');assert.match(pending,/data-r24-refresh disabled/);assert.doesNotMatch(pending,/data-r24-detail=/);
});

test('R24 renderer escapes glyph and query content and has an honest no-font state',async()=>{
 const html=rankingHTML({options:{...DEFAULT_RANKING,query:'<script>'},result:{status:'unavailable',candidateCount:3,verifiedCount:0,unsupportedCount:0,unavailableCount:3,rows:[{glyph:'文',font:'gothic',status:'unavailable',stats:null,rank:null}]}},'en');
 assert.match(html,/&lt;script&gt;/);assert.match(html,/Original font data could not be loaded/);assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/r24-rank-score/);
});

test('R24 four locales include caveat, missing-font, filters and navigation copy',()=>{
 for(const locale of ['ja','zh','en','ko']){const c=rankingCopy(locale);for(const key of ['title','intro','badge','note','font','metric','category','query','direction','loading','unavailable','noVerified','verified','unsupported','details','compare','tip','back','lab'])assert.ok(c[key],`${locale}.${key}`);}
});

test('R24 cumulative entrypoints connect attribute research and keep unfinished online leaderboard out of navigation',()=>{
 assert.match(read('r9-index.html'),/r24-glyph-ranking\.css/);assert.match(read('src/styles.css'),/r24-glyph-ranking\.css/);
 assert.match(read('r9-index.html'),/data-panel="glyph-ranking"/);assert.match(read('app.js'),/target==='glyph-ranking'\)\{closePanel\(\);document\.dispatchEvent/);assert.doesNotMatch(read('r9-index.html'),/data-panel="leaderboard"/);assert.doesNotMatch(read('src/routes/index.tsx'),/data-panel="leaderboard"/);
 const flow=read('r2-flow.js');for(const token of ['screen===\'ranking\'','function openRanking','function inspectRanking','detailReturnScreen','labReturnScreen','data-r24-open-ranking','data-r24-detail','data-r24-compare','#glyph-ranking','rankingHTML'])assert.ok(flow.includes(token),token);
 assert.match(read('engine/r21-glyph-collection.mjs'),/data-r24-open-ranking/);assert.match(read('engine/r22-glyph-detail.mjs'),/data-r24-open-ranking/);assert.match(read('engine/r23-glyph-lab.mjs'),/data-r24-open-ranking/);
 assert.match(read('package.json'),/"test:r24"/);assert.match(read('package.json'),/"fixture:r24"/);
});
