import {feedbackDecision,hapticDuration,FX_LEVELS} from './r13-feedback-policy.mjs';
import {QUALITY_PRESETS} from './r13-quality.mjs';
/** R12 gameplay presentation only. Never writes to native Rapier or HP state. */
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function impactTier(event={}){
 const force=Number.isFinite(event.force)?Math.abs(event.force):0;
 const strength=Number.isFinite(event.strength)?Math.abs(event.strength):0;
 const damages=Array.isArray(event.damage)?event.damage:[];
 const hpLoss=damages.reduce((a,b)=>a+(Number.isFinite(b)?Math.max(0,b):0),0);
 const magnitude=Math.max(strength*1.5,Math.log1p(force)/9,hpLoss/17);
 const intensity=clamp(magnitude,0,1);
 return {intensity,tier:event.critical?'critical':intensity>=.57?'heavy':'normal',hpLoss};
}
export function gestureFinish({distance=0,cancelled=false,precision=false,withinCancel=false,threshold=22}={}){
 if(cancelled||withinCancel||distance<threshold)return 'cancel';
 return precision?'aim':'fire';
}
export function screenPoint(position,camera,width,height){
 if(!position||!camera||!width||!height)return {x:width/2,y:height*.48};
 // Projection matrix follows the original Three.js ArenaView camera. Pure caller-supplied calculation.
 const v=position.clone().project(camera);
 return {x:clamp((v.x+1)*width/2,12,width-12),y:clamp((1-v.y)*height/2,12,height-12)};
}
const random=(seed)=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
export class BattlePresentation {
 constructor({host,webglCanvas,reduceMotion=false,soundEnabled=()=>true}={}){
  this.host=host;this.webglCanvas=webglCanvas;this.reduceMotion=reduceMotion;this.soundEnabled=soundEnabled;
  this.canvas=document.createElement('canvas');this.canvas.className='r12-effects';this.canvas.setAttribute('aria-hidden','true');this.host.append(this.canvas);
  this.ctx=this.canvas.getContext('2d');this.particles=[];this.rings=[];this.shake=0;this.lastHit=-Infinity;this.elapsed=0;this.seed=17701;this.audio=null;this.lastAudio=-Infinity;this.disposed=false;this.dirty=false;this.quality='high';this.fxLevel='standard';this.audioLevel=.55;this.haptics=true;this.lastVisual=-Infinity;this.lastHaptic=-Infinity;this.fxAcc=0;this.audioBus=null;
 }
 setEnabled(v){this.soundOn=!!v;}
 setPreferences({quality,fxLevel,audioLevel,haptics}={}){
  if(QUALITY_PRESETS[quality])this.quality=quality;
  if(Object.hasOwn(FX_LEVELS,fxLevel))this.fxLevel=fxLevel;
  if(Number.isFinite(audioLevel)){this.audioLevel=clamp(audioLevel,0,1);if(this.audioBus)this.audioBus.gain.value=this.audioLevel;}
  if(typeof haptics==='boolean')this.haptics=haptics;
 }
 initAudioBus(ac){if(this.audioBus)return;const bus=ac.createGain(),compressor=ac.createDynamicsCompressor();compressor.threshold.value=-22;compressor.ratio.value=6;compressor.attack.value=.004;compressor.release.value=.15;bus.gain.value=this.audioLevel;bus.connect(compressor).connect(ac.destination);this.audioBus=bus;}

