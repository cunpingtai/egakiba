import { CONFIG } from './config.js';

// Each tier is a closed convex frustum, shared by drawing and collision meshes.
// The narrow, centered driver leaves the glyph's holes and separated strokes open.
export const DRIVER_TIERS = Object.freeze([
 {top:-.08, bottom:-.13, topRadius:.18, bottomRadius:.22, metal:true},
 {top:-.13, bottom:-.26, topRadius:.47, bottomRadius:.44, metal:false},
 {top:-.26, bottom:-.39, topRadius:.34, bottomRadius:.26, metal:true, density:.8},
 {top:-.39, bottom:-.51, topRadius:.18, bottomRadius:.18, metal:false, density:.8},
 {top:-.51, bottom:-.62, topRadius:.18, bottomRadius:.05, metal:true, density:.8},
 ].map(tier=>Object.freeze({...tier,
 top:tier.top*CONFIG.topScale,bottom:tier.bottom*CONFIG.topScale,
 topRadius:tier.topRadius*CONFIG.topScale,bottomRadius:tier.bottomRadius*CONFIG.topScale,
})));
export function driverMesh(tier,segments=16) {
 const vertices=[],indices=[];
 for(const [y,radius] of [[tier.top,tier.topRadius],[tier.bottom,tier.bottomRadius]])
  for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;vertices.push(Math.cos(a)*radius,y,Math.sin(a)*radius);}
 for(let i=0;i<segments;i++){const j=(i+1)%segments;indices.push(i,j,segments+i,j,segments+j,segments+i);}
 for(let i=1;i<segments-1;i++){indices.push(0,i+1,i,segments,segments+i,segments+i+1);}
 return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
}
