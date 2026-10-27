import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { REGION_PAGES, type RegionPage } from './content'

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

export function regionHref(suffix = '') {
  return `${siteRoot()}regional-differences/${suffix}`
}

export function regionCanonical(slug = 'home') {
  const path = slug === 'home' ? 'regional-differences/' : `regional-differences/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getRegionPage(slug: string): RegionPage | null {
  return REGION_PAGES[slug] ?? null
}

export function regionHead(page: RegionPage) {
  const canonical = regionCanonical(page.slug)
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: '日本の地域差クイズ',
        url: canonical,
        inLanguage: 'ja',
        description: page.description,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: '肉じゃがの肉', url: regionCanonical('nikujaga') },
            { '@type': 'ListItem', position: 2, name: 'お雑煮の餅', url: regionCanonical('ozoni') },
          ],
        },
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
      { name: 'theme-color', content: '#0b1626' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
