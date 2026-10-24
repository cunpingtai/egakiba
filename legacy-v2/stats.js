import { CONFIG } from './config.js';

// Balance measures the whole character's envelope, ignoring stroke gaps and
// internal notches. This hull is for the gauge only; mesh/collider holes stay intact.
function envelope(contours){
 const points=contours.flat().map(p=>({x:p.x,y:p.y})).sort((a,b)=>a.x-b.x||a.y-b.y);
 const unique=points.filter((p,i)=>!i||p.x!==points[i-1].x||p.y!==points[i-1].y);
 if(unique.length<3)return unique;
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const half=ordered=>{const hull=[];for(const p of ordered){while(hull.length>=2&&cross(hull.at(-2),hull.at(-1),p)<=0)hull.pop();hull.push(p);}return hull;};
 return half(unique).slice(0,-1).concat(half(unique.toReversed()).slice(0,-1));
}
export function outlineBalance(contours){
 const hull=envelope(contours);if(hull.length<3)return 0;
 // Shift near zero so translation does not reduce floating-point precision.
 const origin=hull[0];let area=0,perimeter=0;
 for(let i=0;i<hull.length;i++){
  const p=hull[i],q=hull[(i+1)%hull.length];
  area+=(p.x-origin.x)*(q.y-origin.y)-(q.x-origin.x)*(p.y-origin.y);
  perimeter+=Math.hypot(q.x-p.x,q.y-p.y);
 }
 return perimeter>1e-8?Math.max(0,Math.min(1,2*Math.PI*Math.abs(area)/(perimeter*perimeter))):0;
}

// Cut filled glyph triangles at the bounding-box center, not the center of
// mass: moving the split toward heavy strokes would conceal their imbalance.
// Holes and gaps have no triangles, so they contribute no area.
export function quadrantAreas(triangles){
 const areas=[0,0,0,0];if(!triangles.length)return areas;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const triangle of triangles)for(const p of triangle){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 const clip=(polygon,axis,sign)=>{
  const result=[];
  for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length],da=a[axis]*sign,db=b[axis]*sign;
   if(da>=0)result.push(a);
   if((da>=0)!==(db>=0)){const t=da/(da-db);result.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
  }
  return result;
 };
 for(const triangle of triangles){
  const centered=triangle.map(p=>({x:p.x-cx,y:p.y-cy}));
  for(let i=0;i<4;i++){
   const polygon=clip(clip(centered,'x',i%2?1:-1),'y',i<2?1:-1);
   let twiceArea=0;
   for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length];twiceArea+=a.x*b.y-b.x*a.y;}
   areas[i]+=Math.abs(twiceArea)/2;
  }
 }
 return areas;
}
export function quadrantBalance(triangles){
 const areas=quadrantAreas(triangles),total=areas.reduce((a,b)=>a+b,0);if(total<=0)return 0;
 // Equal quarters score 1. The largest possible deviation is 1.5 (all in one).
 const deviation=areas.reduce((sum,area)=>sum+Math.abs(area/total-.25),0);
 // Expand the crowded high end without changing ordering or adding character ranks.
 // Exact symmetry remains 1; increasing imbalance falls smoothly toward 0.
 return Math.max(0,Math.min(1,1-deviation/1.5))**CONFIG.statBalanceAreaSensitivity;
}