 sound(type='hit',intensity=.5){if(this.disposed||!this.soundEnabled()||this.audioLevel<=0)return;
  try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
   this.audio??=new Context();this.initAudioBus(this.audio);if(this.audio.state==='suspended')void this.audio.resume();
   const ac=this.audio,at=ac.currentTime;if(type==='hit'&&at-this.lastAudio<.065)return;
   this.lastAudio=at;const volume=clamp(.017+intensity*.05,0,.07),duration=type==='win'?.48:type==='launch'?.2:type==='dash'?.17:.11+intensity*.12;
   const osc=ac.createOscillator(),gain=ac.createGain();osc.type=type==='hit'?'triangle':'sine';
   const start=type==='win'?430:type==='dash'?340:type==='launch'?210:95+intensity*115;
   const end=type==='win'?780:type==='dash'?125:type==='launch'?65:45+intensity*25;
   osc.frequency.setValueAtTime(start,at);osc.frequency.exponentialRampToValueAtTime(end,at+duration);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.004);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
   osc.connect(gain).connect(this.audioBus);osc.start(at);osc.stop(at+duration+.015);
   if((type==='hit'||type==='dash')&&intensity>.35){
    const size=Math.ceil(ac.sampleRate*.075),buffer=ac.createBuffer(1,size,ac.sampleRate),data=buffer.getChannelData(0),rnd=random((this.seed+=179)|0);
    for(let i=0;i<size;i++)data[i]=(rnd()*2-1)*Math.exp(-i/size*7);
    const noise=ac.createBufferSource(),filter=ac.createBiquadFilter(),ng=ac.createGain();noise.buffer=buffer;filter.type='bandpass';filter.frequency.value=type==='dash'?870:700+intensity*1300;filter.Q.value=.8;ng.gain.value=.015+intensity*.04;
    noise.connect(filter).connect(ng).connect(this.audioBus);noise.start(at);noise.stop(at+.075);
   }
  }catch{/* optional audio is never a gameplay dependency */}
 }
 spawn(event,point){if(this.disposed)return;
  const tier=impactTier(event),critical=tier.tier==='critical',now=typeof performance!=='undefined'?performance.now():this.elapsed*1000;
  const policy=feedbackDecision({now,lastVisual:this.lastVisual,lastAudio:this.lastAudio,lastHaptic:this.lastHaptic,critical,intensity:tier.intensity,level:this.fxLevel});
  if(policy.audio){this.sound('hit',critical?1:tier.intensity);this.lastAudio=now;}
  if(policy.haptic&&this.haptics&&navigator?.vibrate){const duration=hapticDuration({critical,intensity:tier.intensity,level:this.fxLevel});if(duration)try{navigator.vibrate(duration);this.lastHaptic=now;}catch{}}
  if(!policy.visual)return tier;
  this.lastVisual=now;this.seed=(this.seed*1664525+1013904223)>>>0;
  const r=random(this.seed),max=QUALITY_PRESETS[this.quality].particles;
  const n=this.reduceMotion?0:Math.ceil((critical?30:tier.tier==='heavy'?18:8)*policy.weight);
  const color=critical?'#ffe6a2':'#c8eafa';
  for(let i=0;i<n;i++){
   const angle=r()*Math.PI*2,speed=(65+r()*220)*(.6+tier.intensity),life=.2+r()*.35;
   this.particles.push({x:point.x,y:point.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-25,rotation:r()*Math.PI,spin:(r()-.5)*12,size:critical?3+r()*9:2+r()*5,life,max:life,color,shape:critical&&i%3===0?'shard':'spark'});
  }
  this.particles.splice(0,Math.max(0,this.particles.length-max));
  if(this.fxLevel!=='quiet')this.rings.push({x:point.x,y:point.y,age:0,duration:critical?.5:.28,color,heavy:tier.tier!=='normal'});
  this.shake=Math.max(this.shake,this.reduceMotion?0:(critical?4:tier.tier==='heavy'?2.3:.75)*policy.weight);this.dirty=true;
  return tier;
 }
 finish(point,{victory=false}={}){
  if(this.disposed)return;this.seed+=57;const r=random(this.seed),count=this.reduceMotion?0:Math.min(QUALITY_PRESETS[this.quality].particles,Math.ceil(35*(FX_LEVELS[this.fxLevel]??.62)));
  for(let i=0;i<count;i++){const angle=r()*Math.PI*2,speed=90+r()*320,life=.45+r()*.55;
   this.particles.push({x:point.x+(r()-.5)*80,y:point.y+(r()-.5)*50,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-95,rotation:r()*6,spin:(r()-.5)*11,size:4+r()*11,life,max:life,color:i%3?'#ffffff':victory?'#ffe5a4':'#ffa5b0',shape:'shard'});
  }
  this.rings.push({x:point.x,y:point.y,age:0,duration:.66,color:victory?'#ffe5a4':'#ffa5b0',heavy:true});
  this.particles.splice(0,Math.max(0,this.particles.length-QUALITY_PRESETS[this.quality].particles));this.shake=this.reduceMotion?0:4*(FX_LEVELS[this.fxLevel]??.62);this.dirty=true;this.sound(victory?'win':'hit',1);
 }
 tick(dt){if(this.disposed)return;this.elapsed+=dt;this.fxAcc+=dt;const minStep=1/QUALITY_PRESETS[this.quality].effectFPS;if(this.fxAcc<minStep)return;dt=Math.min(.1,this.fxAcc);this.fxAcc=0;const bounds=this.host.getBoundingClientRect(),w=Math.max(1,bounds.width),h=Math.max(1,bounds.height),dpr=Math.min(window.devicePixelRatio||1,QUALITY_PRESETS[this.quality].pixelRatio);
  const pixelW=Math.round(w*dpr),pixelH=Math.round(h*dpr);if(this.canvas.width!==pixelW||this.canvas.height!==pixelH){this.canvas.width=pixelW;this.canvas.height=pixelH;this.dirty=true;}
  const c=this.ctx;if(!c)return;if(!this.dirty&&!this.particles.length&&!this.rings.length&&!this.shake)return;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=420*dt;p.rotation+=p.spin*dt;const fade=clamp(p.life/p.max,0,1);c.globalAlpha=fade;c.fillStyle=p.color;c.save();c.translate(p.x,p.y);c.rotate(p.rotation);
   if(p.shape==='shard'){c.beginPath();c.moveTo(-p.size*.5,-p.size*.8);c.lineTo(p.size*.75,0);c.lineTo(-p.size*.5,p.size*.3);c.closePath();c.fill();}else c.fillRect(-p.size*.6,-p.size*.15,p.size*1.8,p.size*.3);c.restore();}
  this.particles=this.particles.filter(x=>x.life>0);
  for(const ring of this.rings){ring.age+=dt;const progress=clamp(ring.age/ring.duration,0,1);c.globalAlpha=(1-progress)*.75;c.strokeStyle=ring.color;c.lineWidth=ring.heavy?3:2;c.beginPath();c.ellipse(ring.x,ring.y,(16+progress*120),(8+progress*55),0,0,Math.PI*2);c.stroke();}
  this.rings=this.rings.filter(x=>x.age<x.duration);c.globalAlpha=1;
  this.shake*=Math.exp(-dt*18);if(this.shake<.1)this.shake=0;this.dirty=Boolean(this.particles.length||this.rings.length||this.shake);
  if(this.webglCanvas){const x=this.reduceMotion?0:Math.sin(this.elapsed*67)*this.shake*.5,y=this.reduceMotion?0:Math.cos(this.elapsed*79)*this.shake*.35;
   this.webglCanvas.style.transform=this.shake?`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`:'none';}
 }
 dispose(){this.disposed=true;this.webglCanvas&&(this.webglCanvas.style.transform='');this.canvas.remove();this.particles=[];this.rings=[];try{void this.audio?.close();}catch{}this.audio=null;this.audioBus=null;}
}
