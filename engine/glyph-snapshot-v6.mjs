/** R6 PORTABLE geometry snapshots. A snapshot freezes a local raster mask; it
 * does NOT prove font license, authenticity, or equivalence to original V2.
 * Untrusted source; never accept a client-provided snapshot for ranked score.
 */
import {geometryFromMask,assertGeometry,GEOMETRY_VERSION} from './glyph-geometry.mjs';
export const SNAPSHOT_SCHEMA=1;
const MAX_N=256;
const MAX_JSON=120000;
const bitbytes=n=>Math.ceil(n/8);
function encoded(mask){
 const bytes=new Uint8Array(bitbytes(mask.length));
 for(let i=0;i<mask.length;i++)if(mask[i])bytes[i>>3]|=1<<(i&7);
 let str='';for(const b of bytes)str+=String.fromCharCode(b);
 return btoa(str);
}
function decoded(base64,length){
 if(typeof base64!=='string'||base64.length>Math.ceil(bitbytes(length)/3)*4+4||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw Error('Invalid snapshot encoding');
 let data;try{data=atob(base64);}catch{throw Error('Invalid base64 mask');}
 if(data.length!==bitbytes(length))throw Error('Snapshot byte length mismatch');
 const mask=new Uint8Array(length);for(let i=0;i<length;i++)mask[i]=(data.charCodeAt(i>>3)>>(i&7))&1;
 return mask;
}
const goodName=s=>typeof s==='string'&&s.length>0&&s.length<=32&&!/[\u0000-\u001f]/.test(s);
export function packGlyphSnapshot(g){
 assertGeometry(g);
 if(g.size>MAX_N||!goodName(g.glyph)||!goodName(g.font)||!goodName(g.source))throw Error('Geometry not suitable for portable snapshot');
 return {schema:SNAPSHOT_SCHEMA,version:GEOMETRY_VERSION,source:g.source,glyph:g.glyph,font:g.font,size:g.size,maskBits:encoded(g.mask),geometryId:g.id};
}
export function unpackGlyphSnapshot(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(value).length>MAX_JSON)throw Error('Invalid snapshot');
 if(value.schema!==SNAPSHOT_SCHEMA||value.version!==GEOMETRY_VERSION)throw Error('Unknown snapshot version');
 if(!Number.isInteger(value.size)||value.size<16||value.size>MAX_N||![value.glyph,value.font,value.source].every(goodName))throw Error('Invalid snapshot metadata');
 if(!['browser-font-raster','fixture-mask','portable-test-mask','authorized-pack-mask'].includes(value.source))throw Error('Unsupported snapshot source');
 const mask=decoded(value.maskBits,value.size*value.size);
 const geometry=geometryFromMask(mask,value.size,{glyph:value.glyph,font:value.font,source:value.source});
 if(geometry.id!==value.geometryId)throw Error('Snapshot integrity mismatch');
 return geometry;
}
