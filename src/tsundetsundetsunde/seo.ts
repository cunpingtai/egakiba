import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { TSUNDE_PAGES, type TsundePage } from './content'

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

export function tsundeHref(suffix = '') {
  return `${siteRoot()}tsundetsundetsunde/${suffix}`
}

export function tsundeCanonical(slug = 'home') {
  const path = slug === 'home' ? 'tsundetsundetsunde/' : `tsundetsundetsunde/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getTsundePage(slug: string): TsundePage | null {
  return TSUNDE_PAGES[slug] ?? null
}

export function tsundeHead(page: TsundePage) {
  const canonical = tsundeCanonical(page.slug)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ツンデツンデツンデ',
    alternateName: ['ツンデツンデを積み上げるゲーム', 'ポケモンを積み上げるゲーム'],
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
      { property: 'og:type', content: 'article' },
      { property: 'og:locale', content: 'ja' },
      { name: 'theme-color', content: '#111922' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
