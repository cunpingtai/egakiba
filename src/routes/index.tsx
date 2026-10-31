import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { bootR9 } from '../game/boot'
import { seoRouteHead, ROUTE_BASE } from '../seo/route-head'
import { drawHref } from '../../draw-fight/src/paths'
import { typhoonHref } from '../typhoon-escape/seo'
import { zipperHref } from '../zipper-finger/seo'
import { shodoHref } from '../shodo-simulator-3d/seo'
import { dashimakiHref } from '../dashimaki-game/seo'
import { omuriceHref } from '../omurice-simulator/seo'
import { potatoHref } from '../long-potato/seo'
import { breathHref } from '../one-breath/seo'
import { hamburgHref } from '../hamburg/seo'
import { softServeHref } from '../soft-serve/seo'
import { ommojiHref } from '../ommoji/seo'
import { shusshinHref } from '../shusshin-ken/seo'
import { iceHref } from '../ice-break/seo'
import { kuroHref } from '../kuroi-ekitai/seo'
import { darumaHref } from '../daruma/seo'
import { prefHref } from '../prefecture-game/seo'
import { kazokuHref } from '../kazoku-igai/seo'
import { hariHref } from '../acupuncture-darts/seo'
import { concafeHref } from '../concafe-simulator/seo'
import { hankoHref } from '../hanko-hankouki/seo'
import { beerHref } from '../beer-pour/seo'
import { sansaHref } from '../sansa/seo'
import { coasterHref } from '../rakugaki-coaster/seo'
import { turkishIceHref } from '../turkish-ice-cream-3d/seo'
import { latteHref } from '../latteart-maker/seo'
import { walkerHref } from '../jinsei-walker/seo'
import { rollIceHref } from '../roll-ice-simulator/seo'
import { nnkoHref } from '../nnko-quiz/seo'
import { derbyHref } from '../prefecture-derby/seo'
import { uwakiHref } from '../uwaki-jinmon/seo'
import { cookingHref } from '../cooking-games/seo'
import { drawingHref } from '../drawing-games/seo'
import { routeHref } from '../seo/landing-content.mjs'
import { siteGames } from '../site-games'
import { SiteIndexLinks } from '../site-links'
import { BillionInvite } from '../billion-invite'
import { SiteGameMenu } from '../site-header'

export const Route = createFileRoute('/')({
  ssr: true,
  head: () => seoRouteHead('home', 'ja'),
  component: Home,
})

function Home() {
  useEffect(() => {
    const timer = window.setTimeout(() => { void bootR9() }, 0)
    return () => window.clearTimeout(timer)
  }, [])
  return <R9Shell />
}

