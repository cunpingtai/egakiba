import { useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'

import { drawHref } from '../draw-fight/src/paths'
import { breathHref } from './one-breath/seo'
import { dashimakiHref } from './dashimaki-game/seo'
import { hamburgHref } from './hamburg/seo'
import { ommojiHref } from './ommoji/seo'
import { omuriceHref } from './omurice-simulator/seo'
import { potatoHref } from './long-potato/seo'
import { routeHref } from './seo/landing-content.mjs'
import { shodoHref } from './shodo-simulator-3d/seo'
import { shusshinHref } from './shusshin-ken/seo'
import { BillionInvite } from './billion-invite'
import { iceHref } from './ice-break/seo'
import { kuroHref } from './kuroi-ekitai/seo'
import { darumaHref } from './daruma/seo'
import { prefHref } from './prefecture-game/seo'
import { kazokuHref } from './kazoku-igai/seo'
import { hariHref } from './acupuncture-darts/seo'
import { concafeHref } from './concafe-simulator/seo'
import { hankoHref } from './hanko-hankouki/seo'
import { beerHref } from './beer-pour/seo'
import { sansaHref } from './sansa/seo'
import { coasterHref } from './rakugaki-coaster/seo'
import { turkishIceHref } from './turkish-ice-cream-3d/seo'
import { latteHref } from './latteart-maker/seo'
import { walkerHref } from './jinsei-walker/seo'
import { rollIceHref } from './roll-ice-simulator/seo'
import { nnkoHref } from './nnko-quiz/seo'
import { derbyHref } from './prefecture-derby/seo'
import { tenhouHref } from './tenhou-simulator/seo'
import { uwakiHref } from './uwaki-jinmon/seo'
import { softServeHref } from './soft-serve/seo'
import { typhoonHref } from './typhoon-escape/seo'
import { zipperHref } from './zipper-finger/seo'

const MOJI_SECTIONS = new Set(['', 'play', 'stages', 'glyphs', 'compare', 'strongest', 'how-to-play'])

type HeaderGame = {
  id: string
  href: string
  mark: string
  title: string
  section: string | null
}

function siteRoot() {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

function normalizePath(path: string) {
  const withSlash = path.startsWith('/') ? path : `/${path}`
  if (withSlash !== '/' && !withSlash.endsWith('/')) return `${withSlash}/`
  return withSlash
}

function headerGames(root: string): HeaderGame[] {
  return [
    { id: 'moji-blade', href: routeHref('home', 'ja', root), mark: '文', title: '文字ブレード', section: null },
    { id: 'rakugaki-fighter', href: drawHref(), mark: '絵', title: 'ラクガキファイター', section: 'draw-fight' },
    { id: 'typhoon-escape', href: typhoonHref(), mark: '風', title: 'タイフーンエスケープ', section: 'typhoon-escape' },
    { id: 'zipper-finger', href: zipperHref(), mark: '開', title: 'ジッパーフィンガー', section: 'zipper-finger' },
    { id: 'shodo-simulator-3d', href: shodoHref(), mark: '書', title: '書道シミュレーター3D', section: 'shodo-simulator-3d' },
    { id: 'dashimaki-game', href: dashimakiHref(), mark: '卵', title: 'だし巻きゲーム', section: 'dashimaki-game' },
    { id: 'omurice-simulator', href: omuriceHref(), mark: '皿', title: 'オムライスシミュレーター', section: 'omurice-simulator' },
    { id: 'long-potato', href: potatoHref(), mark: '芋', title: 'ぐるぐるポテトメーカー', section: 'long-potato' },
    { id: 'one-breath', href: breathHref(), mark: '息', title: '一息で何歳まで', section: 'one-breath' },
    { id: 'hamburg', href: hamburgHref(), mark: '肉', title: 'ハンバーグ作り', section: 'hamburg' },
    { id: 'soft-serve', href: softServeHref(), mark: '氷', title: 'ソフトクリームシミュレーター', section: 'soft-serve' },
    { id: 'ommoji', href: ommojiHref(), mark: '絵', title: 'オム文字シミュレーター', section: 'omurice' },
    { id: 'shusshin-ken', href: shusshinHref(), mark: '県', title: '出身地、当てます', section: 'shusshin-ken' },
    { id: 'uwaki-jinmon', href: uwakiHref(), mark: '問', title: '浮気した夫に全部吐かせる', section: 'uwaki-jinmon' },
    { id: 'ice-break', href: iceHref(), mark: '割', title: 'ICE BREAK', section: 'ice-break' },
    { id: 'kuroi-ekitai', href: kuroHref(), mark: '吸', title: '黒い液体', section: 'kuroi-ekitai' },
    { id: 'daruma', href: darumaHref(), mark: '鬼', title: 'だるまさんがころんだ', section: 'daruma' },
    { id: 'prefecture-game', href: prefHref(), mark: '列', title: '新・都道府県ゲーム', section: 'prefecture-game' },
    { id: 'kazoku-igai', href: kazokuHref(), mark: '戸', title: '家族以外は入れないでください', section: 'kazoku-igai' },
    { id: 'acupuncture-darts', href: hariHref(), mark: '鍼', title: '鍼ダーツ', section: 'acupuncture-darts' },
    { id: 'concafe-simulator', href: concafeHref(), mark: '嬢', title: 'コンカフェ嬢シミュレーター', section: 'concafe-simulator' },
    { id: 'hanko-hankouki', href: hankoHref(), mark: '印', title: 'ハンコう期', section: 'hanko-hankouki' },
    { id: 'beer-pour', href: beerHref(), mark: '泡', title: 'ビールをいい感じにつぐ', section: 'beer-pour' },
    { id: 'sansa-online-temple', href: sansaHref('ja'), mark: '寺', title: '산사', section: 'ja/sansa-online-temple' },
    { id: 'rakugaki-coaster', href: coasterHref(), mark: '車', title: 'らくがきコースター', section: 'rakugaki-coaster' },
    { id: 'turkish-ice-cream-3d', href: turkishIceHref(), mark: '氷', title: 'トルコアイス3D', section: 'turkish-ice-cream-3d' },
    { id: 'latteart-maker', href: latteHref(), mark: '乳', title: 'ラテアート注ぎました', section: 'latteart-maker' },
    { id: 'jinsei-walker', href: walkerHref(), mark: '歩', title: '人生ウォーカー', section: 'jinsei-walker' },
    { id: 'roll-ice-simulator', href: rollIceHref(), mark: '巻', title: 'なんでもロールアイスシミュレーター', section: 'roll-ice-simulator' },
    { id: 'nnko-quiz', href: nnkoHref(), mark: '〇', title: '〇んこクイズ', section: 'nnko-quiz' },
    { id: 'prefecture-derby', href: derbyHref(), mark: '馬', title: '都道府県ダービー', section: 'prefecture-derby' },
    { id: 'tenhou-simulator', href: tenhouHref(), mark: '天', title: '天和シミュレーター', section: 'tenhou-simulator' },
  ]
}

function inSection(path: string, game: HeaderGame) {
  if (game.id === 'moji-blade') {
    const slug = path.split('/').filter(Boolean)[0] ?? ''
    return MOJI_SECTIONS.has(slug)
  }
  return path === `/${game.section}/` || path.startsWith(`/${game.section}/`)
}

export function SiteGameMenu() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const menuRef = useRef<HTMLDetailsElement>(null)
  const path = normalizePath(pathname)
  const games = headerGames(siteRoot())

  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false
  }, [pathname])

  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const onPointer = (event: PointerEvent) => {
      if (!menu.open) return
      if (event.target instanceof Node && menu.contains(event.target)) return
      menu.open = false
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menu.open) menu.open = false
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <details className="site-header-menu" ref={menuRef}>
      <summary>ゲーム</summary>
      <nav className="site-header-panel" aria-label="ゲーム一覧">
        {games.map((game) => {
          const here = path === normalizePath(game.href)
          const label = <><span className="site-header-game-mark" aria-hidden="true">{game.mark}</span><span>{game.title}</span></>
          if (here) return <span key={game.id} aria-current="page">{label}</span>
          return <a key={game.id} href={game.href} className={inSection(path, game) ? 'is-section' : undefined}>{label}</a>
        })}
      </nav>
    </details>
  )
}

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const root = siteRoot()
  const homeHref = routeHref('home', 'ja', root)
  const path = normalizePath(pathname)
  if (path === normalizePath(homeHref)) return null

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="site-header-brand" href={homeHref}><BrandMark /></a>
        <BillionInvite placement="bar" />
        <SiteGameMenu />
      </div>
    </header>
  )
}

function BrandMark() {
  return (
    <>
      <span className="site-header-mark" aria-hidden="true">文</span>
      <span className="site-header-name">文字ブレード</span>
    </>
  )
}
