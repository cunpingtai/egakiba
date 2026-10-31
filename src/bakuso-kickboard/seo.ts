import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { BAKUSO_PAGES, type BakusoPage } from './content'

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

export function bakusoHref(suffix = '') {
  return `${siteRoot()}bakuso-kickboard/${suffix}`
}

export function bakusoCanonical(slug = 'home') {
  const path = slug === 'home' ? 'bakuso-kickboard/' : `bakuso-kickboard/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getBakusoPage(slug: string): BakusoPage | null {
  return BAKUSO_PAGES[slug] ?? null
}

export function bakusoHead(page: BakusoPage) {
  const canonical = bakusoCanonical(page.slug)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '爆走キックボード',
    alternateName: ['山手線をキックボードで走るゲーム', '電動キックボードで通勤するゲーム'],
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
      { name: 'theme-color', content: '#0c1116' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
