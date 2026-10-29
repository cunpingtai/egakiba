import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { PREF_PAGES, type PrefPage } from './content'

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

export function prefHref(suffix = '') {
  return `${siteRoot()}prefecture-game/${suffix}`
}

export function prefCanonical(slug = 'home') {
  const path = slug === 'home' ? 'prefecture-game/' : `prefecture-game/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getPrefPage(slug: string): PrefPage | null {
  if (slug === 'home' || slug === 'guide' || slug === 'adjacency' || slug === 'hard-mode' || slug === 'asia') return PREF_PAGES[slug]
  return null
}

export function prefHead(page: PrefPage) {
  const canonical = prefCanonical(page.slug)
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: '新・都道府県ゲーム',
        alternateName: ['都道府県ゲーム', '都道府県をくっつけるゲーム'],
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
      { property: 'og:type', content: page.slug === 'home' ? 'website' : 'article' },
      { property: 'og:locale', content: 'ja' },
      { name: 'theme-color', content: '#e9e4da' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
