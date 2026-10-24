import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {parse} from '../legacy-v2/vendor/opentype.js';
import {GlyphLibrary} from '../legacy-v2/glyph.js';
import {Battle,initPhysics} from '../legacy-v2/physics.js';
import {FONTS} from '../legacy-v2/fonts.js';
import {PHYSICS_VERSION} from '../legacy-v2/config.js';
import {createClassicBattle,simulateClassicTrace,CLASSIC_V2_PHYSICS} from '../engine/classic-v2-adapter.mjs';

const glyphFile=process.env.MOJI_V2_FONT_PATH;
test('R8 preserves exact uploaded native physics identity',()=>{
 assert.equal(CLASSIC_V2_PHYSICS,'moji-blade-rapier021-r16-app-inner1');
 assert.equal(PHYSICS_VERSION,CLASSIC_V2_PHYSICS);
});
test('Native adapter only with authorized local font file', {skip:!glyphFile?'Set MOJI_V2_FONT_PATH to locally extracted source.zip font to run genuine 3D parity tests':false},async()=>{
 const data=fs.readFileSync(glyphFile);const bytes=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
 const library=new GlyphLibrary(parse(bytes,{lowMemory:true}),FONTS.gothic);
 await initPhysics();
 const cases=[{chars:['文','字'],player:{angle:.12,power:.8,spinDirection:1},opponent:{angle:0,power:.7,spinDirection:1}},
              {chars:['田','力'],player:{angle:-.32,power:.7,spinDirection:-1},opponent:{angle:.12,power:.85,spinDirection:1}},
              {chars:['山','剣'],player:{angle:.22,power:.92,spinDirection:1},opponent:{angle:-.15,power:.72,spinDirection:-1}}];
 for(const c of cases){
  const [pa,en]=c.chars;const g=[library.get(pa),library.get(en)];
  // Untouched V2 constructor is the ground truth for this exact local copy.
  const original=new Battle(g,c.opponent,{stageId:'standard'});original.launch(c.player.angle,c.player.power,c.player.spinDirection);
  const adapter=await createClassicBattle({player:pa,opponent:en,font:'gothic',library,opponentLibrary:library,enemyAction:c.opponent});adapter.launch(c.player);
  const samples=[];
  for(let i=0;i<3500;i++){
    original.advance(1/60);adapter.stepFixed();
    if(i%30===0||original.result||adapter.battle.result){
      assert.equal(adapter.snapshot().stateHash,original.stateHash(),`${pa} vs ${en}, tick ${i}`);
      samples.push(original.stateHash());
    }
    if(original.result||adapter.battle.result)break;
  }
  assert.ok(original.result,'The original engine must have terminated');
  assert.deepEqual(adapter.snapshot().result,original.result);
  assert.ok(samples.length>3);
  original.dispose();adapter.dispose();
  const a=await simulateClassicTrace({player:pa,opponent:en,library,opponentLibrary:library,enemyAction:c.opponent},{action:c.player,sampleEvery:30});
  const b=await simulateClassicTrace({player:pa,opponent:en,library,opponentLibrary:library,enemyAction:c.opponent},{action:c.player,sampleEvery:30});
  assert.equal(a.finalStateHash,b.finalStateHash);assert.deepEqual(a.result,b.result);
 }
});
