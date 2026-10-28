import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { DARUMA_PAGES, type DarumaPage } from './content'

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

export function darumaHref(suffix = '') {
  return `${siteRoot()}daruma/${suffix}`
}

export function darumaCanonical(slug = 'home') {
  const path = slug === 'home' ? 'daruma/' : `daruma/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getDarumaPage(slug: string): DarumaPage | null {
  if (slug === 'home' || slug === 'how-to-play' || slug === 'sensor-fix' || slug === 'speedrun') return DARUMA_PAGES[slug]
  return null
}

export function darumaHead(page: DarumaPage) {
  const canonical = darumaCanonical(page.slug)
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'だるまさんがころんだ',
        alternateName: ['だるまさんがころんだ ゲーム', 'スマホを傾けるゲーム'],
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
      { name: 'theme-color', content: '#1a0f0c' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
