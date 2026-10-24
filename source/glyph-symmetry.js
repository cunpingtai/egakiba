// Approximate shape symmetry, independent of colour, rarity and combat stats.
const cache=new WeakMap();
export const GLYPH_SYMMETRY=Object.freeze({size:96,axes:60,tolerance:2,threshold:.95});
export function glyphSymmetry(metrics,{size=GLYPH_SYMMETRY.size,axes=GLYPH_SYMMETRY.axes,tolerance=GLYPH_SYMMETRY.tolerance,threshold=GLYPH_SYMMETRY.threshold}={}){
 const base=metrics?.baseGlyph||metrics,key=`${size}:${axes}:${tolerance}:${threshold}`;
 if(base&&cache.get(base)?.has(key))return cache.get(base).get(key);
 const triangles=base?.triangles||[],empty={line:false,point:false,lineScore:0,pointScore:0,lineRaw:0,pointRaw:0,axisDegrees:0,pixels:0};
 let area=0,cx=0,cy=0;
 for(const tri of triangles){if(tri.length!==3||tri.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return empty;
  const [a,b,c]=tri,weight=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x));area+=weight;cx+=weight*(a.x+b.x+c.x)/3;cy+=weight*(a.y+b.y+c.y)/3;
 }
 if(!area)return empty;cx/=area;cy/=area;
 let radius=0;for(const tri of triangles)for(const p of tri)radius=Math.max(radius,Math.hypot(p.x-cx,p.y-cy));
 const scale=(size/2-3)/radius,center=(size-1)/2,mask=new Uint8Array(size*size);
 const cross=(a,b,x,y)=>(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);
 for(const tri of triangles){const vertices=tri.map(p=>({x:(p.x-cx)*scale+center,y:(p.y-cy)*scale+center})),[a,b,c]=vertices,sign=cross(a,b,c.x,c.y)>=0?1:-1;
  const minX=Math.max(0,Math.ceil(Math.min(...vertices.map(p=>p.x)))),maxX=Math.min(size-1,Math.floor(Math.max(...vertices.map(p=>p.x)))),minY=Math.max(0,Math.ceil(Math.min(...vertices.map(p=>p.y)))),maxY=Math.min(size-1,Math.floor(Math.max(...vertices.map(p=>p.y))));
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(cross(a,b,x,y)*sign>=-1e-7&&cross(b,c,x,y)*sign>=-1e-7&&cross(c,a,x,y)*sign>=-1e-7)mask[y*size+x]=1;
 }
 const points=[];for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(mask[y*size+x])points.push([x-center,y-center]);if(!points.length)return empty;
 const skeleton=thinMask(mask,size),outline=[];for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(skeleton[y*size+x])outline.push([x-center,y-center]);
 const soft=mask.slice();for(const [x,y] of points){const px=Math.round(x+center),py=Math.round(y+center);for(let dy=-tolerance;dy<=tolerance;dy++)for(let dx=-tolerance;dx<=tolerance;dx++)if(px+dx>=0&&px+dx<size&&py+dy>=0&&py+dy<size)soft[(py+dy)*size+px+dx]=1;}
 // Filled round silhouettes can thin away completely. Keep the raw-area
 // comparison available instead of letting an empty skeleton produce NaN.
 function score(samples,field,cos,sin,point=false,px=0,py=0){if(!samples.length)return 0;let matches=0;for(const [x,y] of samples){const dx=x-px,dy=y-py,tx=Math.round((point?-dx:cos*dx+sin*dy)+center+px),ty=Math.round((point?-dy:sin*dx-cos*dy)+center+py);if(tx>=0&&tx<size&&ty>=0&&ty<size)matches+=field[ty*size+tx];}return matches/samples.length;}
 const softSkeleton=skeleton.slice();for(const [x,y] of outline){const px=Math.round(x+center),py=Math.round(y+center);for(let dy=-tolerance;dy<=tolerance;dy++)for(let dx=-tolerance;dx<=tolerance;dx++)if(dx*dx+dy*dy<=tolerance*tolerance&&px+dx>=0&&px+dx<size&&py+dy>=0&&py+dy<size)softSkeleton[(py+dy)*size+px+dx]=1;}
 const pivots=[[0,0],[(Math.min(...points.map(p=>p[0]))+Math.max(...points.map(p=>p[0])))/2,(Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1])))/2]];
 let best=0,lineRaw=0,lineFill=0,axisDegrees=0;
 for(let i=0;i<axes;i++){const angle=i*Math.PI/axes,cos=Math.cos(2*angle),sin=Math.sin(2*angle);for(const [bx,by] of pivots)for(const offset of [-2,0,2]){const px=bx-Math.sin(angle)*offset,py=by+Math.cos(angle)*offset,raw=score(points,mask,cos,sin,false,px,py),result=Math.max(raw,score(outline,softSkeleton,cos,sin,false,px,py));if(result>=best){if(result>best||raw>lineRaw){best=result;lineRaw=raw;lineFill=score(points,soft,cos,sin,false,px,py);axisDegrees=i*180/axes;}}}}
 let pointScore=0,pointRaw=0,pointFill=0;for(const [bx,by] of pivots)for(const dx of [-2,0,2])for(const dy of [-2,0,2]){const px=bx+dx,py=by+dy,raw=score(points,mask,0,0,true,px,py),candidate=Math.max(raw,score(outline,softSkeleton,0,0,true,px,py));if(candidate>=pointScore){if(candidate>pointScore||raw>pointRaw){pointScore=candidate;pointRaw=raw;pointFill=score(points,soft,0,0,true,px,py);}}}
 const result=Object.freeze({line:best>=threshold&&lineFill>=.6,point:pointScore>=threshold&&pointFill>=.6,lineScore:best,pointScore,lineRaw,pointRaw,lineFill,pointFill,axisDegrees,pixels:points.length,skeletonPixels:outline.length});
 if(base){if(!cache.has(base))cache.set(base,new Map());cache.get(base).set(key,result);}return result;
}

