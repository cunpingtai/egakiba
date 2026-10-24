/** Standalone visual QA fixture: real R21 HTML generator + representative mocked LOCAL data.
 * Font metrics are deliberately absent; no actual native WebGL/battle claims. */
import {writeFileSync,readFileSync} from 'node:fs';
import {readCollectionView,collectionHTML,COLLECTION_KEY} from '../engine/r21-glyph-collection.mjs';
import {R19_HISTORY_KEY} from '../engine/r19-result-report.mjs';
const fromRoot=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const recent=['龍','文','花','剣'].map((glyph,i)=>({version:1,mode:'story',levelId:'01-01',glyph,font:'gothic',outcome:'win',cleared:true,stars:1,durationSeconds:10+i,playedAt:'2026-10-24T00:00:00Z'}));
const persisted={version:1,entries:[{glyph:'龍',font:'mincho',favorite:true,discovered:true},{glyph:'花',font:'gothic',favorite:true,discovered:false},{glyph:'あ',font:'pop',favorite:true,discovered:false}]};
const stores=new Map([[COLLECTION_KEY,JSON.stringify(persisted)],[R19_HISTORY_KEY,JSON.stringify(recent)]]);
const mock={getItem:key=>stores.get(key)??null};
const css=['flow.css','r21-collection.css'].map(fromRoot).join('\n');
for(const [lang,view,query] of [['zh','all',''],['en','favorites',''],['ja','discovered',''],['ko','all','さ']]){
 const snapshot=readCollectionView(mock),render=collectionHTML(snapshot,{locale:lang,query,view,selectedKey:'["龍","mincho"]'});
 const content=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;min-height:100%;background:#0d1b39;color:#f5f8ff;font-family:system-ui,sans-serif;box-sizing:border-box}*,*:before,*:after{box-sizing:inherit}.fixture{max-width:1250px;margin:0 auto;padding:18px}.flow-heading h1{font-size:32px;margin:7px 0 11px}${css}</style></head><body><div class="fixture"><div class="flow-content">${render}</div></div></body></html>`;
 const name=`r21-collection-${lang}-${view}-fixture.html`;writeFileSync(new URL(`../assets/${name}`,import.meta.url),content);console.log(name);
}
