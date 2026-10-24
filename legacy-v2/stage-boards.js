import * as THREE from './vendor/three.js';
import {CONFIG} from './config.js';
import {stageHeight,stageSurfaceHeight,stageRadius,stageFloorRadius,stageRopeRadius,stageRopeSegments,stageRopePoints,boostBoardPoint,stageWallTop,rotatingFloorAngle} from './stages.js';
import {makeArenaSurface} from './physics.js';
export function makeBoostBoardGeometry(stage,pad,segments=32,radialSegments=8){
 const positions=[],uv=[],indices=[];
 for(let i=0;i<=segments;i++){
  const u=i/segments;
  for(let j=0;j<=radialSegments;j++){
   const v=j/radialSegments,point=boostBoardPoint(pad,u,v),radius=Math.hypot(point.x,point.z);
   positions.push(point.x,stageHeight(stage,radius)+.014,point.z);uv.push(u,v);
   if(i<segments&&j<radialSegments){const a=i*(radialSegments+1)+j,b=a+radialSegments+1;indices.push(a,b,a+1,a+1,b,b+1);}
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);return geometry;
}
export function createBowlArena(stage){
 const group=new THREE.Group();group.name='smooth-bowl';
 const surface=makeArenaSurface(96,32,stage),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(surface.vertices,3));geometry.setIndex(new THREE.BufferAttribute(surface.indices,1));geometry.computeVertexNormals();
 const bowl=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xfafcff,roughness:.53,side:THREE.FrontSide}));bowl.receiveShadow=true;group.add(bowl);
 // The outer shell meets the physical wall's top, including a vertical rim.
 const base=-.28,top=stageWallTop(stage),shellMaterial=new THREE.MeshStandardMaterial({color:0xd8dee4,roughness:.55});
 const shell=new THREE.Mesh(new THREE.CylinderGeometry(CONFIG.arenaRadius,CONFIG.arenaRadius,top-base,96,1,true),shellMaterial);shell.name='outer-sidewall';shell.position.y=(top+base)/2;shell.castShadow=true;shell.receiveShadow=true;group.add(shell);
 const bottom=new THREE.Mesh(new THREE.CircleGeometry(CONFIG.arenaRadius,96),shellMaterial.clone());bottom.rotation.x=Math.PI/2;bottom.position.y=base;group.add(bottom);
 if(stage.rimHeight){const rim=new THREE.Mesh(new THREE.TorusGeometry(CONFIG.arenaRadius,.045,8,128),new THREE.MeshStandardMaterial({color:0xc7d0db,roughness:.8}));rim.rotation.x=Math.PI/2;rim.position.y=top;group.add(rim);}
 // Restore continuous concentric markings, slightly embedded in the floor.
 // Their highest point stays below the boards so rainbow strips occlude them.
 for(const radius of [CONFIG.arenaRadius*.36,CONFIG.arenaRadius*.72]){
  if(stage.rotatingFloor&&radius<=stage.rotatingFloor.radius)continue;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.02,8,128),new THREE.MeshStandardMaterial({color:0xd2dce5,roughness:.8}));ring.name='floor-marking';ring.rotation.x=Math.PI/2;ring.position.y=stageHeight(stage,radius)-.009;group.add(ring);
 }
 return {group,dispose(){group.removeFromParent();group.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();mesh.material.dispose();}});}};
}
export function createRotatingFloor(stage){
 if(!stage.rotatingFloor)return null;
 const floor=stage.rotatingFloor,group=new THREE.Group();group.name='rotating-floor';
 const segments=96,rings=12,positions=[0,stageHeight(stage,0)+.009,0],indices=[];
 for(let j=1;j<=rings;j++)for(let i=0;i<segments;i++){
  const a=i/segments*Math.PI*2,r=floor.radius*j/rings;
  positions.push(r*Math.cos(a),stageHeight(stage,r)+.009,r*Math.sin(a));
 }
 for(let i=0;i<segments;i++)indices.push(0,1+(i+1)%segments,1+i);
 for(let j=1;j<rings;j++)for(let i=0;i<segments;i++){
  const a=1+(j-1)*segments+i,b=1+(j-1)*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,b,c,b,d,c);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const disk=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:floor.color,roughness:.65}));disk.name='spinning-disk';disk.receiveShadow=true;group.add(disk);
 // Eight circular dots reveal movement without directional arrows.
 const markers=[],markerIndices=[],dotRadius=.15,dotSegments=16;
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,x=floor.radius*.76*Math.cos(a),z=floor.radius*.76*Math.sin(a),start=markers.length/3;
  markers.push(x,stageHeight(stage,Math.hypot(x,z))+.016,z);
  for(let j=0;j<dotSegments;j++){
   const angle=j/dotSegments*Math.PI*2,px=x+dotRadius*Math.cos(angle),pz=z+dotRadius*Math.sin(angle);
   markers.push(px,stageHeight(stage,Math.hypot(px,pz))+.016,pz);
   markerIndices.push(start,start+1+(j+1)%dotSegments,start+1+j);
  }
 }
 const markerGeometry=new THREE.BufferGeometry();markerGeometry.setAttribute('position',new THREE.Float32BufferAttribute(markers,3));markerGeometry.setIndex(markerIndices);
 const dots=new THREE.Mesh(markerGeometry,new THREE.MeshBasicMaterial({color:0xf2ffc8,side:THREE.DoubleSide}));dots.name='rotation-markers';group.add(dots);
 let elapsed=0;
 return {group,get time(){return elapsed;},update(dt,reduced=false,time){elapsed=time??elapsed+Math.max(0,Math.min(dt,.1));if(reduced)return;group.rotation.y=rotatingFloorAngle(stage,elapsed);},dispose(){group.removeFromParent();group.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();mesh.material.dispose();}});}};
}
export function createStageBoards(stage){
 if(!stage.boost)return null;
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;
 const context=canvas.getContext('2d'),gradient=context.createLinearGradient(0,0,512,0);
 ['#ef5350','#ff9e32','#f5df40','#55cd73','#39c5de','#4875ee','#b267ef','#ef5350'].forEach((color,i)=>gradient.addColorStop(i/7,color));
 context.fillStyle=gradient;context.fillRect(0,0,512,64);
 context.lineJoin='round';context.lineCap='round';
 for(let x=32;x<512;x+=128){
  // Filled chevron geometry: broad along the travel axis, never a font glyph.
  context.beginPath();context.moveTo(x,10);context.lineTo(x+24,10);context.lineTo(x+64,32);context.lineTo(x+24,54);context.lineTo(x,54);context.lineTo(x+40,32);context.closePath();
  context.fillStyle='#fff';context.fill();context.strokeStyle='#273546';context.lineWidth=3;context.stroke();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.generateMipmaps=false;texture.minFilter=texture.magFilter=THREE.LinearFilter;
 const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}),group=new THREE.Group();group.name='stage-boards';
 for(const pad of stage.pads){const mesh=new THREE.Mesh(makeBoostBoardGeometry(stage,pad),material);mesh.name='boost-board';group.add(mesh);}
 return {group,texture,update(dt,reduced){if(!reduced)texture.offset.x=(texture.offset.x-Math.max(0,Math.min(dt,.1))*stage.boost.flowCyclesPerSecond+1)%1;},dispose(){group.removeFromParent();for(const mesh of group.children)mesh.geometry.dispose();material.dispose();texture.dispose();}};
}

