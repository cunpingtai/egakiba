import {appHasBundledOutline} from './app-font-loading.js';
import {emojiPlateShape,isEmojiCharacter,isDeviceDependentCharacter,tintableSymbolRaster} from './glyph-emoji.js';
export {emojiPlateShape,isEmojiCharacter,isDeviceDependentCharacter} from './glyph-emoji.js';
import * as THREE from './vendor/three.js';
import ClipperLib from './vendor/clipper.js';
import { parse } from './vendor/opentype.js';
import { CONFIG, validateCharacter, buildCharacterPools } from './config.js';
import { FONTS, validFont } from './fonts.js';
import { outlineBalance, quadrantBalance, estimateTipPoints, combatTipPoints } from './stats.js';
const fontLoads=new Map();
// Fallback glyphs are sampled at a lower resolution than native font outlines,
// then simplified. This keeps rare, complex characters inside one inexpensive
// compound collider while retaining holes and disconnected strokes.
const RASTER_SIZE=128,RASTER_FONT_SIZE=92,RASTER_PADDING=8,RASTER_ALPHA=48,RASTER_SIMPLIFY=.6;
export function isRankedCharacter(char){
 const value=String(char||'').normalize('NFC'),points=[...value];
 const halfwidthKana=points.length===2&&/^[\uff66-\uff9d]$/u.test(points[0])&&/^[\uff9e\uff9f]$/u.test(points[1]);
 const single=points.length===1&&!/[\p{M}\uff9e\uff9f]/u.test(value);
 return (halfwidthKana||single)&&!isDeviceDependentCharacter(value);
}

