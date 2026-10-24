/** R8 source-scoped native regression. Requires locally installed font assets; never upload fonts. */
import fs from 'node:fs';import crypto from 'node:crypto';
import {parse} from '../legacy-v2/vendor/opentype.js';
import {GlyphLibrary} from '../legacy-v2/glyph.js';
import {FONTS} from '../legacy-v2/fonts.js';
import {simulateClassicTrace} from '../engine/classic-v2-adapter.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/r8-native-golden.json',import.meta.url)));
let failures=0;
for(const item of fixture.cases){
 const path=new URL('../legacy-v2/fonts/'+FONTS[item.font].file,import.meta.url);
 if(!fs.existsSync(path)){console.error('MISSING FONT:',FONTS[item.font].file,'run python scripts/install_font_assets.py --source-zip /path/to/source.zip');failures++;continue;}
 const bytes=fs.readFileSync(path),sha=crypto.createHash('sha256').update(bytes).digest('hex');if(sha!==item.fontSha256){console.error('FONT HASH MISMATCH:',item.font);failures++;continue;}
 const lib=new GlyphLibrary(parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{lowMemory:true}),FONTS[item.font]);
 const trace=await simulateClassicTrace({font:item.font,player:item.chars[0],opponent:item.chars[1],library:lib,opponentLibrary:lib,enemyAction:{angle:.08,power:.8,spinDirection:1}},{action:{angle:.12,power:.86,spinDirection:1}});
 const same=trace.complete&&trace.finalStateHash===item.finalStateHash&&trace.steps===item.steps&&trace.result?.winner===item.result.winner&&trace.result.reason===item.result.reason;
 console.log(same?'PASS':'FAIL',item.font,item.chars.join(' vs '),'winner',trace.result?.winner,'steps',trace.steps,'hash',trace.finalStateHash);
 if(!same)failures++;
}
if(failures){console.error('FAIL:',failures,'native parity case(s)');process.exitCode=1;}else console.log('R8 native golden parity 4/4 PASS · not cross-platform certification');
