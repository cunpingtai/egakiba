import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { ZIPPER_PAGES, type ZipperPage } from './content'

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

export function zipperHref(suffix = '') {
  return `${siteRoot()}zipper-finger/${suffix}`
}

export function zipperCanonical(slug = 'home') {
  const path = slug === 'home' ? 'zipper-finger/' : `zipper-finger/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getZipperPage(slug: string): ZipperPage | null {
  return ZIPPER_PAGES[slug] ?? null
}

export function zipperHead(page: ZipperPage) {
  const canonical = zipperCanonical(page.slug)
  const home = zipperCanonical('home')
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'ジッパーフィンガー',
        alternateName: ['ジッパーで好きなところをひらけるツール', '写真にジッパーを描くツール'],
        url: canonical,
        inLanguage: 'ja',
        description: page.description,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web browser',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: page.title,
        description: page.description,
        url: canonical,
        inLanguage: 'ja',
        isPartOf: { '@type': 'WebSite', name: 'ジッパーフィンガー', url: home },
      }
  return {
    meta: [
      { title: page.title },
      { name: 'description', content: page.description },
      { name: 'robots', content: 'index,follow' },
      { property: 'og:title', content: page.title },
      { property: 'og:description', content: page.description },
      { property: 'og:url', content: canonical },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'ja' },
      { name: 'theme-color', content: '#222222' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
