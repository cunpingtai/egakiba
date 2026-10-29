import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { HANKO_PAGES, type HankoPage } from './content'

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

export function hankoHref(suffix = '') {
  return `${siteRoot()}hanko-hankouki/${suffix}`
}

export function hankoCanonical(slug = 'home') {
  const path = slug === 'home' ? 'hanko-hankouki/' : `hanko-hankouki/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getHankoPage(slug: string): HankoPage | null {
  if (slug === 'home') return HANKO_PAGES.home
  return null
}

export function hankoHead(page: HankoPage) {
  const canonical = hankoCanonical(page.slug)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ハンコう期',
    alternateName: ['ハンコから逃げるゲーム', 'ハンコう期 ゲーム', '判子から逃げるゲーム'],
    url: canonical,
    inLanguage: 'ja',
    description: page.description,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
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
      { name: 'theme-color', content: '#d9dde2' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
