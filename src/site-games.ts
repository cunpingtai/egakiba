export type SiteGame = {
  id: string
  href: string
  mark: string
  kicker: string
  title: string
  description: string
  here?: boolean
}

export function siteGames(drawFightHref: string): SiteGame[] {
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
      href: drawFightHref,
      mark: '絵',
      kicker: 'お絵描き格闘',
      title: 'ラクガキファイター',
      description: '描いたキャラが動き出して、そのままバトル。',
    },
  ]
}
