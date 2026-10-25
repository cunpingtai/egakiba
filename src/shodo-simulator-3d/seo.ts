import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { SHODO_PAGES, type ShodoPage } from './content'

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

export function shodoHref(suffix = '') {
  return `${siteRoot()}shodo-simulator-3d/${suffix}`
}

export function shodoCanonical(slug = 'home') {
  const path = slug === 'home' ? 'shodo-simulator-3d/' : `shodo-simulator-3d/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getShodoPage(slug: string): ShodoPage | null {
  return SHODO_PAGES[slug] ?? null
}

export function shodoHead(page: ShodoPage) {
  const canonical = shodoCanonical(page.slug)
  const home = shodoCanonical('home')
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: '書道シミュレーター3D',
        alternateName: ['書道ゲーム', '書道シミュレーター', '習字ゲーム'],
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
        isPartOf: { '@type': 'WebSite', name: '書道シミュレーター3D', url: home },
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
      { name: 'theme-color', content: '#2b2622' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