// A single flattened outline supplies both the visible mesh and convex colliders.
const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const close = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)<1e-7;
const middle = (a,b) => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
function lineDistance(p,a,b) { const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy); }
function flatten(points, out, depth=0) {
 const a=points[0], b=points.at(-1);
 if (depth>16 || points.slice(1,-1).every(p=>lineDistance(p,a,b)<=CONFIG.curveTolerance)) {out.push(b);return;}
 const rows=[points];while(rows.at(-1).length>1) rows.push(rows.at(-1).slice(1).map((p,i)=>middle(rows.at(-1)[i],p)));
 flatten(rows.map(r=>r[0]),out,depth+1);flatten(rows.map(r=>r.at(-1)).reverse(),out,depth+1);
}
function contoursFromPath(path) {
 const contours=[];let points=[],current;
 const finish=()=>{if(points.length>1 && close(points[0],points.at(-1))) points.pop(); if(points.length>=3)contours.push(points);points=[];};
 for(const c of path.commands) {
  const p={x:c.x,y:-c.y};
  if(c.type==='M'){finish();points=[p];current=p;}
  if(c.type==='L'){if(!close(current,p))points.push(p);current=p;}
  if(c.type==='Q'){flatten([current,{x:c.x1,y:-c.y1},p],points);current=p;}
  if(c.type==='C'){flatten([current,{x:c.x1,y:-c.y1},{x:c.x2,y:-c.y2},p],points);current=p;}
  if(c.type==='Z')finish();
 }
 finish();return contours;
}
const pointKey=(x,y)=>`${x},${y}`;
function simplifyOpen(points,tolerance){
 if(points.length<3)return points;
 const a=points[0],b=points.at(-1),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);let farthest=-1,index=-1;
 for(let i=1;i<points.length-1;i++){const p=points[i],distance=length?Math.abs(dx*(a.y-p.y)-(a.x-p.x)*dy)/length:Math.hypot(p.x-a.x,p.y-a.y);if(distance>farthest){farthest=distance;index=i;}}
 if(farthest<=tolerance)return [a,b];
 const left=simplifyOpen(points.slice(0,index+1),tolerance),right=simplifyOpen(points.slice(index),tolerance);return left.slice(0,-1).concat(right);
}
function simplifyClosed(points,tolerance){
 if(points.length<5)return points;
 let split=1,best=0;for(let i=1;i<points.length;i++){const distance=(points[i].x-points[0].x)**2+(points[i].y-points[0].y)**2;if(distance>best){best=distance;split=i;}}
 const a=simplifyOpen(points.slice(0,split+1),tolerance),b=simplifyOpen(points.slice(split).concat(points[0]),tolerance);return a.slice(0,-1).concat(b.slice(0,-1));
}
export function contoursFromBitmap(bitmap,width,height,scale=1) {
 const edges=[],filled=(x,y)=>x>=0&&x<width&&y>=0&&y<height&&bitmap[y*width+x];
 const add=(ax,ay,bx,by)=>edges.push({a:{x:ax,y:ay},b:{x:bx,y:by},used:false});
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(filled(x,y)){
  if(!filled(x,y-1))add(x,y,x+1,y);
  if(!filled(x+1,y))add(x+1,y,x+1,y+1);
  if(!filled(x,y+1))add(x+1,y+1,x,y+1);
  if(!filled(x-1,y))add(x,y+1,x,y);
 }
 const outgoing=new Map();edges.forEach((edge,index)=>{const key=pointKey(edge.a.x,edge.a.y);if(!outgoing.has(key))outgoing.set(key,[]);outgoing.get(key).push(index);});
 const contours=[];
 for(let start=0;start<edges.length;start++){
  if(edges[start].used)continue;
  const points=[],first=edges[start].a;let index=start,guard=0,previousDirection=null;
  while(index!==undefined&&!edges[index].used&&guard++<=edges.length){
   const edge=edges[index];edge.used=true;points.push(edge.a);
   if(edge.b.x===first.x&&edge.b.y===first.y)break;
   const direction={x:edge.b.x-edge.a.x,y:edge.b.y-edge.a.y};
   const candidates=(outgoing.get(pointKey(edge.b.x,edge.b.y))||[]).filter(i=>!edges[i].used);
   if(!candidates.length){index=undefined;break;}
   index=candidates[0];
   if(candidates.length>1){
    let best=Infinity;
    for(const candidate of candidates){const next=edges[candidate],d={x:next.b.x-next.a.x,y:next.b.y-next.a.y};let turn=Math.atan2(direction.x*d.y-direction.y*d.x,direction.x*d.x+direction.y*d.y);if(turn<0)turn+=Math.PI*2;if(turn<best){best=turn;index=candidate;}}
   }
   previousDirection=direction;
  }
  if(index===undefined||points.length<3)continue;
  const simple=simplifyClosed(points.filter((p,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];return (p.x-a.x)*(b.y-p.y)!==(p.y-a.y)*(b.x-p.x);}),RASTER_SIMPLIFY);
  if(simple.length>=3)contours.push(simple.map(p=>({x:(p.x-width/2)*scale,y:-(p.y-height/2)*scale})));
 }
 return contours;
}
function rasterMask(char,spec,canvas) {
 const context=canvas.getContext('2d',{willReadFrequently:true}),available=RASTER_SIZE-RASTER_PADDING*2;
 context.fillStyle='#000';context.textAlign='left';context.textBaseline='alphabetic';
 let fontSize=RASTER_FONT_SIZE,imageData,mask,count,hash;
 for(let attempt=0;attempt<4;attempt++){
  context.font=`500 ${fontSize}px ${spec.family},${spec.fallback}`;
  const measured=context.measureText(char),left=Number(measured.actualBoundingBoxLeft)||0,right=Number(measured.actualBoundingBoxRight)||measured.width||fontSize,ascent=Number(measured.actualBoundingBoxAscent)||fontSize*.75,descent=Number(measured.actualBoundingBoxDescent)||fontSize*.25;
  if(attempt===0){const fit=Math.min(1,available/Math.max(1,left+right),available/Math.max(1,ascent+descent));if(fit<.999){fontSize*=fit;continue;}}
  const x=RASTER_SIZE/2+(left-right)/2,y=RASTER_SIZE/2+(ascent-descent)/2;
  context.clearRect(0,0,RASTER_SIZE,RASTER_SIZE);context.fillText(char,x,y);
  imageData=context.getImageData(0,0,RASTER_SIZE,RASTER_SIZE);const alpha=imageData.data;mask=new Uint8Array(RASTER_SIZE*RASTER_SIZE);count=0;hash=2166136261;let touchesEdge=false;
  for(let i=0;i<mask.length;i++){const value=alpha[i*4+3]>=RASTER_ALPHA?1:0;mask[i]=value;count+=value;hash=Math.imul(hash^value,16777619);if(value){const px=i%RASTER_SIZE,py=Math.floor(i/RASTER_SIZE);if(px<2||py<2||px>=RASTER_SIZE-2||py>=RASTER_SIZE-2)touchesEdge=true;}}
  if(touchesEdge&&attempt<3){fontSize*=.88;continue;}
  break;
 }
 return {mask,count,hash:hash>>>0,imageData};
}
function rasterBounds(rendered){
 let minX=RASTER_SIZE,minY=RASTER_SIZE,maxX=-1,maxY=-1;
 for(let y=0;y<RASTER_SIZE;y++)for(let x=0;x<RASTER_SIZE;x++)if(rendered.mask[y*RASTER_SIZE+x]){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 return {minX,minY,maxX,maxY,cx:(minX+maxX+1)/2,cy:(minY+maxY+1)/2};
}
function plateContour(rendered,shape){
 const {minX,minY,maxX,maxY,cx,cy}=rasterBounds(rendered),scale=CONFIG.fontSize/RASTER_FONT_SIZE;
 if(shape==='square'){
  const halfWidth=(maxX-minX+3)*scale/2,halfHeight=(maxY-minY+3)*scale/2,exponent=5;
  return [Array.from({length:64},(_,index)=>{const angle=-index/64*Math.PI*2,cos=Math.cos(angle),sin=Math.sin(angle);return {x:(cx-RASTER_SIZE/2)*scale+Math.sign(cos)*Math.abs(cos)**(2/exponent)*halfWidth,y:-(cy-RASTER_SIZE/2)*scale+Math.sign(sin)*Math.abs(sin)**(2/exponent)*halfHeight};})];
 }
 const radius=(Math.max(maxX-minX+1,maxY-minY+1)/2+1)*scale;
 return [Array.from({length:64},(_,index)=>{const angle=-index/64*Math.PI*2;return {x:(cx-RASTER_SIZE/2)*scale+Math.cos(angle)*radius,y:-(cy-RASTER_SIZE/2)*scale+Math.sin(angle)*radius};})];
}
function sameRaster(a,b){return a.count===b.count&&a.hash===b.hash&&a.mask.every((value,index)=>value===b.mask[index]);}
function area(poly) {return poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p.x*q.y-q.x*p.y;},0)/2;}
function pathFromPoints(points,ShapeType){const path=new ShapeType(),oriented=points.slice();path.moveTo(oriented[0].x,oriented[0].y);for(const point of oriented.slice(1))path.lineTo(point.x,point.y);path.closePath();return path;}
export function shapesFromContours(contours){
 // Font strokes may overlap or self-intersect. Containment tests on one point
 // mistake お's horizontal stroke for a redundant nested outline. Resolve the
 // font's nonzero fill first; the resulting tree has actual holes and islands.
 const scale=1e6,clipper=new ClipperLib.Clipper(ClipperLib.Clipper.ioStrictlySimple),tree=new ClipperLib.PolyTree();
 clipper.AddPaths(contours.filter(p=>p.length>=3).map(p=>p.map(v=>({X:Math.round(v.x*scale),Y:Math.round(v.y*scale)}))),ClipperLib.PolyType.ptSubject,true);
 clipper.Execute(ClipperLib.ClipType.ctUnion,tree,ClipperLib.PolyFillType.pftNonZero,ClipperLib.PolyFillType.pftNonZero);
 const points=path=>path.map(p=>({x:p.X/scale,y:p.Y/scale}));
 return ClipperLib.JS.PolyTreeToExPolygons(tree).map(poly=>{
  const shape=pathFromPoints(points(poly.outer),THREE.Shape);
  shape.holes=poly.holes.map(hole=>pathFromPoints(points(hole),THREE.Path));return shape;
 });
}
function mergeConvex(polys) {
 // Merge adjacent triangles only when their union is convex; holes stay empty.
 let changed=true;
 while(changed){changed=false;const edges=new Map();
  outer:for(let i=0;i<polys.length;i++) for(let a=0;a<polys[i].length;a++) {
   const p=polys[i],u=p[a],v=p[(a+1)%p.length];
   const key=q=>`${q.x.toFixed(7)},${q.y.toFixed(7)}`;
   const reversed=edges.get(`${key(v)}:${key(u)}`);
   if(reversed){const [j,b]=reversed,q=polys[j];
    let union=[];for(let k=0;k<p.length;k++)union.push(p[(a+1+k)%p.length]);
    for(let k=2;k<q.length;k++)union.push(q[(b+k)%q.length]);
    union=union.filter((v,k)=>Math.abs(cross(union[(k+union.length-1)%union.length],v,union[(k+1)%union.length]))>1e-9);
    if(union.length>=3 && union.length<=12 && union.every((v,k)=>cross(v,union[(k+1)%union.length],union[(k+2)%union.length])>=-1e-9)) {
     polys[j]=union;polys.splice(i,1);changed=true;break outer;
    }
   }
   edges.set(`${key(u)}:${key(v)}`,[i,a]);
  }
 }
 return polys;
}
export class GlyphLibrary {
 constructor(font,spec=FONTS.gothic,{randomPools}={}){this.font=font;this.spec=spec;this.cache=new Map();this.measurements=new Map();this.supportCache=new Map();this.rasterCache=new Map();this.rasterTextures=new Map();this.teamColorTextures=new Set();this.rasterCanvas=typeof document==='undefined'?null:Object.assign(document.createElement('canvas'),{width:RASTER_SIZE,height:RASTER_SIZE});this.randomPools=randomPools||buildCharacterPools(Object.keys(font.tables.cmap.glyphIndexMap),char=>this.hasBundledOutline(char));}
 static async load(id='gothic'){
  id=validFont(id);
  if(!fontLoads.has(id))fontLoads.set(id,(async()=>{
   const spec=FONTS[id],r=await fetch(new URL('./fonts/'+spec.file,import.meta.url));
   if(!r.ok)throw Error(spec.label+'の文字データを読み込めませんでした。');
   const bytes=await r.arrayBuffer(),library=new GlyphLibrary(parse(bytes,{lowMemory:true}),spec);
   if(typeof FontFace!=='undefined'){
    const face=await new FontFace(spec.family,bytes,{weight:'500'}).load();document.fonts.add(face);
   }
   return library;
  })().catch(error=>{fontLoads.delete(id);throw error;}));
  return fontLoads.get(id);
 }

