/** R23 actual HTML renderer, representative FAKE NUMBERS FOR LAYOUT ONLY. */
import {readFileSync,writeFileSync} from 'node:fs';
import {labHTML,DEFAULT_LAB} from '../engine/r23-glyph-lab.mjs';
const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const css=['flow.css','r23-glyph-lab.css'].map(src).join('\n');
const pair={a:'龍',fontA:'gothic',b:'剣',fontB:'mincho'};
const numbers={status:'ready',selection:pair,sides:{a:{status:'ready',stats:{speed:65,power:87,balance:55,hp:97}},b:{status:'ready',stats:{speed:79,power:72,balance:63,hp:91}}}};
for(const [l,mode] of [['zh','ready'],['ja','waiting'],['en','unsupported'],['ko','ready']]){
 const res=mode==='ready'?numbers:mode==='unsupported'?{status:'incomplete',selection:pair,sides:{a:numbers.sides.a,b:{status:'unsupported',stats:null}}}:null;
 const body=labHTML({selection:pair,result:res,loading:mode==='waiting'},l);
 const html=`<!doctype html><html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>R23 UI fixture — numbers mocked</title><style>html,body{background:#0d1934;color:white;font-family:system-ui,sans-serif;margin:0}*,*:before,*:after{box-sizing:border-box}.fixture{max-width:1240px;margin:auto;padding:22px}.flow-heading h1{font-size:32px;margin:7px 0 11px}.flow-heading{display:flex;justify-content:space-between;gap:22px;align-items:start}.flow-heading p{font-size:14px;line-height:1.55;color:#cbdaf3}.flow-kicker{font-size:11px;letter-spacing:.13em;color:#ebcd92}.flow-status{font-size:12px;color:#dbe8fc}${css}</style></head><body><div class="fixture"><main class="flow-content">${body}</main><p style="font-size:11px;color:#c1cee4">LAYOUT FIXTURE — THESE NUMBERS ARE MOCK DATA, NOT VERIFIED ORIGINAL FONT METRICS.</p></div></body></html>`;
 const name=`r23-lab-${l}-${mode}-fixture.html`;writeFileSync(new URL('../assets/'+name,import.meta.url),html);console.log(name);
}
