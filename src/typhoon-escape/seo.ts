import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { TYPHOON_PAGES, type TyphoonPage } from './content'

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

export function typhoonHref(suffix = '') {
  return `${siteRoot()}typhoon-escape/${suffix}`
}

export function typhoonCanonical(slug = 'home') {
  const path = slug === 'home' ? 'typhoon-escape/' : `typhoon-escape/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getTyphoonPage(slug: string): TyphoonPage | null {
  return TYPHOON_PAGES[slug] ?? null
}

export function typhoonHead(page: TyphoonPage) {
  const canonical = typhoonCanonical(page.slug)
  const home = typhoonCanonical('home')
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': ['VideoGame', 'WebApplication'],
        name: 'タイフーンエスケープ',
        alternateName: ['台風から逃げるゲーム', 'タイフーンから逃げるゲーム'],
        url: canonical,
        inLanguage: 'ja',
        description: page.description,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web browser',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: page.title,
        description: page.description,
        url: canonical,
        inLanguage: 'ja',
        isPartOf: { '@type': 'WebSite', name: 'タイフーンエスケープ', url: home },
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
      { name: 'theme-color', content: '#1B2F5E' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
