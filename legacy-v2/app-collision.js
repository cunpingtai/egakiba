import * as THREE from './vendor/three.js';
import RAPIER from './vendor/rapier.js';
import {CONFIG} from './config.js';

const cache=new WeakMap();
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function ring(path){const p=path.getPoints(1).map(v=>v.clone());if(p.length>1&&p[0].equals(p.at(-1)))p.pop();return p;}
function contains(ring,p){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++)if((ring[i].y>p.y)!==(ring[j].y>p.y)&&p.x<(ring[j].x-ring[i].x)*(p.y-ring[i].y)/(ring[j].y-ring[i].y)+ring[i].x)inside=!inside;return inside;}
function mergeConvex(polys){
 let changed=true;const key=p=>`${p.x.toFixed(7)},${p.y.toFixed(7)}`;
 while(changed){changed=false;const edges=new Map();
  outer:for(let i=0;i<polys.length;i++)for(let a=0;a<polys[i].length;a++){
   const p=polys[i],u=p[a],v=p[(a+1)%p.length],reversed=edges.get(`${key(v)}:${key(u)}`);
   if(reversed){const [j,b]=reversed,q=polys[j];let union=[];
    for(let k=0;k<p.length;k++)union.push(p[(a+1+k)%p.length]);
    for(let k=2;k<q.length;k++)union.push(q[(b+k)%q.length]);
    union=union.filter((v,k)=>Math.abs(cross(union[(k+union.length-1)%union.length],v,union[(k+1)%union.length]))>1e-9);
    if(union.length>=3&&union.length<=64&&union.every((v,k)=>cross(v,union[(k+1)%union.length],union[(k+2)%union.length])>=-1e-9)){polys[j]=union;polys.splice(i,1);changed=true;break outer;}
   }
   edges.set(`${key(u)}:${key(v)}`,[i,a]);
  }
 }
 return polys;
}

// Preserve every exterior contour (including sharp tips and deep recesses).
// Only enclosed narrow holes may be filled. This is a gameplay approximation,
// not a claim that another top can never touch their inner walls.
export function spinningCollision(glyph){
 if(cache.has(glyph))return cache.get(glyph);
 const original={parts:glyph.parts,filledHoles:0};
 if(!glyph.shapes||glyph.parts.length<50){cache.set(glyph,original);return original;}
 const contours=glyph.shapes.map(shape=>({outer:ring(shape),holes:shape.holes.map(ring)}));
 const maxWidth=Math.min(CONFIG.thickness,CONFIG.tipRadius*2)*.8,triangles=[];let filledHoles=0;
 for(const shape of contours){
  const holes=shape.holes.filter(hole=>{
   const xs=hole.map(p=>p.x),ys=hole.map(p=>p.y),width=Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
   // An enclosed island is a separate component: do not cover or double it.
   if(width<maxWidth&&!contours.some(other=>other!==shape&&contains(hole,other.outer[0]))){filledHoles++;return false;}
   return true;
  });
  const points=shape.outer.concat(...holes);
  for(const indices of THREE.ShapeUtils.triangulateShape(shape.outer,holes)){
   const tri=indices.map(i=>({x:points[i].x-glyph.centroid.x,y:points[i].y-glyph.centroid.y}));
   if(THREE.ShapeUtils.area(tri)<0)tri.reverse();if(THREE.ShapeUtils.area(tri)>1e-10)triangles.push(tri);
  }
 }
 const parts=filledHoles?mergeConvex(triangles):glyph.parts;
 const result=filledHoles&&parts.length<=glyph.parts.length*.9?{parts,filledHoles,maxWidth}:original;
 cache.set(glyph,result);return result;
}

export function useSpinningCollider(body,colliders,glyph){
 const simplified=spinningCollision(glyph);if(simplified.parts===glyph.parts)return;
 const shapes=simplified.parts.map(polygon=>{const vertices=[];for(const y of [-CONFIG.thickness/2,CONFIG.thickness/2])for(const p of polygon)vertices.push(p.x,y,-p.y);return new RAPIER.ConvexPolyhedron(new Float32Array(vertices),null);});
 const descriptor=RAPIER.ColliderDesc.compound(shapes,shapes.map(()=>({x:0,y:0,z:0})),shapes.map(()=>({x:0,y:0,z:0,w:1})));
 // Keep the original complete top's mass properties. Filling a hole must not
 // make a letter heavier or change its launch energy. Fragments use the source.
 const mass=body.mass(),center=body.localCom(),inertia=body.principalInertia(),frame=body.principalInertiaLocalFrame();
 colliders[0].setShape(descriptor.shape);for(const collider of colliders)collider.setDensity(0);
 body.setAdditionalMassProperties(mass,center,inertia,frame,false);body.recomputeMassPropertiesFromColliders();
}
