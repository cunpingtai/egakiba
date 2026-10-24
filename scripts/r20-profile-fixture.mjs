/** R20 visual fixtures use real R20 DOM generation with representative LOCAL test data.
 * This is not live WebGL or a real user's results. */
import {writeFileSync,readFileSync} from 'node:fs';
import {renderPlayerProfile,readPlayerProfile} from '../engine/r20-player-profile.mjs';
import {R19_HISTORY_KEY} from '../engine/r19-result-report.mjs';
import {R10_SAVE_KEY} from '../engine/r10-arcade-save.mjs';
const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const base={schema:1,revision:19,progress:{'01-01':{stars:3,bestSeconds:8.6},'01-02':{stars:2,bestSeconds:14.2}},battles:47,lastGlyph:'龍',lastFont:'mincho'};
const history=Array.from({length:14},(_,i)=>({version:1,mode:'story',levelId:['01-01','01-02','01-03','01-04'][i%4],glyph:['龍','文','風','剣'][i%4],font:'gothic',outcome:i%4===3?'loss':'win',cleared:i%4!==3,stars:i%4===3?0:i%3+1,durationSeconds:9.2+i*1.4,playedAt:new Date(Date.UTC(2026,9,24,0,i*2)).toISOString()}));
const mem=new Map([[R10_SAVE_KEY,JSON.stringify(base)],[R19_HISTORY_KEY,JSON.stringify(history)]]);
const storage={getItem:key=>mem.get(key)||null};
const css=['flow.css','r20-profile.css'].map(src).join('\n');
for(const [lang,mode] of [['zh','all'],['en','loss'],['ja','empty']]){
 const snapshot=mode==='empty'?readPlayerProfile({getItem:key=>key===R10_SAVE_KEY?JSON.stringify({...base,progress:{},battles:3}):null}):readPlayerProfile(storage);
 const view=renderPlayerProfile(snapshot,{locale:lang,stage:mode==='loss'?'01-04':'all',outcome:mode==='loss'?'loss':'all'});
 const html=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;min-height:100%;background:#0b1932;color:#fff;font-family:system-ui,sans-serif}*,*::before,*::after{box-sizing:border-box}.fixture{max-width:1240px;margin:0 auto;padding:24px}.button{cursor:pointer;border:1px solid #7794b8;border-radius:11px;background:#233d67;color:white}.button-primary{background:#346ca3;border-color:#447db6}${css}</style></head><body><div class="fixture"><div class="flow-content">${view}</div></div></body></html>`;
 const name=`r20-profile-${lang}-${mode}-fixture.html`;writeFileSync(new URL(`../assets/${name}`,import.meta.url),html);console.log(name);
}
