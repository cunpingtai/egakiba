import type { ReactNode } from 'react'
import { SiteIndexLinks } from '../site-links'
import {
  getSeoPage,
  routeHref,
  type SeoLocale,
  type SeoPageKey,
} from './landing-content.mjs'

const NAV_COPY: Record<SeoLocale, { home: string; play: string; stages: string; glyphs: string; compare: string; strongest: string; guide: string; playNow: string; explore: string; languages: Record<SeoLocale, string> }> = {
  ja: { home: 'ホーム', play: '遊び方・モード', stages: 'ステージ攻略', glyphs: '文字図鑑', compare: '文字比較ラボ', strongest: '最強・最弱研究', guide: '初心者ガイド', playNow: 'ゲームを始める', explore: '関連ページ', languages: { ja: '日本語', en: 'English', zh: '简体中文', ko: '한국어' } },
  en: { home: 'Home', play: 'Modes', stages: 'Stage guide', glyphs: 'Glyph collection', compare: 'Comparison lab', strongest: 'Strongest research', guide: 'How to play', playNow: 'Play Moji Blade', explore: 'Explore Moji Blade', languages: { ja: '日本語', en: 'English', zh: '简体中文', ko: '한국어' } },
  zh: { home: '首页', play: '玩法与模式', stages: '关卡攻略', glyphs: '文字图鉴', compare: '文字对比实验室', strongest: '最强文字研究', guide: '新手指南', playNow: '开始游戏', explore: '继续探索', languages: { ja: '日本語', en: 'English', zh: '简体中文', ko: '한국어' } },
  ko: { home: '홈', play: '플레이 모드', stages: '스테이지 공략', glyphs: '글자 도감', compare: '비교 실험실', strongest: '최강 글자 연구', guide: '플레이 방법', playNow: '게임 시작', explore: 'Moji Blade 더 알아보기', languages: { ja: '日本語', en: 'English', zh: '简体中文', ko: '한국어' } },
}

const LINK_PAGES: { key: Exclude<SeoPageKey, 'home'>; labelKey: 'play' | 'stages' | 'glyphs' | 'compare' | 'strongest' | 'guide'; description: Record<SeoLocale, string> }[] = [
  { key: 'play', labelKey: 'play', description: { ja: 'ストーリーとVS COMの遊び方', en: 'Story and VS COM modes', zh: '故事模式与 VS COM', ko: '스토리와 VS COM 모드' } },
  { key: 'stages', labelKey: 'stages', description: { ja: '第一章4ステージの目標', en: 'Goals for all four stages', zh: '第一章4个关卡目标', ko: '1장 4개 스테이지 목표' } },
  { key: 'glyphs', labelKey: 'glyphs', description: { ja: '漢字・かな・英字を探す', en: 'Search kanji, kana and letters', zh: '搜索汉字、假名和字母', ko: '한자·가나·알파벳 검색' } },
  { key: 'compare', labelKey: 'compare', description: { ja: '2つの文字の属性を比較', en: 'Compare two glyphs', zh: '比较两个文字的属性', ko: '두 글자의 속성 비교' } },
  { key: 'strongest', labelKey: 'strongest', description: { ja: '検証済み属性で候補を研究', en: 'Research verified attributes', zh: '研究经过验证的属性', ko: '검증된 속성 연구' } },
  { key: 'how-to-play', labelKey: 'guide', description: { ja: '発射パワーと角度を学ぶ', en: 'Learn power and angle control', zh: '学习发射力度与角度', ko: '발사 파워와 각도 배우기' } },
]

