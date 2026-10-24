/** Single glyph resolver for preview, stats, collider and replay in R7.
 * Without an explicit authorized pack, existing local browser raster is retained.
 */
import {rasterGlyphGeometry} from './glyph-geometry.mjs';
import {findPackedGlyph,validateCanonicalGlyphPack} from './canonical-glyph-v7.mjs';
let candidateCatalog=null;
export function getGlyphGeometry(glyph,font='gothic'){
 return findPackedGlyph(candidateCatalog,glyph,font)||rasterGlyphGeometry(glyph,font);
}
export function glyphAssetStatus(glyph,font='gothic'){
 const geometry=findPackedGlyph(candidateCatalog,glyph,font);
 return geometry?{source:'versioned-pack',release:candidateCatalog.release,sha256:candidateCatalog.packSha256,pinned:candidateCatalog.pinned,ranked:false}:
 {source:'device-font',release:null,sha256:null,pinned:false,ranked:false};
}
export async function installGlyphPack(pack,{pinnedSha256=null}={}){
 const verified=await validateCanonicalGlyphPack(pack,{pinnedSha256});
 candidateCatalog=verified;
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('moji:glyph-pack-loaded',{detail:{release:verified.release,count:verified.assetCount,pinned:verified.pinned}}));
 return {release:verified.release,count:verified.assetCount,pinned:verified.pinned,ranked:false};
}
export function removeGlyphPack(){candidateCatalog=null;}
export async function loadConfiguredGlyphPack(doc=globalThis.document){
 const url=doc?.documentElement?.dataset?.glyphPackUrl;
 const pin=doc?.documentElement?.dataset?.glyphPackSha256;
 if(!url)return {status:'not-configured'};
 // Require a same-origin, explicit application-owned URL; no injected cross-site endpoints.
 const target=new URL(url,doc.baseURI);
 if(target.origin!==new URL(doc.baseURI).origin)throw Error('Cross-origin glyph pack refused');
 if(!pin)throw Error('Production glyph pack requires an independent SHA-256 pin');
 const response=await fetch(target,{cache:'force-cache',credentials:'same-origin'});
 if(!response.ok)throw Error(`Glyph pack HTTP ${response.status}`);
 const size=Number(response.headers.get('content-length')||0);
 if(size>13_000_000)throw Error('Glyph pack file too large');
 const contents=await response.text();if(contents.length>13_000_000)throw Error('Glyph pack response too large');
 const result=await installGlyphPack(JSON.parse(contents),{pinnedSha256:pin});
 return {status:'loaded',...result};
}
