import * as THREE from './vendor/three.js';

// Analytic antialiasing avoids subpixel shimmer in the distant grid. Keep the
// original 1-unit spacing, extent and colors; no change to the physical floor.
export function makeStableGrid(){
 const material=new THREE.ShaderMaterial({
  uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uLine:{value:new THREE.Color(0x979ba1)},uCenter:{value:new THREE.Color(0x818489)}}]),
  vertexShader:`varying vec2 vGrid;
   #include <fog_pars_vertex>
   void main(){vec4 world=modelMatrix*vec4(position,1.);vGrid=world.xz;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
   }`,
  fragmentShader:`varying vec2 vGrid;uniform vec3 uLine;uniform vec3 uCenter;
   #include <fog_pars_fragment>
   void main(){vec2 footprint=max(fwidth(vGrid),vec2(.00001));vec2 distanceToLine=abs(fract(vGrid-.5)-.5)/footprint;
    float coverage=1.-min(min(distanceToLine.x,distanceToLine.y),1.);
    float center=1.-min(min(abs(vGrid.x)/footprint.x,abs(vGrid.y)/footprint.y),1.);
    float resolved=1.-smoothstep(.35,.75,max(footprint.x,footprint.y));
    gl_FragColor=vec4(mix(uLine,uCenter,center),coverage*resolved);
    #include <colorspace_fragment>
    #include <fog_fragment>
   }`,
  transparent:true,depthWrite:false,depthTest:true,toneMapped:false,fog:true,
 });
 const grid=new THREE.Mesh(new THREE.PlaneGeometry(80,80),material);grid.rotation.x=-Math.PI/2;grid.position.y=-.44;
 return grid;
}
