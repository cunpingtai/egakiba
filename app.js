/* MOJI BLADE R25 — Home, campaign resume, and localized SEO copy.
 * Native Classic/Arcade battles are controlled by their separate Rapier engines.
 * Campaign progress is a read-only R10 local save projection; no cloud save or rankings.
 */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const dictionary = {
    ja: {
      home:'ホーム', profile:'プレイ記録', collection:'文字図鑑', glyphResearch:'文字能力研究', localSaved:'この端末に保存', eyebrow:'さあ、勝負の時間だ。', headline1:'文字ブレードで、', headline2:'文字の形を武器にバトル',
      heroLead:'文字ブレードで、漢字・かな・英字から一文字を選び、3Dの文字コマで戦おう。\n文字の形と書体を試せる無料ブラウザゲーム。', homeGlyphLabel:'文字ブレードで使う文字を入力', homeGlyphHelp:'漢字・かな・英字から一文字を入力。選んだ書体で使える文字か確認します。', useGlyph:'この文字で遊ぶ ↗',
      chooseMode:'遊び方・対戦モード', you:'あなた', previewHint:'文字ブレードでは、選ぶ文字でコマの形と動きも変わる。', modeHeading:'文字ブレードでどのバトルに挑む？', howToPlay:'遊び方', mainMode:'メイン', story:'ストーリーステージ', storyDesc:'4つのステージで発射と角度を練習。', quick:'VS COM フリーバトル', quickDesc:'好きな漢字・文字と書体を選んで対戦。', dailyLine:'文字ブレードで最強の文字候補を探して、実際のバトルで試そう。', noLogin:'登録・インストール不要。ブラウザですぐプレイ。',
      continue:'続きから遊ぶ', start:'さっそく遊ぶ', choose:'この文字で進む', enter:'文字を選ぶ', prepare:'対戦の準備', preview:'3D文字プレビュー', modeSelect:'遊び方を選ぶ', nameMode:'モード', firstStage:'STAGE 01-01', footerLine:'文字ブレード · 文字の形が、バトルを変える。',
      seoMetaTitle:'文字ブレード｜漢字ブレード・無料ブラウザ文字ゲーム', seoMetaDescription:'好きな漢字・かな・英字を選び、3Dの文字コマで戦う無料ブラウザゲーム。4つのストーリーステージ、VS COM、文字図鑑、文字比較ラボ、書体別の属性研究を楽しめます。',
      seoEyebrow:'無料ブラウザゲーム・文字バトル', seoTitle:'文字ブレードで最強の文字を探す', seoIntro1:'文字ブレードは、好きな漢字・かな・英字を選び、3Dの文字コマで戦う無料ブラウザゲームです。文字の形と書体が、コマの動きやぶつかり方に影響します。',
      seoIntro2:'文字ブレードでは、ストーリーモードの4ステージで発射と角度を練習し、VS COMのフリーバトルで別の文字や書体を試せます。登録もインストールも不要で、ブラウザから文字バトルを始められます。', seoFeatureTitle:'文字ブレードでできること', seoStoryTitle:'4つのストーリーステージ', seoStoryDesc:'文字ブレードの4つのストーリーステージで、発射パワー、角度、残りHPなどの目標を確認しながら攻略します。',
      seoBattleTitle:'漢字・文字で自由にバトル', seoBattleDesc:'漢字ブレードや文字ゲームを探している人も、文字ブレードのVS COMで好きな漢字・かな・英字と書体を試せます。', seoResearchTitle:'最強の文字を属性で比較', seoResearchDesc:'文字ブレードの文字図鑑、文字詳細、比較ラボ、文字能力研究で、対応する書体の速度・パワー・バランスを調べられます。属性値は字形からの計算値で、勝率を保証するものではありません。',
      seoLinkStagesTitle:'文字ブレードのステージ攻略', seoLinkStagesDesc:'第一章4ステージの相手、目標時間、星条件を確認。', seoLinkGlyphsTitle:'文字ブレード文字図鑑', seoLinkGlyphsDesc:'漢字・かな・英字・記号を検索し、お気に入りを管理。', seoLinkCompareTitle:'文字比較ラボ', seoLinkCompareDesc:'2つの文字と書体の属性差を比較。', seoLinkStrongestTitle:'最強・最弱文字研究', seoLinkStrongestDesc:'検証済みの速度・パワー・バランスを研究。', seoLinkPlayTitle:'文字ブレードの遊び方', seoLinkPlayDesc:'ストーリーとVS COMの違いを確認。', seoLinkGuideTitle:'初心者ガイド', seoLinkGuideDesc:'発射パワー、角度、Dashの基本。', seoFaqTitle:'文字ブレードについてよくある質問', seoFaq1Q:'文字ブレードは無料で遊べますか？', seoFaq1A:'はい。ブラウザですぐに遊べる無料の文字ゲームです。アカウント登録やアプリのインストールは必要ありません。', seoFaq2Q:'最強の文字はどれですか？', seoFaq2A:'文字ブレードでは、絶対に勝てる最強文字を断定していません。書体別の属性研究で候補を比較し、実際の文字バトルで自分の操作に合う文字を試してください。', seoFaq3Q:'スマートフォンでも遊べますか？', seoFaq3A:'はい。文字ブレードはスマートフォンとPCのブラウザに対応しています。操作感は画面サイズや端末によって異なる場合があります。', seoFaq4Q:'世界一難しい漢字や画数の多い漢字も使えますか？', seoFaq4A:'文字ブレードでは、入力した漢字が選んだ書体の原本データに対応しているかを確認します。画数の多い漢字や難読漢字でも、対応が確認できなければ対戦には進めません。'
    },
    zh: {
      home:'首页', profile:'个人战斗档案', collection:'文字图鉴', glyphResearch:'文字属性研究', localSaved:'进度保存在本机', eyebrow:'准备开战！', headline1:'用文字开战，', headline2:'战到最后！',
      heroLead:'从汉字、假名或字母中选一个文字，用3D文字陀螺对战。\n免费浏览器文字游戏，无需安装。', homeGlyphLabel:'输入要用于文字对战的文字', homeGlyphHelp:'输入一个汉字、假名或字母；系统会检查所选字体是否支持。', useGlyph:'用这个文字开战 ↗',
      chooseMode:'玩法与对战模式', you:'你的文字', previewHint:'更换文字，陀螺形状和运动也会变化。', modeHeading:'在文字对战中选择你的挑战', howToPlay:'玩法说明', mainMode:'主线', story:'故事关卡', storyDesc:'通过4个关卡练习发射与角度。', quick:'VS COM 自由对战', quickDesc:'选择汉字、文字与字体，立即对战。', dailyLine:'寻找属性有优势的文字，再到实战中验证。', noLogin:'无需注册或安装，打开浏览器即可游玩。',
      continue:'继续闯关', start:'立即开始', choose:'使用这个文字', enter:'选择文字', prepare:'对战准备', preview:'3D文字预览', modeSelect:'选择玩法', nameMode:'模式', firstStage:'第 01-01 关', footerLine:'文字对战 · 文字形状改变战斗方式。',
      seoMetaTitle:'文字对战游戏｜Moji Blade 免费浏览器文字游戏', seoMetaDescription:'选择汉字、假名或字母，操控3D文字陀螺对战。体验4个故事关卡、VS COM自由对战、文字图鉴和字体属性比较。免费游玩，无需注册或安装。',
      seoEyebrow:'免费浏览器游戏 · 文字对战', seoTitle:'寻找属性出众的文字，开始文字对战', seoIntro1:'这是一个免费的浏览器文字游戏：选择喜欢的汉字、假名或字母，使用3D文字陀螺进行对战。文字形状和字体会影响陀螺的运动与碰撞。',
      seoIntro2:'你可以通过4个故事关卡练习发射和角度，再进入VS COM自由对战测试不同文字与字体。无需账号，无需下载或安装，打开浏览器即可开始。', seoFeatureTitle:'可以体验的玩法', seoStoryTitle:'4个故事关卡', seoStoryDesc:'完成发射力度、角度、剩余HP等目标，挑战第一章现已开放的4个关卡。',
      seoBattleTitle:'汉字与文字自由对战', seoBattleDesc:'如果你在寻找文字陀螺或汉字对战游戏，可以选择汉字、假名或字母，尝试不同形状与字体组合。', seoResearchTitle:'按属性比较文字', seoResearchDesc:'通过文字图鉴、文字详情、对比实验室和属性研究，查看受支持字体的速度、力量和平衡。属性值来自字形计算，并不代表实际胜率。',
      seoLinkStagesTitle:'文字对战关卡攻略', seoLinkStagesDesc:'查看第一章4个关卡、对手、目标时间和星级条件。', seoLinkGlyphsTitle:'文字图鉴', seoLinkGlyphsDesc:'搜索汉字、假名、字母和符号，管理收藏。', seoLinkCompareTitle:'文字对比实验室', seoLinkCompareDesc:'比较两个文字与字体的属性差异。', seoLinkStrongestTitle:'最强与最弱文字研究', seoLinkStrongestDesc:'研究经过验证的速度、力量和平衡属性。', seoLinkPlayTitle:'文字对战玩法', seoLinkPlayDesc:'了解故事模式与VS COM的区别。', seoLinkGuideTitle:'新手指南', seoLinkGuideDesc:'学习发射力度、角度和Dash。', seoFaqTitle:'文字对战常见问题', seoFaq1Q:'这是免费文字游戏吗？', seoFaq1A:'是的。游戏可直接在浏览器中免费游玩，无需注册账号或安装应用。', seoFaq2Q:'哪个文字最强？', seoFaq2A:'没有一个文字能保证每场获胜。请按字体比较字形属性，再通过实际对战寻找适合自己操作的文字。', seoFaq3Q:'可以在手机上玩吗？', seoFaq3A:'可以。游戏支持手机和电脑浏览器，具体操作手感会因屏幕尺寸与设备而有所不同。', seoFaq4Q:'多笔画或难读汉字也能使用吗？', seoFaq4A:'系统会检查输入汉字是否存在于所选字体的原始字形数据中。若没有经过验证的字形数据，即使是常见或复杂汉字，也不能进入对战。'
    },
    en: {
      home:'Home', profile:'Battle record', collection:'Glyph collection', glyphResearch:'Glyph attribute research', localSaved:'Saved on this device', eyebrow:'The arena awaits.', headline1:'Play Moji Blade.', headline2:'Win the clash.',
      heroLead:'Choose a kanji, kana, or letter and battle with a 3D glyph top.\nA free browser game—no install required.', homeGlyphLabel:'Enter a glyph for Moji Blade', homeGlyphHelp:'Enter one visible glyph. We check whether the selected typeface supports it.', useGlyph:'Play with this glyph ↗',
      chooseMode:'Modes and ways to play', you:'Your glyph', previewHint:'Change the glyph to change the top’s shape and motion.', modeHeading:'Choose your Moji Blade battle', howToPlay:'How to play', mainMode:'MAIN', story:'Story stages', storyDesc:'Practice launch control across four stages.', quick:'VS COM free battle', quickDesc:'Choose glyphs and typefaces, then battle.', dailyLine:'Compare glyph attributes, then test your pick in a real match.', noLogin:'No sign-up or install. Play in your browser.',
      continue:'Continue story', start:'Start playing', choose:'Use this glyph', enter:'Choose glyph', prepare:'Match setup', preview:'3D glyph preview', modeSelect:'Choose a mode', nameMode:'Mode', firstStage:'STAGE 01-01', footerLine:'Moji Blade · Glyph shape changes the clash.',
      seoMetaTitle:'Moji Blade | Free Glyph Battle Browser Game', seoMetaDescription:'Choose a kanji, kana, or letter and battle with a 3D glyph top. Play four story stages, VS COM free battles, browse the glyph collection, and compare typeface attributes for free.',
      seoEyebrow:'Free browser game · Glyph battles', seoTitle:'Find your strongest glyph in Moji Blade', seoIntro1:'Moji Blade is a free browser game where you choose a kanji, kana, or letter and battle with a 3D glyph top. Glyph shape and typeface affect movement and collisions.',
      seoIntro2:'Practice launches and angles in four Story stages, then test different glyphs and typefaces in VS COM free battle. No account, download, or installation is required.', seoFeatureTitle:'What you can play', seoStoryTitle:'Four Story stages', seoStoryDesc:'Learn launch power and angle control, then clear the four currently playable stages in Chapter One.',
      seoBattleTitle:'Free kanji and glyph battles', seoBattleDesc:'Choose a kanji, kana, or letter, try different typefaces, and see how shape changes a physics-based glyph battle.', seoResearchTitle:'Compare glyph attributes', seoResearchDesc:'Use the glyph collection, detail view, comparison lab, and attribute research to inspect supported typefaces. Metrics are derived from glyph geometry and are not win-rate predictions.',
      seoLinkStagesTitle:'Moji Blade stage guide', seoLinkStagesDesc:'Review rivals, time targets and star conditions for four stages.', seoLinkGlyphsTitle:'Glyph collection', seoLinkGlyphsDesc:'Search kanji, kana, letters and symbols; manage favorites.', seoLinkCompareTitle:'Glyph comparison lab', seoLinkCompareDesc:'Compare attribute differences between two glyphs and fonts.', seoLinkStrongestTitle:'Strongest and weakest glyph research', seoLinkStrongestDesc:'Research verified speed, power and balance metrics.', seoLinkPlayTitle:'How to play Moji Blade', seoLinkPlayDesc:'Learn the difference between Story and VS COM.', seoLinkGuideTitle:'Beginner guide', seoLinkGuideDesc:'Learn launch power, aim angle and Dash.', seoFaqTitle:'Moji Blade FAQs', seoFaq1Q:'Is Moji Blade free to play?', seoFaq1A:'Yes. Play this free glyph game in your browser without creating an account or installing an app.', seoFaq2Q:'Which glyph is the strongest?', seoFaq2A:'No glyph is guaranteed to win every match. Compare attributes by typeface, then test a glyph in actual battles to find what fits your controls.', seoFaq3Q:'Can I play on mobile?', seoFaq3A:'Yes. Moji Blade supports mobile and desktop browsers. Controls may feel different across screen sizes and devices.', seoFaq4Q:'Can I use complex or rare kanji?', seoFaq4A:'Moji Blade checks the selected typeface against original glyph data. A glyph cannot enter battle unless its support is verified, including complex or rare kanji.'
    },
    ko: {
      home:'홈', profile:'배틀 기록', collection:'글자 도감', glyphResearch:'글자 능력 연구', localSaved:'이 기기에 저장됨', eyebrow:'승부가 시작된다!', headline1:'문자 블레이드로,', headline2:'끝까지 이겨라!',
      heroLead:'한자, 가나 또는 알파벳 한 글자를 골라 3D 글자 팽이로 대결하세요.\n설치가 필요 없는 무료 브라우저 게임입니다.', homeGlyphLabel:'배틀에 사용할 글자 입력', homeGlyphHelp:'보이는 글자 하나를 입력하세요. 선택한 서체의 지원 여부를 확인합니다.', useGlyph:'이 글자로 플레이 ↗',
      chooseMode:'플레이 방식과 배틀 모드', you:'내 글자', previewHint:'글자를 바꾸면 팽이의 모양과 움직임도 달라집니다.', modeHeading:'문자 블레이드에서 배틀 선택', howToPlay:'게임 방법', mainMode:'메인', story:'스토리 스테이지', storyDesc:'4개 스테이지에서 발사와 각도를 연습하세요.', quick:'VS COM 자유 대전', quickDesc:'글자와 서체를 선택해 바로 대결하세요.', dailyLine:'글자 능력을 비교하고 실제 배틀에서 시험해 보세요.', noLogin:'가입이나 설치 없이 브라우저에서 플레이.',
      continue:'스토리 이어하기', start:'플레이 시작', choose:'이 글자 사용', enter:'글자 선택', prepare:'배틀 준비', preview:'3D 글자 미리보기', modeSelect:'모드 선택', nameMode:'모드', firstStage:'STAGE 01-01', footerLine:'문자 블레이드 · 글자 형태가 배틀을 바꿉니다.',
      seoMetaTitle:'문자 블레이드 | 무료 글자 배틀 브라우저 게임', seoMetaDescription:'한자, 가나, 알파벳을 골라 3D 글자 팽이로 대결하세요. 4개 스토리 스테이지, VS COM 자유 대전, 글자 도감과 서체별 능력 비교를 무료로 즐길 수 있습니다.',
      seoEyebrow:'무료 브라우저 게임 · 글자 배틀', seoTitle:'나에게 맞는 최강 글자를 찾아보세요', seoIntro1:'문자 블레이드는 한자, 가나 또는 알파벳을 골라 3D 글자 팽이로 대결하는 무료 브라우저 게임입니다. 글자의 형태와 서체가 움직임과 충돌에 영향을 줍니다.',
      seoIntro2:'4개의 스토리 스테이지에서 발사와 각도를 연습하고, VS COM 자유 대전에서 다른 글자와 서체를 시험하세요. 계정, 다운로드, 설치가 필요 없습니다.', seoFeatureTitle:'플레이할 수 있는 콘텐츠', seoStoryTitle:'스토리 스테이지 4개', seoStoryDesc:'발사 파워와 각도 조절을 익히고 현재 플레이 가능한 첫 번째 챕터의 4개 스테이지를 공략하세요.',
      seoBattleTitle:'한자와 글자 자유 대전', seoBattleDesc:'한자, 가나, 알파벳과 서체를 선택해 모양에 따라 달라지는 물리 기반 글자 배틀을 즐기세요.', seoResearchTitle:'글자 능력치 비교', seoResearchDesc:'글자 도감, 상세 보기, 비교 실험실, 능력 연구에서 지원되는 서체의 속도·파워·균형을 확인하세요. 수치는 글자 형태에서 계산되며 실제 승률을 뜻하지 않습니다.',
      seoLinkStagesTitle:'스테이지 공략', seoLinkStagesDesc:'1장 4개 스테이지의 상대, 시간과 별 조건을 확인하세요.', seoLinkGlyphsTitle:'글자 도감', seoLinkGlyphsDesc:'한자·가나·알파벳·기호를 검색하고 즐겨찾기를 관리하세요.', seoLinkCompareTitle:'글자 비교 실험실', seoLinkCompareDesc:'두 글자와 서체의 속성 차이를 비교하세요.', seoLinkStrongestTitle:'최강·최약 글자 연구', seoLinkStrongestDesc:'검증된 속도·파워·균형 값을 연구하세요.', seoLinkPlayTitle:'문자 블레이드 플레이 방법', seoLinkPlayDesc:'스토리와 VS COM의 차이를 확인하세요.', seoLinkGuideTitle:'초보자 가이드', seoLinkGuideDesc:'발사 파워, 각도와 Dash의 기본을 배우세요.', seoFaqTitle:'문자 블레이드 자주 묻는 질문', seoFaq1Q:'무료로 플레이할 수 있나요?', seoFaq1A:'네. 계정을 만들거나 앱을 설치하지 않고 브라우저에서 무료로 플레이할 수 있습니다.', seoFaq2Q:'가장 강한 글자는 무엇인가요?', seoFaq2A:'모든 대전에서 이기는 글자는 없습니다. 서체별 능력치를 비교하고 실제 배틀에서 자신에게 맞는 글자를 시험해 보세요.', seoFaq3Q:'휴대폰에서도 플레이할 수 있나요?', seoFaq3A:'네. 휴대폰과 데스크톱 브라우저를 지원합니다. 화면 크기와 기기에 따라 조작감이 다를 수 있습니다.', seoFaq4Q:'획이 많거나 읽기 어려운 한자도 사용할 수 있나요?', seoFaq4A:'선택한 서체의 원본 글자 데이터에 해당 글자가 있는지 확인합니다. 복잡하거나 드문 한자라도 지원 여부가 검증되지 않으면 배틀에 사용할 수 없습니다.'
    }
  };
  // The authoritative R14 projection is provided by r2-flow's ES module after
  // native save validation. No independent localStorage parser or fake progress.
  const readLocalProgress=()=>window.MojiBladeR14Campaign?.snapshot?.()||null;
  const campaignCopy={
    ja:{stages:['はじめての発射','力のコントロール','角度のひみつ','第一の試練'],desc:'次のステージに挑もう。',first:'最初の試練に挑もう。',complete:'第1章クリア！',completeDesc:'全4ステージクリア。ステージを選んでもう一度挑戦！',counter:'ステージ',stars:'獲得した星',saved:'この端末に保存',unavailable:'この端末では保存できません。進行状況は残りません。',boss:'剣',start:'さっそく遊ぶ',resume:'続きから遊ぶ',replay:'ステージを選ぶ'},
    zh:{stages:['初次发射','力度训练','角度的奥秘','初次试炼'],desc:'继续挑战下一关。',first:'从第一关开始冒险。',complete:'第一章已通关！',completeDesc:'已完成全部4关，可以选择关卡重新挑战。',counter:'关卡',stars:'获得星星',saved:'进度保存在此设备',unavailable:'此设备无法保存，离开后进度可能丢失。',boss:'剣',start:'开始冒险',resume:'继续闯关',replay:'选择关卡'},
    en:{stages:['First Launch','Power Control','Angle Control','First Trial'],desc:'Your next battle is ready.',first:'Begin with the first stage.',complete:'Chapter 1 complete!',completeDesc:'All four stages cleared. Choose a stage to replay.',counter:'Stages',stars:'Stars earned',saved:'Saved on this device',unavailable:'Local save is unavailable; progress may be lost.',boss:'剣',start:'Start adventure',resume:'Continue story',replay:'Choose a stage'},
    ko:{stages:['첫 발사','힘 조절','각도의 비밀','첫 시련'],desc:'다음 스테이지로!',first:'첫 스테이지부터 도전하세요.',complete:'챕터 1 완료!',completeDesc:'4개 스테이지를 클리어했습니다. 다시 도전해 보세요.',counter:'스테이지',stars:'획득 별',saved:'이 기기에 저장',unavailable:'로컬 저장을 사용할 수 없습니다. 진행 상황이 사라질 수 있습니다.',boss:'剣',start:'모험 시작',resume:'이어서 플레이',replay:'스테이지 선택'}
  };
  function renderCampaign(snapshot){
    const c=campaignCopy[state.locale]||campaignCopy.ja;
    const progress=snapshot||{clearedCount:0,totalStages:4,earnedStars:0,maxStars:12,nextLevelId:'01-01',allCleared:false,hasProgress:false,available:true,stages:[1,2,3,4].map((i)=>({index:i,state:i===1?'next':'locked'}))};
    const idx=Math.max(0,Math.min(3,Number(progress.nextLevelId.slice(-2))-1));
    $('#campaign-title').textContent=progress.allCleared?c.complete:c.stages[idx];
    $('#campaign-subtitle').textContent=progress.allCleared?c.completeDesc:progress.hasProgress?c.desc:c.first;
    $('#campaign-counter').textContent=`${progress.clearedCount} / ${progress.totalStages} ${c.counter}`;
    $('#campaign-next-glyph').textContent=progress.allCleared?'★':['字','力','山','剣'][idx];
    $('#campaign-progress').setAttribute('aria-valuenow',String(progress.clearedCount));
    $('#campaign-progress-fill').style.width=`${progress.clearedCount / progress.totalStages * 100}%`;
    const steps=$('#campaign-steps');
    [...steps.children].forEach((el,i)=>{
      const stage=progress.stages[i];
      el.className='campaign-step is-'+stage.state;
      el.textContent=`${String(i+1).padStart(2,'0')}${stage.stars?' ★'+stage.stars:''}`;
      el.setAttribute('aria-label',`${c.stages[i]}: ${stage.state==='cleared'?stage.stars+' / 3 ★':stage.state==='next'?'NEXT':'LOCKED'}`);
    });
    $('#campaign-foot').textContent=`★ ${progress.earnedStars} / ${progress.maxStars} · ${progress.available?c.saved:c.unavailable}`;
    $('#campaign-card').classList.toggle('is-complete',progress.allCleared);
    $('#campaign-card').classList.toggle('is-unavailable',!progress.available);
    $('#primary-label').textContent=progress.allCleared?c.replay:progress.hasProgress?c.resume:c.start;
  }
  const state = {locale:'ja',isReturning:Boolean(readLocalProgress()),glyph:'文',sound:false,overlay:null,startedAt:0};
  const t = key => dictionary[state.locale]?.[key] ?? dictionary.ja[key] ?? key;
  function localize(){
    document.documentElement.lang=state.locale;
    $$('[data-t]').forEach(el => {
      const msg=t(el.dataset.t);
      if(!msg)return;
      if(el.dataset.t==='heroLead'){
        el.textContent='';const s=msg.split('\n');el.append(document.createTextNode(s[0]),document.createElement('br'),document.createTextNode(s[1]||''));
      }else el.textContent=msg;
    });
    renderCampaign(readLocalProgress());
    $('#first-hint').hidden=state.isReturning;
    if($('#flow-page')?.hidden){document.title=t('seoMetaTitle');const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=t('seoMetaDescription');const ogTitle=document.querySelector('meta[property="og:title"]');if(ogTitle)ogTitle.content=t('seoMetaTitle');const ogDescription=document.querySelector('meta[property="og:description"]');if(ogDescription)ogDescription.content=t('seoMetaDescription');}
    if(state.overlay)renderPanel(state.overlay);
  }
  function refreshCampaign(){state.isReturning=Boolean(readLocalProgress()?.hasProgress);localize();}
  document.addEventListener('moji:r9-native-progress',refreshCampaign);
  document.addEventListener('moji:campaign-ready',refreshCampaign);
  const overlay=$('#overlay'), panel=$('#panel-content');
  let focusBeforeOverlay = null;
  let audioContext = null;
  function playUiSound(){
    if(!state.sound) return;
    try {
      audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
      const osc=audioContext.createOscillator(), gain=audioContext.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(610,audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(410,audioContext.currentTime+.075);
      gain.gain.setValueAtTime(.032,audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.095);
      osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.10);
    }catch{}
  }
  document.addEventListener('click',e=>{if(e.target.closest('button'))playUiSound();},true);

  function openPanel(kind){
    if(overlay.hidden) focusBeforeOverlay = document.activeElement;
    state.overlay=kind;
    overlay.hidden=false;document.body.style.overflow='hidden';
    $('#panel-kicker').textContent=kind==='guide'?'HOW TO PLAY':'SETTINGS';
    renderPanel(kind);$('#close-overlay').focus();
  }
  function closePanel(){overlay.hidden=true;document.body.style.overflow='';state.overlay=null;focusBeforeOverlay?.focus?.();}
  function panelFrame(head,desc,inner=''){
    return `<h2 class="panel-headline" id="panel-title">${head}</h2><p class="panel-desc">${desc}</p>${inner}`;
  }
  function renderPanel(kind){
    const m=state.locale;
    if(kind==='settings'){
      const title={ja:'設定',zh:'设置',en:'Settings',ko:'설정'}[m];
      const desc={ja:'文字ブレードのサウンド設定。動きの軽減はお使いの端末設定に従います。',zh:'文字对战的声音设置。减少动态效果遵循设备系统设置。',en:'Moji Blade sound settings. Reduced motion follows your device preference.',ko:'문자 블레이드 사운드 설정입니다. 동작 줄이기는 기기 설정을 따릅니다.'}[m];
      const audio={ja:'効果音',zh:'音效',en:'Sound effects',ko:'효과음'}[m];
      const motion={ja:'動きの軽減',zh:'减少动态效果',en:'Reduced motion',ko:'동작 줄이기'}[m];
      const system={ja:matchMedia('(prefers-reduced-motion: reduce)').matches?'端末設定：ON':'端末設定に従う',zh:matchMedia('(prefers-reduced-motion: reduce)').matches?'设备设置：开启':'遵循设备设置',en:matchMedia('(prefers-reduced-motion: reduce)').matches?'Device setting: On':'Follows device setting',ko:matchMedia('(prefers-reduced-motion: reduce)').matches?'기기 설정: 켜짐':'기기 설정 따름'}[m];
      panel.innerHTML=panelFrame(title,desc,`<div class="setting-option"><span>${audio}</span><button class="switch-ui" id="panel-sound" aria-pressed="${state.sound}">${state.sound?'ON':'OFF'}</button></div><div class="setting-option"><span>${motion}</span><strong>${system}</strong></div>`);
      return;
    }
    if(kind==='guide'){
      const title={ja:'文字ブレードの遊び方',zh:'文字对战玩法',en:'How to play Moji Blade',ko:'문자 블레이드 플레이 방법'}[m];
      const desc={ja:'文字と書体を選び、発射角度とパワーを調整。相手にぶつけて勝利を目指します。ストーリーはHPと星の条件、VS COMはクラシック物理ルールで対戦します。',zh:'选择文字与字体，调整发射角度和力度，碰撞对手争取胜利。故事模式使用HP与星级目标，VS COM使用经典物理规则。',en:'Choose a glyph and typeface, set launch angle and power, then collide with your rival. Story battles use HP and star objectives; VS COM uses Classic physics rules.',ko:'글자와 서체를 고르고 발사 각도와 파워를 조절해 상대와 충돌하세요. 스토리는 HP와 별 목표를 사용하고 VS COM은 클래식 물리 규칙으로 진행됩니다.'}[m];
      const steps=m==='zh'?[['01','选择文字与字体'],['02','确认目标并调整发射'],['03','碰撞对手，争取胜利']]:m==='en'?[['01','Choose a glyph and typeface'],['02','Check objectives and aim'],['03','Launch, collide, and win']]:m==='ko'?[['01','글자와 서체 선택'],['02','목표 확인 후 조준'],['03','발사하고 충돌해 승리']]:[['01','文字と書体を選ぶ'],['02','目標を確認して狙う'],['03','発射して相手にぶつける']];
      panel.innerHTML=panelFrame(title,desc,steps.map(([n,label])=>`<div class="panel-metric"><span>${n}</span><strong>${label}</strong></div>`).join(''));
      return;
    }
    panel.innerHTML='';
  }
  document.addEventListener('click',e=>{
    const mode=e.target.closest('[data-mode]');if(mode){const selectedMode=mode.dataset.mode;document.dispatchEvent(new CustomEvent('moji:navigate',{detail:{screen:selectedMode==='story'?'stages':'glyph',mode:selectedMode}}));return;}
    const trigger=e.target.closest('[data-panel]');if(trigger){const target=trigger.dataset.panel;if(target==='glyph-ranking'){closePanel();document.dispatchEvent(new CustomEvent('moji:navigate',{detail:{screen:'ranking'}}));}else if(['profile','collection'].includes(target)){closePanel();document.dispatchEvent(new CustomEvent('moji:navigate',{detail:{screen:target}}));}else if(target==='home'){closePanel();document.dispatchEvent(new CustomEvent('moji:navigate',{detail:{screen:'home'}}));scrollTo({top:0,behavior:'smooth'});}else if(['settings','guide'].includes(target)){openPanel(target);}return;}
    if(e.target.closest('#panel-sound')){toggleSound();renderPanel('settings');return;}
    if(e.target.closest('[data-close]'))closePanel();
  });
  $('#close-overlay').addEventListener('click',closePanel);
  document.addEventListener('keydown',e=>{
    if(overlay.hidden)return;
    if(e.key==='Escape'){e.preventDefault();closePanel();return;}
    if(e.key!=='Tab')return;
    const focusable=[...overlay.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled])')].filter(el=>el.getClientRects().length);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  $('#primary-play').addEventListener('click',()=>{
    const progress=readLocalProgress();
    document.dispatchEvent(new CustomEvent('moji:navigate',{detail:{screen:progress?.allCleared?'stages':progress?.hasProgress?'prepare':'glyph',mode:'story',levelId:progress?.nextLevelId||'01-01'}}));
  });
  $('#choose-mode').addEventListener('click',()=>document.dispatchEvent(new CustomEvent('moji:navigate',{detail:{screen:'modes'}})));
  function toggleSound(){state.sound=!state.sound;$('#sound-toggle').classList.toggle('is-muted',!state.sound);$('#sound-toggle').setAttribute('aria-pressed',String(state.sound));}
  $('#sound-toggle').addEventListener('click',toggleSound);
  $('#sound-toggle').classList.add('is-muted');$('#sound-toggle').setAttribute('aria-pressed','false');
  function selectGlyph(ch){state.glyph=ch;document.dispatchEvent(new CustomEvent('moji:glyph-changed',{detail:{glyph:ch}}));$('#hero-player-glyph').textContent=ch;$$('.glyph-chip').forEach(b=>{const current=b.dataset.glyph===ch;b.classList.toggle('is-current',current);b.setAttribute('aria-pressed',String(current));});if(state.overlay)renderPanel(state.overlay);}
  $$('.glyph-chip').forEach(el=>el.addEventListener('click',()=>selectGlyph(el.dataset.glyph)));
  $('#random-glyph').addEventListener('click',()=>{const pool=['文','龍','花','剣','力','水'];selectGlyph(pool.filter(x=>x!==state.glyph)[Math.floor(Math.random()*(pool.length-1))]);});

  // R2 WebGL renderer owns #arena-canvas. The V1 fake extrusion path is removed.
  window.MojiHomeV1={selectGlyph,locale:()=>state.locale};
  document.addEventListener('moji:r3-local-progress',refreshCampaign);
  localize();
})();
