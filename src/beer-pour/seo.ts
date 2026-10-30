import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { BEER_PAGES, type BeerPage } from './content'

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

export function beerHref(suffix = '') {
  return `${siteRoot()}beer-pour/${suffix}`
}

export function beerCanonical(slug = 'home') {
  const path = slug === 'home' ? 'beer-pour/' : `beer-pour/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getBeerPage(slug: string): BeerPage | null {
  if (slug === 'home' || slug === '100-points') return BEER_PAGES[slug]
  return null
}

export function beerHead(page: BeerPage) {
  const canonical = beerCanonical(page.slug)
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'ビールをいい感じにつぐ',
        alternateName: ['ビールを注ぐゲーム', 'ビールの泡を7対3にするゲーム', 'ビールをいい感じにつぐ ゲーム', 'ビール7:3ゲーム'],
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
      { name: 'theme-color', content: '#fff6dc' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
