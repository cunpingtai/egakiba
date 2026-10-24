import * as THREE from './vendor/three.js';
import {CONFIG} from './config.js';
import {DRIVER_TIERS,driverMesh} from './driver.js';

// ExtrudeGeometry emits a front/side group per disconnected stroke. Submit
// each material once, keeping every original triangle, normal and UV intact.
// The source is also used by glyph caches; the reordered copy belongs to a round.
export function batchGlyphGeometry(source){
 if(source.drawRange.start!==0||source.drawRange.count!==Infinity)return source;
 const materials=new Map();
 for(const group of source.groups){
  if(!materials.has(group.materialIndex))materials.set(group.materialIndex,[]);
  materials.get(group.materialIndex).push(group);
 }
 if(materials.size===source.groups.length)return source;
 const geometry=source.clone(),indices=[];geometry.clearGroups();
 for(const [material,groups] of materials){
  const start=indices.length;
  for(const group of groups)for(let i=group.start;i<group.start+group.count;i++)indices.push(source.index?source.index.getX(i):i);
  geometry.addGroup(start,indices.length-start,material);
 }
 geometry.setIndex(indices);return geometry;
}

// One bounded cache per ArenaView. Fracture copies remain independently owned.
export class AppRenderResources {
 constructor(){this.drivers=new Map();this.geometries=new Set();this.materials=new Map();}
 sharedGeometry(geometry){this.geometries.add(geometry);return geometry;}
 material(key,options){if(!this.materials.has(key))this.materials.set(key,new THREE.MeshStandardMaterial(options));return this.materials.get(key);}
 driver(tier){
  if(!this.drivers.has(tier)){
   const shape=driverMesh(tier),geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.BufferAttribute(shape.vertices,3));geometry.setIndex(new THREE.BufferAttribute(shape.indices,1));geometry.computeVertexNormals();
   const material=this.material(tier.metal?'metal':'body',{color:tier.metal?0x96999e:0x666a70,metalness:tier.metal?.8:.25,roughness:tier.metal?.24:.4,flatShading:true});
   this.drivers.set(tier,{geometry:this.sharedGeometry(geometry),material});
  }
  return this.drivers.get(tier);
 }
 driverAssembly(){
  if(this.assembly)return this.assembly;
  const pieces=DRIVER_TIERS.map(tier=>this.driver(tier)),materials=[...new Set(pieces.map(piece=>piece.material))];
  const vertices=pieces.reduce((sum,piece)=>sum+piece.geometry.attributes.position.count,0),positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3),indices=[],geometry=new THREE.BufferGeometry();
  let offset=0;
  for(const piece of pieces){
   const source=piece.geometry,start=indices.length;
   positions.set(source.attributes.position.array,offset*3);normals.set(source.attributes.normal.array,offset*3);
   for(let i=0;i<source.index.count;i++)indices.push(offset+source.index.getX(i));
   geometry.addGroup(start,indices.length-start,materials.indexOf(piece.material));offset+=source.attributes.position.count;
  }
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setIndex(indices);
  const batched=batchGlyphGeometry(geometry);if(batched!==geometry)geometry.dispose();
  return this.assembly={geometry:this.sharedGeometry(batched),materials};
 }
 tip(){return this.tipResources||=( {geometry:this.sharedGeometry(new THREE.SphereGeometry(CONFIG.tipRadius,16,12)),material:this.material('tip',{color:0xc3c5c8,metalness:.85,roughness:.2})} );}
 get waveGeometry(){return this.wave||=this.sharedGeometry(new THREE.RingGeometry(.94,1,48));}
 get burstGeometry(){return this.burst||=this.sharedGeometry(new THREE.SphereGeometry(.16,12,8));}
 dispose(){for(const geometry of this.geometries)geometry.dispose();for(const material of this.materials.values())material.dispose();this.geometries.clear();this.materials.clear();this.drivers.clear();}
 disposeGeometry(geometry){if(!this.geometries.has(geometry))geometry.dispose();}
}

// Preserve order and the same update/removal callbacks without a new array each frame.
export function filterInPlace(items,keep){
 let write=0;
 for(let read=0;read<items.length;read++){const item=items[read];if(keep(item))items[write++]=item;}
 items.length=write;return items;
}
