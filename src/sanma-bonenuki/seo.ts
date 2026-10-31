import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { SANMA_PAGES, type SanmaPage } from './content'

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

export function sanmaHref(suffix = '') {
  return `${siteRoot()}sanma-bonenuki/${suffix}`
}

export function sanmaCanonical(slug = 'home') {
  const path = slug === 'home' ? 'sanma-bonenuki/' : `sanma-bonenuki/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getSanmaPage(slug: string): SanmaPage | null {
  return SANMA_PAGES[slug] ?? null
}

export function sanmaHead(page: SanmaPage) {
  const canonical = sanmaCanonical(page.slug)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '秋刀魚(骨抜き)',
    alternateName: ['サンマの骨を抜くゲーム', '焼きサンマの中骨を一本で抜くゲーム'],
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
      { name: 'theme-color', content: '#0d0b0a' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
