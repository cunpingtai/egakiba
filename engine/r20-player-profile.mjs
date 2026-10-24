/** R20 local player record: a READ-ONLY projection of authoritative R10
 * stage progress and the bounded R19 story journal. Never writes or grants stars.
 * Overall R10 battles and recent-30 R19 journal have DIFFERENT denominators.
 */
import {loadArcadeSave} from './r10-arcade-save.mjs';
import {LEVEL_ORDER} from './level-catalog.mjs';
import {readBattleJournal,HISTORY_LIMIT,escapeResult} from './r19-result-report.mjs';
import {readCampaignSnapshot} from './r14-campaign-progress.mjs';

const translations={
 ja:{title:'文字ブレードのプレイ記録',intro:'文字ブレードのストーリー対戦、ステージベスト、最近の文字バトルを振り返れます。記録はこの端末だけに保存されます。',local:'ローカル / ランキング対象外',lifetime:'ストーリー累計対戦',logged:'最近の対戦',rate:'最近の勝率',cleared:'クリアしたステージ',sample:'勝率は保存済みの直近30件のストーリー対戦のみで計算されます。過去のすべての勝率ではありません。',missing:'最近の対戦履歴はありません。R19以前の対戦結果の明細は復元できません。',blocked:'保存領域にアクセスできません。記録を保存・確認できない場合があります。',stageBest:'ステージベスト',favorite:'よく使う文字（直近30件）',last:'最新の対戦履歴',filterStage:'ステージ',filterOutcome:'結果',allStages:'すべてのステージ',allResults:'すべての結果',win:'勝利',loss:'敗北',draw:'引き分け',unlocked:'クリア',locked:'未クリア',best:'最速',games:'回',empty:'条件に合う対戦はありません。',play:'ステージへ',home:'ホーム',date:'日時',results:'結果',stars:'星',noGlyph:'履歴なし',note:'クラシック対戦は履歴の対象外です。オンライン同期やランキング機能はありません。'},
 zh:{title:'文字对战记录',intro:'回顾文字对战中的故事关卡成绩、最近战斗与常用文字。数据仅保存在当前设备。',local:'本地记录 · 非线上排行榜',lifetime:'故事模式累计对战',logged:'最近战斗记录',rate:'最近战斗胜率',cleared:'已通关关卡',sample:'胜率只根据最近保存的最多30场故事对战计算，并非生涯总胜率。',missing:'暂无最近的逐场战斗记录。R19 之前的逐场记录无法补回。',blocked:'当前设备无法读取本地存档，部分成绩可能不可用。',stageBest:'各关卡最佳成绩',favorite:'常用文字（最近30场）',last:'最近战斗履历',filterStage:'筛选关卡',filterOutcome:'筛选结果',allStages:'全部关卡',allResults:'全部结果',win:'胜利',loss:'失败',draw:'平局',unlocked:'已通关',locked:'未通关',best:'最快',games:'场',empty:'没有符合筛选条件的战斗。',play:'继续闯关',home:'返回首页',date:'日期',results:'胜负',stars:'星级',noGlyph:'暂无数据',note:'Classic 对战尚未记录在此履历中。没有账号同步或线上排名。'},
 en:{title:'Moji Blade battle record',intro:'Review your Moji Blade Story stage bests, recent glyph battles and frequently used glyphs. Stored on this device only.',local:'Local only · Not ranked',lifetime:'Story battles (lifetime)',logged:'Recent matches saved',rate:'Recent win rate',cleared:'Stages cleared',sample:'Win rate uses only the latest 30 saved Story matches, not your lifetime record.',missing:'No recent match details. Matches before R19 cannot be reconstructed.',blocked:'Local storage is unavailable. Some records may not be accessible.',stageBest:'Stage personal bests',favorite:'Most-used glyphs (last 30)',last:'Recent Story matches',filterStage:'Stage',filterOutcome:'Result',allStages:'All stages',allResults:'All results',win:'Win',loss:'Loss',draw:'Draw',unlocked:'Cleared',locked:'Not cleared',best:'Best time',games:'matches',empty:'No matches match these filters.',play:'Continue Story',home:'Return home',date:'Date',results:'Result',stars:'Stars',noGlyph:'No entries yet',note:'Classic matches are not in this journal. No cloud sync or online ranking.'},
 ko:{title:'문자 블레이드 배틀 기록',intro:'스토리 스테이지 최고 기록, 최근 글자 배틀과 자주 사용한 글자를 확인하세요. 이 기기에만 저장됩니다.',local:'로컬 기록 · 랭킹 제외',lifetime:'스토리 누적 배틀',logged:'최근 저장된 경기',rate:'최근 승률',cleared:'클리어 스테이지',sample:'승률은 최근 저장된 스토리 경기 최대 30건에 대해서만 계산합니다. 전체 승률이 아닙니다.',missing:'최근 경기 기록이 없습니다. R19 이전 경기 상세는 복원할 수 없습니다.',blocked:'로컬 저장 공간에 접근할 수 없습니다. 일부 기록을 확인할 수 없습니다.',stageBest:'스테이지 최고 기록',favorite:'자주 사용한 글자 (최근 30경기)',last:'최근 배틀 기록',filterStage:'스테이지',filterOutcome:'결과',allStages:'전체 스테이지',allResults:'전체 결과',win:'승리',loss:'패배',draw:'무승부',unlocked:'클리어',locked:'미클리어',best:'최단 시간',games:'경기',empty:'조건에 맞는 배틀이 없습니다.',play:'스토리 계속',home:'홈으로',date:'날짜',results:'결과',stars:'별',noGlyph:'기록 없음',note:'클래식 대전은 기록되지 않습니다. 클라우드 동기화 및 온라인 랭킹은 없습니다.'}
};
export const profileCopy=(locale='ja')=>translations[locale]||translations.ja;
const safeInt=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const esc=escapeResult;
const outcomeCopy=(o,c)=>o==='win'?c.win:o==='loss'?c.loss:c.draw;
export function readPlayerProfile(storage){
 const loaded=loadArcadeSave(storage),campaign=readCampaignSnapshot(storage),history=readBattleJournal(storage);
 const completed=campaign.stages.filter(s=>s.state==='cleared');
 const wins=history.filter(e=>e.outcome==='win').length;
 const glyphs=new Map();for(const entry of history){if(typeof entry.glyph!=='string'||!entry.glyph||entry.glyph.length>24)continue;glyphs.set(entry.glyph,(glyphs.get(entry.glyph)||0)+1);}
 const favorites=[...glyphs].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5).map(([glyph,count])=>({glyph,count}));
 return {storageStatus:loaded.status,campaign,storyBattles:loaded.status==='unavailable'?null:safeInt(loaded.save.battles),history,wins,losses:history.filter(e=>e.outcome==='loss').length,draws:history.filter(e=>e.outcome==='draw').length,recentWinRate:history.length?Math.round(wins/history.length*100):null,clearedCount:completed.length,stages:campaign.stages,favorites,windowLimit:HISTORY_LIMIT};
}
export function filterPlayerHistory(entries,{stage='all',outcome='all'}={}){
 const validStage=stage==='all'||LEVEL_ORDER.includes(stage);const validOutcome=['all','win','loss','draw'].includes(outcome);
 if(!validStage||!validOutcome)return [];
 return entries.filter(e=>(stage==='all'||e.levelId===stage)&&(outcome==='all'||e.outcome===outcome));
}
function safeDate(value,locale){const epoch=Date.parse(value);if(!Number.isFinite(epoch))return '—';try{return new Intl.DateTimeFormat(locale==='zh'?'zh-CN':locale==='ko'?'ko-KR':locale==='en'?'en-GB':'ja-JP',{timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(epoch))+' UTC';}catch{return '—';}}
export function renderPlayerProfile(snapshot,{locale='ja',stage='all',outcome='all'}={}){
 const c=profileCopy(locale),list=filterPlayerHistory(snapshot.history,{stage,outcome}),marks=n=>'★'.repeat(Math.min(3,Math.max(0,n||0)))+'☆'.repeat(3-Math.min(3,Math.max(0,n||0)));
 const best=snapshot.stages.map(s=>`<article class="r20-stage ${s.state==='cleared'?'is-cleared':'is-pending'}"><span class="r20-stage-num">STAGE ${esc(s.id)}</span><div class="r20-stage-line"><strong>${s.state==='cleared'?marks(s.stars):'☆☆☆'}</strong><span>${esc(s.state==='cleared'?c.unlocked:c.locked)}</span></div><small>${esc(c.best)} · ${Number.isFinite(s.bestSeconds)?s.bestSeconds.toFixed(1)+'s':'—'}</small></article>`).join('');
 const favors=snapshot.favorites.length?snapshot.favorites.map((f,i)=>`<li><span class="r20-rank">${i+1}</span><strong class="r20-glyph">${esc(f.glyph)}</strong><span class="r20-frequency">${f.count} ${esc(c.games)}</span></li>`).join(''):`<li class="r20-blank">${esc(c.noGlyph)}</li>`;
 const rows=list.map(e=>`<li class="r20-match"><span class="r20-match-glyph">${esc(String(e.glyph||'—').slice(0,24))}</span><div><strong>${esc(e.levelId)}</strong><small>${esc(safeDate(e.playedAt,locale))}</small></div><span class="r20-outcome r20-outcome-${esc(e.outcome)}">${esc(outcomeCopy(e.outcome,c))}${e.outcome==='win'&&!e.cleared?' · 0★':''}</span><span class="r20-match-time">${Number.isFinite(e.durationSeconds)?e.durationSeconds.toFixed(1)+'s':'—'}<small>${marks(e.stars)}</small></span></li>`).join('');
 const choice=(value,label,selected)=>`<option value="${esc(value)}" ${selected===value?'selected':''}>${esc(label)}</option>`;
 return `<div class="r20-profile" aria-label="${esc(c.title)}"><header class="r20-hero"><div><span class="flow-kicker">PLAYER RECORD / R20</span><h1 tabindex="-1">${esc(c.title)}</h1><p>${esc(c.intro)}</p></div><span class="r20-local">● ${esc(c.local)}</span></header>
 ${snapshot.storageStatus==='unavailable'?`<p class="r20-warning" role="status">${esc(c.blocked)}</p>`:''}
 <section class="r20-metrics" aria-label="${esc(c.title)}"><article><span>${esc(c.lifetime)}</span><strong>${snapshot.storyBattles??'—'}</strong><small>R10 · ${esc(c.local)}</small></article><article><span>${esc(c.logged)}</span><strong>${snapshot.history.length}<small> / ${HISTORY_LIMIT}</small></strong><small>R19 JOURNAL</small></article><article><span>${esc(c.rate)}</span><strong>${snapshot.recentWinRate===null?'—':snapshot.recentWinRate+'%'}</strong><small>${snapshot.wins}W · ${snapshot.losses}L · ${snapshot.draws}D</small></article><article><span>${esc(c.cleared)}</span><strong>${snapshot.clearedCount}<small> / ${snapshot.stages.length}</small></strong><small>CHAPTER 01</small></article></section>
 <p class="r20-sample-note">${esc(c.sample)}</p>
 <div class="r20-panels"><section class="r20-card"><h2>${esc(c.stageBest)}</h2><div class="r20-stage-grid">${best}</div></section><section class="r20-card"><h2>${esc(c.favorite)}</h2><ol class="r20-favorites">${favors}</ol></section></div>
 <section class="r20-card r20-journal"><div class="r20-journal-heading"><div><h2>${esc(c.last)}</h2><small>${snapshot.history.length} / ${HISTORY_LIMIT} · ${esc(c.local)}</small></div><div class="r20-filters"><label>${esc(c.filterStage)}<select id="r20-filter-stage">${choice('all',c.allStages,stage)}${LEVEL_ORDER.map(id=>choice(id,id,stage)).join('')}</select></label><label>${esc(c.filterOutcome)}<select id="r20-filter-outcome">${choice('all',c.allResults,outcome)}${['win','loss','draw'].map(o=>choice(o,outcomeCopy(o,c),outcome)).join('')}</select></label></div></div>
 ${snapshot.history.length===0?`<p class="r20-empty" role="status">${esc(c.missing)}</p>`:list.length?`<ol class="r20-history">${rows}</ol>`:`<p class="r20-empty" role="status">${esc(c.empty)}</p>`}</section>
 <footer class="r20-actions"><button type="button" class="button button-primary" data-r20-story>${esc(c.play)} ↗</button><button type="button" class="button button-outline" data-r20-home>${esc(c.home)}</button></footer><p class="r20-disclaimer">${esc(c.note)}</p></div>`;
}
