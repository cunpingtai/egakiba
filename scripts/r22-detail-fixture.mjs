/** Visual-only fixtures. Mock measurement data are explicitly not native-font measurements. */
import {writeFileSync,readFileSync} from 'node:fs';
import {detailHTML} from '../engine/r22-glyph-detail.mjs';
const source=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const css=['flow.css','r21-collection.css','r22-glyph-detail.css'].map(source).join('\n');
const rows=[{font:'gothic',status:'ready',stats:{speed:67,power:45,balance:56,hp:90}},{font:'mincho',status:'ready',stats:{speed:58,power:63,balance:51,hp:89}},{font:'pop',status:'unsupported',stats:null},{font:'gyosho',status:'unavailable',stats:null}];
for(const [lang,font,status] of [['zh','gothic','mixed'],['en','mincho','mixed'],['ja','gothic','loading'],['ko','gyosho','mixed']]){
 const glyph='龍',html=detailHTML({glyph,font,rows:status==='loading'?[]:rows,loading:status==='loading',items:[{glyph,font:'gothic',discovered:true,favorite:false,plays:2},{glyph,font:'mincho',favorite:true,discovered:false,plays:0}],storageStatus:'available'},lang);
 const page=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>R22 visual fixture (mock stats)</title><style>html,body{background:#101b36;color:#f3f8ff;font-family:system-ui,sans-serif;margin:0}*,*:before,*:after{box-sizing:border-box}.fixture{max-width:1250px;margin:auto;padding:20px}.flow-heading h1{font-size:32px;margin:6px 0 11px}.flow-kicker{font-size:11px;letter-spacing:.13em;color:#eac993}.flow-status{color:#d4e4ff;font-size:12px}.flow-heading{display:flex;justify-content:space-between;gap:20px}.flow-heading p{font-size:14px;color:#cfdef2;line-height:1.5}button{font-family:inherit}${css}</style></head><body><div class="fixture"><main class="flow-content">${html}</main><p style="font-size:11px;color:#aebdd2">VISUAL FIXTURE ONLY — values mocked to verify layout, not measurements from original fonts.</p></div></body></html>`;
 const out=`r22-detail-${lang}-${font}-${status}-fixture.html`;writeFileSync(new URL(`../assets/${out}`,import.meta.url),page);console.log(out);
}
