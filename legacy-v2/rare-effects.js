import * as THREE from './vendor/three.js';

// Local, pooled presentation. No game RNG, timers, colliders or external assets.
export function applyRareFoil(material,{clock,pattern},offset=new THREE.Vector3()){
 material.roughness=.2;material.metalness=.42;
 material.onBeforeCompile=shader=>{
  shader.uniforms.rareTime=clock;shader.uniforms.rareOffset={value:offset};shader.uniforms.rarePattern=pattern;shader.uniforms.rareFoilStrength={value:material.userData.rewardSurface?1.15:(material.map&&!material.userData.teamColorTexture)?.5:1};shader.uniforms.rareGlintStrength={value:material.userData.rewardSurface?.38:(material.map&&!material.userData.teamColorTexture)?.65:1};
  shader.vertexShader='uniform vec3 rareOffset; varying vec3 vRarePosition; varying vec3 vRareNormal; varying vec3 vRareLocalNormal; varying vec3 vRareView;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vRarePosition = position + rareOffset; vRareLocalNormal = normal; vRareNormal = normalize(normalMatrix * normal); vRareView = -(modelViewMatrix * vec4(position,1.0)).xyz;');
  shader.fragmentShader=`uniform float rareTime; uniform float rarePattern; uniform float rareFoilStrength; uniform float rareGlintStrength; varying vec3 vRarePosition; varying vec3 vRareNormal; varying vec3 vRareLocalNormal; varying vec3 vRareView;
   float rareHash(vec3 p){p=fract(p*0.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   vec2 rarePoint(vec2 p){return vec2(rareHash(vec3(p,1.0)),rareHash(vec3(p,7.0)));}
   vec3 rareFacet(vec2 p){
    vec2 cell=floor(p),local=fract(p),chosen=cell;float nearest=9.0,second=9.0;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
     vec2 offset=vec2(float(x),float(y)),point=offset+rarePoint(cell+offset)-local;float distance2=dot(point,point);
     if(distance2<nearest){second=nearest;nearest=distance2;chosen=cell+offset;}else second=min(second,distance2);
    }
    return vec3(chosen,max(0.0,sqrt(second)-sqrt(nearest)));
   }
  `+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 axis=abs(vRareLocalNormal);vec2 position=axis.y>=max(axis.x,axis.z)?vRarePosition.xz:axis.x>axis.z?vRarePosition.zy:vRarePosition.xy;vec3 polygon;float occupied=1.0,edge=1.0;
   if(rarePattern<0.5){
    polygon=rareFacet(position*5.3);edge=smoothstep(0.008,0.055,polygon.z);
   }else if(rarePattern<1.5){
    vec2 p=mat2(1.0,0.0,0.57735,1.1547)*position*7.0,cell=floor(p),f=fract(p);
    float triangle=step(f.y,f.x);polygon=vec3(cell+vec2(triangle*0.37,triangle*0.71),1.0);edge=smoothstep(0.008,0.05,abs(f.x-f.y));
   }else{
    vec2 p=mat2(0.7071,0.7071,-0.7071,0.7071)*position*7.0,cell=floor(p),f=fract(p);
    polygon=vec3(cell,1.0);float border=min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));edge=smoothstep(0.008,0.04,border);
   }
   float seed=rareHash(vec3(polygon.xy,3.0));
   vec3 viewRay=normalize(vRareView),surfaceNormal=normalize(vRareNormal);
   vec3 facet=normalize(surfaceNormal+vec3(rareHash(vec3(polygon.xy,4.0))-0.5,rareHash(vec3(polygon.xy,5.0))-0.5,rareHash(vec3(polygon.xy,6.0))-0.5)*1.3);
   float facing=dot(viewRay,facet);
   float hue=fract(seed+facing*2.35+rareTime*0.012);
   vec3 spectrum=clamp(abs(fract(hue+vec3(0.0,0.666667,0.333333))*6.0-3.0)-1.0,0.0,1.0);
   vec3 rainbow=0.20+0.72*spectrum;
   float shimmerPhase=rareTime*(1.25+seed*2.2)+seed*19.0;
   float shine=pow(max(0.0,sin(facing*29.0+shimmerPhase)),20.0);
   float foil=occupied*(0.44+0.16*seed)*mix(0.72,1.0,edge);
   ${material.userData.rewardSurface?'diffuseColor.rgb=mix(diffuseColor.rgb,mix(diffuseColor.rgb*(0.18+1.65*rainbow),rainbow*0.28,0.10),min(0.88,foil*rareFoilStrength));diffuseColor.rgb*=mix(0.89,1.0,edge);':'diffuseColor.rgb=mix(diffuseColor.rgb,rainbow,foil*rareFoilStrength);'}
   diffuseColor.rgb+=vec3(shine*occupied*edge*0.65*rareGlintStrength);
  `);
 };
 material.customProgramCacheKey=()=> 'moji-scout-hologram-v11-'+Boolean(material.userData.rewardSurface);material.needsUpdate=true;
}
export function createRareEffect(group,primaryMaterial,glyphMesh,glyph,{pattern=0,sparkles=true,sideMaterial=null}={}){
 const clock={value:0},patternUniform={value:pattern};
 for(const material of new Set([primaryMaterial,sideMaterial].filter(Boolean)))applyRareFoil(material,{clock,pattern:patternUniform});
 const shape=new THREE.Shape();
 for(let i=0;i<8;i++){const angle=i*Math.PI/4,r=i%2?.19:1,x=Math.sin(angle)*r,y=Math.cos(angle)*r;if(i)shape.lineTo(x,y);else shape.moveTo(x,y);}shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.06,bevelEnabled:false,steps:1}),starMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 const stars=new THREE.InstancedMesh(geometry,starMaterial,24);stars.name='rare-sparkles';stars.frustumCulled=false;stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(stars);
 const transform=new THREE.Object3D(),colour=new THREE.Color(),matrix=new THREE.Matrix4(),inverse=new THREE.Matrix4(),current=new THREE.Vector3(),previous=new THREE.Vector3(),delta=new THREE.Vector3(),cameraRotation=new THREE.Quaternion(),roll=new THREE.Quaternion(),forward=new THREE.Vector3(0,0,1);
 const spreadRadius=Math.max(.65,Math.min(1.4,glyph.radius*.75));
 const particles=Array.from({length:24},()=>({position:new THREE.Vector3(),age:1,life:.72,seed:0}));let elapsed=0,initial=false,carry=0,serial=0,cursor=0;
 stars.count=0;
 const effect={clock,stars,pattern:patternUniform,update(dt,reduced=false,light=false,camera=null){
  const step=Math.max(0,Math.min(.1,dt));elapsed+=reduced?0:step;clock.value=elapsed;
  group.updateWorldMatrix(true,false);current.setFromMatrixPosition(group.matrixWorld);
  const visible=sparkles&&group.visible&&glyphMesh.visible&&Math.abs(group.matrixWorld.determinant())>1e-8;
  if(!initial||!visible||reduced){previous.copy(current);initial=true;carry=0;for(const p of particles)p.age=p.life;stars.count=0;stars.visible=false;return;}
  for(const p of particles)p.age+=step;
  delta.subVectors(current,previous);const distance=delta.length(),capacity=light?8:24,spacing=light?.26:.12;
  // Leave fixed world-space marks along actual translation, never from spin alone.
  if(step>0&&distance>1e-5&&distance<6){
   let along=spacing-carry;
   for(let n=0;along<=distance&&n<capacity;n++,along+=spacing){
    const p=particles[cursor++%capacity],seed=serial++;
    p.position.copy(previous).addScaledVector(delta,along/distance);
    const scatter=spreadRadius*Math.sqrt(.2+.8*(.5+.5*Math.sin(seed*12.9898))),angle=seed*2.399963;
    p.position.x+=Math.cos(angle)*scatter;p.position.z+=Math.sin(angle)*scatter;p.position.y+=.14+(seed%5)*.055;
    p.age=step*(1-along/distance);p.life=.65+(seed%5)*.055;p.seed=seed;
   }
   carry=(carry+distance)%spacing;
  }else if(distance>=6||step===0)carry=0;
  previous.copy(current);inverse.copy(group.matrixWorld).invert();if(camera)camera.getWorldQuaternion(cameraRotation);else cameraRotation.identity();let count=0;
  for(let i=0;i<capacity;i++){
   const p=particles[i];if(p.age>=p.life)continue;
   const fade=1-p.age/p.life,scale=(.10+(p.seed%3)*.025)*(.65+.35*fade);
   transform.position.copy(p.position);transform.quaternion.copy(cameraRotation).multiply(roll.setFromAxisAngle(forward,p.seed*2.399963));transform.scale.setScalar(scale);transform.updateMatrix();matrix.multiplyMatrices(inverse,transform.matrix);stars.setMatrixAt(count,matrix);
   colour.setHSL((p.seed*.129)%1,.32,.78).multiplyScalar(fade*fade);stars.setColorAt(count,colour);count++;
  }
  stars.count=count;stars.visible=count>0;stars.instanceMatrix.needsUpdate=true;if(stars.instanceColor)stars.instanceColor.needsUpdate=true;
 }};
 effect.update(0);return effect;
}
