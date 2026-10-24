/** R19 local match report. Presentation and optional journal only;
 * the R10 verified campaign save remains the sole authority for stage unlocks.
 * No remote/ranked score claims are made here.
 */
import {getStageMission} from './r15-stage-board.mjs';
import {LEVEL_CATALOG} from './level-catalog.mjs';
export const R19_HISTORY_KEY='moji-blade.r19.story-result-history.v1';
export const HISTORY_LIMIT=30;
const STRINGS={
 ja:{title:'文字ブレードのバトル結果',reason:'決着',duration:'試合時間',dash:'DASH',events:'接触イベント',hp:'残りHP',main:'クリア条件',extra:'追加目標',met:'達成',miss:'未達成',previous:'これまでの記録',bestStars:'最高の星',bestTime:'最速クリア',none:'初挑戦',newStars:'星の新記録',newTime:'タイム新記録',noRank:'ローカル記録・ランキング対象外',saved:'ステージ進行を保存済み',memory:'進行を保存できませんでした',journal:'直近の対戦記録を端末に保存',noJournal:'対戦履歴は保存できませんでした',history:'最近の戦績',clear:'ステージクリア',failed:'クリア条件未達成',won:'勝利',lost:'敗北',draw:'引き分け'},
 zh:{title:'文字对战结算',reason:'结束原因',duration:'战斗耗时',dash:'DASH',events:'接触事件',hp:'剩余 HP',main:'主任务',extra:'额外任务',met:'已完成',miss:'未完成',previous:'历史最佳',bestStars:'最高星级',bestTime:'最快通关',none:'暂无通关记录',newStars:'刷新星级',newTime:'刷新时间纪录',noRank:'仅本地记录 · 不计线上排行',saved:'关卡进度已保存',memory:'关卡进度保存失败',journal:'本机战斗履历已保存',noJournal:'战斗履历无法保存',history:'最近战绩',clear:'任务达成',failed:'未达成关卡目标',won:'胜利',lost:'失败',draw:'平局'},
 en:{title:'Moji Blade battle results',reason:'Finish reason',duration:'Duration',dash:'DASH',events:'Contact events',hp:'HP remaining',main:'Main objective',extra:'Bonus objective',met:'Complete',miss:'Not met',previous:'Previous best',bestStars:'Best stars',bestTime:'Fastest clear',none:'No clear yet',newStars:'New star record',newTime:'New time record',noRank:'Local records only · Not ranked',saved:'Stage progress saved',memory:'Stage progress could not be saved',journal:'Recent result saved on this device',noJournal:'Could not save match history',history:'Recent results',clear:'Stage cleared',failed:'Stage objective not met',won:'Victory',lost:'Defeat',draw:'Draw'},
 ko:{title:'문자 블레이드 배틀 결과',reason:'종료 사유',duration:'경기 시간',dash:'DASH',events:'접촉 이벤트',hp:'남은 HP',main:'주요 목표',extra:'추가 목표',met:'완료',miss:'미달성',previous:'이전 최고 기록',bestStars:'최고 별',bestTime:'최단 시간',none:'클리어 기록 없음',newStars:'별 신기록',newTime:'시간 신기록',noRank:'로컬 기록 · 랭킹 미반영',saved:'스테이지 진행 저장 완료',memory:'진행 저장 실패',journal:'기기에 전투 기록 저장됨',noJournal:'전투 기록 저장 실패',history:'최근 기록',clear:'스테이지 클리어',failed:'목표 미달성',won:'승리',lost:'패배',draw:'무승부'}
};
export const resultCopy=locale=>STRINGS[locale]||STRINGS.ja;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export const safeSeconds=n=>finite(n)&&n>=0?`${n.toFixed(1)}s`:'—';
export const escapeResult=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function buildStoryReport({levelId,trace,action,evaluation,previousProgress={},saveStatus='memory-only',locale='ja',glyph='文',font='gothic'}={}){
 const level=LEVEL_CATALOG[levelId];if(!level)throw Error('Unknown level');
 if(!trace?.result||![0,1,null].includes(trace.result.winner)||!Number.isInteger(trace.frames)||trace.frames<=0||!Array.isArray(trace.hp)||trace.hp.length!==2)throw Error('Invalid finished trace');
 const time=trace.frames/60,win=trace.result.winner===0,cleared=Boolean(evaluation?.cleared&&win),stars=cleared?Math.min(3,Math.max(1,evaluation.stars||1)):0;
 const maxHp=Number(trace.stats?.[0]?.maxHp);const hp=finite(trace.hp[0])?Math.max(0,trace.hp[0]):0;const hpRatio=finite(maxHp)&&maxHp>0?hp/maxHp:0;
 const mission=getStageMission(levelId,locale),past=previousProgress?.[levelId]??null,oldStars=past?.stars||0,oldTime=finite(past?.bestSeconds)?past.bestSeconds:null;
 const checks=[{label:mission.conditions[0].text,passed:cleared},{label:mission.conditions[1].text,passed:cleared&&hpRatio>=.55},{label:mission.conditions[2].text,passed:cleared&&time<=level.targetSeconds}];
 // The actual evaluator, not this view, remains authoritative.
 return Object.freeze({levelId,glyph,font,locale,kind:'story',outcome:win?'win':trace.result.winner===null?'draw':'loss',reason:trace.result.reason||'—',time,hp,maxHp,hpRatio,stars,cleared,checks,
  dashCount:Array.isArray(trace.arcadeActions)?trace.arcadeActions.length:0,contactEvents:Array.isArray(trace.events)?trace.events.length:0,
  oldStars,oldTime,newStarRecord:saveStatus==='saved'&&cleared&&stars>oldStars,newTimeRecord:saveStatus==='saved'&&cleared&&(oldTime===null||time<oldTime),saveStatus,rule:trace.rulesetVersion||'local',
  // Non-authoritative recent-battles journal entry, never a leaderboard submission.
  journalEntry:{version:1,mode:'story',levelId,glyph:String(glyph).slice(0,12),font:String(font).slice(0,30),outcome:win?'win':trace.result.winner===null?'draw':'loss',cleared,stars,durationSeconds:time,hpRemaining:hp,dashCount:Array.isArray(trace.arcadeActions)?trace.arcadeActions.length:0,contactEvents:Array.isArray(trace.events)?trace.events.length:0,ruleset:String(trace.rulesetVersion||'local').slice(0,80),playedAt:new Date().toISOString()}
 });
}
const validatedEntry=e=>e&&e.version===1&&e.mode==='story'&&Object.hasOwn(LEVEL_CATALOG,e.levelId)&&['win','loss','draw'].includes(e.outcome)&&Number.isInteger(e.stars)&&e.stars>=0&&e.stars<=3&&finite(e.durationSeconds)&&e.durationSeconds>0&&typeof e.playedAt==='string';
export function readBattleJournal(storage){try{storage??=globalThis.localStorage;const parsed=JSON.parse(storage.getItem(R19_HISTORY_KEY)||'[]');return Array.isArray(parsed)?parsed.filter(validatedEntry).slice(0,HISTORY_LIMIT):[];}catch{return [];}}
export function writeBattleJournal(entry,storage){if(!validatedEntry(entry))return {status:'invalid'};
 try{storage??=globalThis.localStorage;const history=[entry,...readBattleJournal(storage)].slice(0,HISTORY_LIMIT);storage.setItem(R19_HISTORY_KEY,JSON.stringify(history));return {status:'saved',history};}
 catch(error){return {status:'unavailable',error:String(error)};}
}
export function storyResultHTML(report,{reason='',journalStatus='unavailable',recent=[]}={}){
 const c=resultCopy(report.locale),esc=escapeResult,marks=n=>'★'.repeat(n)+'☆'.repeat(3-n);
 const best=report.oldStars?`${marks(report.oldStars)} · ${safeSeconds(report.oldTime)}`:c.none;
 const status=report.saveStatus==='saved'?c.saved:c.memory;
 const winning=report.outcome==='win'?c.won:report.outcome==='loss'?c.lost:c.draw;
 const history=recent.slice(0,3).map(e=>`<li><span>${esc(e.levelId)} · ${esc(e.glyph)}</span><b>${esc(resultCopy(report.locale)[e.outcome==='win'?'won':e.outcome==='draw'?'draw':'lost'])}</b><span>${marks(e.stars)} · ${safeSeconds(e.durationSeconds)}</span></li>`).join('');
 return `<section class="r19-report" aria-label="${esc(c.title)}"><header class="r19-top"><small>STAGE ${esc(report.levelId)} · ${esc(c.title)}</small><strong class="r11-finish-title">${esc(winning)}</strong><span class="r19-reason">${esc(c.reason)}: ${esc(reason||report.reason)}</span><div class="r9-result-stars" aria-label="${report.stars} / 3">${marks(report.stars)}</div><p class="r19-clear">${esc(report.cleared?c.clear:c.failed)}</p></header>
 <div class="r19-metrics"><div><span>${esc(c.duration)}</span><strong>${safeSeconds(report.time)}</strong></div><div><span>${esc(c.hp)}</span><strong>${Math.round(report.hp)}${report.maxHp>0?` / ${Math.round(report.maxHp)}`:''}</strong></div><div><span>${esc(c.dash)}</span><strong>${report.dashCount}</strong></div><div><span>${esc(c.events)}</span><strong>${report.contactEvents}</strong></div></div>
 <div class="r19-grid"><section class="r19-panel r19-mission"><h3>${esc(c.main)} / ${esc(c.extra)}</h3><ul>${report.checks.map((x,i)=>`<li class="${x.passed?'passed':'missed'}"><span aria-hidden="true">${x.passed?'✓':'○'}</span><span>${esc(x.label)}</span><b>${esc(x.passed?c.met:c.miss)}</b></li>`).join('')}</ul></section>
 <section class="r19-panel r19-record"><h3>${esc(c.previous)}</h3><p>${esc(best)}</p>${report.newStarRecord?`<span class="r19-record-badge">★ ${esc(c.newStars)}</span>`:''}${report.newTimeRecord?`<span class="r19-record-badge">⏱ ${esc(c.newTime)}</span>`:''}<p class="r19-save ${report.saveStatus==='saved'?'saved':'warning'}" role="status">${esc(status)}</p><small>${esc(c.noRank)}</small></section></div>
 ${history?`<details class="r19-recent"><summary>${esc(c.history)} · ${recent.length}</summary><ul>${history}</ul></details>`:''}
 <p class="r19-journal">${esc(journalStatus==='saved'?c.journal:c.noJournal)}</p></section>`;
}
export function classicResultHTML({locale='ja',type='draw',duration=0,reason='',contactEvents=0}={}){
 const c=resultCopy(locale),esc=escapeResult,win=type==='win'?c.won:type==='loss'?c.lost:c.draw;
 return `<section class="r19-report r19-classic-report"><header class="r19-top"><small>CLASSIC · ${esc(c.title)}</small><strong class="r11-finish-title">${esc(win)}</strong><p class="r19-reason">${esc(c.reason)}: ${esc(reason)}</p></header><div class="r19-metrics"><div><span>${esc(c.duration)}</span><strong>${safeSeconds(duration)}</strong></div><div><span>${esc(c.events)}</span><strong>${Math.max(0,Math.trunc(contactEvents))}</strong></div></div><p class="r19-journal">${esc(c.noRank)}</p></section>`;
}
