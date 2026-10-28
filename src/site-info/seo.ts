import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { SITE_INFO_PAGES, type SiteInfoPage, type SiteInfoSlug } from './content'

function siteBase() {
  const site = import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL
  const url = new URL(site)
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  url.search = ''
  url.hash = ''
  return url
}

export function siteInfoHref(slug: SiteInfoSlug) {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}${slug}/`
}

export function siteInfoCanonical(slug: SiteInfoSlug) {
  return new URL(`${slug}/`, siteBase()).toString()
}

export function siteInfoHead(slug: SiteInfoSlug) {
  const page: SiteInfoPage = SITE_INFO_PAGES[slug]
  const canonical = siteInfoCanonical(slug)
  const data = slug === 'contact'
    ? {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: page.title,
        url: canonical,
        inLanguage: 'ja',
        description: page.description,
        mainEntity: {
          '@type': 'Organization',
          name: '文字ブレード',
          url: siteBase().toString(),
          email: 'support@egakiba.com',
        },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: page.title,
        url: canonical,
        inLanguage: 'ja',
        description: page.description,
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
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
