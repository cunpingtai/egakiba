import * as THREE from './vendor/three.js';
import {RAINBOW_COLORS} from './skin-catalog.js';
const linear=RAINBOW_COLORS.map(color=>new THREE.Color(color).toArray().map(n=>n.toFixed(6)));
const spectrumGLSL='vec3 rewardRainbowColor(float hue){float band=fract(hue)*7.0;'+linear.map((rgb,i)=>`${i?'else ':''}if(band<${i+1}.0)return mix(vec3(${rgb.join(',')}),vec3(${linear[(i+1)%7].join(',')}),smoothstep(0.0,1.0,fract(band)));`).join('')+'return vec3(1.0); }';
// Local cosmetic reward. Geometry, combat stats and game RNG stay untouched.
export function applyRainbowFinish(material,{clock,bounds=new THREE.Vector4(-1,-1,2,2)},offset=new THREE.Vector3()){
 material.color.setHex(0xffffff);material.metalness=.52;material.roughness=.12;
 material.emissive.setHex(0x111827);material.emissiveIntensity=.1;
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{
  previous.call(material,shader);shader.uniforms.rewardRainbowTime=clock;shader.uniforms.rewardRainbowBounds={value:bounds};shader.uniforms.rewardRainbowOffset={value:offset};shader.uniforms.rewardRainbowStrength={value:(material.map&&!material.userData.teamColorTexture)?.48:1};
  shader.vertexShader='uniform vec3 rewardRainbowOffset; varying vec3 vRewardRainbowPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vRewardRainbowPosition=position+rewardRainbowOffset;');
  // Insert before the existing foil block so rare facets remain on top.
  shader.fragmentShader=spectrumGLSL+'\n'+'uniform vec4 rewardRainbowBounds; uniform float rewardRainbowTime; uniform float rewardRainbowStrength; varying vec3 vRewardRainbowPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   {
    vec2 rewardUv=(vRewardRainbowPosition.xz-rewardRainbowBounds.xy)/rewardRainbowBounds.zw;
    float rewardHue=fract(0.02+1.5*dot(rewardUv,vec2(0.72,0.28)));
    vec3 rewardSpectrum=clamp(abs(fract(rewardHue+vec3(0.0,0.666667,0.333333))*6.0-3.0)-1.0,0.0,1.0);
    vec3 rewardColor=rewardRainbowColor(rewardHue);
    float rewardSweep=0.0;
    diffuseColor.rgb=mix(diffuseColor.rgb,rewardColor,rewardRainbowStrength)+vec3(0.32)*rewardSweep;
   }
  `);
 };material.customProgramCacheKey=()=>previousKey+'-collection-rainbow-v1';material.needsUpdate=true;
}
export function createRainbowEffect(materials,bounds){const effect={bounds,clock:{value:0},update(dt,reduced=false){if(!reduced)this.clock.value+=Math.max(0,Math.min(.1,dt));}};for(const material of materials)applyRainbowFinish(material,effect);return effect;}
