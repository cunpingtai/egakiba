import { drawHref } from '../draw-fight/src/paths'
import { routeHref } from './seo/landing-content.mjs'
import { typhoonHref } from './typhoon-escape/seo'
import { dashimakiHref } from './dashimaki-game/seo'
import { omuriceHref } from './omurice-simulator/seo'
import { potatoHref } from './long-potato/seo'
import { breathHref } from './one-breath/seo'
import { shodoHref } from './shodo-simulator-3d/seo'
import { zipperHref } from './zipper-finger/seo'

function siteBase() {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

export function siteIndexLinks() {
  const root = siteBase()
  return [
    { id: 'home', href: routeHref('home', 'ja', root), label: 'ホーム' },
    { id: 'play', href: routeHref('play', 'ja', root), label: '文字ブレードの遊び方' },
    { id: 'stages', href: routeHref('stages', 'ja', root), label: 'ステージ攻略' },
    { id: 'glyphs', href: routeHref('glyphs', 'ja', root), label: '文字図鑑' },
    { id: 'compare', href: routeHref('compare', 'ja', root), label: '文字比較ラボ' },
    { id: 'strongest', href: routeHref('strongest', 'ja', root), label: '最強・最弱研究' },
    { id: 'how-to-play', href: routeHref('how-to-play', 'ja', root), label: '初心者ガイド' },
    { id: 'draw-fight', href: drawHref(), label: 'ラクガキファイター' },
    { id: 'draw-fight/how-to-play', href: drawHref('how-to-play/'), label: 'ラクガキの遊び方' },
    { id: 'draw-fight/create-fighter', href: drawHref('create-fighter/'), label: 'キャラの描き方' },
    { id: 'draw-fight/controls', href: drawHref('controls/'), label: 'ラクガキの操作' },
    { id: 'draw-fight/stages', href: drawHref('stages/'), label: 'ラクガキのステージ' },
    { id: 'draw-fight/fighter-stats', href: drawHref('fighter-stats/'), label: 'キャラの強さ' },
    { id: 'draw-fight/tips', href: drawHref('tips/'), label: 'ラクガキのコツ' },
    { id: 'draw-fight/bosses', href: drawHref('bosses/'), label: 'ボス攻略' },
    { id: 'draw-fight/faq', href: drawHref('faq/'), label: 'ラクガキの質問' },
    { id: 'draw-fight/save-data', href: drawHref('save-data/'), label: 'データの保存' },
    { id: 'typhoon-escape', href: typhoonHref(), label: 'タイフーンエスケープ' },
    { id: 'typhoon-escape/how-to-play', href: typhoonHref('how-to-play/'), label: '台風の遊び方' },
    { id: 'typhoon-escape/controls', href: typhoonHref('controls/'), label: '台風の操作' },
    { id: 'typhoon-escape/tips', href: typhoonHref('tips/'), label: '台風のコツ' },
    { id: 'zipper-finger', href: zipperHref(), label: 'ジッパーフィンガー' },
    { id: 'zipper-finger/how-to-play', href: zipperHref('how-to-play/'), label: 'ジッパーの遊び方' },
    { id: 'zipper-finger/photo-ideas', href: zipperHref('photo-ideas/'), label: '写真アイデア' },
    { id: 'zipper-finger/jojo', href: zipperHref('jojo/'), label: 'ジョジョとの関係' },
    { id: 'shodo-simulator-3d', href: shodoHref(), label: '書道シミュレーター3D' },
    { id: 'shodo-simulator-3d/how-to-play', href: shodoHref('how-to-play/'), label: '書道の遊び方' },
    { id: 'dashimaki-game', href: dashimakiHref(), label: 'だし巻きゲーム' },
    { id: 'dashimaki-game/how-to-play', href: dashimakiHref('how-to-play/'), label: 'だし巻きの遊び方' },
    { id: 'dashimaki-game/phantom-dashimaki', href: dashimakiHref('phantom-dashimaki/'), label: '幻の出し巻き' },
    { id: 'dashimaki-game/failures', href: dashimakiHref('failures/'), label: 'だし巻きの失敗' },
    { id: 'dashimaki-game/faq', href: dashimakiHref('faq/'), label: 'だし巻きの質問' },
    { id: 'omurice-simulator', href: omuriceHref(), label: 'オムライスシミュレーター' },
    { id: 'omurice-simulator/how-to-play', href: omuriceHref('how-to-play/'), label: 'オムライスの遊び方' },
    { id: 'omurice-simulator/high-score', href: omuriceHref('high-score/'), label: 'オムライスの高得点' },
    { id: 'omurice-simulator/fold-and-flip', href: omuriceHref('fold-and-flip/'), label: 'オムライスの合わせ目' },
    { id: 'omurice-simulator/faq', href: omuriceHref('faq/'), label: 'オムライスの質問' },
    { id: 'long-potato', href: potatoHref(), label: 'ぐるぐるポテトメーカー' },
    { id: 'long-potato/how-to-play', href: potatoHref('how-to-play/'), label: 'ぐるぐるポテトの遊び方' },
    { id: 'long-potato/tips', href: potatoHref('tips/'), label: 'ぐるぐるポテトのコツ' },
    { id: 'long-potato/records', href: potatoHref('records/'), label: 'ぐるぐるポテトの称号' },
    { id: 'long-potato/faq', href: potatoHref('faq/'), label: 'ぐるぐるポテトの質問' },
    { id: 'one-breath', href: breathHref(), label: '一息で何歳まで' },
    { id: 'one-breath/how-to-play', href: breathHref('how-to-play/'), label: '一息の遊び方' },
    { id: 'one-breath/titles', href: breathHref('titles/'), label: '一息の称号' },
    { id: 'one-breath/faq', href: breathHref('faq/'), label: '一息の質問' },
  ]
}

export function SiteIndexLinks({ current }: { current: string }) {
  return (
    <nav className="site-index-links" aria-label="サイト内のページ">
      {siteIndexLinks().map((link) => link.id === current
        ? <span key={link.id} aria-current="page">{link.label}</span>
        : <a key={link.id} href={link.href}>{link.label}</a>)}
    </nav>
  )
}
