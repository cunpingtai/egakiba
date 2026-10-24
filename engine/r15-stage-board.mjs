/** R15 Story Board — presentation only; current playable missions and star thresholds
 * are derived from LEVEL_CATALOG/evaluateLevelResult. Planned chapters are
 * announcements, never playable stage IDs or save entries.
 */
import { LEVEL_CATALOG, LEVEL_ORDER } from './level-catalog.mjs';
import { readCampaignSnapshot } from './r14-campaign-progress.mjs';

const COPY = Object.freeze({
  ja: {
    names:['はじめての発射','力のコントロール','角度のひみつ','第一の試練'],
    tips:['基本操作を覚えて、最初の相手に勝とう。','発射パワーを65%以上に設定して勝利しよう。','発射角度を中心から9°以上ずらして勝利しよう。','第一章のボス「剣」を倒そう。'],
    victory:'勝利する',power:'発射パワー65%以上で勝利',angle:'発射角度9°以上で勝利',boss:'ボス「剣」に勝利',
    hp:'勝利時の残りHPが55%以上',time:n=>`${n}秒以内にクリア`,
    stars:'星',clear:'クリア済み',next:'挑戦可能',locked:'未解放',best:'ベスト',mission:'クリア条件',reward:'星の獲得条件',storage:'保存できません。次のステージは解放されません。',
    ready:'バトルへ',replay:'再挑戦',unavailable:'前のステージをクリアすると解放',total:'第1章の進捗',chapter:'第1章',complete:'全ステージクリア',hint:'星2・3は追加の達成条件です。星1のクリア条件を満たす必要があります。',
  },
  zh: {
    names:['初次发射','力度训练','角度的奥秘','初次试炼'],
    tips:['掌握基础发射操作，赢得第一场战斗。','将发射力度调到至少65%，并击败对手。','发射角度偏离正中至少9°后取得胜利。','挑战第一章 Boss「剣」。'],
    victory:'击败对手',power:'至少65%力度获胜',angle:'至少9°发射偏角获胜',boss:'击败首领「剣」',
    hp:'胜利时剩余HP至少55%',time:n=>`${n}秒内完成`,
    stars:'星星',clear:'已通关',next:'可挑战',locked:'未解锁',best:'最快',mission:'通关目标',reward:'三星条件',storage:'本机无法保存，因此不能永久解锁后续关卡。',
    ready:'选择文字并挑战',replay:'再次挑战',unavailable:'完成前一关后解锁',total:'第一章进度',chapter:'第一章',complete:'全部通关',hint:'第二星和第三星属于额外条件，必须先满足一星通关目标。',
  },
  en: {
    names:['First Launch','Power Control','Angle Control','First Trial'],
    tips:['Learn the launch controls and win your first match.','Win with your launch power at 65% or higher.','Win after aiming at least 9° away from center.','Take down the Chapter One boss 剣.'],
    victory:'Win the match',power:'Win with at least 65% launch power',angle:'Win at an aim angle of at least 9°',boss:'Defeat the boss 剣',
    hp:'Finish with at least 55% of max HP',time:n=>`Finish within ${n} seconds`,
    stars:'Stars',clear:'Cleared',next:'Ready to play',locked:'Locked',best:'Best',mission:'Clear condition',reward:'How to earn 3 stars',storage:'Local storage is unavailable, so later stages cannot stay unlocked.',
    ready:'Choose glyph and battle',replay:'Replay stage',unavailable:'Clear the previous stage to unlock',total:'Chapter 1 progress',chapter:'Chapter 1',complete:'Chapter complete',hint:'Stars 2 and 3 are bonus conditions; the basic clear condition must also be met.',
  },
  ko: {
    names:['첫 발사','힘 조절','각도의 비밀','첫 시련'],
    tips:['발사를 배우고 첫 상대를 이겨 보세요.','발사 파워 65% 이상으로 승리하세요.','발사 각도를 중앙에서 9° 이상 기울여 승리하세요.','1장 보스 剣에게 승리하세요.'],
    victory:'상대에게 승리',power:'발사 파워 65% 이상으로 승리',angle:'발사 각도 9° 이상으로 승리',boss:'보스 剣에게 승리',
    hp:'승리 시 남은 HP가 55% 이상',time:n=>`${n}초 이내 클리어`,
    stars:'별',clear:'클리어',next:'도전 가능',locked:'잠김',best:'최고 기록',mission:'클리어 조건',reward:'별 3개 조건',storage:'저장할 수 없어 다음 스테이지 해제가 유지되지 않습니다.',
    ready:'글자 선택 후 도전',replay:'다시 도전',unavailable:'이전 스테이지를 클리어하면 해제',total:'1장 진행도',chapter:'1장',complete:'모두 클리어',hint:'2번째와 3번째 별은 추가 조건입니다. 먼저 기본 클리어 조건을 충족해야 합니다.',
  },
});


export function storyCopy(locale='ja'){return COPY[locale]||COPY.ja;}
export function getStageMission(id,locale='ja'){
  const level=LEVEL_CATALOG[id];
  if(!level)return null;
  const c=storyCopy(locale);
  const main=level.objective==='power-control'?c.power:level.objective==='angle-control'?c.angle:level.boss?c.boss:c.victory;
  return Object.freeze({id,main,bonusHp:c.hp,bonusTime:c.time(level.targetSeconds),
    instructions:c.tips[LEVEL_ORDER.indexOf(id)],
    // This list is explanatory; there is no separate persistent mission inventory.
    conditions:Object.freeze([{star:1,text:main},{star:2,text:c.hp},{star:3,text:c.time(level.targetSeconds)}]),
    requiredPower:level.minPower??null,requiredAngleDegrees:level.minAngle===undefined?null:Math.ceil(level.minAngle*180/Math.PI),
    minimumHpRatio:.55,targetSeconds:level.targetSeconds,
  });
}
export function getStoryBoard(storage,locale='ja'){
  const snapshot=readCampaignSnapshot(storage);
  const c=storyCopy(locale);
  const stages=Object.freeze(snapshot.stages.map((entry,i)=>Object.freeze({
    ...entry, name:c.names[i],enemy:LEVEL_CATALOG[entry.id].enemy,
    boss:Boolean(LEVEL_CATALOG[entry.id].boss),
    selectable:entry.state==='next'||entry.state==='cleared',
    mission:getStageMission(entry.id,locale),
  })));
  return Object.freeze({...snapshot,stages,locale: COPY[locale]?locale:'ja',
    nextSelectableId:snapshot.nextLevelId,copy:c,
  });
}
export function selectStoryStage(board,id){
  const entry=board?.stages?.find(s=>s.id===id&&s.selectable);
  return entry?.id??board?.stages?.find(s=>s.id===board.nextSelectableId&&s.selectable)?.id??LEVEL_ORDER[0];
}
