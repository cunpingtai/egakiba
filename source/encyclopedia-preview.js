import {disposeRewardEnvironment} from './reward-surface.js';
import * as THREE from './vendor/three.js';
import {createTopVisual,createTopResources,disposeTopVisual,shatterTopVisual,fragmentLaunchMotion} from './render.js';
import {measureTopLaunch,createPreviewDebrisWorld} from './physics.js';
import {CONFIG} from './config.js';
import {scoutGlyph,scoutStats} from './scout-variant.js';
const FRAGMENT_HOLD_SECONDS=1.5,FRAGMENT_FADE_SECONDS=1.5;
// Deterministic presentation clock; the live match and its records are untouched.
export class PreviewSpinMotion{
 constructor(){this.state='idle';this.omega=0;this.angle=0;this.elapsed=0;}
 get playing(){return this.state==='starting'||this.state==='spinning';}
 play(target){const revive=this.state==='shattered';this.from=this.omega;this.target=target;this.elapsed=0;this.state='starting';return revive;}
 stop(){if(!this.playing)return false;this.omega=0;this.elapsed=0;this.state='shattered';return true;}
 step(dt){
  this.elapsed+=dt;const before=this.omega;
  if(this.state==='starting'){const t=Math.min(1,this.elapsed/.42);this.omega=this.from+(this.target-this.from)*(1-(1-t)**3);if(t===1)this.state='spinning';}
  this.angle=(this.angle+(before+this.omega)*.5*dt)%(Math.PI*2);return false;
 }
}
// Limit expensive previews on 90/120 Hz displays. Idle previews need no GPU work.
export class PreviewRenderSchedule{
 constructor(){this.next=0;this.last=null;}
 sample(now,active){
  if(!active){this.next=now;this.last=null;return null;}
  if(now+.25<this.next)return null;
  const dt=this.last===null?0:Math.max(0,Math.min(.05,(now-this.last)/1000));this.last=now;
  this.next=Math.max(this.next+1000/60,now-1000/60);return dt;
 }
}
// One independently owned scene; physics is measured lazily only on first play.
export class EncyclopediaPreview{
 constructor(canvas){
  this.schedule=new PreviewRenderSchedule();this.dirty=true;this.canvas=canvas;this.spin=new PreviewSpinMotion();this.fragments=[];this.resources=createTopResources();this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xf3f7fc);
  this.camera=new THREE.PerspectiveCamera(38,1,.05,50);this.distance=7;this.yaw=0;this.pitch=.75;this.pointers=new Map();
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.floorY=-CONFIG.tipLength-CONFIG.tipRadius;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,toneMapped:false}));floor.rotation.x=-Math.PI/2;floor.position.y=this.floorY;
  const grid=new THREE.GridHelper(100,100,0xc8d2df,0xd9e0e8);grid.material.toneMapped=false;grid.position.y=this.floorY+.002;this.floorObjects=[floor,grid];this.scene.add(floor,grid);
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x8e9cae,2));const sun=new THREE.DirectionalLight(0xffffff,2.8);sun.position.set(-4,8,5);this.scene.add(sun);
  this.events=new AbortController();const options={signal:this.events.signal};
  canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});},options);
  canvas.addEventListener('pointermove',event=>this.move(event),options);
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,event=>this.pointers.delete(event.pointerId),options);
  canvas.addEventListener('wheel',event=>{event.preventDefault();this.zoom(Math.exp(event.deltaY*.001));},{...options,passive:false});
  canvas.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(event.key))return;event.preventDefault();
   this.dirty=true;if(event.key==='ArrowLeft')this.yaw-=.12;if(event.key==='ArrowRight')this.yaw+=.12;
   if(event.key==='ArrowUp')this.pitch=Math.min(1.5,this.pitch+.1);if(event.key==='ArrowDown')this.pitch=Math.max(-.4,this.pitch-.1);
   if(['+','='].includes(event.key))this.zoom(.9);if(event.key==='-')this.zoom(1.1);
  },options);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.onError?.();},options);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);this.resize();
  this.motion=matchMedia('(prefers-reduced-motion: reduce)');
  const frame=now=>{if(this.disposed)return;this.frame=requestAnimationFrame(frame);if(document.hidden||globalThis.window?.mojiBladeApp?.paused){this.schedule.sample(now,false);return;}
   const animated=this.spin.state!=='idle'||this.fragments.length>0||this.reviveAge!==undefined||(!this.motion.matches&&(this.presentationMotion||this.group?.userData.rareEffect));
   const dt=this.schedule.sample(now,this.dirty||animated);if(dt===null)return;
   this.tick(dt);
   this.camera.position.set(Math.sin(this.yaw)*Math.cos(this.pitch)*this.distance,Math.sin(this.pitch)*this.distance,Math.cos(this.yaw)*Math.cos(this.pitch)*this.distance);this.camera.lookAt(0,0,0);
   this.group?.userData.rareEffect?.update(dt,this.motion.matches,false,this.camera);this.group?.userData.skinEffect?.update(dt,this.motion.matches);this.group?.userData.goldEffect?.update(dt,this.motion.matches);this.group?.userData.rainbowEffect?.update(dt,this.motion.matches);this.renderer.render(this.scene,this.camera);this.dirty=false;
  };this.frame=requestAnimationFrame(frame);
 }
 show(base,rare,gold=false,rainbow=false,skin=null){
  this.dirty=true;this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,skin&&skin.kind!=='plain'?1.25:1.5));this.resize();
  this.clearFragments();this.debris?.dispose();this.debris=null;this.spin=new PreviewSpinMotion();this.launch=null;this.generation=(this.generation||0)+1;
  if(this.group){this.scene.remove(this.group);disposeTopVisual(this.group);}
  // Own the rare geometry: the gameplay's WeakMap cache must not retain every
  // visited detail. Base cached geometry remains owned by its GlyphLibrary.
  const source={...base},glyph=rare?scoutGlyph(source,{rare:true}):base;
  this.group=createTopVisual({glyph,gold,rainbow,skin},0x3578ed,this.resources);this.group.getObjectByName('centroid').visible=false;
  if(rare&&!base.textureSource)this.group.getObjectByName('glyph').userData.sharedGeometry=false;
  // Batched textured geometry can be separate from the temporary rare geometry.
  if(rare&&this.group.getObjectByName('glyph').geometry!==glyph.geometry)glyph.geometry.dispose();
  this.glyph=glyph;this.stats=scoutStats(base,rare);this.scene.add(this.group);this.notify();return this.stats;
 }
 get playing(){return this.spin.playing;}
 notify(){this.canvas.dataset.playback=this.loading?'loading':this.spin.state;this.onStateChange?.({playing:this.playing,busy:Boolean(this.loading)});}
 async play(){
  if(this.loading||this.disposed||!this.glyph)return;
  const generation=this.generation;this.loading=true;this.notify();
  try{
   const [launch,debris]=await Promise.all([this.launch||measureTopLaunch(this.glyph),this.debris||createPreviewDebrisWorld(this.floorY)]);
   if(this.disposed||generation!==this.generation){if(debris!==this.debris)debris.dispose();return;}
   this.launch=launch;this.debris=debris;
   if(this.spin.play(this.launch.omega))this.restore(false);
  }finally{if(!this.disposed&&generation===this.generation){this.loading=false;this.notify();}}
 }
 stop(){if(this.spin.stop())this.burst();this.notify();}
 tick(dt){
  const before=this.spin.state;this.spin.step(dt);
  if(this.group){
   this.group.rotation.y=this.spin.angle;
   // Slight balance-dependent precession, fading with the angular velocity.
   const wobble=this.motion.matches?0:(1-Math.min(1,this.stats.balance))*.025*Math.min(1,this.spin.omega/10);
   this.group.rotation.x=Math.sin(this.spin.angle*.23)*wobble;this.group.rotation.z=Math.cos(this.spin.angle*.23)*wobble;
   if(this.reviveAge!==undefined){this.reviveAge+=dt;const t=Math.min(1,this.reviveAge/.24);this.group.scale.setScalar(Math.max(.001,1-(1-t)**3));if(t===1)this.reviveAge=undefined;}
  }
  if(before!==this.spin.state)this.notify();
  this.debris?.advance(dt);
  this.fragments=this.fragments.filter(fragment=>{
   fragment.age+=dt;if(fragment.age>=FRAGMENT_HOLD_SECONDS+FRAGMENT_FADE_SECONDS){this.disposeFragment(fragment);return false;}
   fragment.mesh.position.copy(fragment.body.translation());fragment.mesh.quaternion.copy(fragment.body.rotation());
   for(const material of this.materials(fragment.mesh))material.opacity=Math.max(0,Math.min(1,1-(fragment.age-FRAGMENT_HOLD_SECONDS)/FRAGMENT_FADE_SECONDS));return true;
  });
  if(this.spin.state==='shattered'&&!this.fragments.length)this.restore();
 }
 restore(resetMotion=true){
  this.clearFragments();for(const child of this.group.children)if(child.name==='glyph'||child.userData.driverPart)child.visible=true;
  if(resetMotion){this.spin=new PreviewSpinMotion();this.group.rotation.set(0,0,0);}
  this.reviveAge=0;this.group.scale.setScalar(.001);this.notify();
 }
 burst(){
  this.group.updateMatrixWorld(true);
  shatterTopVisual({glyph:this.glyph},this.group,{addFragment:(mesh,local,shapes)=>{
   const offset=local.clone().applyQuaternion(this.group.quaternion),{velocity,spin}=fragmentLaunchMotion(offset,undefined,this.motion.matches);
   mesh.position.copy(this.group.position).add(offset);mesh.quaternion.copy(this.group.quaternion);this.scene.add(mesh);
   const body=this.debris.add({position:mesh.position,rotation:mesh.quaternion,velocity,spin,shapes});this.fragments.push({mesh,body,age:0});
  }});
 }
 materials(mesh){return Array.isArray(mesh.material)?mesh.material:[mesh.material];}
 disposeFragment({mesh,body}){this.debris?.remove(body);this.scene.remove(mesh);mesh.geometry.dispose();for(const material of this.materials(mesh))material.dispose();}
 clearFragments(){for(const fragment of this.fragments)this.disposeFragment(fragment);this.fragments=[];}
 zoom(ratio){this.dirty=true;this.distance=Math.max(3,Math.min(13,this.distance*ratio));}
 move(event){
  const old=this.pointers.get(event.pointerId);if(!old)return;
  const points=[...this.pointers.entries()];
  if(points.length===1){this.yaw-=(event.clientX-old.x)*.012;this.pitch=Math.max(-.4,Math.min(1.5,this.pitch+(event.clientY-old.y)*.01));}
  else{const other=points.find(([id])=>id!==event.pointerId)[1],before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(event.clientX-other.x,event.clientY-other.y);if(before>0&&after>0)this.zoom(before/after);}
  this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});this.dirty=true;
 }
 resize(){this.dirty=true;const {width,height}=this.canvas.parentElement.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
 dispose(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.events.abort();this.observer.disconnect();this.pointers.clear();this.clearFragments();this.debris?.dispose();for(const object of this.floorObjects){object.geometry.dispose();for(const material of this.materials(object))material.dispose();}disposeTopVisual(this.group);this.resources?.dispose();disposeRewardEnvironment(this.renderer);this.renderer.dispose();this.renderer.forceContextLoss();}
}