// Rasterize the same triangles used for mass/geometry, then thin to stroke lines.
// Tip coordinates are cached with the glyph and never change its visible mesh.
export function estimateTipPoints(triangles,size=112){
 const points=triangles.flat();if(!points.length)return [];
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const p of points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
 const span=Math.max(maxX-minX,maxY-minY);if(span<1e-8)return [];
 const scale=(size-8)/span,bitmap=new Uint8Array(size*size);
 const cross=(a,b,x,y)=>(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);
 for(const tri of triangles){
  const t=tri.map(p=>({x:4+(p.x-minX)*scale,y:4+(p.y-minY)*scale}));
  const x0=Math.max(1,Math.floor(Math.min(...t.map(p=>p.x)))),x1=Math.min(size-2,Math.ceil(Math.max(...t.map(p=>p.x))));
  const y0=Math.max(1,Math.floor(Math.min(...t.map(p=>p.y)))),y1=Math.min(size-2,Math.ceil(Math.max(...t.map(p=>p.y))));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(t.every((a,i)=>cross(a,t[(i+1)%3],x+.5,y+.5)>=-1e-8))bitmap[y*size+x]=1;
 }
 const offsets=[-size,-size+1,1,size+1,size,size-1,-1,-size-1];
 for(let pass=0;pass<size;pass++){
  let changed=false;
  for(let phase=0;phase<2;phase++){
   const remove=[];
   for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
    const i=y*size+x;if(!bitmap[i])continue;
    const p=offsets.map(d=>bitmap[i+d]),count=p.reduce((a,b)=>a+b,0);
    if(count<2||count>6||p.reduce((n,v,j)=>n+(!v&&p[(j+1)%8]?1:0),0)!==1)continue;
    if(phase===0?(p[0]*p[2]*p[4]||p[2]*p[4]*p[6]):(p[0]*p[2]*p[6]||p[0]*p[4]*p[6]))continue;
    remove.push(i);
   }
   for(const i of remove)bitmap[i]=0;
   changed ||= remove.length>0;
  }
  if(!changed)break;
 }
 const neighbors=i=>offsets.map(d=>i+d).filter(j=>bitmap[j]);
 // Remove tiny raster spurs at joins, while preserving separate short strokes.
 const prune=new Set();
 for(let i=size+1;i<bitmap.length-size-1;i++)if(bitmap[i]&&neighbors(i).length===1){
  const path=[i];let previous=-1,current=i;
  for(let step=0;step<3;step++){
   const next=neighbors(current).filter(j=>j!==previous);if(next.length!==1)break;
   previous=current;current=next[0];
   if(neighbors(current).length>2){path.forEach(j=>prune.add(j));break;}
   path.push(current);
  }
 }
 for(const i of prune)bitmap[i]=0;
 const tips=[];for(let i=size+1;i<bitmap.length-size-1;i++)if(bitmap[i]&&neighbors(i).length===1){
  const x=i%size,y=Math.floor(i/size);
  tips.push({x:minX+(x+.5-4)/scale,y:minY+(y+.5-4)/scale});
 }
 return tips;
}
export function estimateTips(triangles,size=112){return estimateTipPoints(triangles,size).length;}

// A skeleton end is a candidate, not necessarily a pointed outline. Keep only
// ends close to a convex outer-contour corner of at most the chosen angle.
// The cached stat tip count remains independent of this combat-only filter.
export function combatTipPoints(tips,shapes,centroid){
 const corners=[];
 for(const shape of shapes){
  const points=shape.getPoints(1).slice();
  if(points.length>1&&Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y)<1e-8)points.pop();
  if(points.length<3)continue;
  let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.y-b.x*a.y;}
  for(let i=0;i<points.length;i++){
   const a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length];
   const ux=a.x-b.x,uy=a.y-b.y,vx=c.x-b.x,vy=c.y-b.y,length=Math.hypot(ux,uy)*Math.hypot(vx,vy);
   if(length<1e-8||((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x))*area<=0)continue;
   const angle=Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy)/length)));
   if(angle<=CONFIG.criticalMaxCornerAngle+1e-6)corners.push({x:b.x-centroid.x,y:b.y-centroid.y,angle,hasHole:shape.holes.length>0});
  }
 }
 return tips.flatMap(tip=>{
  const nearby=corners.filter(corner=>Math.hypot(tip.x-corner.x,tip.y-corner.y)<=CONFIG.criticalContourSearchRadius);
  // An open stroke may end in a serif or a flat cap. For a contour enclosing
  // holes, require a cap extending beyond the skeleton end so a loop bend
  // such as the bottom corners of 口 is not treated as an attacking tip.
  const length=Math.hypot(tip.x,tip.y)||1;
  const ahead=nearby.filter(corner=>corner.hasHole&&((corner.x-tip.x)*tip.x+(corner.y-tip.y)*tip.y)/length>.035);
  const openCorners=nearby.filter(corner=>!corner.hasHole);
  const eligible=openCorners.length?openCorners:ahead.length>=2?ahead:[];
  return eligible.length?[{...tip,cornerAngle:Math.min(...eligible.map(corner=>corner.angle))}]:[];
 });
}
