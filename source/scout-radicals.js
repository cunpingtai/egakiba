// The full table is imported only for a full three-kanji Scout party.
const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const threeKanji=party=>Array.isArray(party)&&party.length===3&&party.every(member=>typeof member?.glyph==='string'&&/^\p{Unified_Ideograph}$/u.test(member.glyph));
export function createScoutRadicals(load=()=>import('./kanji-radicals-data.js')){
 let data=null,loading=null;
 function radical(glyph){
  if(!data||typeof glyph!=='string'||!/^\p{Unified_Ideograph}$/u.test(glyph))return 0;
  const code=glyph.codePointAt(0);let low=0,high=data.ranges.length-1;
  while(low<=high){
   const mid=(low+high)>>>1,[start,end,offset]=data.ranges[mid];
   if(code<start){high=mid-1;continue;}if(code>end){low=mid+1;continue;}
   // Decode just this byte, avoiding a full decoded copy or a 100k-entry Map.
   const index=offset+code-start,part=index%3,at=Math.floor(index/3)*4+part;
   const a=ALPHABET.indexOf(data.base64[at]),b=ALPHABET.indexOf(data.base64[at+1]);
   if(a<0||b<0)return 0;
   const value=part===0?(a<<2)|(b>>>4):part===1?((a&15)<<4)|(b>>>2):((a&3)<<6)|b;
   return value>=1&&value<=214?value:0;
  }
  return 0;
 }
 return {
  async prepare(party){
   if(data||!threeKanji(party))return;
   if(!loading)loading=Promise.resolve().then(load).then(module=>{const next=module.RADICAL_DATA;if(next?.version!==1||next.symbols?.length!==214||!Array.isArray(next.ranges)||typeof next.base64!=='string')throw Error('Invalid radical data');data=next;}).catch(()=>{loading=null;throw Error('部首データを読み込めません。もう一度お試しください。');});
   await loading;
  },
  radical,
  symbol:id=>Number.isInteger(id)&&id>=1&&id<=214?data?.symbols[id-1]||'':''
 };
}
const shared=createScoutRadicals();
export const prepareScoutRadicals=shared.prepare;
export const scoutRadical=shared.radical;
export const scoutRadicalSymbol=shared.symbol;
