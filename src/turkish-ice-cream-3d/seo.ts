import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { ICE_PAGES, type IcePage } from './content'

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

export function turkishIceHref(suffix = '') {
  return `${siteRoot()}turkish-ice-cream-3d/${suffix}`
}

export function turkishIceCanonical(slug = 'home') {
  const path = slug === 'home' ? 'turkish-ice-cream-3d/' : `turkish-ice-cream-3d/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getIcePage(slug: string): IcePage | null {
  return ICE_PAGES[slug] ?? null
}

export function turkishIceHead(page: IcePage) {
  const canonical = turkishIceCanonical(page.slug)
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'トルコアイス3D',
        alternateName: ['トルコアイスを守るゲーム', 'トルコアイスを渡さないゲーム', 'お客さんの手が伸びるゲーム'],
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
      { name: 'theme-color', content: '#c8434f' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
