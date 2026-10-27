import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { COOKING_PAGE, type CookingPage } from './content'

function siteBase() {
  const site = import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL
  const url = new URL(site)
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  url.search = ''
  url.hash = ''
  return url
}

function siteRoot() {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

export function cookingHref(suffix = '') {
  return `${siteRoot()}cooking-games/${suffix}`
}

export function cookingCanonical() {
  return new URL('cooking-games/', siteBase()).toString()
}

export function getCookingPage(): CookingPage {
  return COOKING_PAGE
}

export function cookingHead(page: CookingPage = COOKING_PAGE) {
  const canonical = cookingCanonical()
  const games = [
    ['ハンバーグ作り', 'hamburg/'],
    ['ソフトクリームシミュレーター', 'soft-serve/'],
    ['だし巻きゲーム', 'dashimaki-game/'],
    ['オムライスシミュレーター', 'omurice-simulator/'],
    ['ぐるぐるポテトメーカー', 'long-potato/'],
  ]
  const data = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
      name: page.title,
    url: canonical,
    inLanguage: 'ja',
    description: page.description,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: games.map(([name, path], index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
        url: new URL(path, siteBase()).toString(),
      })),
    },
  }
  return {
    meta: [
      { title: page.title },
      { name: 'description', content: page.description },
      { name: 'robots', content: 'index,follow' },
      { property: 'og:title', content: page.title },
      { property: 'og:description', content: page.description },
      { property: 'og:url', content: canonical },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'ja' },
      { name: 'theme-color', content: '#c4472f' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
