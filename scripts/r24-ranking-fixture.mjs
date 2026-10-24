/** R24 visual-only fixtures. All displayed metrics here are deliberately mocked and are NOT native measurement evidence. */
import { readFileSync, writeFileSync } from 'node:fs';
import { rankingHTML, DEFAULT_RANKING } from '../engine/r24-glyph-ranking.mjs';
const read = f => readFileSync(new URL('../'+f, import.meta.url), 'utf8');
const css = ['flow.css','r24-glyph-ranking.css'].map(read).join('\n');
const options={...DEFAULT_RANKING,font:'gothic',metric:'power',category:'all',direction:'desc',query:''};
const glyphs=[['龍',98,74,89,104],['剣',91,83,67,101],['炎',88,78,72,100],['風',84,61,81,99],['文',77,56,66,97],['花',73,63,88,102],['山',69,70,93,103],['田',62,59,97,104]];
const rows=glyphs.map(([glyph,power,speed,balance,hp],i)=>({glyph,font:'gothic',status:'ready',rank:i+1,stats:{power,speed,balance,hp}}));
const ready={status:'complete',options,candidateCount:34,verifiedCount:28,unsupportedCount:4,unavailableCount:2,rows};
for(const [lang,mode] of [['zh','ready'],['ja','loading'],['en','unavailable'],['ko','ready']]){
 const result=mode==='ready'?ready:mode==='unavailable'?{status:'unavailable',options,candidateCount:34,verifiedCount:0,unsupportedCount:0,unavailableCount:34,rows:[]}:null;
 const html=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>R24 layout fixture — mocked stats only</title><style>html,body{margin:0;background:#0d1934;color:#f0f5ff;font-family:system-ui,sans-serif}*,*:before,*:after{box-sizing:border-box}.fixture{max-width:1240px;margin:auto;padding:18px}.flow-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.flow-heading h1{font-size:32px;margin:8px 0}.flow-heading p{font-size:14px;line-height:1.6;color:#c3d3ed}.flow-kicker{font-size:11px;letter-spacing:.13em;color:#ebcd92}.flow-status{font-size:12px;color:#dbe8fc}${css}</style></head><body><div class="fixture">${rankingHTML({options,result,loading:mode==='loading'},lang)}<p style="font-size:11px;color:#aebfda;margin:14px">UI FIXTURE ONLY — ALL RANKS AND METRICS SHOWN HERE ARE MOCK DATA, NOT VERIFIED FONT MEASUREMENTS.</p></div></body></html>`;
 writeFileSync(new URL(`../assets/r24-ranking-${lang}-${mode}-fixture.html`,import.meta.url),html);
 console.log(`r24-ranking-${lang}-${mode}-fixture.html`);
}
