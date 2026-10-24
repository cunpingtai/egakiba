import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLLECTION_KEY,SUGGESTED_GLYPHS,readCollection,writeCollection,readCollectionView,markDiscovered,toggleFavorite,filterCollection,collectionHTML,collectionCopy,glyphCategory,nativeStatsHTML} from '../engine/r21-glyph-collection.mjs';
import {R19_HISTORY_KEY} from '../engine/r19-result-report.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function storage(records=[]){const data=new Map(records);return {getItem:key=>data.get(key)||null,setItem:(key,val)=>data.set(key,val),data};}
const match=(glyph='龍',font='mincho')=>({version:1,mode:'story',levelId:'01-01',glyph,font,outcome:'win',cleared:true,stars:2,durationSeconds:13,hpRemaining:60,dashCount:1,contactEvents:2,ruleset:'story',playedAt:'2026-10-24T00:00:00.000Z'});
test('candidate glyphs are not silently marked as discovered',()=>{
 const s=storage(),view=readCollectionView(s);assert.equal(view.discoveredCount,0);assert.equal(view.favoriteCount,0);assert.ok(view.items.length>=30);
 assert.equal(view.items.find(e=>e.glyph==='龍'&&e.font==='gothic').discovered,false);
 assert.equal(readCollection(s).status,'available');
});
test('recent R19 records are discovered only in their actual font, not invented lifetime usage',()=>{
 const s=storage([[R19_HISTORY_KEY,JSON.stringify([match('龍','mincho'),match('龍','mincho'),match('文','gothic')])]]);
 const view=readCollectionView(s),mincho=view.items.find(e=>e.glyph==='龍'&&e.font==='mincho');
 assert.equal(view.discoveredCount,2);assert.equal(mincho.plays,2);assert.equal(mincho.discovered,true);
 assert.equal(view.items.find(e=>e.glyph==='龍'&&e.font==='gothic').discovered,false);
});
test('favorite does not invent a discovery; variants persist separately and toggling off removes empty records',()=>{
 const s=storage();assert.equal(toggleFavorite('龍','mincho',s).status,'saved');
 const view=readCollectionView(s);assert.equal(view.discoveredCount,0);assert.equal(view.favoriteCount,1);
 assert.equal(view.items.find(e=>e.glyph==='龍'&&e.font==='gothic').favorite,false);
 assert.equal(toggleFavorite('龍','mincho',s).status,'saved');assert.equal(readCollection(s).entries.length,0);
 assert.equal(markDiscovered('龍','mincho',s).status,'saved');assert.equal(markDiscovered('龍','mincho',s).status,'unchanged');
 assert.equal(toggleFavorite('龍','mincho',s).status,'saved');assert.equal(toggleFavorite('龍','mincho',s).status,'saved');
 assert.equal(readCollection(s).entries[0].discovered,true);
});
test('category and search filters are based on unicode class, never static fake physics stats',()=>{
 assert.equal(glyphCategory('文'),'han');assert.equal(glyphCategory('あ'),'kana');assert.equal(glyphCategory('A'),'latin');assert.equal(glyphCategory('☆'),'other');
 const view=readCollectionView(storage());
 assert.ok(filterCollection(view.items,{category:'kana'}).every(e=>glyphCategory(e.glyph)==='kana'));
 assert.ok(filterCollection(view.items,{query:'龍'}).every(e=>e.glyph==='龍'));
 assert.equal(filterCollection(view.items,{view:'discovered'}).length,0);
 assert.equal(filterCollection(view.items,{view:'bad'}).length,0);
});
test('invalid entries and corrupted data are bounded, and blocked storage reports failure',()=>{
 const s=storage([[COLLECTION_KEY,JSON.stringify({version:1,entries:[{glyph:'AB',font:'gothic',favorite:true},{glyph:'夢',font:'unknown',discovered:true},{glyph:'夢',font:'pop',discovered:true}]})]]);
 assert.deepEqual(readCollection(s).entries.map(e=>[e.glyph,e.font]),[['夢','pop']]);
 assert.equal(markDiscovered('AB','gothic',s).status,'invalid');assert.equal(toggleFavorite('文','bad',s).status,'invalid');
 const blocked={getItem(){throw Error('permission denied');},setItem(){throw Error('permission denied');}};
 assert.equal(readCollection(blocked).status,'unavailable');assert.equal(toggleFavorite('文','gothic',blocked).status,'unavailable');
 assert.match(collectionHTML(readCollectionView(blocked),{locale:'en'}),/Local storage unavailable/);
 const corrupt=storage([[COLLECTION_KEY,'not json']]);assert.equal(readCollection(corrupt).status,'unavailable');
});
test('four language pages and HTML-escaping defend local content',()=>{
 const s=storage();const view=readCollectionView(s);
 for(const locale of ['ja','zh','en','ko']){
  const copy=collectionCopy(locale);for(const key of ['title','intro','tip','notFound','missing'])assert.ok(copy[key]);
  const html=collectionHTML(view,{locale,query:'"<img src=x onerror=alert(1)>',view:'all'});
  assert.match(html,/r21-search/);assert.match(html,/data-r21-use/);assert.doesNotMatch(html,/<img src=x/);
  assert.match(html,/&lt;img/);
 }
 const native=nativeStatsHTML({speed:55,power:64,balance:61,hp:95},'zh');assert.match(native,/55/);assert.match(native,/95/);
 assert.doesNotMatch(collectionHTML(view,{locale:'zh'}),/速度.*55/);
});
test('source integration: both entries have stylesheet, real collection screen, navigation, battle-start discovery',()=>{
 for(const src of ['r9-index.html','src/styles.css'])assert.match(file(src),/r21-collection\.css/);
 for(const src of ['r9-index.html','src/routes/index.tsx'])assert.match(file(src),/data-panel="collection"/);
 const flow=file('r2-flow.js'),app=file('app.js');
 assert.match(flow,/model\.screen==='collection'\?collectionHTML/);
 assert.match(flow,/markDiscovered\(requestedGlyph,requestedFont\)/);
 assert.match(flow,/launchOutcome\?\.status==='started'/);
 assert.match(flow,/data-r21-favorite/);assert.match(flow,/data-r21-use/);
 assert.match(flow,/loadClassicLibrary\(selected\.font\)/);
 assert.match(app,/\['profile','collection'\]\.includes\(target\)/);assert.doesNotMatch(app,/data-panel=.?account/);
 assert.ok(!file('r8-classic-screen.mjs').includes('r21-glyph-collection'));
});
