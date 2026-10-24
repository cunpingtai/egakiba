/** R2 paper-fighter cosmetic rig. No authoritative gameplay changes. */
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const ease=(a,b,t)=>a+(b-a)*t;
/** Frames-per-second independent movement used exclusively for cosmetic motion. */
export function motionFactor(dx,dz,dt,baseSpeed=2.75){
  if(!Number.isFinite(dt)||dt<=0)return 0;
  return clamp(Math.hypot(dx,dz)/(dt*baseSpeed),0,1);
}
/** Area-weighted vertex normals, matching the original paper doll's smooth Lambert shading. */
export function smoothNormals(positions,indices,out){
  out.fill(0);
  for(let t=0;t<indices.length;t+=3){
    const ia=indices[t]*3,ib=indices[t+1]*3,ic=indices[t+2]*3;
    const ux=positions[ib]-positions[ia],uy=positions[ib+1]-positions[ia+1],uz=positions[ib+2]-positions[ia+2];
    const vx=positions[ic]-positions[ia],vy=positions[ic+1]-positions[ia+1],vz=positions[ic+2]-positions[ia+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    out[ia]+=nx;out[ia+1]+=ny;out[ia+2]+=nz;
    out[ib]+=nx;out[ib+1]+=ny;out[ib+2]+=nz;
    out[ic]+=nx;out[ic+1]+=ny;out[ic+2]+=nz;
  }
  for(let i=0;i<out.length;i+=3){
    const l=Math.hypot(out[i],out[i+1],out[i+2]);
    if(l<1e-8){out[i]=0;out[i+1]=1;out[i+2]=0;continue;}
    out[i]/=l;out[i+1]/=l;out[i+2]/=l;
  }
  return out;
}
/** Find true mesh exterior edges; extrude these to seal front/back paper thickness. */
export function makeClosedIndices(indices,n){
  if(!indices?.length||indices.length%3!==0)throw new Error('Malformed triangles');
  const edges=new Map();
  for(let i=0;i<indices.length;i+=3){
    const triangle=[indices[i],indices[i+1],indices[i+2]];
    for(const v of triangle)if(!Number.isInteger(v)||v<0||v>=n)throw new Error('Triangle index out of bounds');
    for(let k=0;k<3;k++){
      const a=triangle[k],b=triangle[(k+1)%3];
      if(a===b)continue;
      const key=a<b?`${a}:${b}`:`${b}:${a}`;
      const entry=edges.get(key);
      if(entry)entry.count++;
      else edges.set(key,{a,b,count:1});
    }
  }
  const boundary=[...edges.values()].filter(x=>x.count===1);
  const out=new (n*2>65535?Uint32Array:Uint16Array)(indices.length*2+boundary.length*6);
  for(let i=0;i<indices.length;i+=3){
    const a=indices[i],b=indices[i+1],c=indices[i+2];
    out.set([a,b,c],i);
    out.set([a+n,c+n,b+n],indices.length+i);
  }
  let at=indices.length*2;
  for(const {a,b} of boundary){out.set([a,b,b+n,a,b+n,a+n],at);at+=6;}
  return {indices:out,boundaryCount:boundary.length};
}

export function createVisualRig(data){
  if(!data||!Array.isArray(data.joints)||!data.joints.length||!Number.isInteger(data.nv)||data.nv<3||!data.index?.length)throw new Error('Invalid fighter mesh');
  if(data.nv>120000||data.index.length>720000)throw new Error('Mesh budget exceeded');
  for(const field of ['rx','ry','uv','thick','vlab'])if(!data[field])throw new Error('Missing mesh field: '+field);
  if(data.rx.length<data.nv||data.ry.length<data.nv||data.uv.length<data.nv*2||data.thick.length<data.nv||data.vlab.length<data.nv)throw new Error('Incomplete mesh attributes');
  for(let i=0;i<data.nv;i++)if(!Number.isFinite(data.rx[i])||!Number.isFinite(data.ry[i])||!Number.isFinite(data.thick[i]))throw new Error('Non-finite mesh coordinates');
  if(data.joints.length>256)throw new Error('Too many joints');
  const joints=data.joints,children=Array.from({length:joints.length},()=>[]);
  for(let i=1;i<joints.length;i++){
    const p=joints[i].par;
    if(!Number.isInteger(p)||p<0||p>=i)throw new Error('Invalid joint hierarchy');
    children[p].push(i);
  }
  const tips=[];
  for(let i=1;i<joints.length;i++)if(!children[i].length)tips.push(i);
  const minY=Math.min(...joints.map(j=>j.y)),maxY=Math.max(...joints.map(j=>j.y));
  const cutoff=minY+(maxY-minY)*.38;
  let legs=tips.filter(i=>joints[i].y<cutoff).sort((a,b)=>joints[a].x-joints[b].x);
  if(!legs.length)legs=tips.slice().sort((a,b)=>joints[a].y-joints[b].y).slice(0,2);
  const legSet=new Set(legs);
  let arms=tips.filter(i=>!legSet.has(i));
  if(!arms.length)arms=tips.slice(0,2);
  const chainMember=new Int16Array(joints.length).fill(-1),legMember=new Int16Array(joints.length).fill(-1);
  function bindChain(tip,slot,store){let j=tip;while(j>0&&store[j]<0){store[j]=slot;const p=joints[j].par;if(p===0||children[p].length>1)break;j=p;}}
  arms.forEach((tip,i)=>bindChain(tip,i,chainMember));
  legs.forEach((tip,i)=>bindChain(tip,i,legMember));
  const n=data.nv,local=new Float32Array(n*2),bone=new Int16Array(n),positions=new Float32Array(n*6),uv=new Float32Array(n*4);
  const {indices:geomIndices,boundaryCount}=makeClosedIndices(data.index,n);
  uv.set(data.uv,0);uv.set(data.uv,n*2);
  for(let i=0;i<n;i++){
    const j=data.vlab[i]>0?data.vlab[i]:0;
    if(j>=joints.length)throw Error('Vertex references missing joint');
    bone[i]=j;
    if(j===0){local[i*2]=data.rx[i]-joints[0].x;local[i*2+1]=data.ry[i]-joints[0].y;continue;}
    const p=joints[j].par,a=joints[p],b=joints[j],dx=b.x-a.x,dy=b.y-a.y,inv=1/(Math.hypot(dx,dy)||1),ux=dx*inv,uy=dy*inv;
    const vx=data.rx[i]-a.x,vy=data.ry[i]-a.y;
    local[i*2]=vx*ux+vy*uy;
    local[i*2+1]=-vx*uy+vy*ux;
  }
  const dyn=new Float32Array(joints.length*3);
  return {data,joints,children,tips,arms,legs,chainMember,legMember,local,bone,uv,geomIndices,boundaryCount,positions,normals:new Float32Array(positions.length),dyn,targetsX:new Float32Array(joints.length),targetsY:new Float32Array(joints.length),targetsZ:new Float32Array(joints.length),t:0,initial:true,motion:0,knock:0,flash:0,lastHitTick:-1};
}
/** Windup pulls the drawing back; the strike steps the whole body forward and throws one limb out. Cosmetic only. */
function attackPose(attack){
  if(!attack)return {lunge:0,reach:0,windup:false};
  const light=attack.kind!=='heavy',wind=light?7:14,active=light?10:9,age=attack.age??0;
  if(age<wind){const s=Math.sin(Math.PI*age/Math.max(1,wind));return {lunge:-s*(light?.28:.42),reach:-s,windup:true};}
  if(age<wind+active){const s=Math.sin(Math.PI*(age-wind)/Math.max(1,active));return {lunge:s*(light?.72:1.05),reach:s,windup:false};}
  return {lunge:0,reach:0,windup:false};
}
/** Project rig vertices to world. Root/motion follow Core; expressive soft motion never affects hits. */
export function animateRig(rig,fighter,dt,now,side){
  const {data,joints,dyn,positions,local,bone}=rig;
  rig.t+=Math.max(0,Math.min(.05,dt));
  const t=rig.t,attack=fighter.attack,guard=fighter.guardHeld,stun=fighter.stunTicks>0;
  const currentMotion=motionFactor(fighter.x-(rig.lastX??fighter.x),fighter.z-(rig.lastZ??fighter.z),dt);
  rig.lastX=fighter.x;rig.lastZ=fighter.z;
  if(dt>0)rig.motion=ease(rig.motion,currentMotion,1-Math.exp(-dt*12));
  const motion=Math.max(.045,rig.motion);
  const knock=rig.knock||0;rig.knock=Math.max(0,knock*Math.exp(-Math.max(0,dt)*13));
  // smooth animation in local paper frame (XY with optional forward Z)
  const targetX=rig.targetsX,targetY=rig.targetsY,targetZ=rig.targetsZ;
  const baseRoot=joints[0];
  const pose=attackPose(attack);
  for(let i=0;i<joints.length;i++){
    const j=joints[i],isRoot=i===0,leg=rig.legMember[i],arm=rig.chainMember[i];
    let x=j.x,y=j.y,z=0;
    const idle=Math.sin(t*3.7+i*.45)*(isRoot?.006:.015);
    y+=idle;
    if(isRoot){y+=Math.sin(t*9)*.028*motion;y+=Math.max(0,pose.lunge)*.22;}
    if(leg>=0){const wave=Math.sin(t*13+leg*Math.PI);x+=wave*.10*motion;y+=Math.max(0,wave)*.07*motion;z+=Math.cos(t*13+leg*Math.PI)*.09*motion;}
    if(arm>=0){const sign=j.x>=baseRoot.x?1:-1;const rank=clamp(Math.hypot(j.x-baseRoot.x,j.y-baseRoot.y)/1.2,0,1);
      if(attack){const chosen=side==='p1'?rig.arms.length-1:0;if(arm===chosen){x+=sign*pose.reach*.22*rank;y+=pose.reach*(pose.windup?.18:.12)*rank;z+=pose.reach*.42*rank;}}
      else if(guard){x=baseRoot.x+(x-baseRoot.x)*.55-sign*.12*rank;y+=.08*rank;z+=.48*rank;}
    }
    if(stun){x+=Math.sin(t*31+i)*.03;z-=.05;}
    if(knock>0 && !isRoot){x+=Math.sin(t*34+i*.7)*knock*.055;z-=knock*.13;}
    targetX[i]=x;targetY[i]=y;targetZ[i]=z;
  }
  const approach=rig.initial?1:1-Math.exp(-Math.max(0,dt)*(attack||guard?48:14));
  for(let i=0;i<joints.length;i++){
    const k=i*3;
    dyn[k]=ease(dyn[k],targetX[i],approach);dyn[k+1]=ease(dyn[k+1],targetY[i],approach);dyn[k+2]=ease(dyn[k+2],targetZ[i],approach);
  }
  rig.initial=false;
  // The drawing stands facing its opponent, the same way the original paper doll did.
  const fx=fighter.faceX,fz=fighter.faceZ;
  const length=Math.hypot(fx,fz)||1,nx=fx/length,nz=fz/length;
  const rx=nz,rz=-nx;
  const fall=fighter.hp<=0?Math.min(1.3,Math.max(0,(rig.fall??0)+dt*3.2)):0;
  rig.fall=fall;
  const cos=Math.cos(fall),sin=Math.sin(fall);
  const rootY=baseRoot.y;
  const zBase=0;
  for(let i=0;i<data.nv;i++){
    const bj=bone[i],k=i*2;
    let lx,ly,lz;
    if(bj===0){lx=dyn[0]+local[k];ly=dyn[1]+local[k+1];lz=dyn[2];}
    else{
      const p=joints[bj].par,ak=p*3,bk=bj*3;
      const dx=dyn[bk]-dyn[ak],dy=dyn[bk+1]-dyn[ak+1],l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l;
      lx=dyn[ak]+ux*local[k]-uy*local[k+1];
      ly=dyn[ak+1]+uy*local[k]+ux*local[k+1];
      lz=dyn[ak+2]+(dyn[bk+2]-dyn[ak+2])*clamp(local[k]/Math.max(.01,Math.hypot(joints[bj].x-joints[p].x,joints[bj].y-joints[p].y)),0,1);
    }
    const yy=ly*cos-(lz+zBase)*sin, zz=ly*sin+(lz+zBase)*cos;
    const half=Math.max(data.thick[i],.004);
    for(let sideIndex=0;sideIndex<2;sideIndex++){
      const depth=zz+(sideIndex===0?half:-half);
      const o=(i+sideIndex*data.nv)*3;
      positions[o]=fighter.x+rx*lx+nx*depth+nx*pose.lunge;
      positions[o+1]=Math.max(.02,yy+(rootY*(1-cos))*.25);
      positions[o+2]=fighter.z+rz*lx+nz*depth+nz*pose.lunge;
    }
  }
  return positions;
}