function R9Shell() {
  return (
    <div className="relative min-h-dvh font-sans antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebApplication', name: '文字ブレード', alternateName: 'MOJI BLADE',
        description: '好きな漢字・かな・英字を選び、3Dの文字コマで戦う無料ブラウザゲーム。ストーリーステージ、VS COM、文字図鑑、書体別の文字能力研究を提供。',
        applicationCategory: 'GameApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript and a WebGL-capable browser',
        isAccessibleForFree: true, offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'}, inLanguage: 'ja'
      })}} />
      <div className="ambient-stamp ambient-stamp--top" aria-hidden="true">文</div>
      <div className="app-shell" id="app">
        <header className="global-header">
          <div className="brand" aria-label="文字ブレード">
            <div className="brand-seal" aria-hidden="true">文<span className="seal-line"></span></div>
            <div className="brand-name">
              <span className="brand-jp">文字ブレード</span>
              <span className="brand-en">MOJI BLADE <span className="mini-red">/ 文字闘技場</span></span>
            </div>
          </div>
          <nav className="desktop-nav" aria-label="メインメニュー">
            <button type="button" className="nav-link active" data-panel="home" data-t="home">ホーム</button>
            <button type="button" className="nav-link" data-panel="collection" data-t="collection">文字図鑑</button>
            <button type="button" className="nav-link" data-panel="profile" data-t="profile">プレイ記録</button>
          </nav>
          <BillionInvite placement="bar" />
          <div className="header-actions">
            <SiteGameMenu />
            <span className="save-status" id="sync-status"><span className="signal-dot"></span><span data-t="localSaved">この端末にセーブ中</span></span>
            <button className="header-icon sound-toggle" id="sound-toggle" type="button" aria-label="サウンドを切り替える" title="Sound">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zM16 9c2 1 2 5 0 6" /></svg>
            </button>
            <button className="header-icon" data-panel="settings" type="button" aria-label="設定" title="Settings">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5v2m0 15v2M2.5 12h2m15 0h2M5.3 5.3l1.4 1.4m10.6 10.6 1.4 1.4m0-13.4-1.4 1.4M6.7 17.3l-1.4 1.4" /><circle cx="12" cy="12" r="4.1" /></svg>
            </button>
          </div>
        </header>

        <main id="home-page" className="page-home">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <BillionInvite placement="hero" />
              <div className="eyebrow"><span className="eyebrow-line"></span><span data-t="eyebrow">さあ、勝負の時間だ。</span></div>
              <h1 id="hero-title"><span data-t="headline1">文字ブレードで、</span><br /><em data-t="headline2">文字の形を武器にバトル</em></h1>
              <p className="hero-lead" data-t="heroLead">文字ブレードで、好きな漢字・かな・英字から一文字を選び、3Dの文字コマで戦おう。<br className="wide-only" />文字の形と書体を試せる無料ブラウザゲーム。</p>
              <form id="home-glyph-form" className="home-glyph-form" autoComplete="off">
                <label id="home-glyph-label" htmlFor="home-glyph-input" data-t="homeGlyphLabel">文字ブレードで使う文字を入力</label>
                <div className="home-glyph-field"><input id="home-glyph-input" defaultValue="文" maxLength={20} spellCheck={false} aria-describedby="home-glyph-help" /><button type="submit" id="home-use-glyph" data-t="useGlyph">この文字で遊ぶ ↗</button></div>
                <span id="home-glyph-help" role="status" aria-live="polite" data-t="homeGlyphHelp">漢字・かな・英字から一文字を入力。選んだ書体で使える文字か確認します。</span>
              </form>
              <div className="hero-buttons">
                <button type="button" className="button button-primary" id="primary-play"><span className="button-icon-round">▶</span><span id="primary-label">つづきから</span><span className="button-arrow">↗</span></button>
                <button type="button" className="button button-outline" id="choose-mode"><span data-t="chooseMode">モードを選ぶ</span><span>↗</span></button>
              </div>
              <section className="campaign-card" id="campaign-card" aria-labelledby="campaign-title">
                <div className="campaign-eyebrow"><span>CHAPTER 01 · STORY</span><span id="campaign-counter">0 / 4</span></div>
                <div className="campaign-heading"><div><h2 id="campaign-title">はじめての発射</h2><p id="campaign-subtitle">最初の試練に挑もう。</p></div><span className="campaign-next-glyph" id="campaign-next-glyph" aria-hidden="true">字</span></div>
                <div className="campaign-progress" id="campaign-progress" role="progressbar" aria-label="Chapter 1" aria-valuemin={0} aria-valuemax={4} aria-valuenow={0}><span id="campaign-progress-fill" /></div>
                <div className="campaign-steps" id="campaign-steps" aria-label="Chapter 1 stages">
                  <span className="campaign-step is-next">01</span><span className="campaign-step">02</span><span className="campaign-step">03</span><span className="campaign-step">04</span>
                </div>
                <p className="campaign-foot" id="campaign-foot" aria-live="polite">★ 0 / 12</p>
              </section>
              <div className="first-time-hint" id="first-hint" hidden><span className="tiny-cross">✳</span><span data-t="noLogin">登録不要ですぐにあそべます</span></div>
            </div>
            <div className="showcase" id="showcase">
              <div className="showcase-corner top-left">MOJI <span>BATTLE ARENA</span></div>
              <div className="showcase-corner top-right"><span className="live-pulse"></span> 文字のリング</div>
              <canvas id="arena-canvas" role="img" aria-label="文字ブレードの3D文字コマが回転するホームプレビュー。"></canvas>
              <div className="showcase-label left-glyph"><span className="label-dot blue"></span><span data-t="you">あなた</span><strong id="hero-player-glyph">文</strong></div>
              <div className="showcase-label right-glyph"><span className="label-dot red"></span> RIVAL <strong>斬</strong></div>
              <div className="showcase-caption"><span className="caption-cross">✳</span><span data-t="previewHint">文字を変えると、コマのカタチも変わる！</span></div>
              <div id="home-battle-rating" className="home-battle-rating" aria-live="polite"><small>この文字の戦力</small><strong>—</strong><span>計算中</span></div>
              <div className="preview-picker" id="glyph-palette" role="group" aria-label="プレビューの文字">
                <button type="button" className="glyph-chip is-current" data-glyph="文" aria-pressed="true">文</button>
                <button type="button" className="glyph-chip" data-glyph="龍" aria-pressed="false">龍</button>
                <button type="button" className="glyph-chip" data-glyph="花" aria-pressed="false">花</button>
                <button type="button" className="glyph-chip" data-glyph="剣" aria-pressed="false">剣</button>
                <button type="button" className="glyph-chip-random" id="random-glyph" aria-label="文字をランダムにする" title="ランダム">↻</button>
              </div>
            </div>
          </section>
          <section className="bottom-content" id="modes" aria-label="ゲームモード">
            <div className="section-topline">
              <div><span className="section-kicker">SELECT BATTLE</span><h2 data-t="modeHeading">文字ブレードでどのバトルに挑む？</h2></div>
              <button className="text-arrow" type="button" data-panel="guide"><span data-t="howToPlay">あそびかた</span> ↗</button>
            </div>
            <div className="mode-grid">
              <button className="mode-card mode-card--story" type="button" data-mode="story"><div className="mode-pattern mode-pattern--one" aria-hidden="true">一</div><div className="mode-top"><span className="mode-number">STORY · 01</span><span className="mode-tag" data-t="mainMode">メイン</span></div><div className="mode-art"><span className="art-ring"></span><span className="art-symbol">章</span></div><div className="mode-info"><h3 data-t="story">ステージ</h3><p data-t="storyDesc">4つのステージで発射と角度を練習。</p></div><span className="card-cta" aria-hidden="true">↗</span></button>
              <button className="mode-card mode-card--quick" type="button" data-mode="quick"><div className="mode-top"><span className="mode-number">VS COM · FREE</span></div><div className="mode-art"><span className="art-ring"></span><span className="art-symbol">戦</span></div><div className="mode-info"><h3 data-t="quick">VS COM</h3><p data-t="quickDesc">好きな漢字・文字と書体を選んで対戦。</p></div><span className="card-cta" aria-hidden="true">↗</span></button>
            </div>
            <div className="underbar">
              <div className="underbar-left"><span className="underbar-stamp">文</span><span data-t="dailyLine">文字ブレードで最強の文字候補を探して、実際のバトルで試そう。</span></div>
              <div className="underbar-actions">
                <button type="button" data-panel="collection"><span data-t="collection">文字図鑑</span> ↗</button>
                <button type="button" data-panel="profile"><span data-t="profile">プレイ記録</span> ↗</button>
              </div>
            </div>
          </section>
          <section className="game-shelf" aria-labelledby="game-shelf-title">
            <div className="section-topline">
              <div><span className="section-kicker">GAMES</span><h2 id="game-shelf-title">あそべるゲーム</h2></div>
            </div>
            <div className="game-shelf-grid">
              {siteGames({ drawFight: drawHref(), typhoonEscape: typhoonHref(), zipperFinger: zipperHref(), shodo: shodoHref(), dashimaki: dashimakiHref(), omurice: omuriceHref(), potato: potatoHref(), breath: breathHref(), hamburg: hamburgHref(), softServe: softServeHref(), ommoji: ommojiHref(), shusshinKen: shusshinHref(), uwakiJinmon: uwakiHref(), iceBreak: iceHref(), kuroiEkitai: kuroHref(), daruma: darumaHref(), prefectureGame: prefHref(), kazokuIgai: kazokuHref(), acupunctureDarts: hariHref(), concafeSim: concafeHref(), hanko: hankoHref(), beerPour: beerHref(), sansa: sansaHref('ja'), coaster: coasterHref(), turkishIce: turkishIceHref(), latte: latteHref(), walker: walkerHref(), rollIce: rollIceHref(), nnko: nnkoHref(), derby: derbyHref() }).map((game) => (
                <a className={`game-card game-card--${game.id}`} href={game.href} key={game.id} aria-current={game.here ? 'page' : undefined}>
                  <span className="game-card-mark" aria-hidden="true">{game.mark}</span>
                  <span className="game-card-body">
                    <span className="game-card-kicker">{game.kicker}</span>
                    <strong>{game.title}</strong>
                    <span className="game-card-copy">{game.description}</span>
                    <span className="game-card-go">{game.here ? 'このページ' : 'あそぶ'}</span>
                  </span>
                </a>
              ))}
            </div>
            <p className="game-shelf-links">
              <a href={cookingHref()}>料理ゲーム一覧：卵焼き・オムライス・ハンバーグ・ソフトクリーム・ポテト</a>
              <a href={drawingHref()}>お絵描きゲーム一覧</a>
            </p>
          </section>
          <section className="seo-content" aria-labelledby="seo-heading"><div className="seo-content-inner"><p className="seo-eyebrow" data-t="seoEyebrow">無料ブラウザゲーム・文字バトル</p><h2 id="seo-heading" data-t="seoTitle">文字ブレードで最強の文字を探す</h2><p data-t="seoIntro1">文字ブレードは、好きな漢字・かな・英字を選び、3Dの文字コマで戦う無料ブラウザゲームです。文字の形と書体が、コマの動きやぶつかり方に影響します。</p><p data-t="seoIntro2">文字ブレードでは、ストーリーモードの4ステージで発射と角度を練習し、VS COMのフリーバトルで別の文字や書体を試せます。登録もインストールも不要で、ブラウザから文字バトルを始められます。</p><h2 data-t="seoFeatureTitle">文字ブレードでできること</h2><div className="seo-feature-grid"><article><h3 data-t="seoStoryTitle">4つのストーリーステージ</h3><p data-t="seoStoryDesc">文字ブレードの4つのストーリーステージで、発射パワー、角度、残りHPなどの目標を確認しながら攻略します。</p></article><article><h3 data-t="seoBattleTitle">漢字・文字で自由にバトル</h3><p data-t="seoBattleDesc">漢字ブレードや文字ゲームを探している人も、文字ブレードのVS COMで好きな漢字・かな・英字と書体を試せます。</p></article><article><h3 data-t="seoResearchTitle">最強の文字を属性で比較</h3><p data-t="seoResearchDesc">文字ブレードの文字図鑑、文字詳細、比較ラボ、文字能力研究で、対応する書体の速度・パワー・バランスを調べられます。属性値は字形からの計算値で、勝率を保証するものではありません。</p></article></div><nav className="seo-route-discovery" aria-label="文字ブレードの攻略・研究ページ">
            <a href={routeHref('stages', 'ja', ROUTE_BASE)}><strong data-t="seoLinkStagesTitle">文字ブレードのステージ攻略</strong><span data-t="seoLinkStagesDesc">第一章4ステージの相手、目標時間、星条件を確認。</span></a>
            <a href={routeHref('glyphs', 'ja', ROUTE_BASE)}><strong data-t="seoLinkGlyphsTitle">文字ブレード文字図鑑</strong><span data-t="seoLinkGlyphsDesc">漢字・かな・英字・記号を検索し、お気に入りを管理。</span></a>
            <a href={routeHref('compare', 'ja', ROUTE_BASE)}><strong data-t="seoLinkCompareTitle">文字比較ラボ</strong><span data-t="seoLinkCompareDesc">2つの文字と書体の属性差を比較。</span></a>
            <a href={routeHref('strongest', 'ja', ROUTE_BASE)}><strong data-t="seoLinkStrongestTitle">最強・最弱文字研究</strong><span data-t="seoLinkStrongestDesc">検証済みの速度・パワー・バランスを研究。</span></a>
            <a href={routeHref('play', 'ja', ROUTE_BASE)}><strong data-t="seoLinkPlayTitle">文字ブレードの遊び方</strong><span data-t="seoLinkPlayDesc">ストーリーとVS COMの違いを確認。</span></a>
            <a href={routeHref('how-to-play', 'ja', ROUTE_BASE)}><strong data-t="seoLinkGuideTitle">初心者ガイド</strong><span data-t="seoLinkGuideDesc">発射パワー、角度、Dashの基本。</span></a>
          </nav>
          <h2 className="seo-faq-heading" data-t="seoFaqTitle">文字ブレードについてよくある質問</h2><div className="seo-faq"><section><h3 data-t="seoFaq1Q">文字ブレードは無料で遊べますか？</h3><p data-t="seoFaq1A">はい。文字ブレードはブラウザですぐに遊べる無料の文字ゲームです。アカウント登録やアプリのインストールは必要ありません。</p></section><section><h3 data-t="seoFaq2Q">最強の文字はどれですか？</h3><p data-t="seoFaq2A">文字ブレードでは、絶対に勝てる最強文字を断定していません。書体別の属性研究で候補を比較し、実際の文字バトルで自分の操作に合う文字を試してください。</p></section><section><h3 data-t="seoFaq3Q">スマートフォンでも遊べますか？</h3><p data-t="seoFaq3A">はい。文字ブレードはスマートフォンとPCのブラウザに対応しています。操作感は画面サイズや端末によって異なる場合があります。</p></section><section><h3 data-t="seoFaq4Q">世界一難しい漢字や画数の多い漢字も使えますか？</h3><p data-t="seoFaq4A">文字ブレードでは、入力した漢字が選んだ書体の原本データに対応しているかを確認します。画数の多い漢字や難読漢字でも、対応が確認できなければ対戦には進めません。</p></section></div><SiteIndexLinks current="home" /></div></section>
          <footer className="home-footer"><span data-t="footerLine">文字ブレード · 文字の形が、バトルを変える。</span><span id="prototype-caption">STORY CHAPTER 01 · LOCAL PLAY</span></footer>
        </main>
        <main id="flow-page" className="flow-page" hidden aria-live="polite">
          <div className="flow-top">
            <button id="flow-back" type="button" className="flow-back">← <span id="flow-back-label">ホーム</span></button>
            <div id="flow-breadcrumb" className="flow-breadcrumb"></div>
            <span className="prototype-chip" id="game-progress-chip">STORY MODE</span>
          </div>
          <section id="flow-content" className="flow-content" aria-label="ゲーム準備"></section>
        </main>
      </div>
      <div className="overlay" id="overlay" hidden>
        <div className="overlay-scrim" data-close></div>
        <section className="overlay-panel" id="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title">
          <div className="overlay-top">
            <span className="overlay-kicker" id="panel-kicker">PREPARE</span>
            <button type="button" className="close-button" id="close-overlay" aria-label="閉じる">×</button>
          </div>
          <div id="panel-content"></div>
        </section>
      </div>
      <div id="battle-root" hidden></div>
    </div>
  )
}
