import {FONTS} from './fonts.js';
import {isEmojiCharacter} from './glyph-emoji.js';
export function mobileAppleCanvas(nav=globalThis.navigator){return /iPhone|iPad|iPod/.test(nav?.userAgent||'')||nav?.platform==='MacIntel'&&nav?.maxTouchPoints>1;}
export function appleCanvasWorkaround(nav=globalThis.navigator){return mobileAppleCanvas(nav)||/AppleWebKit/.test(nav?.userAgent||'')&&!/Chrome|Chromium|Edg\//.test(nav?.userAgent||'');}
const SIZE=32,FONT_SIZE=23,ids=Object.keys(FONTS);
function equal(a,b){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
function paint(ctx,glyph,spec,x=0,y=0){
 // WebKit bug324693: changing short text with custom fonts can retain whole
 // font buffers in cached display lists. A tiny shadow bypasses that cache.
 // Keep the treatment identical for glyphs and missing-glyph references.
 if(appleCanvasWorkaround()){ctx.shadowColor='rgba(0, 0, 0, 0.01)';ctx.shadowOffsetX=.25;}

 ctx.font=`500 ${FONT_SIZE}px ${spec.family},${spec.fallback}`;ctx.textAlign='left';ctx.textBaseline='alphabetic';
 const m=ctx.measureText(glyph),left=m.actualBoundingBoxLeft||0,right=m.actualBoundingBoxRight||m.width,ascent=m.actualBoundingBoxAscent||FONT_SIZE*.75,descent=m.actualBoundingBoxDescent||FONT_SIZE*.25;
 const fit=Math.min(1,28/Math.max(1,left+right),28/Math.max(1,ascent+descent));ctx.font=`500 ${FONT_SIZE*fit}px ${spec.family},${spec.fallback}`;
 ctx.fillStyle='#000';ctx.fillText(glyph,x+SIZE/2+(left-right)*fit/2,y+SIZE/2+(ascent-descent)*fit/2);
}
// Batch 32 small glyphs into one canvas readback per font. Individual GPU
// readbacks for 70k candidates are much slower, even without any 3D geometry.
export function createDisplayProbe(libraries,{createCanvas=()=>document.createElement('canvas')}={}){
 const canvas=Object.assign(createCanvas(),{width:SIZE*8,height:SIZE*4}),ctx=canvas.getContext('2d',{willReadFrequently:true}),missing=new Map();
 function render(glyphs,spec,needed=glyphs.map(()=>true)){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  glyphs.forEach((glyph,i)=>{if(needed[i])paint(ctx,glyph,spec,(i%8)*SIZE,Math.floor(i/8)*SIZE);});
  const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  return glyphs.map((_,i)=>{if(!needed[i])return null;const result=new Uint32Array(SIZE),ox=(i%8)*SIZE,oy=Math.floor(i/8)*SIZE;
   for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(rgba[((oy+y)*canvas.width+ox+x)*4+3]>=48)result[y]|=1<<x;return result;
  });
 }
 function batch(glyphs){
  const state=ids.map(font=>glyphs.map(glyph=>{const lib=libraries().get(font);if(!lib)return 0;if(lib.supportCache.has(glyph))return Number(lib.supportCache.get(glyph));return !isEmojiCharacter(glyph)&&lib.hasBundledOutline(glyph)?1:-1;}));
  const images=ids.map((font,f)=>{
   const needed=state[f].map((v,i)=>v===-1||(f===0&&state.some(row=>row[i]===-1)));
   if(!needed.some(Boolean))return [];
   if(!missing.has(font))missing.set(font,render(['\ufffd','\u{10ffff}'],FONTS[font]));
   return render(glyphs,FONTS[font],needed);
  });
  return glyphs.map((glyph,i)=>{let bits=0;for(let f=0;f<ids.length;f++){
   let valid=state[f][i]===1;
   if(state[f][i]===-1){const image=images[f][i];valid=image.some(Boolean)&&!missing.get(ids[f]).some(mark=>equal(image,mark))&&(isEmojiCharacter(glyph)||f===0||!equal(image,images[0][i]));}
   if(valid)bits|=1<<f;
  }return bits;});
 }
 const probe=(font,glyph)=>Boolean(batch([glyph])[0]&(1<<ids.indexOf(font)));probe.batch=batch;return probe;
}
