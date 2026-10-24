/** R2-GPU: self-contained WebGL2 paper-fighter renderer. Cosmetic only.
 * Authoritative collision, guard, HP and score are ALWAYS from game-core.
 */
import {animateRig,createVisualRig,smoothNormals,clamp} from './rig.js';
import {prepareDisplayTexture} from './texture.js';
import {AdaptiveQuality} from './quality.js';
import {cameraPose} from './camera.js';
import {appendAccent,advanceAccents,accentStyle,circleAccentVertices} from './fx.js';

function shader(gl,type,source){
 const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error('WebGL shader: '+error);}return s;
}
function program(gl){
 const vs=`#version 300 es
 precision highp float;
 layout(location=0) in vec3 aPosition;
 layout(location=1) in vec2 aUV;
 layout(location=2) in vec3 aNormal;
 uniform mat4 uVP;
 uniform vec3 uOffset;
 uniform float uRingScale;
 out vec2 vUV;out vec3 vNormal;
 void main(){vUV=aUV;vNormal=aNormal;gl_Position=uVP*vec4(aPosition*uRingScale+uOffset,1.0);}`;
 const fs=`#version 300 es
 precision highp float;
 in vec2 vUV;in vec3 vNormal;
 uniform sampler2D uTexture;
 uniform vec4 uColor;
 uniform float uUseTexture;
 uniform float uLit;
 uniform float uFlash;
 out vec4 frag;
 void main(){
  vec4 ink=mix(uColor,texture(uTexture,vUV,-.45),uUseTexture);
  if(ink.a<.03)discard;
  if(uLit<.5){frag=ink;return;}
  vec3 n=normalize(vNormal);
  float up=clamp(n.y*.5+.5,0.,1.);
  float sun=max(0.,dot(n,normalize(vec3(2.,5.,3.))));
  float shade=.84+.08*up+.10*sun;
  frag=vec4(mix(ink.rgb*min(shade,1.),vec3(1.,.70,.36),uFlash*.60),ink.a);
 }`;
 const p=gl.createProgram();if(!p)throw Error('WebGL program allocation failed');
 let a=null,b=null;
 try{
  a=shader(gl,gl.VERTEX_SHADER,vs);b=shader(gl,gl.FRAGMENT_SHADER,fs);
  gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('WebGL link: '+gl.getProgramInfoLog(p));
  return p;
 }catch(error){gl.deleteProgram(p);throw error;}
 finally{if(a)gl.deleteShader(a);if(b)gl.deleteShader(b);}

}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
export function lookAt(eye,center){
 let zx=eye[0]-center[0],zy=eye[1]-center[1],zz=eye[2]-center[2];let zlen=Math.hypot(zx,zy,zz)||1;zx/=zlen;zy/=zlen;zz/=zlen;
 let xx=zz,xz=-zx;const xl=Math.hypot(xx,xz)||1;xx/=xl;xz/=xl;
 const yx=zy*xz,yy=zz*xx-zx*xz,yz=-zy*xx;
 return new Float32Array([xx,yx,zx,0,0,yy,zy,0,xz,yz,zz,0,-(xx*eye[0]+xz*eye[2]),-(yx*eye[0]+yy*eye[1]+yz*eye[2]),-(zx*eye[0]+zy*eye[1]+zz*eye[2]),1]);
}
export function multiply4(a,b){const out=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+row]*b[col*4+k];out[col*4+row]=s;}return out;}
function circleGeometry(r=3.92,n=96,y=-.045){
 const verts=[0,y,0],uv=[0,0],idx=[];
 for(let i=0;i<=n;i++){const a=i*Math.PI*2/n;verts.push(Math.cos(a)*r,y,Math.sin(a)*r);uv.push(0,0);}
 for(let i=1;i<=n;i++)idx.push(0,i,i+1);
 return {verts:new Float32Array(verts),uv:new Float32Array(uv),indices:new Uint16Array(idx)};
}
function circleLines(r=3.92){
 const lines=[],rim=[],count=120;
 const point=(x,z)=>lines.push(x,-.035,z);
 for(let p=-3.5;p<=3.5;p+=.5){const half=Math.sqrt(Math.max(0,r*r-p*p));point(-half,p);point(half,p);point(p,-half);point(p,half);}
 for(let i=0;i<=count;i++){const a=i*Math.PI*2/count;rim.push(r*Math.cos(a),-.028,r*Math.sin(a));}
 return {lines:new Float32Array(lines),rim:new Float32Array(rim)};
}
function closeResources(gl,resources){for(const f of resources){if(f.texture)gl.deleteTexture(f.texture);if(f.mesh)deleteMesh(gl,f.mesh);}}
function deleteMesh(gl,mesh){if(!mesh)return;gl.deleteVertexArray(mesh.vao);for(const name of ['vbo','tbo','ibo','b','nbo'])if(mesh[name])gl.deleteBuffer(mesh[name]);}

