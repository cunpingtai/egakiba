import { drawHref } from '../draw-fight/src/paths'
import { routeHref } from './seo/landing-content.mjs'
import { typhoonHref } from './typhoon-escape/seo'
import { dashimakiHref } from './dashimaki-game/seo'
import { omuriceHref } from './omurice-simulator/seo'
import { potatoHref } from './long-potato/seo'
import { breathHref } from './one-breath/seo'
import { hamburgHref } from './hamburg/seo'
import { softServeHref } from './soft-serve/seo'
import { cookingHref } from './cooking-games/seo'
import { ommojiHref } from './ommoji/seo'
import { shusshinHref } from './shusshin-ken/seo'
import { iceHref } from './ice-break/seo'
import { kuroHref } from './kuroi-ekitai/seo'
import { darumaHref } from './daruma/seo'
import { siteInfoHref } from './site-info/seo'
import { uwakiHref } from './uwaki-jinmon/seo'
import { interrogationHref } from './interrogation-games/seo'
import { regionHref } from './regional-differences/seo'
import { drawingHref } from './drawing-games/seo'
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
    { id: 'cooking-games', href: cookingHref(), label: '料理ゲーム（卵焼き・オムライス）' },
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
    { id: 'hamburg', href: hamburgHref(), label: 'ハンバーグ作り' },
    { id: 'hamburg/how-to-play', href: hamburgHref('how-to-play/'), label: 'ハンバーグの遊び方' },
    { id: 'hamburg/high-score', href: hamburgHref('high-score/'), label: 'ハンバーグの高得点' },
    { id: 'soft-serve', href: softServeHref(), label: 'ソフトクリームシミュレーター' },
    { id: 'soft-serve/how-to-play', href: softServeHref('how-to-play/'), label: 'ソフトクリームの遊び方' },
    { id: 'soft-serve/high-score', href: softServeHref('high-score/'), label: 'ソフトクリームの5つ星' },
    { id: 'omurice', href: ommojiHref(), label: 'オム文字シミュレーター' },
    { id: 'omurice/how-to-play', href: ommojiHref('how-to-play/'), label: 'オム文字の遊び方' },
    { id: 'omurice/ketchup-art', href: ommojiHref('ketchup-art/'), label: 'ケチャップアート' },
    { id: 'drawing-games', href: drawingHref(), label: '無料お絵描きゲーム' },
    { id: 'shusshin-ken', href: shusshinHref(), label: '出身地、当てます' },
    { id: 'shusshin-ken/how-to-play', href: shusshinHref('how-to-play/'), label: '出身地の遊び方' },
    { id: 'shusshin-ken/results', href: shusshinHref('results/'), label: '出身地の診断結果' },
    { id: 'shusshin-ken/guess-mode', href: shusshinHref('guess-mode/'), label: '今日の出身地の当て方' },
    { id: 'regional-differences', href: regionHref(), label: '日本の地域差クイズ' },
    { id: 'regional-differences/nikujaga', href: regionHref('nikujaga/'), label: '肉じゃがの牛肉と豚肉' },
    { id: 'regional-differences/ozoni', href: regionHref('ozoni/'), label: 'お雑煮の角餅と丸餅' },
    { id: 'uwaki-jinmon', href: uwakiHref(), label: '浮気した夫に全部吐かせる' },
    { id: 'uwaki-jinmon/s-rank', href: uwakiHref('s-rank/'), label: 'Sランク攻略' },
    { id: 'uwaki-jinmon/evidence', href: uwakiHref('evidence/'), label: '証拠の探し方' },
    { id: 'uwaki-jinmon/endings', href: uwakiHref('endings/'), label: 'エンディング' },
    { id: 'interrogation-games', href: interrogationHref(), label: '尋問ゲーム' },
    { id: 'ice-break', href: iceHref(), label: 'ICE BREAK' },
    { id: 'ice-break/how-to-play', href: iceHref('how-to-play/'), label: '氷の弱点の見つけ方' },
    { id: 'ice-break/500-challenge', href: iceHref('500-challenge/'), label: '500個チャレンジ' },
    { id: 'kuroi-ekitai', href: kuroHref(), label: '黒い液体' },
    { id: 'kuroi-ekitai/guide', href: kuroHref('guide/'), label: '黒い液体の攻略' },
    { id: 'kuroi-ekitai/titles', href: kuroHref('titles/'), label: '黒い液体の称号一覧' },
    { id: 'daruma', href: darumaHref(), label: 'だるまさんがころんだ' },
    { id: 'daruma/how-to-play', href: darumaHref('how-to-play/'), label: 'だるまさんがころんだの遊び方' },
    { id: 'daruma/sensor-fix', href: darumaHref('sensor-fix/'), label: 'だるまさんがころんだが動かないとき' },
    { id: 'daruma/speedrun', href: darumaHref('speedrun/'), label: 'だるまさんがころんだのタイム' },
    { id: 'about', href: siteInfoHref('about'), label: 'サイトについて' },
    { id: 'contact', href: siteInfoHref('contact'), label: 'お問い合わせ' },
    { id: 'privacy', href: siteInfoHref('privacy'), label: 'プライバシーポリシー' },
    { id: 'terms', href: siteInfoHref('terms'), label: '利用規約' },
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
