/** Experimental 2D contact manifold for R5.  NOT a V2/3D rigid body solver.
 * Samples occupied contour pixels, estimates *local* surface orientation, and
 * retains a geometric fallback for ambiguous symmetric contacts.
 */
import {containsWorld,worldOutlinePoint,assertGeometry} from './glyph-geometry.mjs';
const inside=(g,x,y)=>x>=0&&y>=0&&x<g.size&&y<g.size&&g.mask[y*g.size+x]!==0;
function localPosition(g,p,wx,wy){
 const a=-(p.angle||0),co=Math.cos(a),si=Math.sin(a),dx=wx-p.x,dy=wy-p.y,k=g.maxD/p.radius;
 return [(dx*co-dy*si)*k+g.anchor[0],(dx*si+dy*co)*k+g.anchor[1]];
}
/** Approximate outward normal of a raster boundary, not exact SDF gradient. */
export function outwardNormal(g,p,x,y){
 const [lx,ly]=localPosition(g,p,x,y),ix=Math.floor(lx),iy=Math.floor(ly);
 let gx=0,gy=0;
 for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
  if(!dx&&!dy)continue;
  if(!inside(g,ix+dx,iy+dy)){
   const r2=dx*dx+dy*dy;if(r2<=16){gx+=dx/(r2*r2);gy+=dy/(r2*r2);}
  }
 }
 const m=Math.hypot(gx,gy);
 if(m<1e-6)return null;
 const a=p.angle||0,co=Math.cos(a),si=Math.sin(a);
 return [(gx*co-gy*si)/m,(gx*si+gy*co)/m];
}
export function contactManifold(a,b,ga,gb){
 assertGeometry(ga);assertGeometry(gb);
 const dx=b.x-a.x,dy=b.y-a.y,reach=a.radius+b.radius;
 if(dx*dx+dy*dy>reach*reach)return null;
 let samples=0,x=0,y=0,nx=0,ny=0;
 for(const point of ga.outline){
  const [wx,wy]=worldOutlinePoint(ga,a,point);
  if(!containsWorld(gb,b,wx,wy))continue;
  x+=wx;y+=wy;samples++;
  const normal=outwardNormal(gb,b,wx,wy);
  if(normal){nx-=normal[0];ny-=normal[1];}
 }
 for(const point of gb.outline){
  const [wx,wy]=worldOutlinePoint(gb,b,point);
  if(!containsWorld(ga,a,wx,wy))continue;
  x+=wx;y+=wy;samples++;
  const normal=outwardNormal(ga,a,wx,wy);
  if(normal){nx+=normal[0];ny+=normal[1];}
 }
 if(!samples){
  if(!containsWorld(ga,a,b.x,b.y)&&!containsWorld(gb,b,a.x,a.y))return null;
  samples=1;x=(a.x+b.x)/2;y=(a.y+b.y)/2;
 }
 x/=samples;y/=samples;
 const centerD=Math.hypot(dx,dy),fallbackX=centerD>1e-8?dx/centerD:1,fallbackY=centerD>1e-8?dy/centerD:0;
 const normalM=Math.hypot(nx,ny);
 if(normalM>1e-5){nx/=normalM;ny/=normalM;}
 else {nx=fallbackX;ny=fallbackY;}
 // Ensure normal points approximately A→B; otherwise separating impulses pull together.
 if(nx*fallbackX+ny*fallbackY<.15){nx=nx*.3+fallbackX*.7;ny=ny*.3+fallbackY*.7;const m=Math.hypot(nx,ny);nx/=m;ny/=m;}
 return {x,y,nx,ny,samples,depth:Math.min(.055,.006+samples*.0007)};
}
