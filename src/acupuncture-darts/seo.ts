import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { HARI_PAGES, type HariPage } from './content'

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

export function hariHref(suffix = '') {
  return `${siteRoot()}acupuncture-darts/${suffix}`
}

export function hariCanonical(slug = 'home') {
  const path = slug === 'home' ? 'acupuncture-darts/' : `acupuncture-darts/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getHariPage(slug: string): HariPage | null {
  if (slug === 'home' || slug === 'how-to-play') return HARI_PAGES[slug]
  return null
}

export function hariHead(page: HariPage) {
  const canonical = hariCanonical(page.slug)
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: '鍼ダーツ',
        alternateName: ['針ダーツ', 'ダーツで鍼治療するゲーム', '背中のツボに鍼を投げるゲーム'],
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
      { name: 'theme-color', content: '#efe4d2' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
