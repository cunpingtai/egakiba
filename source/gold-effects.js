import * as THREE from './vendor/three.js';
// A cosmetic finish: no metrics, geometry, RNG or physics changes.
export function applyGoldFinish(material,{clock},offset=new THREE.Vector3()){
 material.color.setHex((material.map&&!material.userData.teamColorTexture)?0xffe4ab:0xf1be45);material.metalness=.52;material.roughness=.12;material.emissive.setHex(0x805000);material.emissiveIntensity=.4;
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{
  previous.call(material,shader);shader.uniforms.goldTime=clock;shader.uniforms.goldOffset={value:offset};
  shader.vertexShader='uniform vec3 goldOffset; varying vec3 vGoldPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vGoldPosition=position+goldOffset;');
  shader.fragmentShader='uniform float goldTime; varying vec3 vGoldPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float sweep=0.0;
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0,0.67,0.12),0.32)+vec3(0.95,0.82,0.52)*sweep;
  `);
 };material.customProgramCacheKey=()=>previousKey+'-collection-gold-v3';material.needsUpdate=true;
}
export function createGoldEffect(materials){const effect={clock:{value:0},update(dt,reduced=false){if(!reduced)this.clock.value+=Math.max(0,Math.min(.1,dt));}};for(const material of materials)applyGoldFinish(material,effect);return effect;}
