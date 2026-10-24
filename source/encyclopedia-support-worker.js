import {FONTS} from './fonts.js';
import {createDisplayProbe} from './encyclopedia-display-probe.js';
// Only font faces and tiny 2D masks live here; no physics, meshes or font-outline parser instances.
self.onmessage=async event=>{
 try{
  if(typeof OffscreenCanvas==='undefined'||!self.fonts)throw Error('worker canvas unavailable');
  for(const spec of Object.values(FONTS)){const face=await new FontFace(spec.family,`url(${new URL('./fonts/'+spec.file,import.meta.url)})`,{weight:'500'}).load();self.fonts.add(face);}
  const {glyphs,states}=event.data,indices=new Map(glyphs.map((g,i)=>[g,i])),libraries=new Map(Object.keys(FONTS).map((font,f)=>[font,{supportCache:{has:g=>states[f][indices.get(g)]===2,get:()=>false},hasBundledOutline:g=>states[f][indices.get(g)]===1}]));
  const probe=createDisplayProbe(()=>libraries,{createCanvas:()=>new OffscreenCanvas(256,128)});let rows=[],last=performance.now();
  for(let offset=0;offset<glyphs.length;offset+=32){const part=glyphs.slice(offset,offset+32),values=probe.batch(part);values.forEach((bits,i)=>rows.push([offset+i,bits]));if(performance.now()-last>100){self.postMessage({rows});rows=[];last=performance.now();}await new Promise(resolve=>setTimeout(resolve,0));}
  self.postMessage({rows,done:true});
 }catch(error){self.postMessage({error:String(error?.message||error)});}
};
