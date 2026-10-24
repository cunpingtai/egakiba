/** R3 local glyph-measurement experiment. Browser-font raster is NOT the V2 bundled outline.
 * Never use client-computed stats in authoritative rankings/PvP; replace with signed bundled assets.
 */
export const GLYPH_STATS_VERSION='r3-local-raster-0.1';
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const FONT_CSS={
 gothic:"900 84px 'Noto Sans CJK JP','Yu Gothic',sans-serif",
 mincho:"800 84px 'Noto Serif CJK JP','Yu Mincho',serif",
 pop:"900 84px 'Arial Rounded MT Bold','Noto Sans CJK JP',sans-serif",
 gyosho:"800 84px 'Noto Serif CJK JP',serif"
};
/** Geometry-only feature extraction from a binary raster, testable without DOM. */
export function measureBinaryMask(mask,size){
 if(!Number.isInteger(size)||size<8||mask.length!==size*size)throw new Error('Invalid glyph mask');
 let area=0,sx=0,sy=0,minX=size,maxX=0,minY=size,maxY=0,perimeter=0,moment=0,symDiff=0,verticalHits=0;
 const has=(x,y)=>x>=0&&y>=0&&x<size&&y<size&&Boolean(mask[y*size+x]);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(has(x,y)){
  area++;sx+=x;sy+=y;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  perimeter+=(!has(x-1,y)?1:0)+(!has(x+1,y)?1:0)+(!has(x,y-1)?1:0)+(!has(x,y+1)?1:0);
  if(!has(size-1-x,y))symDiff++;
 }
 if(area<12)throw new Error('Glyph has no measurable silhouette');
 const cx=sx/area,cy=sy/area,bw=maxX-minX+1,bh=maxY-minY+1;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(has(x,y)){moment+=((x-cx)**2+(y-cy)**2)/area;}
 const bboxArea=bw*bh,compactness=clamp(area/bboxArea,0,1),centerOffset=Math.hypot(cx-(minX+maxX)/2,cy-(minY+maxY)/2)/size;
 const symmetry=1-clamp(symDiff/area,0,1),pointiness=clamp((perimeter/Math.sqrt(area)-4)/12,0,1);
 return {areaRatio:area/(size*size),compactness,centerOffset,moment:moment/(size*size),symmetry,pointiness,bounds:{minX,maxX,minY,maxY},pixelCount:area,perimeter};
}
export function statsFromFeatures(f){
 const density=clamp(f.areaRatio/.24,0,1),rough=f.pointiness;
 // Mapping is deliberately visible/versioned, not inferred from V2's physics.
 const speed=Math.round(clamp(88-47*density+11*(1-f.compactness),25,96));
 const power=Math.round(clamp(29+59*density+11*rough,23,97));
 const balance=Math.round(clamp(32+38*f.symmetry+24*f.compactness-130*f.centerOffset,18,96));
 const maxHp=Math.round(clamp(67+67*density+11*f.compactness-20*f.centerOffset,65,150));
 return {speed,power,balance,maxHp,statsVersion:GLYPH_STATS_VERSION,source:'local-browser-font-raster',pointiness:rough};
}
const cache=new Map();
export function rasterStats(glyph,font='gothic'){
 if(typeof document==='undefined')throw new Error('Raster stats require a browser');
 const key=`${glyph}:${font}`;if(cache.has(key))return cache.get(key);
 const can=document.createElement('canvas'),S=120;can.width=can.height=S;
 const ctx=can.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Canvas2D unavailable');
 ctx.clearRect(0,0,S,S);ctx.fillStyle='#000';ctx.font=FONT_CSS[font]||FONT_CSS.gothic;
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(glyph,S/2,S*.49,S*.89);
 const rgba=ctx.getImageData(0,0,S,S).data,mask=new Uint8Array(S*S);
 for(let i=0;i<mask.length;i++)mask[i]=rgba[i*4+3]>=96?1:0;
 const stats=statsFromFeatures(measureBinaryMask(mask,S));cache.set(key,stats);return stats;
}