export function createSquareArena(stage){
 const group=new THREE.Group();group.name='square-arena';
 const surface=makeArenaSurface(96,32,stage),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(surface.vertices,3));geometry.setIndex(new THREE.BufferAttribute(surface.indices,1));geometry.computeVertexNormals();
 const bowl=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xfafcff,roughness:.53,side:THREE.DoubleSide}));bowl.receiveShadow=true;group.add(bowl);
 // Reuse the exact physical boundary vertices for the exterior and rim.
 // An analytic strip spanning the almost-vertical wall was floating above it.
 const edge=stageRadius(stage),ropeEdge=stageRopeRadius(stage),floorEdge=stageFloorRadius(stage),n=Math.round(Math.sqrt(surface.vertices.length/3)),boundary=[];
 const add=index=>boundary.push(new THREE.Vector3().fromArray(surface.vertices,index*3));
 for(let j=0;j<n;j++)add(j*n+n-1);
 for(let i=n-2;i>=0;i--)add((n-1)*n+i);
 for(let j=n-2;j>=0;j--)add(j*n);
 for(let i=1;i<n-1;i++)add(i);
 const sidePositions=[],sideIndices=[];
 for(let i=0;i<boundary.length;i++){
  const point=boundary[i],offset=sidePositions.length/3;sidePositions.push(point.x,-.28,point.z,point.x,point.y,point.z);
  const next=(i+1)%boundary.length*2;sideIndices.push(offset,offset+1,next,offset+1,next+1,next);
 }
 const sides=new THREE.BufferGeometry();sides.setAttribute('position',new THREE.Float32BufferAttribute(sidePositions,3));sides.setIndex(sideIndices);sides.computeVertexNormals();
 const shell=new THREE.Mesh(sides,new THREE.MeshStandardMaterial({color:0xd8dee4,roughness:.55,side:THREE.DoubleSide}));shell.name='outer-sidewall';shell.castShadow=false;shell.receiveShadow=false;group.add(shell);
 const path=new THREE.CurvePath();for(let i=0;i<boundary.length;i++)path.add(new THREE.LineCurve3(boundary[i],boundary[(i+1)%boundary.length]));
 if(!stage.ropes){const rim=new THREE.Mesh(new THREE.TubeGeometry(path,256,.035,6,true),new THREE.MeshStandardMaterial({color:0xc7d0db,roughness:.8}));rim.name='square-rim';group.add(rim);}
 const ropes=stageRopeSegments(stage),ropeMeshes=[];
 for(const segment of ropes){
  const points=stageRopePoints(stage,segment).map(p=>new THREE.Vector3(p.x,p.y,p.z)),path=new THREE.CurvePath();for(let i=0;i<points.length-1;i++)path.add(new THREE.LineCurve3(points[i],points[i+1]));
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,96,segment.radius,8,false),new THREE.MeshStandardMaterial({color:0x50545a,roughness:.72}));mesh.name='ring-rope';mesh.userData.segment=segment;mesh.userData.rest=new Float32Array(mesh.geometry.attributes.position.array);mesh.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);mesh.geometry.computeBoundingSphere();mesh.geometry.boundingSphere.radius+=.65;ropeMeshes.push(mesh);group.add(mesh);
 }
 if(stage.ropes)for(const x of [-ropeEdge,ropeEdge])for(const z of [-ropeEdge,ropeEdge]){
  const base=stageSurfaceHeight(stage,x,z),height=stage.ropes.levels.at(-1)+.14;const post=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,height,8),new THREE.MeshStandardMaterial({color:0x30343a,roughness:.65}));post.name='ring-post';post.position.set(x,base+height/2,z);group.add(post);
 }
 const bottom=new THREE.Mesh(new THREE.PlaneGeometry(floorEdge*2,floorEdge*2),new THREE.MeshStandardMaterial({color:0xd8dee4,side:THREE.DoubleSide}));bottom.rotation.x=Math.PI/2;bottom.position.y=-.28;group.add(bottom);
 // Surface-following inner square markings.
 for(const ratio of [.36,.72]){
  const r=edge*ratio,positions=[],indices=[],halfWidth=.02;
  for(let side=0;side<4;side++)for(let i=0;i<=64;i++){
   const angle=side*Math.PI/2,t=-r+2*r*i/64,offset=positions.length/3;
   for(const v of [-halfWidth,halfWidth]){const x=(r+v)*Math.cos(angle)-t*Math.sin(angle),z=(r+v)*Math.sin(angle)+t*Math.cos(angle);positions.push(x,stageSurfaceHeight(stage,x,z)+.024,z);}
   if(i<64)indices.push(offset,offset+2,offset+1,offset+1,offset+2,offset+3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);
  const marking=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xd2dce5,side:THREE.DoubleSide}));marking.name='floor-marking';group.add(marking);
 }
 const impulses=new Map();
 const clear=()=>{impulses.clear();for(const mesh of ropeMeshes){mesh.geometry.attributes.position.array.set(mesh.userData.rest);mesh.geometry.attributes.position.needsUpdate=true;}};
 return {group,clear,hit(event){
  const segment=ropes.find(s=>s.side===event.side);if(!segment)return;
  const dx=segment.end.x-segment.start.x,dz=segment.end.z-segment.start.z;
  const u=Math.max(.02,Math.min(.98,((event.position.x-segment.start.x)*dx+(event.position.z-segment.start.z)*dz)/(dx*dx+dz*dz)));
  // One bounded pulse per side, shared by the three ropes. No new GPU objects.
  const halfSpan=Math.max(.035,Math.min(.3,(event.width||1.8)/(4*ropeEdge)));
  impulses.set(event.side,{u,halfSpan,age:0,live:event.phase==='impact'||event.phase==='stretch',value:(event.depth||.2)*(event.amount||0),amplitude:event.phase==='release'?.035:Math.min(.3,.08+event.speed*.025)});
 },update(dt,reduced=false){
  if(reduced){if(impulses.size)clear();return;}
  for(const [side,pulse] of impulses){
   pulse.age+=Math.max(0,Math.min(dt,.1));const done=!pulse.live&&pulse.age>=.42;
   const displacement=pulse.live?pulse.value:done?0:pulse.amplitude*Math.sin(pulse.age/.42*Math.PI*2)*Math.exp(-pulse.age*7);
   for(const mesh of ropeMeshes)if(mesh.userData.segment.side===side){
    const {segment,rest}=mesh.userData,attribute=mesh.geometry.attributes.position,positions=attribute.array;
    const dx=segment.end.x-segment.start.x,dz=segment.end.z-segment.start.z,nx=Math.cos(side*Math.PI/2),nz=Math.sin(side*Math.PI/2);
    for(let i=0;i<positions.length;i+=3){
     const u=((rest[i]-segment.start.x)*dx+(rest[i+2]-segment.start.z)*dz)/(dx*dx+dz*dz);
     const bend=displacement*Math.sin(Math.PI*Math.max(0,Math.min(1,u)))*Math.exp(-((Math.max(0,Math.abs(u-pulse.u)-pulse.halfSpan)/Math.max(.035,pulse.halfSpan*.7))**2));
     positions[i]=rest[i]+nx*bend;positions[i+1]=rest[i+1];positions[i+2]=rest[i+2]+nz*bend;
    }
    attribute.needsUpdate=true;
   }
   if(done)impulses.delete(side);
  }
 },dispose(){group.removeFromParent();group.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();mesh.material.dispose();}});}};
}