// Preserve connectivity while reducing stroke thickness to a one-pixel skeleton.
function thinMask(mask,size){
 const out=mask.slice();let changed=true,passes=0;
 while(changed&&passes++<size){changed=false;for(let pass=0;pass<2;pass++){const remove=[];
  for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){const i=y*size+x;if(!out[i])continue;const n=[out[i-size],out[i-size+1],out[i+1],out[i+size+1],out[i+size],out[i+size-1],out[i-1],out[i-size-1]],count=n.reduce((a,b)=>a+b,0);if(count<2||count>6)continue;let transitions=0;for(let k=0;k<8;k++)if(!n[k]&&n[(k+1)%8])transitions++;if(transitions!==1)continue;
   if(pass===0?n[0]*n[2]*n[4]||n[2]*n[4]*n[6]:n[0]*n[2]*n[6]||n[0]*n[4]*n[6])continue;remove.push(i);
  }for(const i of remove)out[i]=0;if(remove.length)changed=true;
 }}return out;
}

const defaultKey=Object.values(GLYPH_SYMMETRY).join(':'),pending=new WeakMap(),jobs=new Map();
let worker=null,workerFailed=false,serial=0;
export function cachedGlyphSymmetry(metrics){return cache.get(metrics?.baseGlyph||metrics)?.get(defaultKey)||null;}
function storeSymmetry(base,result){if(!cache.has(base))cache.set(base,new Map());const frozen=Object.freeze(result);cache.get(base).set(defaultKey,frozen);return frozen;}
function finishSymmetry(id,result){
 const job=jobs.get(id);if(!job)return;clearTimeout(job.timer);jobs.delete(id);
 if(result){pending.delete(job.base);job.resolve(storeSymmetry(job.base,result));}
 else setTimeout(()=>{const result=glyphSymmetry(job.base);pending.delete(job.base);job.resolve(result);},0);
}
function failSymmetryWorker(){workerFailed=true;worker?.terminate();worker=null;for(const id of [...jobs.keys()])finishSymmetry(id,null);}
// Only requested party shapes are sent to one lazy worker; no catalog scan or 3D data.
export function prepareGlyphSymmetry(metrics){
 const base=metrics?.baseGlyph||metrics,known=cachedGlyphSymmetry(base);if(known)return Promise.resolve(known);
 if(!base?.triangles?.length)return Promise.resolve(glyphSymmetry(base));
 if(pending.has(base))return pending.get(base);
 let resolve;const promise=new Promise(done=>resolve=done);pending.set(base,promise);
 const id=++serial;const timer=setTimeout(failSymmetryWorker,5000);jobs.set(id,{base,resolve,timer});
 try{
  if(!worker&&!workerFailed&&typeof Worker!=='undefined'){
   worker=new Worker(new URL('./glyph-symmetry-worker.js',import.meta.url),{type:'module'});
   worker.onmessage=event=>{const {id,result}=event.data||{};finishSymmetry(id,result&&typeof result.line==='boolean'&&typeof result.point==='boolean'?result:null);};
   worker.onerror=event=>{event.preventDefault?.();failSymmetryWorker();};
  }
  if(worker)worker.postMessage({id,triangles:base.triangles});else finishSymmetry(id,null);
 }catch{failSymmetryWorker();}
 return promise;
}
