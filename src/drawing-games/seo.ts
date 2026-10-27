import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { DRAWING_PAGE, type DrawingPage } from './content'

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

export function drawingHref(suffix = '') {
  return `${siteRoot()}drawing-games/${suffix}`
}

export function drawingCanonical() {
  return new URL('drawing-games/', siteBase()).toString()
}

export function getDrawingPage(): DrawingPage {
  return DRAWING_PAGE
}

export function drawingHead(page: DrawingPage = DRAWING_PAGE) {
  const canonical = drawingCanonical()
  const games = [
    ['オム文字シミュレーター', 'omurice/'],
    ['ラクガキファイター', 'draw-fight/'],
    ['ジッパーフィンガー', 'zipper-finger/'],
    ['書道シミュレーター3D', 'shodo-simulator-3d/'],
  ]
  const data = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '無料お絵描きゲーム',
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
      { name: 'theme-color', content: '#c4261a' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