 hasBundledOutline(char){return appHasBundledOutline(this.font,this.spec,char);}
 fallbackContours(char){
  if(this.rasterCache.has(char))return this.rasterCache.get(char);
  if(!this.rasterCanvas){this.rasterCache.set(char,null);return null;}
  const rendered=rasterMask(char,this.spec,this.rasterCanvas);
  if(!rendered.count){this.rasterCache.set(char,null);return null;}
  const emoji=isEmojiCharacter(char);
  const missing=['\uFFFD','\u{10FFFF}'].some(mark=>sameRaster(rendered,rasterMask(mark,this.spec,this.rasterCanvas)));
  // If a non-gothic stack resolves to exactly the same system glyph as the
  // gothic stack, the browser is using the gothic fallback. Keep it exclusive
  // to the gothic selector instead of presenting it as another typeface.
  const wrongStyle=!emoji&&!missing&&this.spec.fallbackStyle!=='gothic'&&sameRaster(rendered,rasterMask(char,FONTS.gothic,this.rasterCanvas));
  const plate=emojiPlateShape(char),contours=missing||wrongStyle?null:plate?plateContour(rendered,plate):contoursFromBitmap(rendered.mask,RASTER_SIZE,RASTER_SIZE,CONFIG.fontSize/RASTER_FONT_SIZE);
  if(emoji&&contours?.length){
   const texture=document.createElement('canvas');texture.width=texture.height=RASTER_SIZE;
   if(tintableSymbolRaster(char,rendered.imageData)){this.teamColorTextures.add(char);const pixels=rendered.imageData.data;for(let i=0;i<pixels.length;i+=4)pixels[i]=pixels[i+1]=pixels[i+2]=255;}
   texture.getContext('2d').putImageData(rendered.imageData,0,0);this.rasterTextures.set(char,texture);
  }
  this.rasterCache.set(char,contours?.length?contours:null);return this.rasterCache.get(char);
 }
 supports=(char)=>{if(!this.supportCache.has(char))this.supportCache.set(char,isEmojiCharacter(char)&&this.rasterCanvas?Boolean(this.fallbackContours(char)):this.hasBundledOutline(char)||Boolean(this.fallbackContours(char)));return this.supportCache.get(char);};
 measure(raw,regulation='mixed') {
  const char=validateCharacter(raw,regulation,this.supports);if(this.measurements.has(char))return this.measurements.get(char);
  const rasterOutline=Boolean(isEmojiCharacter(char)&&this.rasterCanvas)||!this.hasBundledOutline(char);
  const contours=rasterOutline?this.fallbackContours(char):contoursFromPath(this.font.getPath(char,0,0,CONFIG.fontSize));
  const shapes=shapesFromContours(contours); const triangles=[];
  for(const shape of shapes){const outer=shape.getPoints(1),holes=shape.holes.map(h=>h.getPoints(1));
   // ShapeUtils removes closing vertices in-place before creating indices.
   const indices=THREE.ShapeUtils.triangulateShape(outer,holes);const points=outer.concat(...holes);
   for(const ix of indices){let tri=ix.map(i=>({x:points[i].x,y:points[i].y}));if(area(tri)<0)tri.reverse();if(area(tri)>1e-10)triangles.push(tri);}
  }
  if(!triangles.length)throw Error('この文字の形状を作れませんでした。');
  let total=0,cx=0,cy=0;
  for(const t of triangles){const a=area(t);total+=a;cx+=a*(t[0].x+t[1].x+t[2].x)/3;cy+=a*(t[0].y+t[1].y+t[2].y)/3;}
  cx/=total;cy/=total;
  const centered=triangles.map(t=>t.map(p=>({x:p.x-cx,y:p.y-cy})));
  let polar=0;for(const tri of centered)for(let i=0;i<3;i++){const p=tri[i],q=tri[(i+1)%3];polar+=(p.x*q.y-q.x*p.y)*(p.x*p.x+p.x*q.x+q.x*q.x+p.y*p.y+p.y*q.y+q.y*q.y)/12;}
  const roundness=outlineBalance(contours),distribution=quadrantBalance(centered),tipPoints=estimateTipPoints(centered);
  const metrics={char,rasterPixelSize:rasterOutline?CONFIG.fontSize/RASTER_FONT_SIZE:0,shapes,triangles:centered,area:total,roundness,distribution,balance:roundness*(1-CONFIG.statBalanceAreaWeight)+distribution*CONFIG.statBalanceAreaWeight,tips:tipPoints.length,tipPoints,criticalTipPoints:combatTipPoints(tipPoints,shapes,{x:cx,y:cy}),mass:total*CONFIG.thickness*CONFIG.density,inertia:polar*CONFIG.thickness*CONFIG.density,centroid:{x:cx,y:cy},textureSource:this.rasterTextures.get(char)||null,teamColorTexture:this.teamColorTextures.has(char),textureScale:CONFIG.fontSize/RASTER_FONT_SIZE,textureSize:RASTER_SIZE};
  this.measurements.set(char,metrics);return metrics;
 }
 get(raw,regulation='mixed') {
  const metrics=this.measure(raw,regulation),{char,shapes,centroid}=metrics;
  if(this.cache.has(char))return this.cache.get(char);
  const parts=mergeConvex(metrics.triangles.map(t=>t.slice()));
  const geometry=new THREE.ExtrudeGeometry(shapes,{depth:CONFIG.thickness,bevelEnabled:false,steps:1,curveSegments:1});
  geometry.translate(-centroid.x,-centroid.y,-CONFIG.thickness/2);geometry.rotateX(-Math.PI/2);geometry.computeBoundingSphere();
  const glyph={...metrics,geometry,parts,radius:geometry.boundingSphere.radius};
  this.cache.set(char,glyph);return glyph;
 }
}
export function containsPoint(glyph,x,z) {const p={x,y:-z};return glyph.triangles.some(t=>t.every((a,i)=>cross(a,t[(i+1)%3],p)>=-1e-8));}
