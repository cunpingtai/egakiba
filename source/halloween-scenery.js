import * as THREE from './vendor/three.js';
import {CONFIG} from './config.js';
import {makeArenaSurface} from './physics.js';
import {stageHeight,stageSurfaceHeight,stageRadius,stageWallTop} from './stages.js';
const mesh=(geometry,color,roughness=.8)=>new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness}));
function shapeMesh(points,color){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));}
function pumpkin(){
 const group=new THREE.Group(),g=new THREE.SphereGeometry(.48,20,12),position=g.attributes.position;
 for(let i=0;i<position.count;i++){const x=position.getX(i),z=position.getZ(i),lobe=1+.07*Math.cos(Math.atan2(z,x)*8);position.setXYZ(i,x*lobe,position.getY(i)*.88,z*lobe);}g.computeVertexNormals();
 group.add(mesh(g,0xef861d,.58));const stem=mesh(new THREE.CylinderGeometry(.055,.075,.19,6),0x4f652d);stem.position.y=.47;stem.rotation.z=-.18;group.add(stem);
 for(const x of [-.17,.17]){const eye=shapeMesh([[-.085,0],[0,.13],[.085,0]],0x24142e);eye.position.set(x,.03,.445);group.add(eye);}
 const nose=shapeMesh([[-.05,0],[0,.075],[.05,0]],0x24142e);nose.position.set(0,-.035,.482);group.add(nose);
 const mouth=shapeMesh([[-.28,0],[-.20,-.17],[-.07,-.21],[-.07,-.15],[.04,-.15],[.04,-.21],[.20,-.17],[.28,0],[.12,-.06],[.12,-.11],[.03,-.11],[.03,-.075],[-.12,-.06],[-.12,-.11],[-.2,-.08]],0x24142e);mouth.position.set(0,-.09,.43);group.add(mouth);return group;
}
function grave(){
 const group=new THREE.Group(),shape=new THREE.Shape();shape.moveTo(-.47,-.53);shape.lineTo(.47,-.53);shape.lineTo(.47,.22);shape.quadraticCurveTo(.47,.6,0,.6);shape.quadraticCurveTo(-.47,.6,-.47,.22);shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:.44,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:1,steps:1});g.translate(0,0,-.22);const stone=mesh(g,0x8d91a1);stone.castShadow=true;group.add(stone);
 for(const [w,h] of [[.07,.42],[.3,.07]]){const cross=mesh(new THREE.BoxGeometry(w,h,.025),0x454351);cross.position.set(0,.15,.26);group.add(cross);}return group;
}
function webMesh(stage,patch){
 const points=[],r=patch.radius,center=patch;const v=(radius,angle)=>new THREE.Vector3(center.x+Math.cos(angle)*radius,stageSurfaceHeight(stage,center.x+Math.cos(angle)*radius,center.z+Math.sin(angle)*radius)+.028,center.z+Math.sin(angle)*radius);
 for(let i=0;i<12;i++)points.push(v(0,0),v(r,i*Math.PI/6));
 for(let ring=1;ring<=5;ring++)for(let sector=0;sector<12;sector++)for(let j=0;j<8;j++){const a=(sector+j/8)*Math.PI/6,b=(sector+(j+1)/8)*Math.PI/6;points.push(v(r*ring/5*(1-.12*Math.sin(j/8*Math.PI)),a),v(r*ring/5*(1-.12*Math.sin((j+1)/8*Math.PI)),b));}
 const group=new THREE.Group();group.name='slowing-web';
 for(const [width,color,height] of [[.052,0x302d36,.042],[.030,0xffffff,.046]]){const vertices=[];for(let i=0;i<points.length;i+=2){const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),ox=-dz/length*width,oz=dx/length*width;const corners=[[a.x+ox,a.z+oz],[a.x-ox,a.z-oz],[b.x-ox,b.z-oz],[b.x+ox,b.z+oz]];for(const n of [0,1,2,0,2,3]){const [x,z]=corners[n];vertices.push(x,stageSurfaceHeight(stage,x,z)+height,z);}}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const layer=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));layer.name=color===0xffffff?'web-white':'web-outline';group.add(layer);}
 return group;
}
// Baked-in shader coordinates keep the stone paving to one floor draw, without textures.
function stoneMaterial(color){
 const material=new THREE.MeshStandardMaterial({color,roughness:.94});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 vStoneFloor;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStoneFloor=position.xz;');
  shader.fragmentShader='varying vec2 vStoneFloor;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 stoneP=vStoneFloor/vec2(1.12,.74);
   float row=floor(stoneP.y);stoneP.x+=mod(row,2.0)*.5;
   vec2 cell=floor(stoneP),local=fract(stoneP);
   float seed=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
   float edge=min(min(local.x,1.0-local.x),min(local.y,1.0-local.y));
   float grout=smoothstep(.022,.060,edge);
   float bevel=smoothstep(.06,.14,edge);
   float grain=sin(vStoneFloor.x*47.0+sin(vStoneFloor.y*31.0))*sin(vStoneFloor.y*53.0)*.015;
   diffuseColor.rgb*=mix(.30,mix(.78,.98,seed)+grain,grout)*( .92+.08*bevel );`);
 };
 material.customProgramCacheKey=()=> 'halloween-stone-v1';return material;
}
function magicCircle(stage){
 const radius=stageRadius(stage),points=[],inks=[],royal=stage.id==='halloween-moon';let ink=new THREE.Color(royal?0x4f286b:0x634478);
 const vertex=(x,z)=>new THREE.Vector3(x,stageSurfaceHeight(stage,x,z)+.04,z);
 const line=(r1,a1,r2,a2)=>{const x1=Math.cos(a1)*r1,z1=Math.sin(a1)*r1,x2=Math.cos(a2)*r2,z2=Math.sin(a2)*r2,n=royal?Math.max(1,Math.ceil(Math.hypot(x2-x1,z2-z1)/.3)):1;for(let j=0;j<n;j++){points.push(vertex(x1+(x2-x1)*j/n,z1+(z2-z1)*j/n),vertex(x1+(x2-x1)*(j+1)/n,z1+(z2-z1)*(j+1)/n));inks.push(ink);}};
 for(const ratio of [.82,.855,.965])for(let i=0;i<192;i++)line(radius*ratio,i/192*Math.PI*2,radius*ratio,(i+1)/192*Math.PI*2);
 for(let i=0;i<24;i++){const a=i*Math.PI/12,w=.036;line(radius*.88,a-w,radius*.94,a);line(radius*.94,a,radius*.88,a+w);line(radius*.88,a+w,radius*.88,a-w);if(i%2===0)line(radius*.90,a-w,radius*.90,a+w);else line(radius*.86,a,radius*.95,a);}
 if(royal){
  ink=new THREE.Color(0xae711b);
  for(const ratio of [.24,.28,.57,.62])for(let i=0;i<128;i++)line(radius*ratio,i*Math.PI/64,radius*ratio,(i+1)*Math.PI/64);
  for(let triangle=0;triangle<2;triangle++)for(let i=0;i<3;i++)line(radius*.57,triangle*Math.PI/3+i*Math.PI*2/3,radius*.57,triangle*Math.PI/3+(i+1)*Math.PI*2/3);
  for(let i=0;i<16;i++)line(radius*(i%2?.14:.23),i*Math.PI/8,radius*(i%2?.23:.14),(i+1)*Math.PI/8);
  for(let i=0;i<48;i++){const a=i*Math.PI/24;line(radius*.65,a,radius*(i%4===0?.70:.68),a);}
 }
 const vertices=[],colors=[];for(let i=0;i<points.length;i+=2){const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),width=royal?.026:.018,ox=-dz/length*width,oz=dx/length*width,c=inks[i/2];const corners=[[a.x+ox,a.z+oz],[a.x-ox,a.z-oz],[b.x-ox,b.z-oz],[b.x+ox,b.z+oz]];for(const n of [0,1,2,0,2,3]){const [x,z]=corners[n];vertices.push(x,stageSurfaceHeight(stage,x,z)+.04,z);colors.push(c.r,c.g,c.b);}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const lines=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.82,depthWrite:false}));lines.name='magic-circle';return lines;
}
// Four static lanterns share three batched draws. Emission/glow add no real lights.
function cornerLanterns(stage){
 const group=new THREE.Group();group.name='halloween-lanterns';const metal=[],glass=[],glow=[],radius=stageRadius(stage);
 function add(target,geometry,x,y,z,ry=0,rx=0){const source=geometry.index?geometry.toNonIndexed():geometry;if(source!==geometry)geometry.dispose();source.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,0)),new THREE.Vector3(1,1,1)));target.push(source);}
 const positions=[];
 for(const side of [-1,1])for(const back of [true,false]){const middle=stage.surfaceScale===1.2,x=side*(radius*(back?.5:middle?.65:.45)+.12),z=radius*(back?-1.48:middle?.84:stage.fitArena?.99:1.02)+(back?-.3:.08);
  positions.push({x,z});add(metal,new THREE.BoxGeometry(.76,.12,.76),x,-.34,z);
  add(glass,new THREE.BoxGeometry(.58,.70,.58),x,.08,z);
  for(const dx of [-.32,.32])for(const dz of [-.32,.32])add(metal,new THREE.BoxGeometry(.055,.76,.055),x+dx,.08,z+dz);
  add(metal,new THREE.BoxGeometry(.74,.09,.74),x,.48,z);
  add(metal,new THREE.CylinderGeometry(0,.56,.30,4),x,.66,z,Math.PI/4);
  add(metal,new THREE.TorusGeometry(.14,.028,5,12),x,.96,z);
  // Jack-o'-lantern face on the forward glass panel.
  for(const dx of [-.15,.15]){const shape=new THREE.Shape();shape.moveTo(-.08,0);shape.lineTo(0,.12);shape.lineTo(.08,0);shape.closePath();add(metal,new THREE.ShapeGeometry(shape),x+dx,.10,z+.297);}
  const mouth=new THREE.Shape();mouth.moveTo(-.21,0);mouth.lineTo(-.14,-.12);mouth.lineTo(.14,-.12);mouth.lineTo(.21,0);mouth.lineTo(.07,-.04);mouth.lineTo(0,-.01);mouth.lineTo(-.07,-.04);mouth.closePath();add(metal,new THREE.ShapeGeometry(mouth),x,-.045,z+.297);
  add(glow,new THREE.PlaneGeometry(1.5,1.5),x,.16,z,0,-Math.PI/4);
  add(glow,new THREE.PlaneGeometry(2,2),x,-.435,z,0,-Math.PI/2);
 }
 function batch(parts,material,name){const attributes={position:[],normal:[],uv:[]};for(const part of parts){for(const name of Object.keys(attributes))attributes[name].push(...part.attributes[name].array);part.dispose();}const geometry=new THREE.BufferGeometry();for(const [name,values] of Object.entries(attributes))geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,name==='uv'?2:3));const object=new THREE.Mesh(geometry,material);object.name=name;group.add(object);}
 batch(metal,new THREE.MeshStandardMaterial({color:0x281c31,roughness:.72}),'lantern-frames');
 batch(glass,new THREE.MeshStandardMaterial({color:0xffa42d,emissive:0xff8318,emissiveIntensity:2,roughness:.7}),'lantern-windows');
 batch(glow,new THREE.ShaderMaterial({vertexShader:'varying vec2 vGlow;void main(){vGlow=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vGlow;void main(){float r=length(vGlow-.5)*2.;float glow=pow(max(0.,1.-r),2.);gl_FragColor=vec4(1.,.29,.035,glow*.46);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}),'lantern-glow');
 group.userData.positions=positions;return group;
}
export function createHalloweenArena(stage,battle){
 const group=new THREE.Group();group.name=stage.id;const radius=stageRadius(stage),top=stageWallTop(stage.baseStage),surface=makeArenaSurface(96,32,stage),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(surface.vertices,3));geometry.setIndex(new THREE.BufferAttribute(surface.indices,1));geometry.computeVertexNormals();
 const colors={'halloween-pumpkins':0xc2afa1,'halloween-webs':0xb8a9c6,'halloween-graves':0xaeb9b4,'halloween-candy':0xd3c8b6};
 const floor=new THREE.Mesh(geometry,stoneMaterial(stage.floorColor??colors[stage.id]??0xbab0c4));floor.name='halloween-floor';floor.receiveShadow=true;group.add(floor);group.add(magicCircle(stage));group.add(cornerLanterns(stage));
 const shell=mesh(new THREE.CylinderGeometry(radius,radius,top+.32,64,1,true),0x493253);shell.position.y=(top-.32)/2;group.add(shell);
 const rim=mesh(new THREE.TorusGeometry(radius,.065,6,96),stage.rimColor??0x75469b);rim.rotation.x=Math.PI/2;rim.position.y=top+.015;group.add(rim);
 {for(const ratio of [.36,.72]){const r=radius*ratio,ring=mesh(new THREE.TorusGeometry(r,.012,5,96),0xd2dce5);ring.name='floor-marking';ring.rotation.x=Math.PI/2;ring.position.y=stageHeight(stage,r)-.001;group.add(ring);}}
 for(const patch of stage.webs||[])group.add(webMesh(stage,patch));
 const props=new Map(),fragments=[];
 for(const prop of battle.props||[]){const object=prop.kind==='pumpkin'?pumpkin():grave();if(prop.kind==='pumpkin')object.scale.setScalar(prop.size||1);object.traverse(o=>{if(o.isMesh)o.castShadow=true;});props.set(prop.id,object);group.add(object);}
 function breakGrave(prop,object){object.visible=false;for(let i=0;i<8;i++){
  const shard=mesh(new THREE.BoxGeometry(.24,.28,.22),0x8d91a1);shard.material.transparent=true;const p=object.position.clone().add(new THREE.Vector3((i%2-.5)*.45,(Math.floor(i/2)%2-.5)*.5,(Math.floor(i/4)-.5)*.22).applyQuaternion(object.quaternion));
  const points=Array.from(shard.geometry.attributes.position.array);const body=battle.addDebris({position:p,rotation:object.quaternion.clone(),velocity:{x:(i%2-.5)*2,y:1.4,z:(Math.floor(i/4)-.5)*2},spin:{x:2,y:i,z:-2},shapes:[points]});shard.position.copy(p);group.add(shard);fragments.push({mesh:shard,body,age:0});
 }}
 return {group,update(dt){
  for(const prop of battle.props||[]){const object=props.get(prop.id);if(prop.destroyed){if(object.visible)breakGrave(prop,object);continue;}object.position.copy(prop.body.translation());object.quaternion.copy(prop.body.rotation());}
  for(let i=fragments.length-1;i>=0;i--){const f=fragments[i];f.age+=dt;f.mesh.position.copy(f.body.translation());f.mesh.quaternion.copy(f.body.rotation());if(f.age>1.4){f.mesh.material.transparent=true;f.mesh.material.opacity=Math.max(0,(2-f.age)/.6);}if(f.age>=2){battle.removeDebris(f.body);f.mesh.removeFromParent();f.mesh.geometry.dispose();f.mesh.material.dispose();fragments.splice(i,1);}}
 },dispose(){for(const f of fragments)battle.removeDebris(f.body);fragments.length=0;group.removeFromParent();group.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});}};
}
