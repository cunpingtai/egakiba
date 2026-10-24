import {getGlyphGeometry} from './engine/glyph-source-v7.mjs';
/* R2 Preview3D — local WebGL extrusion from browser font raster masks.
 * This IS a 3D triangle mesh with side faces/depth; it is NOT a production glyph outline,
 * collider or validated game font asset. Never use it for physics or ranked results.
 * No third-party runtime dependency.
 */
const vShader=`attribute vec3 a_position; attribute vec3 a_normal;
uniform mat4 u_mvp; uniform mat4 u_model; varying float v_light;
void main(){vec3 n=normalize(mat3(u_model)*a_normal);v_light=0.59+0.41*max(dot(n,normalize(vec3(-0.35,0.50,0.80))),0.0);gl_Position=u_mvp*vec4(a_position,1.0);}`;
const fShader=`precision mediump float;uniform vec3 u_color;varying float v_light;
void main(){gl_FragColor=vec4(u_color*v_light,1.0);}`;
const matIdentity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){o[c*4+r]=0;for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];}return o;}
function translate(x,y,z){const o=matIdentity();o[12]=x;o[13]=y;o[14]=z;return o;}
function rotZ(a){const c=Math.cos(a),s=Math.sin(a);return [c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];}
function rotY(a){const c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];}
function scale(x,y,z){return [x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1];}
function perspective(fovy,aspect,near,far){let f=1/Math.tan(fovy/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
function lookAt(eye,target,up){let z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
const sub=(a,b)=>a.map((n,i)=>n-b[i]),dot=(a,b)=>a.reduce((t,n,i)=>t+n*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const m=Math.hypot(...a)||1;return a.map(v=>v/m);};
// The preview and local collider now read the exact same binary silhouette asset.
// The source is either an explicitly loaded pack or the browser-font fallback. Neither verifies V2 parity.
function maskFor(ch,font='gothic'){
 const geometry=getGlyphGeometry(ch,font);
 return {occupied:geometry.mask,N:geometry.size,geometry};
}
function meshOfGlyph(ch,font){const {occupied:Nx,N,geometry}=maskFor(ch,font),positions=[],normals=[];const has=(row,col)=>row>=0&&row<N&&col>=0&&col<N&&Nx[row*N+col]>0;
function quad(p1,p2,p3,p4,n){for(const p of [p1,p2,p3,p1,p3,p4]){positions.push(...p);normals.push(...n);}}
const px=x=>(x-geometry.anchor[0])/geometry.maxD*.72,py=row=>(geometry.anchor[1]-row)/geometry.maxD*.72,front=.24,back=-.035;
for(let row=0;row<N;row++){
 let col=0;while(col<N){if(!has(row,col)){col++;continue;}let from=col;while(col<N&&has(row,col))col++;let x0=px(from),x1=px(col),y1=py(row),y0=py(row+1);quad([x0,y0,front],[x1,y0,front],[x1,y1,front],[x0,y1,front],[0,0,1]);quad([x1,y0,back],[x0,y0,back],[x0,y1,back],[x1,y1,back],[0,0,-1]);}
 for(col=0;col<N;col++){if(!has(row,col))continue;const x0=px(col),x1=px(col+1),y0=py(row+1),y1=py(row);
  if(!has(row-1,col))quad([x0,y1,front],[x1,y1,front],[x1,y1,back],[x0,y1,back],[0,1,0]);
  if(!has(row+1,col))quad([x1,y0,front],[x0,y0,front],[x0,y0,back],[x1,y0,back],[0,-1,0]);
  if(!has(row,col-1))quad([x0,y0,front],[x0,y1,front],[x0,y1,back],[x0,y0,back],[-1,0,0]);
  if(!has(row,col+1))quad([x1,y1,front],[x1,y0,front],[x1,y0,back],[x1,y1,back],[1,0,0]);
 }
}
return {positions:new Float32Array(positions),normals:new Float32Array(normals)};
}
function ringMesh(radius=2.7){let positions=[],normals=[];const tri=(a,b,c,n)=>{positions.push(...a,...b,...c);normals.push(...n,...n,...n)};for(let i=0;i<112;i++){const t=i/112*Math.PI*2,t2=(i+1)/112*Math.PI*2;const a=[radius*Math.cos(t),radius*Math.sin(t),-.24],b=[radius*Math.cos(t2),radius*Math.sin(t2),-.24];tri([0,0,-.24],a,b,[0,0,1]);}return {positions:new Float32Array(positions),normals:new Float32Array(normals)};}
function compile(gl,type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh;}
export class GlyphPreview3D{
 constructor(canvas,{glyph='文',font='gothic',rival='斬',view='home'}={}){this.canvas=canvas;this.glyph=glyph;this.font=font;this.rival=rival;this.view=view;this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,preserveDrawingBuffer:false});if(!this.gl)throw Error('WebGL unavailable');const gl=this.gl;const program=gl.createProgram();gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vShader));gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,fShader));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));this.program=program;this.aPos=gl.getAttribLocation(program,'a_position');this.aNormal=gl.getAttribLocation(program,'a_normal');this.uMVP=gl.getUniformLocation(program,'u_mvp');this.uModel=gl.getUniformLocation(program,'u_model');this.uColor=gl.getUniformLocation(program,'u_color');this.meshes={};this.meshes.arena=this.upload(ringMesh());this.meshes.player=this.upload(meshOfGlyph(glyph,font));this.meshes.rival=this.upload(meshOfGlyph(rival,'mincho'));this.elapsed=0;this.dragX=0;this.dragging=false;this.active=true;this.visible=true;this.motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;this.lost=false;this.bind();this.resize();this.prev=0;this.frameHandle=requestAnimationFrame(t=>this.frame(t));}
 upload(data){const gl=this.gl;let pb=gl.createBuffer(),nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,data.positions,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,data.normals,gl.STATIC_DRAW);return {pb,nb,count:data.positions.length/3};}
 swap(name,ch,font){const old=this.meshes[name];if(old){this.gl.deleteBuffer(old.pb);this.gl.deleteBuffer(old.nb);}this.meshes[name]=this.upload(meshOfGlyph(ch,font));}
 setGlyph(ch,font=this.font){if(ch===this.glyph&&font===this.font)return;this.glyph=ch;this.font=font;this.swap('player',ch,font);this.draw();}
 setRival(ch){if(ch===this.rival)return;this.rival=ch;this.swap('rival',ch,'mincho');this.draw();}
 bind(){this.onResize=()=>this.resize();this.ro=new ResizeObserver(this.onResize);this.ro.observe(this.canvas);this.onVisibility=()=>{this.prev=0;this.visible=!document.hidden;};document.addEventListener('visibilitychange',this.onVisibility);this.io=new IntersectionObserver(entries=>{this.visible=entries[0]?.isIntersecting&&!document.hidden;this.prev=0;});this.io.observe(this.canvas);this.canvas.addEventListener('webglcontextlost',this.contextLost=e=>{e.preventDefault();this.lost=true;this.active=false;});this.canvas.addEventListener('pointerdown',this.down=e=>{this.dragging=true;this.lastX=e.clientX;this.canvas.setPointerCapture?.(e.pointerId);});this.canvas.addEventListener('pointermove',this.move=e=>{if(!this.dragging)return;this.dragX=Math.max(-.9,Math.min(.9,this.dragX+(e.clientX-this.lastX)*.008));this.lastX=e.clientX;this.draw();});this.canvas.addEventListener('pointerup',this.up=()=>{this.dragging=false;});this.canvas.addEventListener('pointercancel',this.up);}
 resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(devicePixelRatio||1,2);const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.draw();}
 draw(){if(!this.active||this.lost||!this.canvas.width)return;const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);const asp=this.canvas.width/this.canvas.height;let vp=mul(perspective(.84,asp,.1,50),lookAt([0,-4.3,5.7],[0,0,0],[0,1,0]));const compact=asp<1.1?1.15:1;
 const drawMesh=(mesh,model,color)=>{gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.enableVertexAttribArray(this.aPos);gl.vertexAttribPointer(this.aPos,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.enableVertexAttribArray(this.aNormal);gl.vertexAttribPointer(this.aNormal,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(this.uModel,false,new Float32Array(model));gl.uniformMatrix4fv(this.uMVP,false,mul(vp,model));gl.uniform3fv(this.uColor,new Float32Array(color));gl.drawArrays(gl.TRIANGLES,0,mesh.count);};
 drawMesh(this.meshes.arena,mul(translate(0,0,-.13),scale(1,1,1)),[.72,.82,.84]);
 const rotation=this.motion?this.elapsed*.42:0;const left=mul(translate(this.view==='home'?-.95*compact:0,-.05,.13),mul(rotY(this.dragX*.9),mul(rotZ(-.16+rotation),scale(this.view==='home'?.95:1.36,this.view==='home'?.95:1.36,1))));drawMesh(this.meshes.player,left,[.19,.44,.81]);
 if(this.view==='home'){const right=mul(translate(.94*compact,.3,.1),mul(rotY(-this.dragX*.5),mul(rotZ(.22-rotation*.8),scale(.86,.86,.86))));drawMesh(this.meshes.rival,right,[.86,.37,.28]);}
 }
 frame(t){if(!this.active)return;this.frameHandle=requestAnimationFrame(x=>this.frame(x));if(!this.visible)return;if(t-this.prev<34)return;const dt=this.prev?Math.min(.08,(t-this.prev)/1000):0;this.prev=t;if(this.motion)this.elapsed+=dt;this.draw();}
 destroy(){this.active=false;cancelAnimationFrame(this.frameHandle);this.ro?.disconnect();this.io?.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);const gl=this.gl;Object.values(this.meshes).forEach(mesh=>{gl.deleteBuffer(mesh.pb);gl.deleteBuffer(mesh.nb);});gl.deleteProgram(this.program);}
}
