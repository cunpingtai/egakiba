#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {validateCanonicalGlyphPack} from '../engine/canonical-glyph-v7.mjs';
const [file,pin]=process.argv.slice(2);
if(!file){console.error('Usage: node scripts/verify_glyph_pack.mjs pack.json [expected-sha256]');process.exit(2);}
try{
 const data=JSON.parse(await readFile(file,'utf8'));
 const report=await validateCanonicalGlyphPack(data,{pinnedSha256:pin||null});
 console.log(JSON.stringify({release:report.release,assets:report.assetCount,sha256:report.packSha256,pinned:report.pinned,ranked:false,licenseVerified:false},null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
