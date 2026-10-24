import * as THREE from './vendor/three.js';
import {HALLOWEEN_PATTERN_GLSL} from './halloween-skins.js';
// Finishes affect only independently owned display materials, including debris.
export function applySkinFinish(material,effect,offset=new THREE.Vector3()){
 const skin=effect.skin,side=material.userData.skinSide;
 material.color.set(skin.pattern?0xffffff:skin.color);if(side&&skin.kind==='plain')material.color.multiplyScalar(.56);
 material.metalness=skin.metalness;material.roughness=skin.roughness;
 if(skin.kind==='plain')return;
 material.emissive.set(skin.color);material.emissiveIntensity=0;
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{
  previous.call(material,shader);shader.uniforms.skinTime=effect.clock;shader.uniforms.skinOffset={value:offset};
  shader.vertexShader='uniform vec3 skinOffset; varying vec3 vSkinPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vSkinPosition=position+skinOffset;');
  let finish='';
  if(skin.pattern){
   shader.uniforms.halloweenBase={value:new THREE.Color(skin.colors[0])};shader.uniforms.halloweenInk={value:new THREE.Color(skin.colors[1])};shader.uniforms.skinBounds={value:effect.bounds};
   const pattern={pumpkin:1,web:2,night:3}[skin.pattern];
   shader.fragmentShader='#define HW_PATTERN '+pattern+'\nuniform vec3 halloweenBase;uniform vec3 halloweenInk;uniform vec4 skinBounds;\n'+HALLOWEEN_PATTERN_GLSL+'\n'+shader.fragmentShader;
   finish='vec2 hwUv=(vSkinPosition.xz-skinBounds.xy)/skinBounds.zw;diffuseColor.rgb=mix(halloweenBase,halloweenInk,hwPattern(hwUv));';
  }
  shader.fragmentShader='uniform float skinTime; varying vec3 vSkinPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n{'+finish+'}\n');
 };material.customProgramCacheKey=()=>previousKey+'-skin-v1-'+skin.id;material.needsUpdate=true;
}
export function createSkinEffect(materials,skin,bounds=new THREE.Vector4(-1,-1,2,2)){const effect={skin,bounds,clock:{value:0},update(dt,reduced=false){if(!reduced&&skin.kind!=='plain'&&!skin.pattern)this.clock.value+=Math.max(0,Math.min(.1,dt));}};for(const material of materials)applySkinFinish(material,effect);return effect;}
