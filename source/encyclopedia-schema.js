// The storage key and IndexedDB name stay stable across application releases.
// Change this version (and add a migration) only when the saved schema changes.
export const ENCYCLOPEDIA_VERSION=3;
export const ENCYCLOPEDIA_CATEGORIES=Object.freeze(['kanji','hiragana','katakana','alphanumeric','symbol','emoji','other']);
// Packed entry version 1 has exactly these nine slots. Never append/reorder
// slots in place: introduce a new packed codec when adding a saved counter.
export const PACKED_V1_FIELDS=Object.freeze(['uses','wins','losses','draws','encounters','defeated','lostTo','enemyDraws','recruits']);
export const savedIdentifier=value=>typeof value==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(value);
export function migrateEncyclopedia(value){
 if(!Number.isSafeInteger(value?.version)||value.version<1)throw Error('Invalid collection version');
 if(value.version>ENCYCLOPEDIA_VERSION){const error=Error('Newer collection version');error.code='newer-version';throw error;}
 let data=value;
 while(data.version<ENCYCLOPEDIA_VERSION){
  if(data.version===1)data={...data,version:2,unlocks:{gold:[],rainbow:false}};
  else if(data.version===2)data={...data,version:3,unread:[]};
  else throw Error('Missing collection migration');
 }
 return {data,migrated:data!==value};
}
