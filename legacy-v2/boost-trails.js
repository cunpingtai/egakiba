import * as THREE from './vendor/three.js';
const SAMPLES=32,LANES=3,LIFE=.5,EMIT=.55;
// Two reusable meshes: no per-boost GPU allocations, shadows or postprocessing.
export class BoostTrails {
 constructor(scene){
  this.material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
  this.slots=Array.from({length:2},()=>{
   const geometry=new THREE.BufferGeometry(),positions=new Float32Array((SAMPLES-1)*LANES*6*3),colors=new Float32Array((SAMPLES-1)*LANES*6*4);
   geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,4).setUsage(THREE.DynamicDrawUsage));geometry.setDrawRange(0,0);
   const mesh=new THREE.Mesh(geometry,this.material);mesh.name='boost-wind-trail';mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
   return {mesh,geometry,positions,colors,points:[],remaining:0,color:new THREE.Color()};
  });
 }
 trigger(index,color){const slot=this.slots[index];if(slot){slot.remaining=EMIT;slot.color.set(color);}}
 clear(){for(const slot of this.slots){slot.points.length=0;slot.remaining=0;slot.geometry.setDrawRange(0,0);slot.mesh.visible=false;}}
 update(dt,groups,reduced=false,emitting=true){
  if(reduced){this.clear();return;}
  dt=Math.max(0,Math.min(dt,.1));
  for(const [index,slot] of this.slots.entries()){
   for(const point of slot.points)point.age+=dt;
   slot.points=slot.points.filter(point=>point.age<LIFE);slot.remaining=Math.max(0,slot.remaining-dt);
   if(slot.remaining>0&&emitting&&groups[index]){
    const p=groups[index].position,last=slot.points[0];
    if(!last||Math.hypot(p.x-last.x,p.y+.13-last.y,p.z-last.z)>.015){slot.points.unshift({x:p.x,y:p.y+.13,z:p.z,age:0});slot.points.length=Math.min(slot.points.length,SAMPLES);}
   }
   let vertex=0,distance=0;
   for(let i=0;i<slot.points.length-1;i++){
    const a=slot.points[i],b=slot.points[i+1],length=Math.hypot(a.x-b.x,a.z-b.z);distance+=length;if(distance>2.6)break;if(length<1e-6)continue;
    const nx=-(a.z-b.z)/length,nz=(a.x-b.x)/length;
    for(let lane=-1;lane<=1;lane++){
     const width=lane===0?.055:.035;
     const edge=(p,side,progress)=>{const offset=lane*.22*progress+side*width;return {x:p.x+nx*offset,y:p.y,z:p.z+nz*offset,alpha:.8*(1-p.age/LIFE)*(1-progress*.65)};};
     const u=i/(SAMPLES-1),v=(i+1)/(SAMPLES-1),al=edge(a,-1,u),ar=edge(a,1,u),bl=edge(b,-1,v),br=edge(b,1,v);
     for(const point of [al,bl,ar,ar,bl,br]){slot.positions.set([point.x,point.y,point.z],vertex*3);slot.colors.set([slot.color.r,slot.color.g,slot.color.b,point.alpha],vertex*4);vertex++;}
    }
   }
   slot.geometry.setDrawRange(0,vertex);slot.geometry.attributes.position.needsUpdate=true;slot.geometry.attributes.color.needsUpdate=true;slot.mesh.visible=vertex>0;
  }
 }
 dispose(){for(const slot of this.slots){slot.mesh.removeFromParent();slot.geometry.dispose();}this.material.dispose();}
}
