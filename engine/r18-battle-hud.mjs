/** R18 presentation-only copy/status projection. Never changes physics, rules, or scores. */
const COPY=Object.freeze({
 ja:{loading:['準備中','文字とアリーナを読み込み中'],ready:['発射準備完了','青い文字を引いて放すか、精密照準から発射'],battle:['バトル中','DASH で進路を変えよう。残りの回転にも注意'],paused:['一時停止','再開すると同じ状況から続きます'],settling:['判定中','勝敗が決まるまでお待ちください'],result:['対戦終了','結果と記録を確認できます'],clock:'経過時間',dashReady:'DASH 使用可能',dashCooldown:'DASH 再充電',dashLowSpin:'回転不足',dashWait:'速度が高すぎます',dashUnavailable:'DASH 使用不可',dashPending:'発射後に使用可能',healthPlayer:'HP 残りわずか',healthRival:'相手の HP 残りわずか',noHealth:'HP は安定',helpReady:'発射: 引いて放す / 精密照準 · Enter',helpBattle:'DASH: ボタンまたは Space / D · 中断: Esc',helpPaused:'再開: ボタンまたは Esc',helpResult:'もう一度挑戦するかステージへ戻る',exit:'ステージへ戻る',exitConfirm:'もう一度押して退出',exitWarning:'途中退出すると、この対戦は保存されません。',pauseHelp:'Esc または一時停止ボタン'},
 zh:{loading:['正在加载','正在准备文字和竞技场'],ready:['准备发射','拖动蓝色文字松手发射，或使用精确瞄准'],battle:['战斗中','使用 Dash 调整方向，留意剩余旋转量'],paused:['已暂停','继续后从当前战斗状态恢复'],settling:['正在判定','等待物理对战结束'],result:['对战结束','查看成绩与战斗记录'],clock:'已用时间',dashReady:'Dash 可用',dashCooldown:'Dash 冷却',dashLowSpin:'旋转量不足',dashWait:'当前速度过高',dashUnavailable:'Dash 不可用',dashPending:'发射后可用',healthPlayer:'己方 HP 危险',healthRival:'对手 HP 危险',noHealth:'HP 状态正常',helpReady:'发射：拖动松手 / 精确瞄准 · Enter',helpBattle:'Dash：按钮或 Space / D · 暂停：Esc',helpPaused:'继续：按钮或 Esc',helpResult:'再战一次或返回关卡',exit:'返回关卡',exitConfirm:'再次点击确认退出',exitWarning:'中途退出不会保存本场战绩。',pauseHelp:'Esc 或暂停按钮'},
 en:{loading:['Loading','Preparing glyphs and arena'],ready:['Ready to launch','Pull and release the blue top, or use precision aim'],battle:['Battle underway','Use Dash to steer and watch your remaining spin'],paused:['Paused','Resume to continue from this exact state'],settling:['Judging result','Waiting for the physical match to finish'],result:['Match complete','Review result and local record'],clock:'Elapsed',dashReady:'Dash ready',dashCooldown:'Dash recharging',dashLowSpin:'Not enough spin',dashWait:'Speed too high',dashUnavailable:'Dash unavailable',dashPending:'Available after launch',healthPlayer:'Your HP is critical',healthRival:'Rival HP is critical',noHealth:'HP stable',helpReady:'Launch: pull & release / Precision · Enter',helpBattle:'Dash: button or Space / D · Pause: Esc',helpPaused:'Resume: button or Esc',helpResult:'Rematch or return to stages',exit:'Leave stage',exitConfirm:'Tap again to leave',exitWarning:'Leaving mid-match does not save this result.',pauseHelp:'Esc or pause button'},
 ko:{loading:['로딩 중','글자와 경기장을 준비하고 있습니다'],ready:['발사 준비 완료','파란 글자를 당겼다 놓거나 정밀 조준 사용'],battle:['배틀 중','DASH 로 방향을 바꾸고 회전량을 확인하세요'],paused:['일시 정지','재개하면 현재 상태부터 계속합니다'],settling:['판정 중','물리 대전이 끝나기를 기다리세요'],result:['대전 종료','결과와 기록을 확인하세요'],clock:'경과 시간',dashReady:'DASH 준비 완료',dashCooldown:'DASH 재충전',dashLowSpin:'회전 부족',dashWait:'속도 초과',dashUnavailable:'DASH 불가',dashPending:'발사 후 사용',healthPlayer:'플레이어 HP 위험',healthRival:'상대 HP 위험',noHealth:'HP 양호',helpReady:'발사: 당겼다 놓기 / 정밀 조준 · Enter',helpBattle:'DASH: 버튼 또는 Space / D · 일시 정지: Esc',helpPaused:'재개: 버튼 또는 Esc',helpResult:'재대결 또는 스테이지로',exit:'스테이지 나가기',exitConfirm:'다시 눌러 나가기',exitWarning:'중간에 나가면 기록이 저장되지 않습니다.',pauseHelp:'Esc 또는 일시 정지 버튼'}
});
const PHASES=Object.freeze(['loading','ready','battle','paused','settling','result']);
const localeCopy=locale=>COPY[locale]||COPY.ja;
export function battlePhaseView({locale='ja',phase='loading',mode='story'}={}){
 const key=PHASES.includes(phase)?phase:'loading',copy=localeCopy(locale),[title,detail]=copy[key];
 return {phase:key,title,detail,clock:copy.clock,help:copy[`help${key[0].toUpperCase()}${key.slice(1)}`]||'',mode:mode==='quick'?'classic':'story'};
}
export function dashStatusView({locale='ja',phase='ready',canDash=null,remainingFrames=0}={}){
 const copy=localeCopy(locale);
 if(phase!=='battle')return {key:'pending',label:copy.dashPending,enabled:false};
 if(canDash?.ok)return {key:'ready',label:copy.dashReady,enabled:true};
 if(canDash?.reason==='cooldown')return {key:'cooldown',label:`${copy.dashCooldown} · ${(Math.max(0,Math.ceil(Number(remainingFrames)||0))/60).toFixed(1)}s`,enabled:false};
 if(canDash?.reason==='low-spin')return {key:'low-spin',label:copy.dashLowSpin,enabled:false};
 if(canDash?.reason==='speed')return {key:'speed',label:copy.dashWait,enabled:false};
 return {key:'unavailable',label:copy.dashUnavailable,enabled:false};
}
export function healthStatusView({locale='ja',playerHp=0,playerMaxHp=1,rivalHp=0,rivalMaxHp=1}={}){
 const copy=localeCopy(locale),ratio=(hp,max)=>Number.isFinite(hp)&&Number.isFinite(max)&&max>0?Math.max(0,hp)/max:1;
 const player=ratio(playerHp,playerMaxHp),rival=ratio(rivalHp,rivalMaxHp);
 return player<=.25?{key:'player',label:copy.healthPlayer}:rival<=.25?{key:'rival',label:copy.healthRival}:{key:'ok',label:copy.noHealth};
}
export function pauseActionsCopy(locale='ja'){const c=localeCopy(locale);return {exit:c.exit,exitConfirm:c.exitConfirm,exitWarning:c.exitWarning,help:c.pauseHelp};}
