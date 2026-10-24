import {CONFIG} from './config.js';
import {DRIVER_TIERS,driverMesh} from './driver.js';
const outlines=new WeakMap();
const driverSurfaces=DRIVER_TIERS.map(tier=>driverMesh(tier));
function outline(glyph){
 let cached=outlines.get(glyph);if(cached)return cached;
 const points=glyph.parts.flat().map(p=>({x:p.x,y:p.y})).sort((a,b)=>a.x-b.x||a.y-b.y);
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lower=[],upper=[];
 for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(let i=points.length-1;i>=0;i--){const p=points[i];while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 cached=lower.slice(0,-1).concat(upper.slice(0,-1));outlines.set(glyph,cached);return cached;
}
// Exact outer support of the extruded glyph at its current orientation. The
// cached convex outline has few points even for complex multi-part characters.
export function topWorldBounds(top){
 const p=top.body.translation(),bounds={minX:p.x,maxX:p.x,minZ:p.z,maxZ:p.z,minY:p.y,maxY:p.y};
 if(!top.glyph?.parts)return bounds;
 const q=top.body.rotation();
 for(const point of outline(top.glyph))for(const y of [-CONFIG.thickness/2,CONFIG.thickness/2]){
  const x=point.x,z=-point.y,tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);
  const wx=p.x+x+q.w*tx+q.y*tz-q.z*ty,wy=p.y+y+q.w*ty+q.z*tx-q.x*tz,wz=p.z+z+q.w*tz+q.x*ty-q.y*tx;
  bounds.minX=Math.min(bounds.minX,wx);bounds.maxX=Math.max(bounds.maxX,wx);bounds.minZ=Math.min(bounds.minZ,wz);bounds.maxZ=Math.max(bounds.maxZ,wz);bounds.minY=Math.min(bounds.minY,wy);bounds.maxY=Math.max(bounds.maxY,wy);
 }
 const rows=[
  [1-2*(q.y*q.y+q.z*q.z),2*(q.x*q.y-q.w*q.z),2*(q.x*q.z+q.w*q.y)],
  [2*(q.x*q.y+q.w*q.z),1-2*(q.x*q.x+q.z*q.z),2*(q.y*q.z-q.w*q.x)],
  [2*(q.x*q.z-q.w*q.y),2*(q.y*q.z+q.w*q.x),1-2*(q.x*q.x+q.y*q.y)],
 ];
 for(const tier of DRIVER_TIERS)for(const [y,radius] of [[tier.top,tier.topRadius],[tier.bottom,tier.bottomRadius]])for(let i=0;i<3;i++){
  const key=['X','Y','Z'][i],origin=[p.x,p.y,p.z][i]+rows[i][1]*y,extent=radius*Math.hypot(rows[i][0],rows[i][2]);
  bounds['min'+key]=Math.min(bounds['min'+key],origin-extent);bounds['max'+key]=Math.max(bounds['max'+key],origin+extent);
 }
 for(let i=0;i<3;i++){const key=['X','Y','Z'][i],center=[p.x,p.y,p.z][i]-rows[i][1]*CONFIG.tipLength;bounds['min'+key]=Math.min(bounds['min'+key],center-CONFIG.tipRadius);bounds['max'+key]=Math.max(bounds['max'+key],center+CONFIG.tipRadius);}
 return bounds;
}
// A broad 2D footprint must not combine an airborne glyph's wide extent with
// the shaft's lower Y elsewhere. Clip the solids at the upper rope first.
export function topCrossesBelow(top,side,edge,ceiling,bounds=topWorldBounds(top)){
 const sign=side<2?1:-1,key=side%2?'Z':'X',extreme=sign>0?bounds['max'+key]:-bounds['min'+key],inner=sign>0?bounds['min'+key]:-bounds['max'+key];
 if(!top.glyph?.parts)return extreme>=edge&&bounds.minY<=ceiling;
 if(extreme<edge||inner>edge||bounds.minY>ceiling)return false;
 if(bounds.maxY<=ceiling)return true;
 const p=top.body.translation(),q=top.body.rotation();
 const transform=(x,y,z)=>{const tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);return {outward:sign*(side%2?p.z+z+q.w*tz+q.x*ty-q.y*tx:p.x+x+q.w*tx+q.y*tz-q.z*ty),y:p.y+y+q.w*ty+q.z*tx-q.x*tz};};
 const inside=point=>point.y<=ceiling&&Math.abs(point.outward-edge)<=1e-6;
 const crosses=(a,b)=>{
  if(inside(a)||inside(b))return true;
  if((a.outward<edge)===(b.outward<edge))return false;
  const t=(edge-a.outward)/(b.outward-a.outward);return a.y+(b.y-a.y)*t<=ceiling;
 };
 const path=outline(top.glyph),low=[],high=[];
 for(const point of path){low.push(transform(point.x,-CONFIG.thickness/2,-point.y));high.push(transform(point.x,CONFIG.thickness/2,-point.y));}
 for(let i=0;i<path.length;i++){const j=(i+1)%path.length;if(crosses(low[i],low[j])||crosses(high[i],high[j])||crosses(low[i],high[i]))return true;}
 for(const surface of driverSurfaces){
  const points=[];for(let i=0;i<surface.vertices.length;i+=3){const point=transform(surface.vertices[i],surface.vertices[i+1],surface.vertices[i+2]);if(inside(point))return true;points.push(point);}
  for(let i=0;i<surface.indices.length;i+=3){const [a,b,c]=[points[surface.indices[i]],points[surface.indices[i+1]],points[surface.indices[i+2]]];if(crosses(a,b)||crosses(b,c)||crosses(c,a))return true;}
 }
 const center=transform(0,-CONFIG.tipLength,0);
 return Math.hypot(edge-center.outward,Math.max(0,center.y-ceiling))<=CONFIG.tipRadius;
}