/** R3 cosmetic chapter colors. Palette never enters hit detection or score. */
export const ARENA_THEMES=Object.freeze({
 'school-note':{sky:[.976,.959,.914,1],floor:[.89,.90,.86,1],grid:[.68,.74,.75,.33]},
 'colored-note':{sky:[.976,.954,.900,1],floor:[.94,.88,.75,1],grid:[.79,.59,.47,.30]},
 'ink-palace':{sky:[.92,.91,.96,1],floor:[.84,.81,.91,1],grid:[.55,.51,.70,.30]},
});
export class Battle3DRenderer {
 constructor(canvas,opts={}){
  this.canvas=canvas;this.opts=opts;this.gl=null;this.fighters=[];this.shake=0;this.frame=0;this.accents=[];
  this.reducedMotion=opts.reducedMotion ?? (typeof window!=='undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  this.theme=ARENA_THEMES['school-note'];this.lost=false;this.disposed=false;this.lastRenderNow=0;this.cameraEye=null;this.cameraFocus=null;
  this.quality=new AdaptiveQuality({mobile:opts.mobile??(typeof window!=='undefined'&&window.matchMedia('(max-width: 650px)').matches),maxPixelRatio:opts.pixelRatio??2});
  this.onLost=(e)=>{e.preventDefault();this.lost=true;this.opts.onUnavailable?.('WebGL の接続が切れました。2D モードに切り替えます。');};
  this.onRestore=()=>{this.lost=true;this.opts.onUnavailable?.('3D を復旧するには、もう一度バトルを始めてください。');};
  canvas.addEventListener('webglcontextlost',this.onLost);canvas.addEventListener('webglcontextrestored',this.onRestore);
 }
 init(){
  if(this.disposed)throw Error('Renderer disposed');
  if(this.gl&&!this.lost)return true;
  if(this.lost)throw Error('Renderer context not ready');
  const gl=this.canvas.getContext('webgl2',{antialias:true,alpha:false,depth:true,preserveDrawingBuffer:false,powerPreference:'default'});
  if(!gl)throw Error('この端末は WebGL2 に対応していません');
  this.gl=gl;
  this.program=program(gl);gl.useProgram(this.program);
  this.uVP=gl.getUniformLocation(this.program,'uVP');this.uOffset=gl.getUniformLocation(this.program,'uOffset');this.uRingScale=gl.getUniformLocation(this.program,'uRingScale');gl.uniform1f(this.uRingScale,1);
  this.uColor=gl.getUniformLocation(this.program,'uColor');this.uUseTexture=gl.getUniformLocation(this.program,'uUseTexture');this.uLit=gl.getUniformLocation(this.program,'uLit');this.uFlash=gl.getUniformLocation(this.program,'uFlash');
  gl.vertexAttrib3f(2,0,1,0);
  gl.uniform1i(gl.getUniformLocation(this.program,'uTexture'),0);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
  gl.clearColor(...this.theme.sky);
  const base=circleGeometry(),shadows=circleGeometry(.58,40,-.02),lines=circleLines();
  this.arena={base:this.createMesh(base.verts,base.uv,base.indices,gl.STATIC_DRAW),grid:this.createLines(lines.lines),rim:this.createLines(lines.rim),accent:this.createLines(circleAccentVertices())};
  this.shadow=this.createMesh(shadows.verts,shadows.uv,shadows.indices,gl.STATIC_DRAW);
  this.maxTextureSize=Math.max(64,gl.getParameter(gl.MAX_TEXTURE_SIZE)||1024);
  this.maxRenderbufferSize=Math.max(256,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)||2048);
  const gpuError=gl.getError();if(gpuError!==gl.NO_ERROR)throw Error('WebGL initialization error '+gpuError);
  return true;
 }
 setArenaTheme(name){
  this.theme=ARENA_THEMES[name]||ARENA_THEMES['school-note'];
  if(this.gl)this.gl.clearColor(...this.theme.sky);
 }
 createLines(vertices){
  const gl=this.gl,b=gl.createBuffer(),vao=gl.createVertexArray();
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.disableVertexAttribArray(1);gl.vertexAttrib2f(1,0,0);gl.disableVertexAttribArray(2);gl.bindVertexArray(null);
  return {vao,b,count:vertices.length/3};
 }
 createMesh(vertices,uv,index,usage,normals=null){
  const gl=this.gl,vao=gl.createVertexArray(),vbo=gl.createBuffer(),tbo=gl.createBuffer(),ibo=gl.createBuffer();
  const nbo=normals?gl.createBuffer():null;
  if(!vao||!vbo||!tbo||!ibo||(normals&&!nbo))throw Error('GPU allocation failed');
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,vertices,usage);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,tbo);gl.bufferData(gl.ARRAY_BUFFER,uv,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,0,0);
  if(nbo){gl.bindBuffer(gl.ARRAY_BUFFER,nbo);gl.bufferData(gl.ARRAY_BUFFER,normals,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,3,gl.FLOAT,false,0,0);}
  else{gl.disableVertexAttribArray(2);gl.vertexAttrib3f(2,0,1,0);}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,index,gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return {vao,vbo,tbo,ibo,nbo,count:index.length,indexType:index instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT};
 }
 makeTexture(source){
  const gl=this.gl,maxSize=Math.min(1024,this.maxTextureSize);
  const image=prepareDisplayTexture(source,{maxSize});const tex=gl.createTexture();
  if(!tex)throw Error('GPU texture allocation failed');
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const aniso=typeof gl.getExtension==='function'?gl.getExtension('EXT_texture_filter_anisotropic'):null;
  if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)||1));
  gl.generateMipmap(gl.TEXTURE_2D);
  image.width=image.height=0;
  return tex;
 }
 clearFighters(){if(!this.gl){this.fighters=[];return;}closeResources(this.gl,this.fighters);this.fighters=[];}
 setFighters(datas){
  this.init();const staged=[];
  try{
   for(const data of datas){
    const rig=createVisualRig(data);smoothNormals(rig.positions,rig.geomIndices,rig.normals);const mesh=this.createMesh(rig.positions,rig.uv,rig.geomIndices,this.gl.DYNAMIC_DRAW,rig.normals);
    staged.push({rig,mesh,texture:null});
    staged[staged.length-1].texture=this.makeTexture(data.tex);
   }
   if(staged.length!==2)throw Error('Exactly two fighters required');
   const error=this.gl.getError();if(error!==this.gl.NO_ERROR)throw Error('GPU fighter upload failed '+error);
  }catch(error){closeResources(this.gl,staged);throw error;}
  this.clearFighters();this.fighters=staged;
  this.shake=0;this.accents=[];this.frame=0;this.cameraEye=this.cameraFocus=null;this.lastRenderNow=0;
 }
 markEvent(ev,match){
  if(match)this.accents=appendAccent(this.accents,ev,[match.p1,match.p2]);
  const target=ev.target==='p1'?0:ev.target==='p2'?1:-1;
  if(ev.type==='hit'){this.shake=Math.max(this.shake,this.reducedMotion?0:.10);if(target>=0 && this.fighters[target]){this.fighters[target].rig.flash=1;this.fighters[target].rig.knock=Math.max(this.fighters[target].rig.knock,.55);}}
  if(ev.type==='guard_break'){this.shake=Math.max(this.shake,this.reducedMotion?0:.13);if(target>=0 && this.fighters[target]){this.fighters[target].rig.flash=.75;this.fighters[target].rig.knock=Math.max(this.fighters[target].rig.knock,.85);}}
  if(ev.type==='blocked'||ev.type==='perfect_guard')this.shake=Math.max(this.shake,this.reducedMotion?0:(ev.type==='perfect_guard'?.075:.035));
  if(ev.type==='knockout')this.shake=Math.max(this.shake,this.reducedMotion?0:.18);
 }
 resize(){
  const gl=this.gl,c=this.canvas;if(!gl)return 1;
  const dpr=Math.max(1,Math.min(this.quality.ratio,typeof devicePixelRatio!=='undefined'?devicePixelRatio:1.4));
  const rawW=Math.max(1,Math.round(c.clientWidth*dpr)),rawH=Math.max(1,Math.round(c.clientHeight*dpr));
  const shrink=Math.min(1,this.maxRenderbufferSize/Math.max(rawW,rawH));
  const w=Math.max(1,Math.round(rawW*shrink)),h=Math.max(1,Math.round(rawH*shrink));
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  gl.viewport(0,0,w,h);
  return w/h;
 }
 drawLines(mesh,color,mode){
  const gl=this.gl;gl.uniform4fv(this.uColor,color);gl.uniform1f(this.uUseTexture,0);gl.uniform1f(this.uLit,0);gl.uniform1f(this.uFlash,0);
  gl.bindVertexArray(mesh.vao);gl.drawArrays(mode,0,mesh.count);
 }
 drawPrimitive(mesh,rgba,offset=[0,0,0]){
  const gl=this.gl;gl.uniform3fv(this.uOffset,offset);gl.uniform4fv(this.uColor,rgba);
  gl.uniform1f(this.uUseTexture,0);gl.uniform1f(this.uLit,0);gl.uniform1f(this.uFlash,0);
  gl.bindVertexArray(mesh.vao);gl.drawElements(gl.TRIANGLES,mesh.count,mesh.indexType,0);
 }
 render(match,dt,now){
  const gl=this.gl;if(!gl||this.lost||!match||this.fighters.length!==2)return;
  if(this.lastRenderNow>0)this.quality.sample(now-this.lastRenderNow);
  this.lastRenderNow=now;
  const aspect=this.resize();gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
  const pose=cameraPose(match,aspect);const k=this.cameraEye===null?1:1-Math.exp(-Math.min(.05,dt)*4.5);
  if(this.cameraEye===null){this.cameraEye=pose.eye.slice();this.cameraFocus=pose.focus.slice();}
  else for(let i=0;i<3;i++){this.cameraEye[i]+=(pose.eye[i]-this.cameraEye[i])*k;this.cameraFocus[i]+=(pose.focus[i]-this.cameraFocus[i])*k;}
  const shake=this.shake>.001?Math.sin(now*.064)*this.shake:0;
  const eye=[this.cameraEye[0]+shake,this.cameraEye[1]+shake*.3,this.cameraEye[2]];
  const view=lookAt(eye,this.cameraFocus),proj=perspective(pose.fov*Math.PI/180,aspect,.1,80);
  gl.uniformMatrix4fv(this.uVP,false,multiply4(proj,view));gl.uniform3f(this.uOffset,0,0,0);
  this.drawPrimitive(this.arena.base,this.theme.floor);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  this.drawLines(this.arena.grid,this.theme.grid,gl.LINES);
  this.drawLines(this.arena.rim,[.16,.23,.33,1],gl.LINE_STRIP);
  for(const f of [match.p1,match.p2])this.drawPrimitive(this.shadow,[.16,.22,.28,.18],[f.x,0,f.z]);
  // Hit rings are drawn in world space and use the same authoritative target position.
  this.accents=advanceAccents(this.accents,dt);
  for(const accent of this.accents){
   const style=accentStyle(accent);
   const points=this.arena.accent;
   gl.uniform3f(this.uOffset,accent.x,1.0,accent.z);
   gl.uniformMatrix4fv(this.uVP,false,multiply4(proj,view));
   // The ring mesh is unit-sized; scale by updating its world offset and uniform.
   // uRingScale is also used for neutral geometry, so set it back to 1 immediately.
   gl.uniform1f(this.uRingScale,style.scale);
   this.drawLines(points,[style.color[0],style.color[1],style.color[2],style.opacity],gl.LINE_STRIP);
  }
  gl.uniform1f(this.uRingScale,1);
  gl.depthMask(true);gl.disable(gl.BLEND);
  gl.uniform3f(this.uOffset,0,0,0);
  for(let i=0;i<2;i++){
   const f=this.fighters[i],fighter=i===0?match.p1:match.p2;
   const pos=animateRig(f.rig,fighter,dt,now,i===0?'p1':'p2');
   smoothNormals(pos,f.rig.geomIndices,f.rig.normals);
   gl.bindBuffer(gl.ARRAY_BUFFER,f.mesh.vbo);gl.bufferSubData(gl.ARRAY_BUFFER,0,pos);
   gl.bindBuffer(gl.ARRAY_BUFFER,f.mesh.nbo);gl.bufferSubData(gl.ARRAY_BUFFER,0,f.rig.normals);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,f.texture);
   gl.uniform1f(this.uUseTexture,1);gl.uniform1f(this.uLit,1);gl.uniform1f(this.uFlash,clamp(f.rig.flash,0,1));
   gl.uniform4f(this.uColor,1,1,1,1);
   gl.bindVertexArray(f.mesh.vao);gl.drawElements(gl.TRIANGLES,f.mesh.count,f.mesh.indexType,0);
   f.rig.flash=Math.max(0,f.rig.flash-dt*5);
  }
  this.shake*=Math.exp(-dt*12);this.frame++;
 }
 getDiagnostics(){return {mode:this.gl&&!this.lost?'webgl2':'unavailable',frames:this.frame,qualityLevel:this.quality.level,pixelRatio:this.quality.ratio,canvasPixels:[this.canvas.width,this.canvas.height],reducedMotion:this.reducedMotion,activeAccents:this.accents.length,maxRenderbufferSize:this.maxRenderbufferSize,fighters:this.fighters.length,meshes:this.fighters.map(x=>({vertices:x.rig.data.nv*2,triangles:x.mesh.count/3,contourEdges:x.rig.boundaryCount}))};}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.clearFighters();
  if(this.gl){const gl=this.gl;for(const mesh of Object.values(this.arena||{}))deleteMesh(gl,mesh);deleteMesh(gl,this.shadow);if(this.program)gl.deleteProgram(this.program);}
  this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestore);
  this.gl=null;this.arena=null;this.shadow=null;this.accents=[];
 }
}
