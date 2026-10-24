#!/usr/bin/env node
/** Generate canonical-candidate masks from user-owned/licensed exporters.
 * Input must include explicit redistribution permission. Script NEVER generates
 * font outlines by scraping online games or bundles font binaries.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {buildCanonicalGlyphPack} from '../engine/canonical-glyph-v7.mjs';
const [source,dest]=process.argv.slice(2);
if(!source||!dest){console.error('Usage: node scripts/build_glyph_pack.mjs input-export.json output-pack.json');process.exit(2);}
try{
 const sourceData=JSON.parse(await readFile(source,'utf8'));
 const pack=await buildCanonicalGlyphPack(sourceData);
 await writeFile(dest,JSON.stringify(pack,null,2)+'\n','utf8');
 console.log(`Candidate pack: ${pack.entries.length} assets, release ${pack.release}, SHA-256 ${pack.sha256}`);
 console.log('Not licensed-asset verification, not V2 physics parity and not eligible for ranked.');
}catch(e){console.error(e.message);process.exitCode=1;}
