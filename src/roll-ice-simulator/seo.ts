import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { ROLL_ICE_PAGES, type RollIcePage } from './content'

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

export function rollIceHref(suffix = '') {
  return `${siteRoot()}roll-ice-simulator/${suffix}`
}

export function rollIceCanonical(slug = 'home') {
  const path = slug === 'home' ? 'roll-ice-simulator/' : `roll-ice-simulator/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getRollIcePage(slug: string): RollIcePage | null {
  return ROLL_ICE_PAGES[slug] ?? null
}

export function rollIceHead(page: RollIcePage) {
  const canonical = rollIceCanonical(page.slug)
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'なんでもロールアイスシミュレーター',
        alternateName: ['ロールアイスシミュレーター', 'フルーツを刻んでロールアイスを作るゲーム', '鉄板でアイスを巻くゲーム'],
        url: canonical,
        inLanguage: 'ja',
        description: page.description,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web browser',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: page.title,
        description: page.description,
        inLanguage: 'ja',
        url: canonical,
      }
  return {
    meta: [
      { title: page.title },
      { name: 'description', content: page.description },
      { name: 'robots', content: 'index,follow' },
      { property: 'og:title', content: page.title },
      { property: 'og:description', content: page.description },
      { property: 'og:url', content: canonical },
      { property: 'og:type', content: 'article' },
      { property: 'og:locale', content: 'ja' },
      { name: 'theme-color', content: '#e6d3b6' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
