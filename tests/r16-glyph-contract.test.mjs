import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGlyphDraft,validateGlyphSelectionShape,glyphSelectionKey,createGlyphValidationGate} from '../engine/r16-glyph-contract.mjs';

test('single visible grapheme is kept, NFC-normalized and not truncated',()=>{
 assert.deepEqual(parseGlyphDraft(' 龍 '),{ok:true,glyph:'龍',reason:'valid'});
 assert.equal(parseGlyphDraft('か\u3099').glyph,'が');
 assert.equal(parseGlyphDraft('AB').reason,'multiple');
 assert.equal(parseGlyphDraft('文剣').reason,'multiple');
 assert.equal(parseGlyphDraft('   ').reason,'empty');
 assert.equal(parseGlyphDraft('\u200b').reason,'invisible');
 assert.equal(parseGlyphDraft('\n').reason,'empty');
 assert.equal(parseGlyphDraft('\u0301').reason,'invisible');
});
test('only supported mode and fonts can be selected',()=>{
 assert.equal(validateGlyphSelectionShape({glyph:'字',font:'gothic',mode:'story'}).ok,true);
 assert.equal(validateGlyphSelectionShape({glyph:'字',font:'mincho',mode:'quick'}).ok,true);
 assert.equal(validateGlyphSelectionShape({glyph:'文字',font:'gothic',mode:'story'}).reason,'multiple');
 assert.equal(validateGlyphSelectionShape({glyph:'字',font:'unknown',mode:'story'}).ok,false);
 assert.equal(validateGlyphSelectionShape({glyph:'字',font:'gothic',mode:'ranked'}).ok,false);
});
test('verification starts disabled and becomes ready only on native result',async()=>{
 let release;const g=createGlyphValidationGate(()=>new Promise(r=>release=r));
 const value={glyph:'龍',font:'gothic',mode:'story'};
 const started=g.verify(value);assert.equal(g.snapshot().status,'loading');assert.equal(g.isReady(value),false);
 release({speed:78,power:50,balance:60,hp:91});await started;
 assert.equal(g.isReady(value),true);assert.equal(g.isReady({...value,font:'mincho'}),false);
 assert.equal(g.snapshot().data.hp,91);
});
test('latest selection wins over stale async font validation',async()=>{
 const resolvers=[];const g=createGlyphValidationGate(()=>new Promise((resolve)=>resolvers.push(resolve)));
 const a={glyph:'龍',font:'gothic',mode:'story'},b={...a,font:'mincho'};
 const p1=g.verify(a),p2=g.verify(b);
 resolvers[1]({speed:45});await p2;
 resolvers[0]({speed:90});await p1;
 assert.equal(g.snapshot().key,glyphSelectionKey(b));assert.equal(g.isReady(a),false);assert.equal(g.snapshot().data.speed,45);
});
test('unsupported fonts and missing font resources never become playable',async()=>{
 const g=createGlyphValidationGate(async ({font})=>{throw new Error(font==='pop'?'unsupported glyph':'font unavailable');});
 assert.equal((await g.verify({glyph:'龍',font:'pop',mode:'story'})).reason,'unsupported');
 assert.equal((await g.verify({glyph:'龍',font:'gothic',mode:'story'})).reason,'unavailable');
 assert.equal(g.isReady({glyph:'龍',font:'gothic',mode:'story'}),false);
});
test('invalid draft immediately invalidates previous verified selection',async()=>{
 const g=createGlyphValidationGate(async()=>({speed:25}));
 const value={glyph:'文',font:'gyosho',mode:'quick'};
 await g.verify(value);assert.equal(g.isReady(value),true);
 const result=await g.verify({...value,glyph:'文剣'});assert.equal(result.reason,'multiple');
 assert.equal(g.isReady(value),false);
 g.invalidate();assert.equal(g.snapshot().status,'idle');
});
