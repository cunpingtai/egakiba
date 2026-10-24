import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parse} from '../legacy-v2/vendor/opentype.js';
import {GlyphLibrary} from '../legacy-v2/glyph.js';
import {FONTS} from '../legacy-v2/fonts.js';
import {createArcadeBattle,replayArcadeBattle} from '../engine/r10-arcade-battle.mjs';
const fontPath=process.env.MOJI_V2_FONT_PATH;
test('Dash alters Rapier velocity and produces a deterministic replay', {skip:!fontPath?'Provide local original font path':false}, async()=>{
 const bytes=fs.readFileSync(fontPath);
 const lib=new GlyphLibrary(parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{lowMemory:true}),FONTS.gothic);
 const args={levelId:'01-01',player:'文',font:'gothic',library:lib,opponentLibrary:lib};
 const input={angle:0,power:.95,spinDirection:1};const match=await createArcadeBattle(args);
 try {
   match.launch(input);match.stepFixed();
   const before=match.native.battle.tops[0].body.linvel();
   const action=match.dash(.6);
   assert.equal(action.ok,true);
   const after=match.native.battle.tops[0].body.linvel();
   assert.notDeepEqual({x:before.x,z:before.z},{x:after.x,z:after.z});
   assert.equal(match.dash(.4).reason,'cooldown');
   for(let i=0;i<3800&&!match.finished;i++)match.stepFixed();
   const original=match.snapshot();
   const replay=await replayArcadeBattle(args,{launch:input,dashes:match.dashes,maxFrames:3800});
   assert.deepEqual(replay.snapshot.hp,original.hp);
   assert.equal(replay.snapshot.stateHash,original.stateHash);
   assert.deepEqual(replay.trace.arcadeActions,match.dashes);
 }finally{match.dispose();}
});
