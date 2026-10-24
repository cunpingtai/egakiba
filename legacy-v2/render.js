import {setArenaLighting} from './arena-lighting.js';
import {fittedArenaFov} from './arena-framing.js';
import {createHalloweenArena} from './halloween-scenery.js';
import {rewardMaterial,createRewardSurface,rewardBoundsFor,disposeRewardEnvironment} from './reward-surface.js';
import {skinById} from './skin-catalog.js';
import {createSkinEffect,applySkinFinish} from './skin-effects.js';
import {smoothGlyphGeometry,smoothFragmentGeometry} from './raster-display.js';
import {createGoldEffect,applyGoldFinish} from './gold-effects.js';
import {createRainbowEffect,applyRainbowFinish} from './rainbow-effects.js';
import {createRareEffect,applyRareFoil} from './rare-effects.js';
import {TopPresence} from './top-presence.js';
import * as THREE from './vendor/three.js';
import { AppRenderResources, filterInPlace, batchGlyphGeometry } from './app-render-resources.js';
import { simplifyGlyphGeometry } from './app-glyph-detail.js';
import { makeStableGrid } from './app-grid.js';
import { CONFIG, bowlHeight } from './config.js';
import { makeArenaSurface } from './physics.js';
import { DRIVER_TIERS, driverMesh } from './driver.js';
import { fracturePieces } from './fracture.js';
import { RENDER_QUALITIES } from './render-recovery.js';
import { createStageBoards, createBowlArena, createSquareArena, createRotatingFloor } from './stage-boards.js';
import { getStage, stageHeight, stageRadius } from './stages.js';
import { BoostTrails } from './boost-trails.js';
const COLORS=[new THREE.Color(skinById('blue').color).getHex(),new THREE.Color(skinById('red').color).getHex()];
function fragmentMaterials(mesh){return Array.isArray(mesh.material)?mesh.material:[mesh.material];}
function texturedGlyph(glyph){
 const source=smoothGlyphGeometry(glyph),geometry=source===glyph.geometry?source.clone():source,position=geometry.attributes.position,uv=geometry.attributes.uv,span=glyph.textureScale*glyph.textureSize;
 for(const group of geometry.groups)if(group.materialIndex===0)for(let i=group.start;i<group.start+group.count;i++){
  const vertex=geometry.index?geometry.index.getX(i):i,x=position.getX(vertex),z=position.getZ(vertex);
  uv.setXY(vertex,.5+(x+glyph.centroid.x)/span,.5+(z-glyph.centroid.y)/span);
 }
 uv.needsUpdate=true;
 const texture=new THREE.CanvasTexture(glyph.textureSource);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
 return {geometry,texture};
}
export function createTopResources(){return new AppRenderResources();}
export function disposeTopVisual(group){group?.userData.rewardSurface?.dispose();group?.traverse(o=>{if(o.isMesh){if(!o.userData.sharedGeometry)o.geometry.dispose();if(!o.userData.sharedMaterial)for(const material of Array.isArray(o.material)?o.material:[o.material]){material.map?.dispose();material.dispose();}}});}
export function createTopVisual(top,color=0x3578ed,resources=null){
   const skin=top.skin&&(!top.glyph.textureSource||top.glyph.teamColorTexture)?top.skin:null;if(skin)color=new THREE.Color(skin.color).getHex();const surfaceSkin=skin&&skin.kind!=='plain'?skin:(!top.glyph.textureSource||top.glyph.teamColorTexture)?top.rainbow?skinById('rainbow'):top.gold?skinById('gold'):null:null;
   const group=new THREE.Group(),textured=top.glyph.textureSource?texturedGlyph(top.glyph):null;const material=rewardMaterial(surfaceSkin,{color:textured&&!top.glyph.teamColorTexture?0xffffff:color,map:textured?.texture||null,roughness:.33,metalness:textured?0:.12,transparent:Boolean(textured)});material.userData.teamColorTexture=top.glyph.teamColorTexture===true;const side=rewardMaterial(surfaceSkin,{color:new THREE.Color(color).multiplyScalar(.56),roughness:.5,metalness:.12});side.userData.skinSide=true;const visualGeometry=textured?.geometry||smoothGlyphGeometry(top.glyph),sourceGeometry=visualGeometry===top.glyph.geometry&&!top.glyph.rare?simplifyGlyphGeometry(top.glyph):visualGeometry,drawGeometry=batchGlyphGeometry(sourceGeometry);if(sourceGeometry!==top.glyph.geometry&&drawGeometry!==sourceGeometry)sourceGeometry.dispose();const mesh=new THREE.Mesh(drawGeometry,[material,side]);mesh.name='glyph';mesh.userData.sharedGeometry=drawGeometry===top.glyph.geometry;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
   for(const tier of DRIVER_TIERS){const {geometry,material}=resources.driver(tier);const driver=new THREE.Mesh(geometry,material);driver.visible=false;driver.userData.sharedGeometry=true;driver.userData.sharedMaterial=true;driver.userData.driverPart=true;driver.castShadow=true;driver.receiveShadow=true;group.add(driver);}
   const assembly=resources.driverAssembly(),assemblyMesh=new THREE.Mesh(assembly.geometry,assembly.materials);assemblyMesh.name='driver-assembly';assemblyMesh.castShadow=true;assemblyMesh.receiveShadow=true;assemblyMesh.userData.sharedGeometry=true;assemblyMesh.userData.sharedMaterial=true;group.add(assemblyMesh);
   const tipResources=resources.tip(),tip=new THREE.Mesh(tipResources.geometry,tipResources.material);tip.userData.sharedGeometry=true;tip.userData.sharedMaterial=true;tip.userData.driverPart=true;tip.position.y=-CONFIG.tipLength;tip.castShadow=true;group.add(tip);
   const marker=new THREE.Group();const dot=new THREE.Mesh(new THREE.CircleGeometry(.075,16),new THREE.MeshBasicMaterial({color:0x23395d,depthTest:false}));dot.rotation.x=-Math.PI/2;dot.position.y=-.001;marker.add(dot);for(let i=0;i<2;i++){const line=new THREE.Mesh(new THREE.BoxGeometry(.16,.009,.025),new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false}));line.rotation.y=i*Math.PI/2;marker.add(line);}marker.position.y=CONFIG.thickness/2+.015;marker.name='centroid';group.add(marker);
   material.userData.rewardSurface=side.userData.rewardSurface=Boolean(surfaceSkin);if(top.glyph.rare)group.userData.rareEffect=createRareEffect(group,material,mesh,top.glyph,{sideMaterial:side});group.userData.effectColors=skin?.colors||[color];if(skin)group.userData.skinColor=color;if(skin&&!['plain','gold','rainbow'].includes(skin.kind))group.userData.skinEffect=createSkinEffect([material,side],skin,rewardBoundsFor(mesh.geometry));if(top.rainbow||skin?.id==='rainbow')group.userData.rainbowEffect=createRainbowEffect([material,side],rewardBoundsFor(mesh.geometry));else if(top.gold||skin?.id==='gold')group.userData.goldEffect=createGoldEffect([material,side]);if(surfaceSkin)group.userData.rewardSurface=createRewardSurface(mesh,surfaceSkin);return group;

}
export function fragmentLaunchMotion(offset,motion={x:0,y:0,z:0},reduced=false){
 const scatter=reduced?.18:1,angle=Math.atan2(offset.z,offset.x)+(Math.random()-.5)*1.2,speed=(1.3+Math.random()*1.1)*scatter;
 return {velocity:new THREE.Vector3(Math.cos(angle)*speed+motion.x*.2,(2+Math.random()*1.8)*scatter,Math.sin(angle)*speed+motion.z*.2),spin:new THREE.Vector3((Math.random()-.5)*6,(Math.random()-.5)*6,(Math.random()-.5)*6).multiplyScalar(scatter)};
}
export function shatterTopVisual(top,group,{color=0x3578ed,addFragment}){
  group.getObjectByName('glyph').visible=false;group.getObjectByName('driver-assembly').visible=false;group.updateMatrixWorld(true);
  const sourceGlyph=group.getObjectByName('glyph'),rareEffect=top.glyph.rare?group.userData.rareEffect:null,goldEffect=group.userData.goldEffect,rainbowEffect=group.userData.rainbowEffect,skinEffect=group.userData.skinEffect;
  for(const piece of fracturePieces(top.glyph.triangles)){
   const positions=[],h=CONFIG.thickness/2,c=piece.center,edges=new Map();
   const pointKey=p=>`${p.x.toFixed(7)},${p.y.toFixed(7)}`;
   const vertex=(p,y)=>[p.x-c.x,y,-(p.y-c.y)];
   const triangle=(a,b,c)=>positions.push(...a,...b,...c);
   for(const t of piece.triangles){
    const upper=t.map(p=>vertex(p,h)),lower=t.map(p=>vertex(p,-h));
    triangle(...upper);triangle(lower[2],lower[1],lower[0]);
    for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],key=`${pointKey(a)}:${pointKey(b)}`,reverse=`${pointKey(b)}:${pointKey(a)}`;if(edges.has(reverse))edges.delete(reverse);else edges.set(key,[a,b]);}
   }
   const capVertices=positions.length/3;
   // Only exposed contour edges need side walls, not triangulation seams.
   for(const [a,b] of edges.values()){
    const upperA=vertex(a,h),upperB=vertex(b,h),lowerA=vertex(a,-h),lowerB=vertex(b,-h);
    triangle(upperA,lowerA,upperB);triangle(upperB,lowerA,lowerB);
   }
   const smoothed=smoothFragmentGeometry(top.glyph,piece),geometry=smoothed||new THREE.BufferGeometry();if(!smoothed){geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();}
   let material;
   if(rareEffect||goldEffect||rainbowEffect||skinEffect||smoothed||top.glyph.textureSource){
    const source=Array.isArray(sourceGlyph.material)?sourceGlyph.material:[sourceGlyph.material,sourceGlyph.material];
    material=source.map(face=>{const copy=face.clone();copy.transparent=true;if(rareEffect)applyRareFoil(copy,rareEffect,new THREE.Vector3(c.x,0,-c.y));if(skinEffect)applySkinFinish(copy,skinEffect,new THREE.Vector3(c.x,0,-c.y));if(rainbowEffect)applyRainbowFinish(copy,rainbowEffect,new THREE.Vector3(c.x,0,-c.y));else if(goldEffect)applyGoldFinish(copy,goldEffect,new THREE.Vector3(c.x,0,-c.y));group.userData.rewardSurface?.apply(copy,new THREE.Vector3(c.x,0,-c.y));return copy;});
    if(!smoothed){geometry.addGroup(0,capVertices,0);geometry.addGroup(capVertices,positions.length/3-capVertices,1);}
    if(material[0].map){const uv=[],span=top.glyph.textureScale*top.glyph.textureSize,vertices=geometry.attributes.position;for(let i=0;i<vertices.count;i++)uv.push(.5+(vertices.getX(i)+c.x+top.glyph.centroid.x)/span,.5+(vertices.getZ(i)-c.y-top.glyph.centroid.y)/span);geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));}
   }else material=new THREE.MeshStandardMaterial({color:group.userData.skinColor??color,roughness:.4,metalness:.12,transparent:true});
   const mesh=new THREE.Mesh(geometry,material);group.userData.rewardSurface?.bind(mesh);mesh.userData.fragmentKind='glyph';
   const key=p=>`${p.x.toFixed(7)},${p.y.toFixed(7)}`,vertices=new Set(piece.triangles.flat().map(key));
   const shapes=top.glyph.parts.filter(poly=>poly.some(p=>vertices.has(key(p)))).map(poly=>[-h,h].flatMap(y=>poly.flatMap(p=>vertex(p,y))));
   addFragment(mesh,new THREE.Vector3(c.x,0,-c.y),shapes);
  }
  for(const part of group.children.filter(child=>child.userData.driverPart)){
   part.visible=false;
   const geometry=part.geometry.clone();geometry.computeBoundingBox();
   const center=geometry.boundingBox.getCenter(new THREE.Vector3());geometry.translate(-center.x,-center.y,-center.z);
   const material=part.material.clone();material.transparent=true;
   const mesh=new THREE.Mesh(geometry,material);mesh.userData.fragmentKind='driver';
   addFragment(mesh,center.add(part.position),[Array.from(geometry.attributes.position.array)]);
  }
}
export class ArenaView {
 constructor(canvas,quality=RENDER_QUALITIES[0],{goldFor=()=>false,rainbowFor=()=>false,skinFor=()=>null}={}) {
  this.goldFor=goldFor;this.rainbowFor=rainbowFor;this.skinFor=skinFor;
  this.canvas=canvas;this.quality=quality;this.renderer=this.createRenderer(canvas,quality);this.renderResources=new AppRenderResources();this.sparkPool=[];this.interpolatedRotation=new THREE.Quaternion();
  this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0xb4b6b9,22,48);this.camera=new THREE.PerspectiveCamera(43,1,.1,70);this.camera.position.set(0,CONFIG.cameraHeight,CONFIG.cameraDistance);this.camera.lookAt(0,0,0);
  const ambient=new THREE.HemisphereLight(0xffffff,0x8e9cae,1.1);this.scene.add(ambient);const sun=new THREE.DirectionalLight(0xffffff,2.8);sun.position.set(-5,13,6);sun.castShadow=true;sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:1,far:28});sun.shadow.bias=-.0006;sun.shadow.normalBias=.012;this.scene.add(sun);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0xa5a7ab,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.45;floor.receiveShadow=true;this.scene.add(floor);
  const grid=makeStableGrid();this.scene.add(grid);this.environment={ambient,sun,floor,grid};
  const arenaStart=this.scene.children.length;
  const rimHeight=bowlHeight(CONFIG.arenaRadius);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(CONFIG.arenaRadius,CONFIG.arenaRadius+.12,rimHeight+.32,96,1,true),new THREE.MeshStandardMaterial({color:0xd8dee4,roughness:.55}));base.position.y=(rimHeight-.32)/2;base.castShadow=true;base.receiveShadow=true;this.scene.add(base);
  const surface=makeArenaSurface();const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(surface.vertices,3));geom.setIndex(new THREE.BufferAttribute(surface.indices,1));geom.computeVertexNormals();
  const bowl=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color:0xfafcff,roughness:.53,side:THREE.DoubleSide}));bowl.receiveShadow=true;this.scene.add(bowl);
  for(const radius of [CONFIG.arenaRadius*.36,CONFIG.arenaRadius*.72,CONFIG.arenaRadius]) {const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,radius===CONFIG.arenaRadius?.045:.012,8,128),new THREE.MeshStandardMaterial({color:radius===CONFIG.arenaRadius?0xc7d0db:0xe1e7ed,roughness:.8}));ring.rotation.x=Math.PI/2;ring.position.y=bowlHeight(radius)+.012;this.scene.add(ring);}
  const ticks=new THREE.InstancedMesh(new THREE.BoxGeometry(.035,.018,1),new THREE.MeshStandardMaterial({color:0xbcc6d0}),24),tickTransform=new THREE.Object3D();
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;tickTransform.position.set(Math.sin(a)*(CONFIG.arenaRadius*.952),bowlHeight(CONFIG.arenaRadius*.952)+.016,Math.cos(a)*(CONFIG.arenaRadius*.952));tickTransform.rotation.y=a;tickTransform.scale.z=i%6===0?.26:.12;tickTransform.updateMatrix();ticks.setMatrixAt(i,tickTransform.matrix);}ticks.instanceMatrix.needsUpdate=true;this.scene.add(ticks);
  this.standardArena=new THREE.Group();for(const object of this.scene.children.slice(arenaStart))this.standardArena.add(object);this.scene.add(this.standardArena);
  const arrowShape=new THREE.Shape();arrowShape.moveTo(-.22,0);arrowShape.lineTo(.22,0);arrowShape.lineTo(.22,.66);arrowShape.lineTo(.5,.66);arrowShape.lineTo(0,1);arrowShape.lineTo(-.5,.66);arrowShape.lineTo(-.22,.66);arrowShape.closePath();
  const arrowGeometry=new THREE.ShapeGeometry(arrowShape);arrowGeometry.rotateX(-Math.PI/2);
  this.arrows=COLORS.map((color,index)=>{const arrow=new THREE.Mesh(arrowGeometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,depthTest:true,depthWrite:false}));arrow.position.set(0,.8,index===0?CONFIG.spawnRadius:-CONFIG.spawnRadius);arrow.renderOrder=0;arrow.visible=false;this.scene.add(arrow);return arrow;});
  this.sparkMesh=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false}),CONFIG.sparkCapacity);
  this.sparkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.sparkMesh.count=0;this.sparkMesh.frustumCulled=false;this.scene.add(this.sparkMesh);
  this.sparkTransform=new THREE.Object3D();this.sparkAxis=new THREE.Vector3(0,1,0);this.sparkDirection=new THREE.Vector3();
  this.boostTrails=new BoostTrails(this.scene);this.groups=[];this.sparks=[];this.shockwaves=[];this.bursts=[];this.fragments=[];this.shake=0;this.localIndex=0;this.viewTurn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);this.stageMotion=matchMedia('(prefers-reduced-motion: reduce)');this.reduced=this.stageMotion.matches;
  this.topPresence=new TopPresence({tipLength:CONFIG.tipLength,reduced:()=>this.stageMotion.matches});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);this.resize();
 }
 createRenderer(canvas,quality){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:quality.antialias,alpha:false});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,quality.pixelRatio));
  renderer.shadowMap.enabled=quality.shadows;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.setClearColor(this.stage?.halloween?0x16111f:0xb4b6b9);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.outputColorSpace=THREE.SRGBColorSpace;
  canvas.dataset.renderQuality=quality.id;return renderer;
 }
 rebuildRenderer(quality,bindCanvas){
  // A restored context on the same canvas retains its original antialias
  // attributes. A fresh canvas is needed to actually disable multisampling.
  const previous=this.renderer,next=this.canvas.cloneNode(false);next.width=next.height=1;
  this.canvas.replaceWith(next);this.canvas=next;bindCanvas(next);this.renderer=null;
  disposeRewardEnvironment(previous);previous?.dispose();previous?.forceContextLoss();
  // Render targets belong to the old context; scene/CPU geometry is reusable.
  this.scene.traverse(object=>{if(object.shadow){object.shadow.dispose();object.shadow.map=null;object.shadow.mapPass=null;}});
  this.quality=quality;this.renderer=this.createRenderer(next,quality);this.resize();
  this.renderer.render(this.scene,this.camera);
 }
 resize(){if(!this.renderer||!this.canvas?.parentElement)return;const {width,height}=this.canvas.parentElement.getBoundingClientRect();if(!width||!height)return;const size=this.renderer.getSize(this.resizeSize||(this.resizeSize=new THREE.Vector2()));if(size.x!==width||size.y!==height)this.renderer.setSize(width,height,false);const aspect=width/height,verticalFrame=width>850?8:5.7;this.camera.aspect=aspect;this.camera.fov=2*Math.atan(Math.max(verticalFrame,(stageRadius(this.stage||getStage())+(this.stage?.shape==='square'?2.5:.9))/aspect)/Math.hypot(CONFIG.cameraHeight,CONFIG.cameraDistance))*180/Math.PI;if(this.stage?.fitArena)this.camera.fov=fittedArenaFov({radius:stageRadius(this.stage)+.12,top:stageHeight(this.stage,stageRadius(this.stage))+.12,aspect,cameraHeight:CONFIG.cameraHeight,cameraDistance:CONFIG.cameraDistance,verticalFrame,margin:aspect>1?(this.stage.fitMarginLandscape??this.stage.fitMargin):this.stage.fitMargin});this.camera.updateProjectionMatrix();}
 colorFor(index){return COLORS[index===this.localIndex?0:1];}
 setBattle(battle,localIndex=0) {
  const stage=battle.stage||getStage();
  if(this.stageId!==stage.id){
   this.stageBoards?.dispose();this.stageBowl?.dispose();this.rotatingFloor?.dispose();
   this.stageBoards=createStageBoards(stage);this.stageBowl=stage.halloween?createHalloweenArena(stage,battle):stage.shape==='square'?createSquareArena(stage):(stage.bowlDepth||stage.rotatingFloor)?createBowlArena(stage):null;
   if(this.standardArena)this.standardArena.visible=!stage.halloween&&!stage.bowlDepth&&!stage.rotatingFloor&&stage.shape!=='square';
   for(const object of this.standardArena?.children||[])if(object.geometry?.type==='TorusGeometry')object.visible=!stage.rotatingFloor||object.geometry.parameters.radius>stage.rotatingFloor.radius;
   if(this.stageBowl)this.scene.add(this.stageBowl.group);if(this.stageBoards)this.scene.add(this.stageBoards.group);
   this.rotatingFloor=createRotatingFloor(stage);if(this.rotatingFloor)this.scene.add(this.rotatingFloor.group);
   this.stageId=stage.id;this.stage=stage;setArenaLighting(this,stage);this.resize();
  }
  this.localIndex=localIndex;
  this.topPresence?.clear();this.clearEffects();this.finishedBattle=null;
  for(const group of this.groups){this.scene.remove(group);disposeTopVisual(group);}
  this.groups=battle.tops.map((top,index)=>{const group=createTopVisual({...top,skin:this.skinFor?.(top,index,localIndex)||null,gold:this.goldFor?.(top,index,localIndex)||false,rainbow:this.rainbowFor?.(top,index,localIndex)||false},this.colorFor(index),this.renderResources);this.scene.add(group);return group;});this.draw(battle,1,0,true);
 }
 animateTops(indices,kind='enter'){return this.topPresence.animate(this.groups,indices,kind);}
 ropeHit(event){if(!this.stageMotion?.matches){this.stageBowl?.hit?.(event);if(event.otherSide!==undefined)this.stageBowl?.hit?.({...event,side:event.otherSide});}}
 boost(event){if(!this.stageMotion?.matches)this.boostTrails?.trigger(event.index,this.colorFor(event.index));}
 clearEffects(){
  this.boostTrails?.clear();this.stageBowl?.clear?.();
  for(const effect of this.fragments){if(effect.body)effect.battle.removeDebris(effect.body);this.scene.remove(effect.mesh);this.renderResources.disposeGeometry(effect.mesh.geometry);for(const material of fragmentMaterials(effect.mesh))material.dispose();}
  for(const effect of this.shockwaves){this.scene.remove(effect.mesh);this.renderResources.disposeGeometry(effect.mesh.geometry);effect.mesh.material.dispose();}
  for(const effect of this.bursts){this.scene.remove(effect.mesh);this.renderResources.disposeGeometry(effect.mesh.geometry);effect.mesh.material.dispose();}
  this.sparkPool.push(...this.sparks);this.fragments=[];this.sparks=[];this.shockwaves=[];this.bursts=[];this.sparkMesh.count=0;this.shake=0;
 }
 finish(battle){
  if(this.finishedBattle===battle)return false;this.finishedBattle=battle;let shattered=false;
  for(const top of battle.tops)if(['回転停止','転倒'].includes(battle.result.losses?.[top.index])){
   this.shatter(top,this.groups[top.index],battle);shattered=true;
  }
  return shattered;
 }
 shatter(top,group,battle){
  const sourceMotion=top.body.linvel(),motion=this.localIndex?{x:-sourceMotion.x,y:sourceMotion.y,z:-sourceMotion.z}:sourceMotion;
  shatterTopVisual(top,group,{color:this.colorFor(top.index),addFragment:(mesh,position,shapes)=>this.addFragment(mesh,position,group,motion,battle,shapes)});
  if(!this.reduced)this.shake=Math.max(this.shake,CONFIG.impactShake*.9);
 }
 addFragment(mesh,localPosition,group,motion,battle,shapes){
  const offset=localPosition.clone().applyQuaternion(group.quaternion);
  mesh.position.copy(group.position).add(offset);mesh.quaternion.copy(group.quaternion);mesh.castShadow=true;this.scene.add(mesh);
  const {velocity,spin}=fragmentLaunchMotion(offset,motion,this.reduced);
  const body=battle.addDebris({position:mesh.position,rotation:mesh.quaternion,velocity,spin,shapes});
  this.fragments.push({mesh,body,battle,age:0});
 }
 aim(angle,power,visible,index=0){const arrow=this.arrows[index];arrow.visible=visible;arrow.rotation.y=index===0?-angle:Math.PI+angle;arrow.position.z=index===0?CONFIG.spawnRadius:-CONFIG.spawnRadius;arrow.scale.set(.45+power*.85,1,1+power*2.4);arrow.position.y=stageHeight(this.stage||getStage(),CONFIG.spawnRadius)+CONFIG.tipLength-CONFIG.thickness/2-.04;}
 pointFromPointer(event){const r=this.canvas.getBoundingClientRect();const pointer=new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(pointer,this.camera);return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-(stageHeight(this.stage||getStage(),CONFIG.spawnRadius)+CONFIG.tipLength)),new THREE.Vector3());}
 hit(event){
  if(this.localIndex){event={...event,position:{x:-event.position.x,y:event.position.y,z:-event.position.z}};}
  const strong=this.reduced||event.critical||event.strength>=CONFIG.impactStrongThreshold;
  // Quadratic response keeps glancing contacts readable while making the
  // strongest collisions dramatically heavier.
  if(!this.reduced)this.shake=Math.max(this.shake,event.strength*(.06+event.strength*CONFIG.impactShake));
  const count=this.reduced?0:CONFIG.sparkCount+Math.round(event.strength*CONFIG.sparkExtraCount)+(event.critical?12:0);
  const criticalOwners=event.criticalAttackers?.length?event.criticalAttackers:[this.localIndex];
  const paletteFor=owner=>(this.groups?.[owner]?.userData.effectColors||[COLORS[owner===this.localIndex?0:1]]).map(color=>new THREE.Color(color));
  const palettes=event.critical?criticalOwners.map(paletteFor):[];
  const colors=event.critical?palettes.flatMap(palette=>palette.flatMap(color=>[color,color.clone().lerp(new THREE.Color(0xffffff),.35)])):[0xffffff,0xffd14b,0xff8a27];
  for(let i=0;i<count;i++){
   const angle=Math.random()*Math.PI*2,speed=(2.5+Math.random()*4)*(1+event.strength*.3),life=.22+Math.random()*.3;
   const size=event.critical?1.3:1;
   const spark=this.sparkPool.pop()||{position:new THREE.Vector3(),velocity:new THREE.Vector3(),color:new THREE.Color()};spark.position.copy(event.position);spark.life=spark.maxLife=life;spark.velocity.set(Math.cos(angle)*speed,1.5+Math.random()*4.5,Math.sin(angle)*speed);spark.width=(.025+Math.random()*.025)*size;spark.length=(.12+Math.random()*.22)*size;spark.color.set(colors[i%colors.length]);this.sparks.push(spark);
  }
  while(this.sparks.length>CONFIG.sparkCapacity)this.sparkPool.push(this.sparks.shift());
  if(strong){
   const waves=event.critical?palettes.flatMap((palette,index)=>
    [0,.055,.11].map((delay,i)=>[delay+index*.025,palette[i%palette.length].clone().lerp(new THREE.Color(0xffffff),i*.22)])):[[0,event.strength>.78?0xffffff:0xffca55],[.065,0x72c6ff]];
   for(const [delay,color] of this.reduced?waves.slice(0,1):waves){
    const geometry=this.renderResources.waveGeometry,material=new THREE.ShaderMaterial({
     uniforms:{uRadius:{value:this.reduced?.9:.34},uThickness:{value:event.critical?.17:.11},uColor:{value:new THREE.Color(color)},uOpacity:{value:.72}},
     vertexShader:`uniform float uRadius;uniform float uThickness;varying float vEdge;void main(){float base=length(position.xy);vEdge=clamp((base-.94)/.06,0.,1.);vec2 direction=normalize(position.xy);float radius=uRadius+(vEdge-.5)*uThickness;gl_Position=projectionMatrix*modelViewMatrix*vec4(direction*radius,position.z,1.);}`,
     fragmentShader:`uniform vec3 uColor;uniform float uOpacity;void main(){gl_FragColor=vec4(uColor,uOpacity);}`,
     transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:event.critical?THREE.NormalBlending:THREE.AdditiveBlending,
    });
    const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.copy(event.position);mesh.position.y+=.035;mesh.renderOrder=3;mesh.visible=delay===0;this.scene.add(mesh);
    this.shockwaves.push({mesh,age:-delay,strength:event.strength,critical:Boolean(event.critical)});
   }
   const burst=new THREE.Mesh(this.renderResources.burstGeometry,new THREE.MeshBasicMaterial({color:event.critical?palettes[0][0].clone().lerp(new THREE.Color(0xffffff),.55):0xffffff,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending}));burst.position.copy(event.position);burst.renderOrder=4;this.scene.add(burst);this.bursts.push({mesh:burst,age:0,strength:event.strength});
   while(this.shockwaves.length>6){const old=this.shockwaves.shift();this.scene.remove(old.mesh);this.renderResources.disposeGeometry(old.mesh.geometry);old.mesh.material.dispose();}
   while(this.bursts.length>4){const old=this.bursts.shift();this.scene.remove(old.mesh);this.renderResources.disposeGeometry(old.mesh.geometry);old.mesh.material.dispose();}
  }
 }

 draw(battle,alpha,dt,preview=false){if(!this.renderer)return;this.stageBoards?.update(dt,this.stageMotion.matches);this.stageBowl?.update?.(dt,this.stageMotion.matches);if(this.rotatingFloor){const clock=battle&&(battle.running||battle.result)?(battle.rotationStartedAt||0)+battle.time+(battle.aftermathTime||0):undefined;this.rotatingFloor.update(dt,this.stageMotion.matches,clock);if(battle&&!battle.running&&!battle.result)battle.previewRotationTime=this.rotatingFloor.time;}if(battle)battle.tops.forEach((top,i)=>{const g=this.groups[i];if(!g)return;const a=top.previous,b=top.current;g.position.copy(a.position).lerp(b.position,alpha);g.quaternion.copy(a.rotation).slerp(this.interpolatedRotation.set(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w),alpha);if(this.localIndex){g.position.x*=-1;g.position.z*=-1;g.quaternion.premultiply(this.viewTurn);}g.getObjectByName('centroid').visible=preview;this.topPresence?.update(i,g,dt);g.userData.rareEffect?.update(dt,this.stageMotion.matches,this.quality?.id==='light',this.camera);g.userData.skinEffect?.update(dt,this.stageMotion.matches);g.userData.goldEffect?.update(dt,this.stageMotion.matches);g.userData.rainbowEffect?.update(dt,this.stageMotion.matches);});
  this.boostTrails?.update(dt,this.groups,this.stageMotion?.matches,!preview&&!battle?.result);
  filterInPlace(this.sparks,s=>{s.life-=dt;if(s.life<=0){this.sparkPool.push(s);return false;}s.velocity.y-=dt*8;s.position.addScaledVector(s.velocity,dt);return true;});
  this.sparks.forEach((s,i)=>{
   const fade=Math.sqrt(s.life/s.maxLife),t=this.sparkTransform;t.position.copy(s.position);
   t.quaternion.setFromUnitVectors(this.sparkAxis,this.sparkDirection.copy(s.velocity).normalize());t.scale.set(s.width*fade,s.length*fade,s.width*fade);t.updateMatrix();
   this.sparkMesh.setMatrixAt(i,t.matrix);this.sparkMesh.setColorAt(i,s.color);
  });
  this.sparkMesh.count=this.sparks.length;if(this.sparks.length){this.sparkMesh.instanceMatrix.needsUpdate=true;if(this.sparkMesh.instanceColor)this.sparkMesh.instanceColor.needsUpdate=true;}
  filterInPlace(this.shockwaves,effect=>{
   effect.age+=dt;if(effect.age<0){effect.mesh.visible=false;return true;}effect.mesh.visible=true;const progress=effect.age/CONFIG.shockwaveDuration;
   if(progress>=1){this.scene.remove(effect.mesh);this.renderResources.disposeGeometry(effect.mesh.geometry);effect.mesh.material.dispose();return false;}
   const eased=1-(1-progress)**2,uniforms=effect.mesh.material.uniforms;
   const maxRadius=CONFIG.shockwaveMaxScale*.39*(effect.critical?CONFIG.criticalShockwaveScale:1);
   uniforms.uRadius.value=this.reduced?.9:.34+(maxRadius-.34)*eased;
   uniforms.uThickness.value=this.reduced?(effect.critical?.17:.11):effect.critical?.17-.145*progress:.11-.095*progress;
   uniforms.uOpacity.value=(1-progress)**2*(effect.critical?.9:.48+effect.strength*.3);return true;
  });
  filterInPlace(this.bursts,effect=>{effect.age+=dt;const progress=effect.age/.18;if(progress>=1){this.scene.remove(effect.mesh);this.renderResources.disposeGeometry(effect.mesh.geometry);effect.mesh.material.dispose();return false;}const scale=this.reduced?1:1+progress*4;effect.mesh.scale.setScalar(scale);effect.mesh.material.opacity=(1-progress)**2*(.65+effect.strength*.3);return true;});
  filterInPlace(this.fragments,s=>{
   s.age+=dt;if(s.age>3){s.battle.removeDebris(s.body);this.scene.remove(s.mesh);this.renderResources.disposeGeometry(s.mesh.geometry);for(const material of fragmentMaterials(s.mesh))material.dispose();return false;}
   s.mesh.position.copy(s.body.translation());s.mesh.quaternion.copy(s.body.rotation());
   for(const material of fragmentMaterials(s.mesh))material.opacity=Math.max(0,Math.min(1,3-s.age));return true;
  });
  this.shake*=Math.exp(-dt*CONFIG.impactShakeDecay);
  const jitter=()=>this.shake?(Math.random()-.5)*this.shake:0;
  this.camera.position.x=jitter();this.camera.position.y=CONFIG.cameraHeight+jitter()*.8;this.camera.position.z=CONFIG.cameraDistance+jitter()*.9;
  this.camera.lookAt(0,0,0);this.camera.rotation.z+=jitter()*.055;this.renderer.render(this.scene,this.camera);
 }
}
