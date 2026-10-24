import * as THREE from './vendor/three.js';
import {CONFIG} from './config.js';

const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function contourArea(points){let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.y-b.x*a.y;}return area/2;}
function distanceSquared(p,a,b){const x=b.x-a.x,y=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return (p.x-a.x-t*x)**2+(p.y-a.y-t*y)**2;}
function openSimplify(points,tolerance){
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]],limit=tolerance*tolerance;
 while(stack.length){const [start,end]=stack.pop();let far=-1,maximum=limit;for(let i=start+1;i<end;i++){const d=distanceSquared(points[i],points[start],points[end]);if(d>maximum){far=i;maximum=d;}}if(far!==-1){keep.add(far);stack.push([start,far],[far,end]);}}
 return [...keep].sort((a,b)=>a-b).map(index=>points[index]);
}
function clean(points){const result=points.map(({x,y})=>({x,y}));if(result.length>1&&result[0].x===result.at(-1).x&&result[0].y===result.at(-1).y)result.pop();return result;}
export function simplifyContour(points,tolerance){
 points=clean(points);if(points.length<6)return points;
 let far=1;for(let i=2;i<points.length;i++)if((points[i].x-points[0].x)**2+(points[i].y-points[0].y)**2>(points[far].x-points[0].x)**2+(points[far].y-points[0].y)**2)far=i;
 return openSimplify(points.slice(0,far+1),tolerance).slice(0,-1).concat(openSimplify(points.slice(far).concat(points[0]),tolerance).slice(0,-1));
}
function intersects(a,b,c,d){
 if(Math.max(a.x,b.x)<Math.min(c.x,d.x)||Math.max(c.x,d.x)<Math.min(a.x,b.x)||Math.max(a.y,b.y)<Math.min(c.y,d.y)||Math.max(c.y,d.y)<Math.min(a.y,b.y))return false;
 return cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;
}
function selfIntersects(ring){for(let i=0;i<ring.length;i++)for(let j=i+2;j<ring.length;j++){if(i===0&&j===ring.length-1)continue;if(intersects(ring[i],ring[(i+1)%ring.length],ring[j],ring[(j+1)%ring.length]))return true;}return false;}
function ringsIntersect(a,b){for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)if(intersects(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length]))return true;return false;}
function contains(ring,p){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++)if((ring[i].y>p.y)!==(ring[j].y>p.y)&&p.x<(ring[j].x-ring[i].x)*(p.y-ring[i].y)/(ring[j].y-ring[i].y)+ring[i].x)inside=!inside;return inside;}
function safeContour(before,after){
 const original=contourArea(before),next=contourArea(after);
 return after.length>=3&&original*next>0&&Math.abs(next-original)<=Math.abs(original)*.02&&!selfIntersects(after);
}
function path(points,Type){const path=new Type();path.moveTo(points[0].x,points[0].y);for(const point of points.slice(1))path.lineTo(point.x,point.y);path.closePath();return path;}

