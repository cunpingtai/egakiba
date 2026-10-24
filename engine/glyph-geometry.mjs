/** R4 experimental glyph silhouette asset shared by preview and local contact solver.
 * LOCAL FONT RASTER IS NOT A CANONICAL FONT ASSET. Hash is only an integrity fingerprint,
 * never an authentication token. Do not use for ranked matchmaking or server verification.
 */
import {FONT_CSS,measureBinaryMask,statsFromFeatures} from './glyph-stats.mjs';
export const GEOMETRY_VERSION='r4-raster-silhouette-0.1';
export const MASK_SIZE=72;
const cache=new Map();
function has(mask,size,x,y){return x>=0&&y>=0&&x<size&&y<size&&mask[y*size+x]!==0;}
function checksum(mask,meta=''){
 let h=2166136261>>>0;for(const char of meta){h=Math.imul(h^char.charCodeAt(0),16777619)>>>0;}
 for(let i=0;i<mask.length;i++)h=Math.imul(h^mask[i],16777619)>>>0;
 return h.toString(16).padStart(8,'0');
}
/** Pure function; supports test fixtures and externally supplied, font-derived masks. */
export function geometryFromMask(mask,size,{glyph='?',font='fixture',source='fixture-mask'}={}){
 if(!Number.isInteger(size)||size<16||size>256||mask?.length!==size*size)throw Error('Invalid geometry mask');
 const binary=Uint8Array.from(mask,x=>x?1:0),features=measureBinaryMask(binary,size),cx=0,cy=0;
 let mx=0,my=0,count=0,maxD=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(has(binary,size,x,y)){mx+=x+.5;my+=y+.5;count++;}
 const anchorX=mx/count,anchorY=my/count,edges=[];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(has(binary,size,x,y)){
   maxD=Math.max(maxD,Math.hypot(x+.5-anchorX,y+.5-anchorY));
   if(!has(binary,size,x-1,y)||!has(binary,size,x+1,y)||!has(binary,size,x,y-1)||!has(binary,size,x,y+1))edges.push([x+.5-anchorX,y+.5-anchorY]);
 }
 if(!edges.length||maxD<1)throw Error('Degenerate glyph silhouette');
 // Perimeter sampling is capped deterministically for bounded CPU cost.
 const step=Math.max(1,Math.ceil(edges.length/160));const outline=[];for(let i=0;i<edges.length;i+=step)outline.push([edges[i][0]/maxD,edges[i][1]/maxD]);
 const id=`${GEOMETRY_VERSION}:${source}:${font}:${glyph}:${checksum(binary,`${size}:${glyph}:${font}`)}`;
 return Object.freeze({version:GEOMETRY_VERSION,id,source,font,glyph,size,mask:binary,anchor:[anchorX,anchorY],maxD,outline:Object.freeze(outline),features:Object.freeze(features),stats:Object.freeze(statsFromFeatures(features))});
}
export function rasterGlyphGeometry(glyph,font='gothic'){
 if(typeof document==='undefined')throw Error('Browser rendering unavailable');
 const key=`${font}:${glyph}`;if(cache.has(key))return cache.get(key);
 const N=MASK_SIZE,canvas=document.createElement('canvas');canvas.width=canvas.height=N;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas rendering unavailable');
 ctx.font=(FONT_CSS[font]||FONT_CSS.gothic).replace('84px',`${Math.round(N*.78)}px`);
 ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillStyle='#000';ctx.fillText(glyph,N*.5,N*.49,N*.9);
 const rgba=ctx.getImageData(0,0,N,N).data,mask=new Uint8Array(N*N);
 for(let i=0;i<mask.length;i++)mask[i]=rgba[i*4+3]>=96?1:0;
 const geo=geometryFromMask(mask,N,{glyph,font,source:'browser-font-raster'});cache.set(key,geo);return geo;
}
/** Collision occupancy at the queried world coordinate. A hole is explicitly empty. */
export function containsWorld(g,p,worldX,worldY){
 const a=-(p.angle||0),co=Math.cos(a),si=Math.sin(a);
 const dx=worldX-p.x,dy=worldY-p.y,inv=g.maxD/(p.radius||.43);
 const x=Math.floor((dx*co-dy*si)*inv+g.anchor[0]),y=Math.floor((dx*si+dy*co)*inv+g.anchor[1]);
 return has(g.mask,g.size,x,y);
}
export function worldOutlinePoint(g,p,point){
 const a=p.angle||0,co=Math.cos(a),si=Math.sin(a),r=p.radius||.43;
 return [p.x+r*(point[0]*co-point[1]*si),p.y+r*(point[0]*si+point[1]*co)];
}
/** SAT broadphase, binary-mask narrowphase. Preserves real concavities/holes at mask resolution. */
export function silhouetteContact(a,b,ga,gb){
 const dx=b.x-a.x,dy=b.y-a.y,reach=a.radius+b.radius;if(dx*dx+dy*dy>reach*reach)return null;
 let overlaps=0,wx=0,wy=0;
 for(const point of ga.outline){const [x,y]=worldOutlinePoint(ga,a,point);if(containsWorld(gb,b,x,y)){wx+=x;wy+=y;overlaps++;}}
 for(const point of gb.outline){const [x,y]=worldOutlinePoint(gb,b,point);if(containsWorld(ga,a,x,y)){wx+=x;wy+=y;overlaps++;}}
 if(!overlaps){if(containsWorld(ga,a,b.x,b.y)||containsWorld(gb,b,a.x,a.y)){overlaps=1;wx=(a.x+b.x)/2;wy=(a.y+b.y)/2;}else return null;}
 let dist=Math.hypot(dx,dy),nx=dist>1e-7?dx/dist:1,ny=dist>1e-7?dy/dist:0;
 return {nx,ny,x:wx/overlaps,y:wy/overlaps,overlaps};
}
export function assertGeometry(g){if(g?.version!==GEOMETRY_VERSION||!(g.mask instanceof Uint8Array)||g.mask.length!==g.size*g.size||!g.outline.length)throw Error('Invalid R4 glyph geometry');return g;}
