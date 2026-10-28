import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { KURO_PAGES, type KuroPage } from './content'

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

export function kuroHref(suffix = '') {
  return `${siteRoot()}kuroi-ekitai/${suffix}`
}

export function kuroCanonical(slug = 'home') {
  const path = slug === 'home' ? 'kuroi-ekitai/' : `kuroi-ekitai/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getKuroPage(slug: string): KuroPage | null {
  if (slug === 'home' || slug === 'guide' || slug === 'titles') return KURO_PAGES[slug]
  return null
}

export function kuroHead(page: KuroPage) {
  const canonical = kuroCanonical(page.slug)
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: '黒い液体',
        alternateName: ['黒い液体 ゲーム', 'Black Liquid'],
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
      { name: 'theme-color', content: '#e8e3d8' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
