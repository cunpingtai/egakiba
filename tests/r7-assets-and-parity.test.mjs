import assert from 'node:assert/strict';
import {buildCanonicalGlyphPack,validateCanonicalGlyphPack,findPackedGlyph,canonicalJSONString} from '../engine/canonical-glyph-v7.mjs';
import {installGlyphPack,removeGlyphPack,getGlyphGeometry,glyphAssetStatus} from '../engine/glyph-source-v7.mjs';
import {getCompetitiveReadiness,assertCanSubmitRankedResult} from '../engine/competitive-gate-v7.mjs';
import {compareBattleTrace,runParityCases,ENGINE_CONTRACTS} from '../engine/physics-parity-v7.mjs';
import {geometryFromMask} from '../engine/glyph-geometry.mjs';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const make=(n,shape)=>{const a=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++)a.push(shape(x,y)?1:0);return a;};
const N=40;
const input={release:'synthetic-test-v7',license:{name:'R7 synthetic fixtures, not font assets',publisher:'Moji Blade engineering tests',evidence:'tests only: original geometric squares',redistributionConfirmed:true},assets:[
 {glyph:'田',font:'gothic',size:N,mask:make(N,(x,y)=>x>6&&x<33&&y>6&&y<33&&!(x>14&&x<25&&y>14&&y<25))},
 {glyph:'文',font:'gothic',size:N,mask:make(N,(x,y)=>x>9&&x<31&&y>9&&y<31)},
]};
const p=await buildCanonicalGlyphPack(input);
const reordered=structuredClone(input);reordered.assets.reverse();const p2=await buildCanonicalGlyphPack(reordered);
assert.equal(p.sha256,p2.sha256,'asset input ordering cannot change pack hash');
const out=await validateCanonicalGlyphPack(p,{pinnedSha256:p.sha256});
assert.equal(out.assetCount,2);assert.equal(out.pinned,true);assert.equal(out.competitiveEligible,false);assert.equal(out.licenseVerified,false);
const g=findPackedGlyph(out,'田','gothic');assert.ok(g);assert.equal(g.source,'authorized-pack-mask');
assert.ok(g.stats.maxHp>0);assert.equal(g.id,geometryFromMask(new Uint8Array(input.assets[0].mask),N,{glyph:'田',font:'gothic',source:'authorized-pack-mask'}).id);
assert.equal(findPackedGlyph(out,'字','gothic'),null);
const result=await installGlyphPack(p,{pinnedSha256:p.sha256});assert.equal(result.ranked,false);
assert.equal(getGlyphGeometry('文','gothic').id,findPackedGlyph(out,'文','gothic').id);
assert.equal(glyphAssetStatus('文','gothic').source,'versioned-pack');
assert.equal(glyphAssetStatus('文','mincho').source,'device-font'); // Never silently mix fonts/IDs
removeGlyphPack();
const poison=structuredClone(p);poison.entries[0].snapshot.maskBits='!';await assert.rejects(validateCanonicalGlyphPack(poison),/digest mismatch/i);
const tampered=structuredClone(p);tampered.sha256='a'.repeat(64);await assert.rejects(validateCanonicalGlyphPack(tampered),/digest mismatch/i);
await assert.rejects(validateCanonicalGlyphPack(p,{pinnedSha256:'b'.repeat(64)}),/pinned digest/i);
await assert.rejects(buildCanonicalGlyphPack({...input,license:{...input.license,redistributionConfirmed:false}}),/permission|declaration/i);
await assert.rejects(buildCanonicalGlyphPack({...input,assets:[input.assets[0],input.assets[0]]}),/duplicate/i);
assert.throws(()=>canonicalJSONString({value:NaN}),/Non-finite/);
assert.equal(getCompetitiveReadiness({assetStatus:{source:'server-approved-pack'},ruleset:{id:'production-physics-v1',serverCompatible:true},identity:{authenticated:true},serverVerification:{authoritative:true}}).eligible,false);
assert.throws(()=>assertCanSubmitRankedResult({}),/unavailable/);
const expected={engine:'experimental-hp-r5',rules:ENGINE_CONTRACTS['experimental-hp-r5'].rules,result:{winner:0,reason:'hp-depleted',tick:100,contactCount:4,hp:[55,0],spin:[.2,.1]}};
assert.equal(compareBattleTrace(expected,structuredClone(expected)).passed,true);
const mismatch=structuredClone(expected);mismatch.result.tick++;assert.equal(compareBattleTrace(expected,mismatch).passed,false);
assert.throws(()=>compareBattleTrace(expected,{...expected,engine:'classic-v2',result:expected.result}),/version/);
const suite=await runParityCases([{id:'synthetic-frozen',input:{case:1},expected}],{simulate:async()=>structuredClone(expected)});
assert.equal(suite.passed,true);
const dir=await mkdtemp(path.join(tmpdir(),'moji-r7-'));
try{
 const infile=path.join(dir,'in.json'),outfile=path.join(dir,'pack.json');
 await writeFile(infile,JSON.stringify(input));
 execFileSync('node',['scripts/build_glyph_pack.mjs',infile,outfile],{cwd:new URL('..',import.meta.url)});
 execFileSync('node',['scripts/verify_glyph_pack.mjs',outfile,p.sha256],{cwd:new URL('..',import.meta.url)});
 assert.equal(JSON.parse(await readFile(outfile)).sha256,p.sha256);
}finally{await rm(dir,{recursive:true,force:true});}
console.log('R7 PASS: pinned SHA-256 packs, mask reuse, invalid asset refusal, CLI build/verify, parity adapter, competitive fail-closed');
