/** R7 canonical candidate pack: deterministic asset bytes + SHA-256 integrity.
 * A digest prevents accidental substitution ONLY when independently pinned.
 * It is NOT a license audit, signed release, server authority or V2 physics parity.
 */
import {geometryFromMask} from './glyph-geometry.mjs';
import {packGlyphSnapshot,unpackGlyphSnapshot} from './glyph-snapshot-v6.mjs';
export const GLYPH_PACK_SCHEMA=7;
export const GLYPH_PACK_SOURCE='authorized-pack-mask';
const MAX_ASSETS=1500,MAX_PACK_BYTES=13_000_000;
const textBytes=s=>new TextEncoder().encode(s);
export function canonicalJSONString(value){
 if(value===null)return 'null';
 if(typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite JSON number');return JSON.stringify(value);}
 if(Array.isArray(value))return '['+value.map(canonicalJSONString).join(',')+']';
 if(typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){const keys=Object.keys(value).sort();return '{'+keys.map(k=>JSON.stringify(k)+':'+canonicalJSONString(value[k])).join(',')+'}';}
 throw Error('Not a plain JSON value');
}
export async function sha256Hex(data){
 if(!globalThis.crypto?.subtle?.digest)throw Error('WebCrypto SHA-256 unavailable');
 const hash=await crypto.subtle.digest('SHA-256',textBytes(data));
 return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
const exactHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const validToken=(s,max=80)=>typeof s==='string'&&s.length>0&&s.length<=max&&!/[\x00-\x1f]/.test(s);
const glyphKey=(glyph,font)=>JSON.stringify([glyph,font]);
function enforcePermission(license){
 if(!license||!validToken(license.name,120)||!validToken(license.publisher,120)||!validToken(license.evidence,512)||license.redistributionConfirmed!==true)
  throw Error('Asset release requires explicit source and redistribution declaration');
}
function validateBuildInput(input){
 if(!input||!validToken(input.release,64)||!Array.isArray(input.assets)||input.assets.length<1||input.assets.length>MAX_ASSETS)throw Error('Invalid glyph pack build input');
 enforcePermission(input.license);
 const seen=new Set();
 for(const entry of input.assets){
  if(!entry||!validToken(entry.glyph,16)||!validToken(entry.font,32)||!Number.isInteger(entry.size)||entry.size<16||entry.size>256||!Array.isArray(entry.mask)||entry.mask.length!==entry.size**2||!entry.mask.every(b=>b===0||b===1))throw Error('Invalid glyph export');
  const key=glyphKey(entry.glyph,entry.font);if(seen.has(key))throw Error('Duplicate glyph/font entry');seen.add(key);
 }
}
/** Input is an exporter-produced mask file from assets with redistribution rights. */
export async function buildCanonicalGlyphPack(input){
 validateBuildInput(input);
 const entries=[];
 for(const item of input.assets){
  const geometry=geometryFromMask(Uint8Array.from(item.mask),item.size,{glyph:item.glyph,font:item.font,source:GLYPH_PACK_SOURCE});
  const snapshot=packGlyphSnapshot(geometry);
  entries.push({glyph:item.glyph,font:item.font,snapshot,sha256:await sha256Hex(canonicalJSONString(snapshot))});
 }
 entries.sort((a,b)=>glyphKey(a.glyph,a.font)<glyphKey(b.glyph,b.font)?-1:glyphKey(a.glyph,a.font)>glyphKey(b.glyph,b.font)?1:0);
 const payload={schema:GLYPH_PACK_SCHEMA,release:input.release,physicsCompatibility:'unverified-v2',license:{name:input.license.name,publisher:input.license.publisher,evidence:input.license.evidence,redistributionConfirmed:true},entries};
 return {...payload,sha256:await sha256Hex(canonicalJSONString(payload))};
}
/** Performs integrity/schema checks; provenance is a declaration, not verified ownership. */
export async function validateCanonicalGlyphPack(pack,{pinnedSha256=null}={}){
 if(!pack||typeof pack!=='object'||Array.isArray(pack)||pack.schema!==GLYPH_PACK_SCHEMA||!Array.isArray(pack.entries)||pack.entries.length<1||pack.entries.length>MAX_ASSETS||!validToken(pack.release,64)||!exactHash(pack.sha256))throw Error('Invalid glyph pack schema');
 if(JSON.stringify(pack).length>MAX_PACK_BYTES)throw Error('Pack over size limit');
 enforcePermission(pack.license);
 if(pack.physicsCompatibility!=='unverified-v2')throw Error('Invalid compatibility declaration');
 const {sha256,...body}=pack;
 if(await sha256Hex(canonicalJSONString(body))!==sha256)throw Error('Glyph pack digest mismatch');
 if(pinnedSha256!==null&&(!exactHash(pinnedSha256)||pinnedSha256!==sha256))throw Error('Glyph pack does not match pinned digest');
 const geometries=new Map();
 for(const item of pack.entries){
  if(!item||!validToken(item.glyph,16)||!validToken(item.font,32)||!exactHash(item.sha256)||!item.snapshot)throw Error('Invalid glyph entry');
  const key=glyphKey(item.glyph,item.font);
  if(geometries.has(key))throw Error('Duplicate glyph asset');
  if(item.snapshot.source!==GLYPH_PACK_SOURCE||item.snapshot.glyph!==item.glyph||item.snapshot.font!==item.font)throw Error('Asset source or identity mismatch');
  if(await sha256Hex(canonicalJSONString(item.snapshot))!==item.sha256)throw Error('Glyph asset digest mismatch');
  geometries.set(key,unpackGlyphSnapshot(item.snapshot));
 }
 return Object.freeze({packSha256:sha256,release:pack.release,assetCount:geometries.size,integrity:'sha256-ok',pinned:pinnedSha256!==null,competitiveEligible:false,licenseVerified:false,geometries});
}
export function findPackedGlyph(catalog,glyph,font){return catalog?.geometries?.get(glyphKey(glyph,font))||null;}
/** No pack shipping in R7; all tests use synthetic fixture shapes. */
