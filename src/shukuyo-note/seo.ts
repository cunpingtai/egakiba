import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { YADO_PAGES, type YadoPage } from './content'

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

export function yadoHref(suffix = '') {
  return `${siteRoot()}shukuyo-note/${suffix}`
}

export function yadoCanonical(slug = 'home') {
  const path = slug === 'home' ? 'shukuyo-note/' : `shukuyo-note/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function getYadoPage(slug: string): YadoPage | null {
  return YADO_PAGES[slug] ?? null
}

export function yadoHead(page: YadoPage) {
  const canonical = yadoCanonical(page.slug)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.h1,
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
      { name: 'theme-color', content: '#dbe5e1' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ja', href: canonical },
      { rel: 'alternate', hrefLang: 'x-default', href: canonical },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
