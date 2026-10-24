/** R21 Local glyph collection. This is NOT a ranked/universal encyclopedia.
 * Curated suggestions are not unlocked. Only actual started battles / R19 story
 * journal entries count as discovered; favorites never grant discovery or power.
 */
import {readBattleJournal,escapeResult} from './r19-result-report.mjs';
import {parseGlyphDraft,R16_FONTS} from './r16-glyph-contract.mjs';
export const COLLECTION_KEY='moji-blade.r21.glyph-collection.v1';
export const MAX_COLLECTION=160;
export const SUGGESTED_GLYPHS=Object.freeze(['文','龍','花','剣','力','水','風','田','天','夢','字','山','炎','王','円','火','一','雷','石','空','猫','鳥','愛','星','あ','の','ア','カ','A','B','Z','3','☆','〇']);
export const collectionIdentity=(glyph,font)=>JSON.stringify([glyph,font]);
export function glyphCategory(glyph){
 if(/[\p{Script=Han}]/u.test(glyph))return 'han';
 if(/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(glyph))return 'kana';
 if(/[A-Za-z0-9]/u.test(glyph))return 'latin';
 return 'other';
}
const valid=(glyph,font)=>parseGlyphDraft(glyph).ok&&R16_FONTS.includes(font);
const cleanRecord=record=>{
 if(!record||!valid(record.glyph,record.font))return null;
 return {glyph:parseGlyphDraft(record.glyph).glyph,font:record.font,discovered:record.discovered===true,favorite:record.favorite===true};
};
export function readCollection(storage){
 try{
  storage??=globalThis.localStorage;
  const raw=storage.getItem(COLLECTION_KEY),parsed=raw?JSON.parse(raw):null;
  if(parsed!==null&&(!parsed||parsed.version!==1||!Array.isArray(parsed.entries)))return {entries:[],status:'corrupt'};
  const unique=new Map();
  for(const rec of (parsed?.entries||[]).slice(0,MAX_COLLECTION)){
   const row=cleanRecord(rec);if(!row)continue;
   const key=collectionIdentity(row.glyph,row.font);
   if(!unique.has(key))unique.set(key,row);
  }
  return {entries:[...unique.values()],status:'available'};
 }catch(error){return {entries:[],status:'unavailable'};}
}
export function writeCollection(entries,storage){
 try{
  storage??=globalThis.localStorage;
  const unique=new Map();for(const rec of entries){const row=cleanRecord(rec);if(row)unique.set(collectionIdentity(row.glyph,row.font),row);}
  if(unique.size>MAX_COLLECTION)return {status:'full'};
  storage.setItem(COLLECTION_KEY,JSON.stringify({version:1,entries:[...unique.values()]}));return {status:'saved'};
 }catch{return {status:'unavailable'};}
}
export function markDiscovered(glyph,font,storage){
 if(!valid(glyph,font))return {status:'invalid'};
 const saved=readCollection(storage);if(saved.status!=='available')return {status:saved.status};
 const entries=saved.entries.map(e=>({...e})),key=collectionIdentity(glyph,font),previous=entries.find(e=>collectionIdentity(e.glyph,e.font)===key);
 if(previous){if(previous.discovered)return {status:'unchanged'};previous.discovered=true;}
 else entries.push({glyph,font,discovered:true,favorite:false});
 return writeCollection(entries,storage);
}
export function toggleFavorite(glyph,font,storage){
 if(!valid(glyph,font))return {status:'invalid'};
 const loaded=readCollection(storage);if(loaded.status!=='available')return {status:loaded.status};
 const entries=loaded.entries.map(e=>({...e})),key=collectionIdentity(glyph,font),rec=entries.find(e=>collectionIdentity(e.glyph,e.font)===key);
 if(rec){rec.favorite=!rec.favorite;if(!rec.discovered&&!rec.favorite)entries.splice(entries.indexOf(rec),1);}
 else entries.push({glyph,font,discovered:false,favorite:true});
 return writeCollection(entries,storage);
}
export function readCollectionView(storage){
 const saved=readCollection(storage),history=readBattleJournal(storage),all=new Map();
 const add=(glyph,font,props)=>{
  if(!valid(glyph,font))return;const key=collectionIdentity(glyph,font),previous=all.get(key)||{glyph,font,discovered:false,favorite:false,plays:0,source:'suggested'};
  all.set(key,{...previous,...props,discovered:previous.discovered||props.discovered===true,favorite:previous.favorite||props.favorite===true,plays:previous.plays+(props.plays||0)});
 };
 for(const glyph of SUGGESTED_GLYPHS)add(glyph,'gothic',{});
 for(const record of saved.entries)add(record.glyph,record.font,{discovered:record.discovered,favorite:record.favorite,source:'saved'});
 // R19 only covers the latest 30 Story matches; do not interpret this as lifetime discovery.
 for(const entry of history)add(entry.glyph,entry.font,{discovered:true,plays:1,source:'recent-story'});
 return {items:[...all.values()],storageStatus:saved.status,recentMatchCount:history.length,discoveredCount:[...all.values()].filter(e=>e.discovered).length,favoriteCount:[...all.values()].filter(e=>e.favorite).length};
}
export function filterCollection(items,{query='',category='all',view='all'}={}){
 const term=String(query||'').trim().toLocaleLowerCase();
 return items.filter(row=>{
  if(category!=='all'&&glyphCategory(row.glyph)!==category)return false;
  if(view==='discovered'&&!row.discovered||view==='favorites'&&!row.favorite)return false;
  if(!['all','discovered','favorites'].includes(view))return false;
  return !term||row.glyph.toLocaleLowerCase().includes(term)||row.font.includes(term);
 });
}
const copy={
 ja:{title:'文字ブレード文字図鑑',intro:'文字ブレードの文字図鑑で漢字・かな・英字・記号を検索し、実際に使った文字とお気に入りを管理できます。おすすめ文字は発見済みではありません。',local:'この端末のみ · ランキング対象外',found:'使用済み',favorites:'お気に入り',candidates:'表示中',search:'文字または書体で検索',all:'すべて',han:'漢字',kana:'かな',latin:'英字・数字',other:'記号',viewAll:'すべて',viewDiscovered:'使用済み',viewFavorites:'お気に入り',none:'条件に合う文字がありません。',tip:'R19の直近30件の対戦とR21以降の実際のバトルから記録。過去の全発見数ではありません。',selected:'選択した文字',notFound:'おすすめ · 未使用',fromBattle:'バトルで使用',fav:'お気に入りに追加',unfav:'お気に入り解除',play:'この文字を使う',native:'実際の字形能力を確認',checking:'オリジナル書体を読み込み中…',missing:'書体または字形を読み込めません。数値を推測せず表示を保留します。',hint:'書体ごとに別のコレクションとして保存します。',unavailable:'ローカル保存が使えません。お気に入りは保存できません。',saved:'お気に入りを更新しました。',stats:'オリジナル文字データから計算',font:'書体',speed:'速度',power:'パワー',balance:'バランス',hp:'HP（ストーリー）',back:'ホーム'},
 zh:{title:'文字对战图鉴',intro:'搜索汉字、假名、字母和符号，管理实际用于文字对战的文字与收藏。推荐文字不等于已发现。',local:'仅保存在本机 · 非排行榜',found:'已用于战斗',favorites:'我的收藏',candidates:'当前显示',search:'搜索文字或字体',all:'全部分类',han:'汉字',kana:'假名',latin:'字母与数字',other:'符号',viewAll:'全部',viewDiscovered:'战斗使用过',viewFavorites:'已收藏',none:'暂无符合条件的文字。',tip:'发现记录来自最近30场故事战斗及R21之后实际启动的战斗；并非生涯完整发现总数。',selected:'当前文字',notFound:'推荐探索 · 未使用',fromBattle:'已用于战斗',fav:'加入收藏',unfav:'取消收藏',play:'使用该文字',native:'查看真实字形属性',checking:'正在读取原始字体数据…',missing:'当前缺少字体资源或不支持该文字，暂不显示数值。',hint:'不同字体是独立的收藏条目。',unavailable:'本机存档不可用，收藏无法保存。',saved:'已更新本机收藏。',stats:'源自原生字形的实际属性',font:'字体',speed:'速度',power:'力量',balance:'平衡',hp:'HP（故事模式）',back:'返回首页'},
 en:{title:'Moji Blade glyph collection',intro:'Search kanji, kana, letters and symbols, track glyphs actually used in battle, and manage local favorites. Suggestions do not count as discovered.',local:'On this device · Not ranked',found:'Used in battle',favorites:'Favorites',candidates:'Showing',search:'Search glyph or font',all:'All scripts',han:'Kanji',kana:'Kana',latin:'Letters & digits',other:'Symbols',viewAll:'All glyphs',viewDiscovered:'Played',viewFavorites:'Favorites',none:'No glyphs match these filters.',tip:'Played glyphs come from the latest 30 Story matches and battles actually started since R21. Not a lifetime total.',selected:'Selected glyph',notFound:'Explore · Not played',fromBattle:'Used in battle',fav:'Add favorite',unfav:'Remove favorite',play:'Use this glyph',native:'Inspect native stats',checking:'Loading original font data…',missing:'Font data missing or glyph unsupported. No estimated stats displayed.',hint:'Each font is saved as a separate entry.',unavailable:'Local storage unavailable. Favorites cannot be saved.',saved:'Local favorites updated.',stats:'Measured using the original glyph asset',font:'Font',speed:'Speed',power:'Power',balance:'Balance',hp:'HP (Story)',back:'Home'},
 ko:{title:'문자 블레이드 글자 도감',intro:'한자, 가나, 알파벳과 기호를 검색하고 실제 배틀에서 사용한 글자와 즐겨찾기를 관리하세요. 추천 글자는 발견으로 처리하지 않습니다.',local:'이 기기에만 저장 · 랭킹 제외',found:'배틀 사용',favorites:'즐겨찾기',candidates:'표시 중',search:'글자 또는 서체 검색',all:'전체 분류',han:'한자',kana:'가나',latin:'영문·숫자',other:'기호',viewAll:'전체',viewDiscovered:'사용한 글자',viewFavorites:'즐겨찾기',none:'조건에 맞는 글자가 없습니다.',tip:'최근 스토리 30회 및 R21 이후 실제 시작된 전투에서 사용한 글자만 기록합니다. 전체 누적이 아닙니다.',selected:'선택한 글자',notFound:'추천 · 미사용',fromBattle:'배틀에서 사용',fav:'즐겨찾기 추가',unfav:'즐겨찾기 해제',play:'이 글자 사용',native:'실제 능력치 확인',checking:'원본 글꼴 데이터 확인 중…',missing:'글꼴 또는 글자를 읽을 수 없습니다. 추정 능력치를 표시하지 않습니다.',hint:'서체마다 별도로 수집됩니다.',unavailable:'저장소에 접근할 수 없습니다. 즐겨찾기를 저장할 수 없습니다.',saved:'즐겨찾기를 저장했습니다.',stats:'원본 글자 기반 능력치',font:'글꼴',speed:'속도',power:'파워',balance:'균형',hp:'HP (스토리)',back:'홈'}
};
export const collectionCopy=locale=>copy[locale]||copy.ja;
export function collectionHTML(snapshot,{locale='ja',query='',category='all',view='all',selectedKey}={}){
 const c=collectionCopy(locale),esc=escapeResult,items=filterCollection(snapshot.items,{query,category,view});
 const selected=snapshot.items.find(x=>collectionIdentity(x.glyph,x.font)===selectedKey)||snapshot.items[0];
 const option=(value,label,actual)=>`<option value="${esc(value)}" ${value===actual?'selected':''}>${esc(label)}</option>`;
 const cards=items.map(row=>{
  const id=collectionIdentity(row.glyph,row.font),active=id===collectionIdentity(selected?.glyph,selected?.font);
  return `<button type="button" class="r21-glyph-card ${active?'active':''}" data-r21-select="${esc(id)}" aria-pressed="${active}"><span class="r21-letter">${esc(row.glyph)}</span><span class="r21-card-meta">${esc(row.font)}</span><span class="r21-card-flags">${row.discovered?'✓':''}${row.favorite?' ★':''}${!row.discovered&&!row.favorite?'·':''}</span></button>`;
 }).join('');
 return `<div class="r21-collection"><header class="flow-heading r21-title"><div><span class="flow-kicker">GLYPH ARCHIVE / R21</span><h1 tabindex="-1">${esc(c.title)}</h1><p>${esc(c.intro)}</p></div><span class="flow-status">${esc(c.local)}</span></header>
 <div class="r21-totals"><div><span>${esc(c.found)}</span><strong>${snapshot.discoveredCount}</strong></div><div><span>${esc(c.favorites)}</span><strong>${snapshot.favoriteCount}</strong></div><div><span>${esc(c.candidates)}</span><strong>${items.length}</strong></div></div>
 ${snapshot.storageStatus!=='available'?`<p class="r21-warning" role="status">${esc(c.unavailable)}</p>`:''}
 <div class="r21-layout"><section class="r21-browser" aria-label="${esc(c.title)}"><div class="r21-tools"><label class="r21-search"><span>${esc(c.search)}</span><input id="r21-search" type="search" maxlength="40" value="${esc(query)}" autocomplete="off"/></label><label><span>${esc(c.all)}</span><select id="r21-category">${[['all','all'],['han','han'],['kana','kana'],['latin','latin'],['other','other']].map(([v,k])=>option(v,c[k],category)).join('')}</select></label><label><span>${esc(c.viewAll)}</span><select id="r21-view">${[['all','viewAll'],['discovered','viewDiscovered'],['favorites','viewFavorites']].map(([v,k])=>option(v,c[k],view)).join('')}</select></label></div><div class="r21-grid" id="r21-grid">${cards||`<p class="r21-empty">${esc(c.none)}</p>`}</div></section>
 <aside class="r21-details" aria-label="${esc(c.selected)}"><span class="flow-kicker">${esc(c.selected)}</span><div class="r21-focus">${selected?esc(selected.glyph):'—'}</div><div class="r21-font">${selected?esc(selected.font):'—'} · ${esc(selected?.discovered?c.fromBattle:c.notFound)}</div><p>${esc(c.hint)}</p><div class="r21-buttons"><button type="button" data-r21-favorite ${!selected||snapshot.storageStatus!=='available'?'disabled':''}>${esc(selected?.favorite?c.unfav:c.fav)} ★</button><button type="button" data-r21-inspect ${!selected?'disabled':''}>${esc(c.native)}</button><button type="button" data-r22-open ${!selected?'disabled':''}>${esc(({ja:"詳細ページ",zh:"查看文字详情",en:"Full detail",ko:"상세 페이지"})[locale]||"詳細ページ")} ↗</button><button type="button" data-r23-open>${esc(({ja:'比較ラボ',zh:'文字对比实验室',en:'Comparison lab',ko:'글자 비교 실험실'})[locale]||'比較ラボ')} ⚖</button><button type="button" data-r24-open-ranking>${esc(({ja:'文字能力リサーチ',zh:'最强文字研究',en:'Glyph rankings',ko:'글자 능력 연구'})[locale]||'文字能力リサーチ')} ↗</button><button type="button" class="r21-use" data-r21-use ${!selected?'disabled':''}>${esc(c.play)} ↗</button></div><div id="r21-native" class="r21-native" role="status" aria-live="polite"></div><p id="r21-feedback" class="r21-feedback" role="status" aria-live="polite"></p></aside></div>
 <footer class="r21-foot"><p>${esc(c.tip)}</p><button type="button" data-r21-home>${esc(c.back)} ↗</button></footer></div>`;
}
export function nativeStatsHTML(stats,locale='ja'){
 const c=collectionCopy(locale),esc=escapeResult;
 return `<strong>${esc(c.stats)}</strong><div class="r21-stat-grid">${[['speed','speed'],['power','power'],['balance','balance'],['hp','hp']].map(([key,label])=>`<div><span>${esc(c[label])}</span><b>${Number.isFinite(stats?.[key])?esc(stats[key]):'—'}</b></div>`).join('')}</div>`;
}
