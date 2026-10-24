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
 return after.length>=3&&original*next>0&&Math.abs(next-original)<=Math.abs(original)*.005&&!selfIntersects(after);
}
function path(points,Type){const path=new Type();path.moveTo(points[0].x,points[0].y);for(const point of points.slice(1))path.lineTo(point.x,point.y);path.closePath();return path;}

// Visual detail only: no point is removed from the physics outline, convex
// parts, metrics, fracture pieces or glyph cache. Fine/tiny components and all
// hole counts survive. Unsafe or ineffective candidates retain the source.
export function simplifyGlyphGeometry(glyph){
 if(glyph.textureSource||!/^\p{Unified_Ideograph}$/u.test(glyph.char||'')||!glyph.shapes||glyph.parts.length<80)return glyph.geometry;
 const tolerance=Math.min(.003,glyph.radius*.002),shapes=[];let beforeCount=0,afterCount=0;
 for(const shape of glyph.shapes){
  const original=[shape,...shape.holes].map(ring=>clean(ring.getPoints(1))),candidate=original.map(ring=>{
   for(let attempt=0;attempt<4;attempt++){const simplified=simplifyContour(ring,tolerance/2**attempt);if(safeContour(ring,simplified))return simplified;}
   return ring;
  });
  let safe=candidate.every((ring,index)=>safeContour(original[index],ring));
  for(let i=1;safe&&i<candidate.length;i++){
   if(!contains(candidate[0],candidate[i][0]))safe=false;
   for(let j=0;safe&&j<i;j++)if(ringsIntersect(candidate[i],candidate[j])||j>0&&(contains(candidate[j],candidate[i][0])||contains(candidate[i],candidate[j][0])))safe=false;
  }
  const used=safe?candidate:original;beforeCount+=original.reduce((sum,ring)=>sum+ring.length,0);afterCount+=used.reduce((sum,ring)=>sum+ring.length,0);
  if(!safe||used.every((ring,index)=>ring.length===original[index].length)){shapes.push(shape);continue;}
  const simplified=path(used[0],THREE.Shape);simplified.holes=used.slice(1).map(ring=>path(ring,THREE.Path));shapes.push(simplified);
 }
 if(afterCount>=beforeCount*.9)return glyph.geometry;
 // Keep disconnected strokes disconnected, including very narrow gaps.
 const outer=shapes.map(shape=>clean(shape.getPoints(1)));
 for(let i=0;i<outer.length;i++)for(let j=0;j<i;j++)if(ringsIntersect(outer[i],outer[j])||contains(outer[i],outer[j][0])||contains(outer[j],outer[i][0]))return glyph.geometry;
 const geometry=new THREE.ExtrudeGeometry(shapes,{depth:CONFIG.thickness,bevelEnabled:false,steps:1,curveSegments:1});
 geometry.translate(-glyph.centroid.x,-glyph.centroid.y,-CONFIG.thickness/2);geometry.rotateX(-Math.PI/2);geometry.computeBoundingSphere();
 if(geometry.attributes.position.count>=glyph.geometry.attributes.position.count*.9){geometry.dispose();return glyph.geometry;}
 geometry.userData.appDetail={tolerance,beforeCount,afterCount,components:shapes.length,holes:shapes.reduce((count,shape)=>count+shape.holes.length,0)};
 return geometry;
}
