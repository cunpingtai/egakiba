import * as THREE from './vendor/three.js';
// Display-only resources. One environment per renderer, one bounded normal map
// per live glyph geometry. No glyph metrics, colliders or random state change.
const environments=new WeakMap(),bevels=new WeakMap();
const GEM_IDS=new Set(['sapphire','obsidian','candy','aurora']);
const tuning={gold:[.85,.075,1.3],pearl:[.88,.085,1.25],silver:[.96,.045,1.4],sapphire:[.04,.065,1.1],obsidian:[.04,.065,1.1],candy:[.04,.065,1.1],aurora:[.28,.06,.7],rainbow:[.68,.07,.85]};
export function rewardMaterial(skin,options){
 if(skin?.kind==='halloween')return new THREE.MeshPhysicalMaterial({...options,clearcoat:.65,clearcoatRoughness:.16});
 if(!GEM_IDS.has(skin?.id))return new THREE.MeshStandardMaterial(options);
 return new THREE.MeshPhysicalMaterial({...options,clearcoat:skin.id==='aurora'?.6:1,clearcoatRoughness:.025,ior:1.76,specularIntensity:skin.id==='aurora'?.8:1.35});
}
function studioEnvironment(renderer){
 if(environments.has(renderer))return environments.get(renderer);
 const studio=new THREE.Scene();studio.background=new THREE.Color(.13,.16,.21);
 studio.add(new THREE.Mesh(new THREE.BoxGeometry(20,16,20),new THREE.MeshBasicMaterial({color:new THREE.Color(.3,.34,.4),side:THREE.BackSide})));
 for(const [w,h,x,y,z,b] of [[3,9,-6,3,3,8],[2,10,6,2,-1,6],[8,3,0,7,1,7],[3,7,-2,2,-7,4],[9,2,0,-3,5,3]]){
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(b,b*.97,b*.91),side:THREE.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);
 }
 const generator=new THREE.PMREMGenerator(renderer);let target;
 try{target=generator.fromScene(studio,.025,.1,50,{size:128});environments.set(renderer,target);return target;}
 finally{generator.dispose();studio.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});}
}
export function disposeRewardEnvironment(renderer){environments.get(renderer)?.dispose();environments.delete(renderer);}
export function rewardBoundsFor(geometry){
 const p=geometry.attributes.position;let x=Infinity,z=Infinity,right=-Infinity,bottom=-Infinity;
 for(let i=0;i<p.count;i++){x=Math.min(x,p.getX(i));z=Math.min(z,p.getZ(i));right=Math.max(right,p.getX(i));bottom=Math.max(bottom,p.getZ(i));}
 if(!Number.isFinite(x))return new THREE.Vector4(-1,-1,2,2);
 return new THREE.Vector4(x-.12,z-.12,Math.max(.001,right-x)+.24,Math.max(.001,bottom-z)+.24);
}
// Two-pass chamfer distance and separable blur: fixed O(size²) work, no canvas
// or full-font scanning at game startup. RGB stores outward X/Z and edge depth.
export function bevelPixels(alpha,size,span){
 const n=size*size,dist=new Float32Array(n),tmp=new Float32Array(n),blur=new Float32Array(n),diagonal=Math.SQRT2;
 for(let i=0;i<n;i++)dist[i]=alpha[i]>127?1e6:0;
 for(let y=1;y<size;y++)for(let x=1;x<size-1;x++){const i=y*size+x;dist[i]=Math.min(dist[i],dist[i-1]+1,dist[i-size]+1,dist[i-size-1]+diagonal,dist[i-size+1]+diagonal);}
 for(let y=size-2;y>=0;y--)for(let x=size-2;x>=1;x--){const i=y*size+x;dist[i]=Math.min(dist[i],dist[i+1]+1,dist[i+size]+1,dist[i+size-1]+diagonal,dist[i+size+1]+diagonal);}
 blur.set(dist);
 for(let pass=0;pass<2;pass++){
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){let sum=0;for(let k=-2;k<=2;k++)sum+=blur[y*size+Math.max(0,Math.min(size-1,x+k))];tmp[y*size+x]=sum/5;}
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){let sum=0;for(let k=-2;k<=2;k++)sum+=tmp[Math.max(0,Math.min(size-1,y+k))*size+x];blur[y*size+x]=sum/5;}
 }
 const bytes=new Uint8Array(n*4),radius=.125*(size-1)/Math.max(.001,span);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,dx=blur[y*size+Math.min(size-1,x+2)]-blur[y*size+Math.max(0,x-2)],dz=blur[Math.min(size-1,y+2)*size+x]-blur[Math.max(0,y-2)*size+x],length=Math.hypot(dx,dz)||1;
  bytes[i*4]=Math.round(127.5-127.5*dx/length);bytes[i*4+1]=Math.round(127.5-127.5*dz/length);bytes[i*4+2]=Math.round(Math.min(1,blur[i]/radius)*255);bytes[i*4+3]=255;
 }
 return bytes;
}
function makeBevel(geometry,bounds){
 const size=256,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),p=geometry.attributes.position,normal=geometry.attributes.normal,index=geometry.index;
 ctx.fillStyle='#fff';ctx.beginPath();
 for(const group of geometry.groups){if(group.materialIndex!==0)continue;
  for(let k=group.start;k<group.start+group.count;k+=3){const ids=[0,1,2].map(j=>index?index.getX(k+j):k+j);if(normal.getY(ids[0])<.5)continue;
   for(let j=0;j<3;j++){const x=(p.getX(ids[j])-bounds.x)/bounds.z*(size-1),z=(p.getZ(ids[j])-bounds.y)/bounds.w*(size-1);if(j)ctx.lineTo(x,z);else ctx.moveTo(x,z);}ctx.closePath();
  }
 }
 ctx.fill();const pixels=ctx.getImageData(0,0,size,size).data,alpha=new Uint8Array(size*size);for(let i=0;i<alpha.length;i++)alpha[i]=pixels[i*4+3];
 const texture=new THREE.DataTexture(bevelPixels(alpha,size,Math.max(bounds.z,bounds.w)),size,size,THREE.RGBAFormat);
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 canvas.width=canvas.height=1;return texture;
}
export function createRewardSurface(mesh,skin){
 if(!tuning[skin?.id])return null;
 const geometry=mesh.geometry;let shared=bevels.get(geometry);
 if(!shared){shared={refs:0,bounds:rewardBoundsFor(geometry),map:{value:null}};bevels.set(geometry,shared);}shared.refs++;
 let disposed=false;
 const effect={skin,bounds:shared.bounds,apply(material,offset=new THREE.Vector3()){
  const [metalness,roughness,intensity]=tuning[skin.id];material.metalness=metalness;material.roughness=roughness;material.envMapIntensity=intensity;
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=shader=>{
   previous.call(material,shader);shader.uniforms.rewardBevelMap=shared.map;shader.uniforms.rewardBounds={value:shared.bounds};shader.uniforms.rewardSurfaceOffset={value:offset};
   shader.vertexShader='uniform vec3 rewardSurfaceOffset;varying vec3 vRewardSurfacePosition;varying vec3 vRewardAxisX;varying vec3 vRewardAxisZ;varying float vRewardFace;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vRewardSurfacePosition=position+rewardSurfaceOffset;vRewardAxisX=normalize((modelViewMatrix*vec4(1.,0.,0.,0.)).xyz);vRewardAxisZ=normalize((modelViewMatrix*vec4(0.,0.,1.,0.)).xyz);vRewardFace=abs(normal.y);');
   shader.fragmentShader='uniform sampler2D rewardBevelMap;uniform vec4 rewardBounds;varying vec3 vRewardSurfacePosition;varying vec3 vRewardAxisX;varying vec3 vRewardAxisZ;varying float vRewardFace;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec2 rewardUv=(vRewardSurfacePosition.xz-rewardBounds.xy)/rewardBounds.zw;
    vec3 rewardBevel=texture2D(rewardBevelMap,rewardUv).rgb;
    float rewardEdge=(1.-smoothstep(.76,1.,rewardBevel.b))*smoothstep(.7,.98,vRewardFace);
    normal=normalize(normal+(vRewardAxisX*(rewardBevel.r*2.-1.)+vRewardAxisZ*(rewardBevel.g*2.-1.))*.95*rewardEdge);
    roughnessFactor=max(roughnessFactor,.18*rewardEdge);
   `).replace('#include <clearcoat_normal_fragment_maps>',`#include <clearcoat_normal_fragment_maps>
    #ifdef USE_CLEARCOAT
     clearcoatNormal=normal;
    #endif
   `);
   if(GEM_IDS.has(skin.id))shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float gemDepth=.5+.5*sin(vRewardSurfacePosition.x*1.25+vRewardSurfacePosition.z*.8);
    diffuseColor.rgb*=${skin.id==='aurora'?'.62+.18*gemDepth':'.38+.28*gemDepth'};
   `).replace('#include <opaque_fragment>',`float gemRim=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);outgoingLight+=diffuseColor.rgb*gemRim*.12;
    #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>key+'-reward-surface-v1-'+skin.id;material.needsUpdate=true;
 },bind(target){
  target.onBeforeRender=(renderer,scene,camera,geometry,material)=>{
   if(disposed)return;
   if(!shared.map.value)shared.map.value=makeBevel(mesh.geometry,shared.bounds);
   const texture=studioEnvironment(renderer).texture;
   if(material.envMap!==texture){material.envMap=texture;material.needsUpdate=true;}
  };
 },dispose(){if(disposed)return;disposed=true;if(--shared.refs===0){shared.map.value?.dispose();shared.map.value=null;bevels.delete(geometry);}}};
 for(const material of mesh.material)effect.apply(material);effect.bind(mesh);return effect;
}
