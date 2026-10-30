import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { WALKER_PAGES, type WalkerPage } from './content'

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

export function walkerHref(suffix = '') {
  return `${siteRoot()}jinsei-walker/${suffix}`
}

export function walkerCanonical(slug = 'home') {
  const path = slug === 'home' ? 'jinsei-walker/' : `jinsei-walker/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getWalkerPage(slug: string): WalkerPage | null {
  return WALKER_PAGES[slug] ?? null
}

export function walkerHead(page: WalkerPage) {
  const canonical = walkerCanonical(page.slug)
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: '人生ウォーカー',
        alternateName: ['人生ウォーカー ゲーム', '人生を歩くゲーム', '歩くたびに年を取るゲーム'],
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
      { name: 'theme-color', content: '#16202e' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
