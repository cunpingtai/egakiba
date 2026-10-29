/* Browser-only completion scenes, adapted from the approved immersive mock. */
(() => {
'use strict';
const images={}, assetState={version:0};
for(const name of ['night','dawn']){
 const image=document.createElement('img');
 image.onload=()=>{images[name]=image;assetState.version++;};
 image.src=`finale-assets/${name}.jpg`;
}
window.PrefPackFinale={create({mode,items}){
 const W=480,H=850,clamp=x=>Math.max(0,Math.min(1,x));
 const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 const ramp=(t,a,b)=>ease((t-a)/(b-a));
 const mix=(a,b,t)=>a+(b-a)*t;
 const serif='"Hiragino Mincho ProN","Yu Mincho",serif';
 const sans='"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif';
 const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const config={
  japan:{duration:12,reveal:10,title:'日本列島 完成',count:'47 / 47 都道府県'},
  asia:{duration:14,reveal:12,title:'アジア大陸 完成',count:'48 / 48 国・地域'}
 };
 const canvas=document.createElement('canvas');canvas.width=W*2;canvas.height=H*2;
 const g=canvas.getContext('2d');let reduced=false,lastKey='';
const fireworks=[
 [4.8,75,290,102,'#ffc980'],[5.55,406,230,118,'#7fe4ec'],[6.2,35,438,100,'#ff927b'],[6.9,438,447,115,'#ffdc91'],
 [7.55,238,258,180,'#ffe3a0'],[8.1,61,193,116,'#ffb482'],[8.5,420,160,129,'#a5e8ed'],[9.1,92,490,112,'#ffda8a'],[9.55,407,515,124,'#ffe5ad']
].map((a,i)=>{const r=rng(200+i);return {at:a[0],x:a[1],y:a[2],size:a[3],color:a[4],rays:Array.from({length:i===4?125:85},(_,j)=>({a:j*6.283/(i===4?125:85)+(r()-.5)*.025,k:.7+r()*.3,life:2.1+r()*.95,tw:r()*6.28}))};});

function buildMap(items,key){
 const all=items.flatMap(p=>p.lands.flatMap(flat=>Array.from({length:flat.length/2},(_,i)=>[flat[i*2],flat[i*2+1]])));
 const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
 const minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys);
 const scale=Math.min((key==='japan'?340:409)/(maxX-minX),(key==='japan'?454:391)/(maxY-minY));
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 const parts=items.map(item=>{
  let sx=0,sy=0,n=0;
  const polygons=item.lands.map(flat=>Array.from({length:flat.length/2},(_,i)=>[(flat[i*2]-cx)*scale,(flat[i*2+1]-cy)*scale]));
  for(const polygon of polygons)for(const [x,y] of polygon){sx+=x;sy+=y;n++;}
  return {...item,polygons,x:sx/n,y:sy/n};
 });
 const ordered=parts.slice().sort(key==='japan'?(a,b)=>b.y-a.y:(a,b)=>a.x-b.x);
 ordered.forEach((p,i)=>p.order=i/(ordered.length-1));
 const map={parts,polygons:parts.flatMap(p=>p.polygons),width:(maxX-minX)*scale,height:(maxY-minY)*scale};
 return map;
}
const maps={[mode]:buildMap(items,mode)};
function text(str,x,y,size,color='#fff0d3',alpha=1,font=serif){if(alpha<=0)return;g.save();g.globalAlpha=alpha;g.font=`${size}px ${font}`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=color;g.fillText(str,x,y);g.restore();}
function glow(x,y,r,color,alpha=1){if(alpha<=0)return;g.save();g.globalAlpha=alpha;const grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,'transparent');g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);g.restore();}
function backdrop(image,alpha=1){if(!image||alpha<=0)return;g.save();g.globalAlpha=alpha;const k=Math.max(W/image.width,H/image.height);g.drawImage(image,(W-image.width*k)/2,(H-image.height*k)/2,image.width*k,image.height*k);g.restore();}
function line(x1,y1,x2,y2,color,width=1){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokeStyle=color;g.lineWidth=width;g.stroke();}
function star(x,y,r,alpha){g.save();g.globalAlpha=alpha;g.fillStyle='#fff3c7';g.beginPath();g.moveTo(x,y-r*2);g.lineTo(x+r*.3,y-r*.3);g.lineTo(x+r*2,y);g.lineTo(x+r*.3,y+r*.3);g.lineTo(x,y+r*2);g.lineTo(x-r*.3,y+r*.3);g.lineTo(x-r*2,y);g.lineTo(x-r*.3,y-r*.3);g.closePath();g.fill();g.restore();}

/* A deterministic 2.5D scene: map relief, atmospheric depth and a traveling camera. */
function immersiveCamera(seconds){
 const asian=mode==='asia',out=asian?10:8;
 const dive=reduced?0:ramp(seconds,1.35,4)*(1-ramp(seconds,out,out+2));
 const journey=ramp(seconds,4,out);
 const yaw=dive*mix(.38,-.29,journey),pitch=dive*.94;
 const roll=dive*mix(-.075,.045,journey);
 return {dive,journey,yaw,pitch,roll,cosY:Math.cos(yaw),sinY:Math.sin(yaw),cosP:Math.cos(pitch),sinP:Math.sin(pitch),cosR:Math.cos(roll),sinR:Math.sin(roll),
  x:dive*mix(asian?-100:-63,asian?88:49,journey),y:dive*mix(asian?25:92,asian?-20:-78,journey),
  distance:mix(790,700,ramp(seconds,.5,1.5))-325*dive,centerY:(asian?437:426)-20*dive};
}
function projectWorld(x,y,z,camera){
 x-=camera.x;y-=camera.y;
 const xx=x*camera.cosY+z*camera.sinY,zz=-x*camera.sinY+z*camera.cosY;
 const yy=y*camera.cosP-zz*camera.sinP,depth=y*camera.sinP+zz*camera.cosP;
 const k=700/Math.max(75,camera.distance-depth);
 return {x:W/2+(xx*camera.cosR-yy*camera.sinR)*k,y:camera.centerY+(xx*camera.sinR+yy*camera.cosR)*k,k,depth};
}
function projectedPath(polygons,z,camera,offsetY=0){
 g.beginPath();
 for(const points of polygons){for(let i=0;i<points.length;i++){const p=projectWorld(points[i][0],points[i][1]+offsetY,z,camera);if(i)g.lineTo(p.x,p.y);else g.moveTo(p.x,p.y);}g.closePath();}
}
function createAtmosphere(){
 const random=rng(58219);
 const motes=Array.from({length:100},(_,i)=>({x:(random()-.5)*1050,y:(random()-.5)*900,z:-330+random()*530,size:.6+random()*1.8,phase:random()*6.28,drift:5+random()*10,index:i}));
 const clouds=[];
 for(const kind of ['night','dawn']){
  const cv=document.createElement('canvas');cv.width=600;cv.height=220;const ctx=cv.getContext('2d'),r=rng(739);
  for(let i=0;i<38;i++){
   const x=45+r()*510,y=65+r()*90,rad=25+r()*65;
   const grad=ctx.createRadialGradient(x,y,0,x,y,rad);
   grad.addColorStop(0,kind==='night'?'rgba(135,167,204,.19)':'rgba(255,233,210,.26)');
   grad.addColorStop(.45,kind==='night'?'rgba(101,130,173,.09)':'rgba(255,192,154,.13)');grad.addColorStop(1,'transparent');ctx.fillStyle=grad;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);
  }clouds.push(cv);
 }
 const ember=document.createElement('canvas');ember.width=64;ember.height=64;const ctx=ember.getContext('2d'),grad=ctx.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'#fff4c9');grad.addColorStop(.14,'#ffe2a8cc');grad.addColorStop(.4,'#ffc77a44');grad.addColorStop(1,'#ffc77a00');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
 return {motes,clouds,ember};
}
let atmosphere;
function immersiveBackdrop(seconds,camera){
 const dawn=mode==='asia'?ramp(seconds,4.3,10.7):0;
 g.fillStyle='#030b19';g.fillRect(0,0,W,H);
 if(!images.night || (mode==='asia'&&!images.dawn)){
  const sky=g.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#051226');sky.addColorStop(.67,mode==='asia'&&dawn>.5?'#d68c60':'#1b324d');sky.addColorStop(1,'#061225');
  g.fillStyle=sky;g.fillRect(0,0,W,H);
 }
 function plate(im,alpha){
  if(!im||alpha<=0)return;
  g.save();g.globalAlpha=alpha;
  const scale=Math.max(W/im.width,H/im.height)*(1.04+camera.dive*.12);
  const x=(W-im.width*scale)/2-camera.x*.12+camera.yaw*20;
  const y=(H-im.height*scale)/2+camera.pitch*25-camera.y*.08;
  g.drawImage(im,x,y,im.width*scale,im.height*scale);g.restore();
 }
 plate(images.night,1);plate(images.dawn,dawn);
 const veil=g.createLinearGradient(0,0,0,H);veil.addColorStop(0,'#020a1a9c');veil.addColorStop(.25,'#020a1a08');veil.addColorStop(.72,'#020a1a00');veil.addColorStop(1,'#020a1a95');g.fillStyle=veil;g.fillRect(0,0,W,H);
 if(mode==='asia'&&dawn>0){
  const x=240-camera.x*.15,y=592+camera.pitch*18;
  glow(x,y,180,'#ffd69c',dawn*.2);
  if(!reduced){g.save();g.globalCompositeOperation='screen';g.fillStyle=`rgba(255,224,168,${dawn*.028})`;for(let i=0;i<8;i++){const angle=-2.8+i*.35;g.beginPath();g.moveTo(x,y);g.arc(x,y,1000,angle,angle+.04);g.closePath();g.fill();}g.restore();}
 }
 // Reflection stays far away; it moves much less than the map and foreground.
 if(!reduced){g.save();g.globalAlpha=.22*(mode==='asia'?dawn:1);for(let i=0;i<25;i++){const yy=690+i*5.7,xx=240-camera.x*.1+Math.sin(i*3.7+seconds*.8)*(i+5);line(xx-6-i*.7,yy,xx+6+i*.7,yy,'#ffe2a3',.6);}g.restore();}
}
function immersiveClouds(seconds,camera,front){
 const dawn=mode==='asia'?ramp(seconds,4,10):0;
 // Large near clouds pass across the coast; distant veils barely move.
 const layers=front?[
  {x:-160+seconds*14,y:170,z:90,w:260,opacity:.5},
  {x:280-seconds*10,y:-140,z:130,w:250,opacity:.45},
  {x:-180+seconds*12,y:220,z:170,w:380,opacity:.35}
 ]:[{x:-70,y:-160,z:-180,w:800,opacity:.5},{x:170,y:145,z:-100,w:710,opacity:.45}];
 const strength=front?(reduced?.06:.08+camera.dive*.65):.22;
 for(const layer of layers){
  const p=projectWorld(layer.x,layer.y,layer.z,camera);
  const width=layer.w*p.k,height=width*.367;
  g.save();g.globalAlpha=layer.opacity*strength*(1-dawn);g.drawImage(atmosphere.clouds[0],p.x-width/2,p.y-height/2,width,height);
  if(dawn>0){g.globalAlpha=layer.opacity*strength*dawn;g.drawImage(atmosphere.clouds[1],p.x-width/2,p.y-height/2,width,height);}g.restore();
 }
}
function immersiveMap(seconds,camera){
 const map=maps[mode],asian=mode==='asia';
 const litStart=asian?4.7:2,litEnd=asian?10.8:5.8,progress=(seconds-litStart)/(litEnd-litStart);
 const rise=ramp(seconds,.15,1.4);
 g.save();g.lineJoin='round';
 // Lower silhouette and strata share the same projection as the surface.
 g.save();g.globalAlpha=.13;projectedPath(map.polygons,-37,camera,18);g.fillStyle='#000719';g.fill();g.restore();
 for(let z=-16;z<0;z+=4){projectedPath(map.polygons,z,camera);g.fillStyle=z<-8?'#253b4b':z<-4?'#617f83':'#a8b6a2';g.fill();g.strokeStyle='#10273288';g.lineWidth=.45;g.stroke();}
 const ordered=map.parts.slice().sort((a,b)=>projectWorld(a.x,a.y,0,camera).depth-projectWorld(b.x,b.y,0,camera).depth);
 for(const part of ordered){
  projectedPath(part.polygons,0,camera);
  const center=projectWorld(part.x,part.y,0,camera);
  const grad=g.createLinearGradient(center.x-50,center.y-100,center.x+55,center.y+100);grad.addColorStop(0,part.color);grad.addColorStop(1,part.color);g.fillStyle=grad;g.fill();
  g.strokeStyle='#fff9e1b3';g.lineWidth=Math.min(1.5,.7*center.k);g.stroke();
  const shine=clamp(1-Math.abs(progress-part.order)/.16);
  if(shine>0){g.save();g.globalAlpha=shine*.48;g.fillStyle='#fff6d5';g.fill();g.restore();}
 }
 // A single outline bloom, rather than costly per-edge shadows.
 projectedPath(map.polygons,.5,camera);g.strokeStyle=`rgba(255,223,160,${rise*(.35+.15*camera.dive)})`;g.lineWidth=1.5;g.stroke();
 if(camera.dive>.05){
  g.save();projectedPath(map.polygons,.5,camera);g.clip();
  const shine=g.createLinearGradient(0,180,W,680);shine.addColorStop(0,'#fff7d233');shine.addColorStop(.5,'#fff7d200');shine.addColorStop(1,'#06416022');g.fillStyle=shine;g.fillRect(0,0,W,H);g.restore();
 }
 g.restore();
 if(seconds>litStart&&!reduced)for(const part of map.parts){const a=clamp(1-Math.abs(progress-part.order)/.09);if(a>0){const p=projectWorld(part.x,part.y,4,camera);star(p.x,p.y,2*p.k,a);}}
}
function immersiveFireworks(seconds,camera,front){
 if(mode!=='japan'||reduced)return;
 g.save();g.globalCompositeOperation='screen';
 fireworks.forEach((firework,index)=>{
  const near=index===3||index===7;if(near!==front)return;
  const age=seconds-firework.at;if(age<-.6||age>3.4)return;
  const bx=(firework.x-240)*(near?.75:.95),by=firework.y-(near?460:660),bz=near?95:-180-index%3*25;
  const center=projectWorld(bx,by,bz,camera),size=firework.size*(near?1.08:1);
  if(age<0){const y=mix(410,by,clamp((age+.6)/.6)),p=projectWorld(bx,y,bz,camera);line(p.x,p.y+20*p.k,p.x,p.y,'#ffe3a899',1);g.drawImage(atmosphere.ember,p.x-6*p.k,p.y-6*p.k,12*p.k,12*p.k);return;}
  glow(center.x,center.y,40*center.k,firework.color,Math.exp(-age*5)*.4);
  const tipAge=Math.max(0,age-.22);
  const expand=1-Math.exp(-age*1.9),tailExpand=1-Math.exp(-tipAge*1.9);
  for(const ray of firework.rays){
   if(age>ray.life)continue;
   const radius=size*ray.k,depth=Math.sin(ray.tw)*radius*.35;
   const p=projectWorld(bx+Math.cos(ray.a)*radius*expand,by+Math.sin(ray.a)*radius*expand+age*age*11,bz+depth*expand,camera);
   const tail=projectWorld(bx+Math.cos(ray.a)*radius*tailExpand,by+Math.sin(ray.a)*radius*tailExpand+tipAge*tipAge*11,bz+depth*tailExpand,camera);
   const a=Math.pow(1-age/ray.life,.9)*(.65+.35*Math.sin(age*15+ray.tw)**2);
   g.globalAlpha=a;g.lineWidth=Math.min(2.8,(near?1.25:.85)*p.k);g.strokeStyle=firework.color;g.beginPath();g.moveTo(tail.x,tail.y);g.lineTo(p.x,p.y);g.stroke();
   g.fillStyle='#fff9dc';g.fillRect(p.x-.65*p.k,p.y-.65*p.k,1.3*p.k,1.3*p.k);
  }
 });g.restore();
}
function immersiveMotes(seconds,camera,front){
 if(reduced)return;
 const intensity=ramp(seconds,.4,2)*(mode==='asia'?.55:1);
 g.save();g.globalCompositeOperation='screen';
 for(const mote of atmosphere.motes){
  const near=mote.z>60;if(near!==front)continue;
  const drift=Math.sin(seconds*.25+mote.phase)*8;
  const p=projectWorld(mote.x+drift,mote.y-seconds*mote.drift*.45,mote.z,camera);
  if(p.x<-35||p.x>W+35||p.y<-35||p.y>H+35)continue;
  const alpha=intensity*(.2+.5*Math.sin(seconds*.7+mote.phase)**2)*(near?.8:.55);
  const size=Math.min(25,mote.size*p.k*(near?5:1.4));
  g.globalAlpha=alpha;
  if(near)g.drawImage(atmosphere.ember,p.x-size,p.y-size,size*2,size*2);
  else{g.fillStyle='#ffe4af';g.beginPath();g.arc(p.x,p.y,size*.5,0,Math.PI*2);g.fill();}
 }g.restore();
}
function immersiveCompletionRim(seconds,camera){
 if(mode!=='japan')return;
 const start=config.japan.reveal,arrival=ramp(seconds,start,start+.85);
 if(arrival<=0)return;
 if(!atmosphere.completionRim){
  // Union the land silhouettes before adding light, so prefecture borders stay quiet.
  const mask=document.createElement('canvas'),rim=document.createElement('canvas');
  mask.width=rim.width=W*2;mask.height=rim.height=H*2;
  const maskContext=mask.getContext('2d'),rimContext=rim.getContext('2d');
  maskContext.scale(2,2);maskContext.fillStyle='#ffdf95';
  for(const points of maps.japan.polygons){
   maskContext.beginPath();
   points.forEach(([x,y],i)=>{const p=projectWorld(x,y,0,camera);if(i)maskContext.lineTo(p.x,p.y);else maskContext.moveTo(p.x,p.y);});
   maskContext.closePath();maskContext.fill();
  }
  rimContext.shadowColor='#ffc45b';rimContext.shadowBlur=32;rimContext.drawImage(mask,0,0);
  rimContext.shadowColor='#ffe9b0';rimContext.shadowBlur=10;rimContext.drawImage(mask,0,0);
  rimContext.shadowBlur=0;
  for(const [x,y] of [[-2,0],[2,0],[0,-2],[0,2]])rimContext.drawImage(mask,x,y);
  rimContext.globalCompositeOperation='destination-out';rimContext.drawImage(mask,0,0);
  atmosphere.completionRim=rim;
 }
 const settle=1-ramp(seconds,start+.85,config.japan.duration)*.6;
 g.save();g.globalCompositeOperation='screen';g.globalAlpha=arrival*(reduced?.5:settle);
 g.drawImage(atmosphere.completionRim,0,0,W,H);g.restore();
}
function immersiveTitles(seconds){
 const cfg=config[mode];
 const title=ramp(seconds,cfg.reveal,cfg.reveal+.85);
 if(title>0){
  text('C O M P L E T E',240,54,10,'#f3d9a3',title,'Georgia,serif');
  g.save();g.globalAlpha=title;g.shadowColor='#ffc66d';g.shadowBlur=10;g.font=`${mode==='japan'?39:35}px ${serif}`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff1cc';g.fillText(cfg.title,240,105);g.restore();
  text(cfg.count,240,157,13,'#fff0d3',title,sans);
  g.save();g.globalAlpha=title*.7;line(143,184,213,184,'#efd28c',.6);line(267,184,337,184,'#efd28c',.6);star(240,184,2,1);g.restore();
 }
}
function renderImmersive(seconds){
 if(!atmosphere)atmosphere=createAtmosphere();
 const camera=immersiveCamera(seconds);
 immersiveBackdrop(seconds,camera);
 immersiveClouds(seconds,camera,false);immersiveMotes(seconds,camera,false);immersiveFireworks(seconds,camera,false);
 immersiveMap(seconds,camera);
 immersiveCompletionRim(seconds,camera);
 immersiveClouds(seconds,camera,true);immersiveFireworks(seconds,camera,true);immersiveMotes(seconds,camera,true);
 // Subtle edge darkening frames the camera journey, never hides its center.
 const v=g.createRadialGradient(240,420,130,240,420,510);v.addColorStop(0,'#00000000');v.addColorStop(1,`rgba(1,7,18,${.24+camera.dive*.14})`);g.fillStyle=v;g.fillRect(0,0,W,H);
 immersiveTitles(seconds);
}

 return {draw(target,width,height,seconds,reducedMotion=false){
  reduced=reducedMotion;
  const time=Math.max(0,Math.min(config[mode].duration,seconds));
  const key=`${time}:${reduced}:${assetState.version}`;
  if(key!==lastKey){g.setTransform(2,0,0,2,0,0);g.clearRect(0,0,W,H);renderImmersive(time);lastKey=key;}
  target.save();target.fillStyle='#030b19';target.fillRect(0,0,width,height);
  const scale=Math.min(width/W,height/H);
  target.drawImage(canvas,(width-W*scale)/2,(height-H*scale)/2,W*scale,H*scale);target.restore();
 }};
}};
})();
