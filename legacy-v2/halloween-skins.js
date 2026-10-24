// Stable event IDs. Appearance only: no geometry, collision or stat changes.
export const HALLOWEEN_SKINS=Object.freeze([
 {id:'halloween-2026-dots',name:'かぼちゃ柄',color:'#ff8724',colors:['#ff8724','#21152b'],pattern:'pumpkin'},
 {id:'halloween-2026-web',name:'蜘蛛の巣柄',color:'#7c36c6',colors:['#7c36c6','#21152b'],pattern:'web'},
 {id:'halloween-2026-night',name:'三日月と星柄',color:'#21152b',colors:['#21152b','#ffd45c'],pattern:'night'},
].map(s=>Object.freeze({...s,colors:Object.freeze(s.colors),kind:'halloween',source:'halloween-2026',metalness:.06,roughness:.28})));
export const HALLOWEEN_WEB_STYLE=Object.freeze({scale:1.5,ring:1.2,spoke:.95});
const icons=new Map();
export function halloweenSkinIcon(skin){
 if(!skin?.pattern)return null;if(icons.has(skin.id))return icons.get(skin.id);
 let art='';const base=skin.colors[0],ink=skin.colors[1];
 if(skin.pattern==='pumpkin'){
  // Same face coordinates as the pigment shader: only the overall icon scale differs.
  art=`<defs><mask id="pumpkin-mouth" maskUnits="userSpaceOnUse" x="-40" y="-25" width="80" height="70"><ellipse cx="0" cy="18" rx="34" ry="20" fill="white"/><ellipse cx="0" cy="1" rx="36" ry="17" fill="black"/><path fill="black" d="M-23 11h12v12h-12zM11 11h12v12H11zM-6 29H6v10H-6z"/></mask></defs><g transform="translate(96 80) scale(2)"><path d="M-29-3-19-21-9-3ZM9-3 19-21 29-3ZM-6 11 0-1 6 11Z"/><ellipse cx="0" cy="18" rx="34" ry="20" mask="url(#pumpkin-mouth)"/></g>`;
 }else if(skin.pattern==='web'){
  const point=(cx,cy,r,a)=>`${(cx+Math.cos(a)*r*1.2).toFixed(2)} ${(cy+Math.sin(a)*r*1.2).toFixed(2)}`;
  for(const [cx,cy] of [[36,43],[156,43],[96,163]]){
   for(let i=0;i<12;i++)art+=`<path d="M${cx} ${cy}L${point(cx,cy,49,i*Math.PI/6)}"/>`;
   for(const r of [12,25,38,49]){let d=`M${point(cx,cy,r,0)}`;for(let i=1;i<=12;i++){const a=i*Math.PI/6;d+=`Q${point(cx,cy,r*.65,a-Math.PI/12)} ${point(cx,cy,r,a)}`;}art+=`<path d="${d}"/>`;}
  }
  art=`<g fill="none" stroke="${ink}" stroke-width="2.4">${art}</g>`;
 }else if(skin.pattern==='night'){
  art=`<defs><mask id="crescent"><rect width="192" height="192" fill="white"/><circle cx="106.84" cy="76.08" r="53.94" fill="black"/></mask></defs><circle cx="79" cy="90" r="58" mask="url(#crescent)" transform="rotate(7.918 79 90)"/><path d="m147 33 4 12 12 4-12 4-4 12-4-12-12-4 12-4Zm-3 87 3 11 11 3-11 3-3 11-3-11-11-3 11-3Zm-41 30 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/>`;

 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><path fill="${base}" d="M0 0h192v192H0z"/><g fill="${ink}">${art}</g></svg>`;
 const paint=`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;icons.set(skin.id,paint);return paint;
}
// Glyph paint follows the same 512-unit, staggered layout as the 3D shader.
// Keep the enlarged single-motif artwork above exclusively for inventory icons.
const glyphPaints=new Map();
export function halloweenGlyphPaint(skin){
 if(!skin?.pattern)return null;if(glyphPaints.has(skin.id))return glyphPaints.get(skin.id);
 const [base,ink]=skin.colors;let defs='',art='';
 if(skin.pattern==='pumpkin'){
  defs='<mask id="mouth" maskUnits="userSpaceOnUse" x="-40" y="-25" width="80" height="70"><ellipse cx="0" cy="18" rx="34" ry="20" fill="white"/><ellipse cx="0" cy="1" rx="36" ry="17" fill="black"/><path fill="black" d="M-23 11h12v12h-12zM11 11h12v12H11zM-6 29H6v10H-6z"/></mask><g id="face"><path d="M-29-3-19-21-9-3ZM9-3 19-21 29-3ZM-6 11 0-1 6 11Z"/><ellipse cx="0" cy="18" rx="34" ry="20" mask="url(#mouth)"/></g>';
  for(let row=-1;row<4;row++)for(let col=-1;col<4;col++)art+=`<use href="#face" transform="translate(${90+(col*180)-((row%2+2)%2)*90} ${78+row*156}) scale(1.55)"/>`;
 }else if(skin.pattern==='web'){
  const point=(r,a)=>[r*Math.cos(a),r*Math.sin(a)];let web='';
  for(let i=0;i<12;i++){const p=point(76,i*Math.PI/6);web+=`<path d="M0 0L${p}" stroke-width="${HALLOWEEN_WEB_STYLE.spoke*2}"/>`;}
  for(const radius of [12,30,48,66]){let d=`M${point(radius*.966,0)}`;for(let i=0;i<12;i++){const a=point(radius*.966,i*Math.PI/6),b=point(radius*.966,(i+1)*Math.PI/6),m=point(radius*.786,(i+.5)*Math.PI/6),q=[2*m[0]-(a[0]+b[0])/2,2*m[1]-(a[1]+b[1])/2];d+=`Q${q} ${b}`;}web+=`<path d="${d}Z" stroke-width="${HALLOWEEN_WEB_STYLE.ring*2}"/>`;}
  defs=`<g id="web" fill="none" stroke="${ink}">${web}</g>`;
  for(let row=-1;row<4;row++)for(let col=-1;col<4;col++)art+=`<use href="#web" transform="translate(${(90+col*180-((row%2+2)%2)*90)*HALLOWEEN_WEB_STYLE.scale} ${(90+row*180)*HALLOWEEN_WEB_STYLE.scale}) scale(${HALLOWEEN_WEB_STYLE.scale})"/>`;
 }else{
  defs='<mask id="moon" maskUnits="userSpaceOnUse" x="-40" y="-40" width="80" height="80"><circle r="37" fill="white"/><circle cx="17.76" cy="-8.88" r="34.41" fill="black"/></mask>';
  const star=(x,y,r)=>`<path d="M${x} ${y-r}l${r/4} ${r*.75} ${r*.75} ${r/4}-${r*.75} ${r/4}-${r/4} ${r*.75}-${r/4}-${r*.75}-${r*.75}-${r/4} ${r*.75}-${r/4}Z"/>`;
  for(let row=-1;row<4;row++)for(let col=-1;col<4;col++){const x=col*150,y=row*145;art+=`<g transform="translate(${65+x} ${60+y}) rotate(7.918)"><circle r="37" mask="url(#moon)"/></g>`+star(135+x,115+y,18)+star(40+x,125+y,7);}
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${defs}</defs><path fill="${base}" d="M0 0h512v512H0z"/><g fill="${ink}">${art}</g></svg>`,paint=`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;glyphPaints.set(skin.id,paint);return paint;
}
// Bounded, texture-free pigment patterns; SVG swatches above are icon artwork.
export const HALLOWEEN_PATTERN_GLSL=`
float hwInk(float d){float aa=max(fwidth(d),.6);return 1.-smoothstep(-aa,aa,d);}
float hwWeb(vec2 p){
 float r=length(p),a=atan(p.y,p.x),sector=mod(a+6.2831853,.5235988)/.5235988;
 float scale=.966-.18*sin(sector*3.1415927);
 float ring=abs(mod(r/scale-12.+9.,18.)-9.)*scale-${HALLOWEEN_WEB_STYLE.ring};
 float spoke=abs(sin(a*6.))*r/6.-${HALLOWEEN_WEB_STYLE.spoke};
 return max(hwInk(spoke),hwInk(ring))*step(r,76.);
}
vec2 hwWrap(vec2 p){return mod(p+vec2(75.,72.5),vec2(150.,145.))-vec2(75.,72.5);}
float hwStar(vec2 p,float r){p=abs(p);return max(p.x,p.y)+3.*min(p.x,p.y)-r;}
float hwTriangle(vec2 p,vec2 size){return max(max(abs(p.x)-size.x*(p.y+size.y)/(2.*size.y),-p.y-size.y),p.y-size.y);}
float hwBox(vec2 p,vec2 size){return max(abs(p.x)-size.x,abs(p.y)-size.y);}
float hwPattern(vec2 uv){
 vec2 p=uv*512.;
 #if HW_PATTERN == 1
  float row=floor(p.y/156.);vec2 q=vec2(mod(p.x+mod(row,2.)*90.,180.)-90.,mod(p.y,156.)-78.)/1.55;
  float eyes=min(hwTriangle(q-vec2(-19.,-12.),vec2(10.,9.)),hwTriangle(q-vec2(19.,-12.),vec2(10.,9.)));
  float nose=hwTriangle(q-vec2(0.,5.),vec2(6.,6.));
  float teeth=min(min(hwBox(q-vec2(-17.,17.),vec2(6.)),hwBox(q-vec2(17.,17.),vec2(6.))),hwBox(q-vec2(0.,34.),vec2(6.,5.)));
  float outer=(length((q-vec2(0.,18.))/vec2(34.,20.))-1.)*20.;float inner=(length((q-vec2(0.,1.))/vec2(36.,17.))-1.)*17.;float mouth=max(max(outer,-inner),-teeth);
  return hwInk(min(min(eyes,nose),mouth));
 #elif HW_PATTERN == 2
  vec2 webPoint=p/${HALLOWEEN_WEB_STYLE.scale.toFixed(1)};float row=floor(webPoint.y/180.);vec2 q=vec2(mod(webPoint.x+mod(row,2.)*90.,180.)-90.,mod(webPoint.y,180.)-90.);
  return hwWeb(q);
 #else
  vec2 q=hwWrap(p-vec2(65.,60.));q=mat2(.990467,-.137756,.137756,.990467)*q;
  float moon=max(length(q)-37.,34.41-length(q-vec2(17.76,-8.88)));
  return max(hwInk(moon),max(hwInk(hwStar(hwWrap(p-vec2(135.,115.)),18.)),hwInk(hwStar(hwWrap(p-vec2(40.,125.)),7.))));
 #endif
}`;
