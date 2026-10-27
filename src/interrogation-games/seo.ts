import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { INTERROGATION_PAGE, type InterrogationPage } from './content'

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

export function interrogationHref(suffix = '') {
  return `${siteRoot()}interrogation-games/${suffix}`
}

export function interrogationCanonical() {
  return new URL('interrogation-games/', siteBase()).toString()
}

export function getInterrogationPage(): InterrogationPage {
  return INTERROGATION_PAGE
}

export function interrogationHead(page: InterrogationPage = INTERROGATION_PAGE) {
  const canonical = interrogationCanonical()
  const data = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
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
      { name: 'theme-color', content: '#0b0a09' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