export function SeoLandingPage({ pageKey, locale, routeBase }: { pageKey: SeoPageKey; locale: SeoLocale; routeBase: string }) {
  const copy = getSeoPage(pageKey, locale)
  const nav = NAV_COPY[locale] || NAV_COPY.ja
  const homeHref = routeHref('home', locale, routeBase)
  const sections: ReactNode[] = copy.sections.map((section, index) => (
    <section className="seo-landing-section" key={`${pageKey}-section-${index}`} aria-labelledby={`seo-section-${index}`}>
      <h2 id={`seo-section-${index}`}>{section.title}</h2>
      <p>{section.body}</p>
      {section.bullets?.length ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
    </section>
  ))

  return (
    <main className="seo-landing" lang="ja">
      <header className="seo-landing-header">
        <a className="seo-landing-brand" href={homeHref} aria-label="Moji Blade home">
          <span className="seo-landing-brand-mark" aria-hidden="true">文</span>
          <span><strong>{locale === 'ja' ? '文字ブレード' : 'MOJI BLADE'}</strong><small>3D GLYPH BATTLE</small></span>
        </a>
        <nav aria-label={nav.explore} className="seo-landing-nav">
          <a href={routeHref('play', locale, routeBase)}>{nav.play}</a>
          <a href={routeHref('stages', locale, routeBase)}>{nav.stages}</a>
          <a href={routeHref('glyphs', locale, routeBase)}>{nav.glyphs}</a>
          <a href={routeHref('compare', locale, routeBase)}>{nav.compare}</a>
          <a href={routeHref('strongest', locale, routeBase)}>{nav.strongest}</a>
        </nav>
        <a className="seo-landing-header-cta" href={homeHref}>{nav.playNow} ↗</a>
      </header>

      <article className="seo-landing-article">
        <nav className="seo-landing-breadcrumb" aria-label="Breadcrumb">
          <a href={homeHref}>{nav.home}</a><span aria-hidden="true">/</span><span>{copy.h1}</span>
        </nav>
        <p className="seo-landing-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.h1}</h1>
        {copy.intro.map((paragraph, index) => <p className="seo-landing-lead" key={`${pageKey}-intro-${index}`}>{paragraph}</p>)}
        {pageKey === 'stages' ? <div className="seo-stage-grid" aria-label="Playable Story stages">
          {[
            { id: '01-01', glyph: '字', enemy: locale === 'ja' ? '相手：字' : locale === 'zh' ? '对手：字' : locale === 'ko' ? '상대: 字' : 'Rival: 字', title: locale === 'ja' ? 'はじめての発射' : locale === 'zh' ? '初次发射' : locale === 'ko' ? '첫 발사' : 'First Launch', target: locale === 'ja' ? '勝利 · 16秒以内' : locale === 'zh' ? '获胜 · 16秒内' : locale === 'ko' ? '승리 · 16초 이내' : 'Win · within 16 seconds' },
            { id: '01-02', glyph: '力', enemy: locale === 'ja' ? '相手：力' : locale === 'zh' ? '对手：力' : locale === 'ko' ? '상대: 力' : 'Rival: 力', title: locale === 'ja' ? '力のコントロール' : locale === 'zh' ? '力度训练' : locale === 'ko' ? '힘 조절' : 'Power Control', target: locale === 'ja' ? 'パワー65%以上 · 19秒以内' : locale === 'zh' ? '力度至少65% · 19秒内' : locale === 'ko' ? '파워 65% 이상 · 19초 이내' : 'Power ≥65% · within 19 seconds' },
            { id: '01-03', glyph: '山', enemy: locale === 'ja' ? '相手：山' : locale === 'zh' ? '对手：山' : locale === 'ko' ? '상대: 山' : 'Rival: 山', title: locale === 'ja' ? '角度のひみつ' : locale === 'zh' ? '角度训练' : locale === 'ko' ? '각도 조절' : 'Angle Control', target: locale === 'ja' ? '角度9°以上 · 20秒以内' : locale === 'zh' ? '偏角至少9° · 20秒内' : locale === 'ko' ? '각도 9° 이상 · 20초 이내' : 'Angle ≥9° · within 20 seconds' },
            { id: '01-04', glyph: '剣', enemy: locale === 'ja' ? 'ボス：剣' : locale === 'zh' ? 'Boss：剣' : locale === 'ko' ? '보스: 剣' : 'Boss: 剣', title: locale === 'ja' ? '第一の試練' : locale === 'zh' ? '初次试炼' : locale === 'ko' ? '첫 시련' : 'First Trial', target: locale === 'ja' ? 'ボスに勝利 · 24秒以内' : locale === 'zh' ? '击败Boss · 24秒内' : locale === 'ko' ? '보스 처치 · 24초 이내' : 'Defeat boss · within 24 seconds' },
          ].map((stage) => <section className="seo-stage-card" key={stage.id}><div className="seo-stage-card-top"><span>{stage.id}</span><span>{stage.id === '01-04' ? 'BOSS' : 'STORY'}</span></div><div className="seo-stage-glyph" aria-hidden="true">{stage.glyph}</div><h2>{stage.title}</h2><p>{stage.enemy}</p><p className="seo-stage-target">{stage.target}</p></section>)}
        </div> : null}
        <div className="seo-landing-sections">{sections}</div>

        {copy.faqs.length ? <section className="seo-landing-faq" aria-labelledby="seo-faq-title">
          <h2 id="seo-faq-title">よくある質問</h2>
          {copy.faqs.map(([question, answer]) => <section key={question}><h3>{question}</h3><p>{answer}</p></section>)}
        </section> : null}

        <nav className="seo-landing-related" aria-labelledby="seo-related-title">
          <h2 id="seo-related-title">{nav.explore}</h2>
          <div className="seo-related-grid">{LINK_PAGES.filter((item) => item.key !== pageKey).map((item) => <a href={routeHref(item.key, locale, routeBase)} key={item.key}><strong>{nav[item.labelKey]}</strong><span>{item.description[locale]}</span><span className="seo-related-arrow" aria-hidden="true">↗</span></a>)}</div>
        </nav>
        <div className="seo-landing-cta"><div><p>{copy.eyebrow}</p><h2>{nav.playNow}</h2><span>{locale === 'ja' ? '文字を選び、対応書体を確認してから対戦を始めましょう。' : locale === 'zh' ? '选择文字并验证字体支持后，即可开始对战。' : locale === 'ko' ? '글자를 선택하고 서체 지원을 확인한 뒤 배틀을 시작하세요.' : 'Choose a glyph, verify typeface support, and start a battle.'}</span></div><a href={homeHref}>{nav.playNow} ↗</a></div>
      </article>

      <footer className="seo-landing-footer">
        <span>MOJI BLADE · 文字の形が、バトルを変える。</span>
        <SiteIndexLinks current={pageKey} />
      </footer>
    </main>
  )
}
