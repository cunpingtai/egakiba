import { DEFAULT_SITE_URL, getSeoHead, type SeoLocale, type SeoPageKey } from './landing-content.mjs'

const siteUrl = import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL

export function seoRouteHead(pageKey: SeoPageKey, locale: SeoLocale = 'ja') {
  const seo = getSeoHead(pageKey, locale, siteUrl)
  const localeCode = locale === 'zh' ? 'zh-Hans' : locale
  return {
    meta: [
      { title: seo.title },
      { name: 'description', content: seo.description },
      { name: 'robots', content: 'index,follow,max-image-preview:large' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: seo.title },
      { property: 'og:description', content: seo.description },
      { property: 'og:url', content: seo.canonical },
      { property: 'og:locale', content: localeCode },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: seo.title },
      { name: 'twitter:description', content: seo.description },
    ],
    links: [
      { rel: 'canonical', href: seo.canonical },
      ...seo.alternates.map((alternate) => ({
        rel: 'alternate',
        hrefLang: alternate.lang === 'zh' ? 'zh-Hans' : alternate.lang,
        href: alternate.href,
      })),
      { rel: 'alternate', hrefLang: 'x-default', href: seo.alternates.find((alternate) => alternate.lang === 'ja')?.href || seo.canonical },
    ],
    scripts: [
      { type: 'application/ld+json', children: JSON.stringify(seo.structuredData) },
    ],
  }
}

export const ROUTE_BASE = import.meta.env.BASE_URL || '/'
