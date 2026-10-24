/** Actual R16 glyph() view markup from r2-flow; UI-only preview without WebGL/FontLibrary. */
import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),load=f=>readFileSync(new URL(f,root),'utf8');
const flow=load('r2-flow.js');
const glyphBody=flow.slice(flow.indexOf('function glyph(){'),flow.indexOf('function prepare(){'));
const css=['styles.css','flow.css','game-experience-r10.css','r15-story.css','r16-glyph.css'].map(load).join('\n');
const copy={ja:{glyph:'文字を選ぶ',glyphBrief:'好きな一文字と書体を選ぼう。カタチが強さを変える！',type:'キミの一文字',font:'書体',speed:'スピード',power:'パワー',hp:'HP',balance:'バランス',mockBadge:'準備中',demoStats:'書体を変えると能力も変化する。',preview:'3D文字プレビュー',continue:'この文字で勝負！'},zh:{glyph:'选择文字',glyphBrief:'选择喜欢的字与字体——不同形状，不同实力！',type:'你的战斗文字',font:'字体',speed:'速度',power:'力量',hp:'血量',balance:'平衡',mockBadge:'准备中',demoStats:'切换字体，也会改变能力。',preview:'3D 字形预览',continue:'就用这个字！'},en:{glyph:'Choose a glyph',glyphBrief:'Pick a glyph and style. Shape changes its power.',type:'Your battle glyph',font:'Typeface',speed:'Speed',power:'Power',hp:'HP',balance:'Balance',mockBadge:'Loading',demoStats:'Typeface changes power.',preview:'3D glyph preview',continue:'Battle with this glyph!'},ko:{glyph:'글자 선택',glyphBrief:'글자와 서체를 골라보세요.',type:'나의 배틀 글자',font:'서체',speed:'속도',power:'파워',hp:'HP',balance:'균형',mockBadge:'준비',demoStats:'서체가 능력을 바꿉니다.',preview:'3D 글자 미리보기',continue:'이 글자로 배틀!'}};
for(const lang of Object.keys(copy)){
 const page=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body class="in-flow"><div class="app-shell"><main id="flow-page" class="flow-page"><div class="flow-content" id="flow-content"></div></main></div><script>
 const model={glyph:'龍',glyphDraft:null,font:'gothic',mode:'story',comparisonGlyph:'剣',comparisonFont:'gothic'};
 const locale=()=>${JSON.stringify(lang)},t=(key)=>(${JSON.stringify(copy[lang])})[key]||key;
 const localPreviewStats=()=>[null,null,null,null],escapeHtml=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 ${glyphBody}
 document.querySelector('#flow-content').innerHTML=glyph();
 const stage=document.querySelector('.glyph-stage'),canvas=document.querySelector('#glyph-webgl');canvas.remove();
 const visual=document.createElement('div');visual.style.cssText='position:absolute;inset:20%;display:grid;place-items:center;font:900 clamp(80px,16vw,190px) serif;color:#e7f2ff;text-shadow:0 8px 40px #7ebdf2;pointer-events:none';visual.textContent='龍';stage.append(visual);
 document.querySelectorAll('[data-font-next]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-font-next]').forEach(x=>{x.classList.toggle('current',x===b);x.setAttribute('aria-pressed',String(x===b));});document.querySelector('#r16-glyph-status').dataset.state='loading';document.querySelector('#r16-glyph-status').textContent='Loading font…';}));
 </script></body></html>`;
 writeFileSync(new URL(`../assets/r16-fixture-${lang}.html`,import.meta.url),page);
}
console.log('R16 glyph UI fixtures written');