// Raster contours carry pixel stairs. Average only local pixel noise, retain
// sharp corners measured across a three-pixel span, then simplify the display
// path. This never writes into glyph.shapes/parts/triangles or its geometry.
function along(points,index,direction,length){
 let current=points[index],remaining=length;
 for(let step=1;step<=points.length;step++){
  const next=points[(index+direction*step+points.length*2)%points.length],distance=Math.hypot(next.x-current.x,next.y-current.y);
  if(distance>=remaining)return {x:current.x+(next.x-current.x)*remaining/distance,y:current.y+(next.y-current.y)*remaining/distance};
  remaining-=distance;current=next;
 }return points[index];
}
export function smoothRasterContour(points,pixel){
 points=clean(points);if(points.length<6)return points;
 const softened=points.map((p,i)=>{
  const before=along(points,i,-1,pixel*3),after=along(points,i,1,pixel*3),a={x:p.x-before.x,y:p.y-before.y},b={x:after.x-p.x,y:after.y-p.y};
  if(a.x*b.x+a.y*b.y<.35*Math.hypot(a.x,a.y)*Math.hypot(b.x,b.y))return p;
  const left=along(points,i,-1,pixel),right=along(points,i,1,pixel);return {x:(left.x+2*p.x+right.x)/4,y:(left.y+2*p.y+right.y)/4};
 });
 return simplifyContour(softened,pixel*.65);
}
// Variants can be nested (rare -> boss size -> original raster). The stored
// contours always belong to the original; use the total texture scale ratio.
function rasterSource(glyph){let base=glyph;while(base.baseGlyph||base.bossBaseGlyph)base=base.baseGlyph||base.bossBaseGlyph;return base;}
export function smoothGlyphGeometry(glyph){
 const base=rasterSource(glyph),pixel=base.rasterPixelSize;
 if(!pixel||!base.shapes)return glyph.geometry;
 const tolerance=pixel*1.2,shapes=[];let beforeCount=0,afterCount=0;
 for(const shape of base.shapes){
  const original=[shape,...shape.holes].map(ring=>clean(ring.getPoints(1))),candidate=original.map(ring=>{
   for(const strength of [1,.85,.6]){const visual=smoothRasterContour(ring,pixel*strength);if(safeContour(ring,visual)&&ring.every(point=>visual.some((a,i)=>distanceSquared(point,a,visual[(i+1)%visual.length])<=tolerance*tolerance)))return visual;}
   return ring;
  });
  let safe=candidate.every((ring,index)=>safeContour(original[index],ring)&&original[index].every(point=>ring.some((a,i)=>distanceSquared(point,a,ring[(i+1)%ring.length])<=tolerance*tolerance)));
  for(let i=1;safe&&i<candidate.length;i++){
   if(!contains(candidate[0],candidate[i][0]))safe=false;
   for(let j=0;safe&&j<i;j++)if(ringsIntersect(candidate[i],candidate[j])||j>0&&(contains(candidate[j],candidate[i][0])||contains(candidate[i],candidate[j][0])))safe=false;
  }
  const used=safe?candidate:original;beforeCount+=original.reduce((sum,ring)=>sum+ring.length,0);afterCount+=used.reduce((sum,ring)=>sum+ring.length,0);
  if(!safe){shapes.push(shape);continue;}
  const visual=path(used[0],THREE.Shape);visual.holes=used.slice(1).map(ring=>path(ring,THREE.Path));shapes.push(visual);
 }
 if(afterCount>=beforeCount*.9)return glyph.geometry;
 // A visual contour must not bridge separate strokes or close a real hole.
 const outer=shapes.map(shape=>clean(shape.getPoints(1)));
 for(let i=0;i<outer.length;i++)for(let j=0;j<i;j++)if(ringsIntersect(outer[i],outer[j])||contains(outer[i],outer[j][0])||contains(outer[j],outer[i][0]))return glyph.geometry;
 const geometry=new THREE.ExtrudeGeometry(shapes,{depth:CONFIG.thickness,bevelEnabled:false,steps:1,curveSegments:1});
 geometry.translate(-base.centroid.x,-base.centroid.y,-CONFIG.thickness/2);geometry.rotateX(-Math.PI/2);
 const scale=(glyph.baseGlyph||glyph.bossBaseGlyph)?glyph.textureScale/base.textureScale:1;geometry.scale(scale,1,scale);geometry.computeBoundingSphere();
 geometry.userData.rasterDisplay={tolerance,beforeCount,afterCount,components:shapes.length,holes:shapes.reduce((count,shape)=>count+shape.holes.length,0)};return geometry;
}

// Match each original physical component to the source stroke contours. The
// triangulation can contain T-junctions, so tracing its exposed edges would
// mistakenly treat internal seams as part of the outline.
export function smoothFragmentGeometry(glyph,piece){
 const base=rasterSource(glyph),scale=(glyph.baseGlyph||glyph.bossBaseGlyph)?glyph.textureScale/base.textureScale:1,pixel=base.rasterPixelSize*scale;
 if(!pixel||!base.shapes)return null;
 const key=p=>`${p.x.toFixed(7)},${p.y.toFixed(7)}`,vertices=new Set(piece.triangles.flat().map(key)),point=p=>({x:(p.x-base.centroid.x)*scale,y:(p.y-base.centroid.y)*scale}),shapes=[];let expectedArea=0;
 for(const source of base.shapes){
  const outer=clean(source.getPoints(1)).map(point);if(!outer.some(p=>vertices.has(key(p))))continue;
  const holes=source.holes.map(hole=>clean(hole.getPoints(1)).map(point)),shape=path(outer,THREE.Shape);shape.holes=holes.map(ring=>path(ring,THREE.Path));shapes.push(shape);
  expectedArea+=Math.abs(contourArea(outer))-holes.reduce((sum,ring)=>sum+Math.abs(contourArea(ring)),0);
 }
 const physicalArea=piece.triangles.reduce((sum,triangle)=>sum+Math.abs(contourArea(triangle)),0);
 // Never draw a whole stroke on a component containing only part of it.
 if(!shapes.length||Math.abs(expectedArea-physicalArea)>Math.max(1e-8,physicalArea*.00001))return null;
 return smoothGlyphGeometry({geometry:null,shapes,centroid:piece.center,rasterPixelSize:pixel});
}
