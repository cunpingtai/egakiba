import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'

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

export function koiHref(suffix = '') {
  return `${siteRoot()}koi-shindan/${suffix}`
}

export function koiCanonical(suffix = '') {
  return new URL(`koi-shindan/${suffix}`, siteBase()).toString()
}

export function koiHead(title: string, description: string, suffix = '', jsonLd?: unknown, index = true) {
  const canonical = koiCanonical(suffix)
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: index ? 'index,follow' : 'noindex,follow' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'ja_JP' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'theme-color', content: '#FFF9F5' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: jsonLd ? [{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }] : [],
  }
}
