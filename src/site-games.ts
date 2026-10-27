export type SiteGame = {
  id: string
  href: string
  mark: string
  kicker: string
  title: string
  description: string
  here?: boolean
}

export function siteGames(links: { drawFight: string; typhoonEscape: string; zipperFinger: string; shodo: string; dashimaki: string; omurice: string; potato: string; breath: string; hamburg: string; ommoji: string }): SiteGame[] {
  return [
    {
      id: 'moji-blade',
      href: '#hero-title',
      mark: '文',
      kicker: '文字コマ',
      title: '文字ブレード',
      description: '漢字・かな・英字を選んで、文字コマで戦う。',
      here: true,
    },
    {
      id: 'rakugaki-fighter',
      href: links.drawFight,
      mark: '絵',
      kicker: 'お絵描き格闘',
      title: 'ラクガキファイター',
      description: '描いたキャラが動き出して、そのままバトル。',
    },
    {
      id: 'typhoon-escape',
      href: links.typhoonEscape,
      mark: '風',
      kicker: '台風回避',
      title: 'タイフーンエスケープ',
      description: '日本列島を動かして、台風から逃げる。',
    },
    {
      id: 'zipper-finger',
      href: links.zipperFinger,
      mark: '開',
      kicker: '写真ジッパー',
      title: 'ジッパーフィンガー',
      description: '好きな場所にジッパーを描いて、中の写真を開く。',
    },
    {
      id: 'shodo-simulator-3d',
      href: links.shodo,
      mark: '書',
      kicker: '書道',
      title: '書道シミュレーター3D',
      description: '半紙に筆で書いて、点数を見る。',
    },
    {
      id: 'dashimaki-game',
      href: links.dashimaki,
      mark: '卵',
      kicker: '料理',
      title: 'だし巻きゲーム',
      description: '火加減と油で卵焼きを巻く。',
    },
    {
      id: 'omurice-simulator',
      href: links.omurice,
      mark: '皿',
      kicker: '料理',
      title: 'オムライスシミュレーター',
      description: '卵を折って、チキンライスの上で開く。',
    },
    {
      id: 'long-potato',
      href: links.potato,
      mark: '芋',
      kicker: '料理',
      title: 'ぐるぐるポテトメーカー',
      description: 'じゃがいもをぐるぐる切って、長さを競う。',
    },
    {
      id: 'one-breath',
      href: links.breath,
      mark: '息',
      kicker: 'マイク',
      title: '一息で何歳まで',
      description: 'ろうそく1000本を、一息で吹き消す。',
    },
    {
      id: 'hamburg',
      href: links.hamburg,
      mark: '肉',
      kicker: '料理',
      title: 'ハンバーグ作り',
      description: '玉ねぎを切って、こねて、焼く。',
    },
    {
      id: 'ommoji',
      href: links.ommoji,
      mark: '絵',
      kicker: 'お絵描き',
      title: 'オム文字シミュレーター',
      description: 'ケチャップで、オムライスに絵や文字を描く。',
    },
  ]
}
