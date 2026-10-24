export type SiteGame = {
  id: string
  href: string
  mark: string
  kicker: string
  title: string
  description: string
  here?: boolean
}

export function siteGames(links: { drawFight: string; typhoonEscape: string; zipperFinger: string }): SiteGame[] {
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
  ]
}
