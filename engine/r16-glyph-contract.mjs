/** R16: Unicode selection contract; separate from the original V2 physics rules. */
export const R16_FONTS=Object.freeze(['gothic','mincho','pop','gyosho']);
export function parseGlyphDraft(raw){
 const source=String(raw??'').normalize('NFC').trim();
 if(!source)return Object.freeze({ok:false,glyph:'',reason:'empty'});
 if(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(source))return Object.freeze({ok:false,glyph:'',reason:'invisible'});
 const parts=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(source)].map(p=>p.segment):Array.from(source);
 if(parts.length!==1)return Object.freeze({ok:false,glyph:'',reason:'multiple'});
 const glyph=parts[0];
 if(!glyph||!glyph.trim()||!/\P{Mark}/u.test(glyph))return Object.freeze({ok:false,glyph:'',reason:'invisible'});
 return Object.freeze({ok:true,glyph,reason:'valid'});
}
export function glyphSelectionKey({glyph,font,mode}){return JSON.stringify([glyph,font,mode]);}
export function validateGlyphSelectionShape(selection){
 if(!selection||!R16_FONTS.includes(selection.font)||!['story','quick'].includes(selection.mode))return {ok:false,reason:'invalid'};
 const parsed=parseGlyphDraft(selection.glyph);
 return parsed.ok?{...parsed,selectionKey:glyphSelectionKey(selection)}:parsed;
}
/** Prevent a slower earlier font request from overwriting a newer choice. */
export function createGlyphValidationGate(inspect){
 let revision=0,state=Object.freeze({status:'idle',key:null,data:null});
 return {
  snapshot:()=>state,
  isReady(selection){return state.status==='ready'&&state.key===glyphSelectionKey(selection);},
  invalidate(){revision++;state=Object.freeze({status:'idle',key:null,data:null});return state;},
  async verify(selection){
   const key=glyphSelectionKey(selection),shape=validateGlyphSelectionShape(selection),id=++revision;
   if(!shape.ok){state=Object.freeze({status:'invalid',key,data:null,reason:shape.reason});return state;}
   state=Object.freeze({status:'loading',key,data:null});
   try{
    const data=await inspect(selection);
    if(id!==revision)return state;
    state=Object.freeze({status:'ready',key,data});return state;
   }catch(error){
    if(id!==revision)return state;
    const reason=String(error?.message||error).includes('unsupported')?'unsupported':'unavailable';
    state=Object.freeze({status:'invalid',key,data:null,reason});return state;
   }
  }
 };
}
