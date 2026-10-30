import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'
import { SANSA_PAGES, type SansaLocaleId, type SansaPage } from './content'

export const SANSA_LOCALES: Record<SansaLocaleId, {
  base: string
  lang: SansaLocaleId
  locale: string
  label: string
  how: string
  play: string
  home: string
  back: string
  nav: string
  iframe: string
}> = {
  ko: {
    base: 'ko/sansa',
    lang: 'ko',
    locale: 'ko_KR',
    label: '산사 온라인 절',
    how: '온라인 절 하는 법',
    play: '법당에 들어가기',
    home: '홈',
    back: '산사 온라인 절로',
    nav: '산사 안내',
    iframe: '산사 온라인 절',
  },
  ja: {
    base: 'ja/sansa-online-temple',
    lang: 'ja',
    locale: 'ja',
    label: '산사',
    how: '遊び方',
    play: 'お堂に入る',
    home: 'ホーム',
    back: '산사へ',
    nav: '산사の案内',
    iframe: '산사',
  },
  fr: {
    base: 'fr/sansa',
    lang: 'fr',
    locale: 'fr',
    label: 'Sansa',
    how: 'Comment entrer',
    play: 'Entrer dans la salle',
    home: 'Accueil',
    back: 'Retour à Sansa',
    nav: 'Parcours de Sansa',
    iframe: 'Sansa',
  },
  en: {
    base: 'en/sansa',
    lang: 'en',
    locale: 'en',
    label: 'Sansa',
    how: 'How to enter',
    play: 'Enter the hall',
    home: 'Home',
    back: 'Back to Sansa',
    nav: 'Sansa pages',
    iframe: 'Sansa',
  },
}

const NAMES: Record<SansaLocaleId, string> = {
  ko: '산사 온라인 절',
  ja: '산사',
  fr: 'Sansa',
  en: 'Sansa',
}

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

export function sansaHref(locale: SansaLocaleId, suffix = '') {
  return `${siteRoot()}${SANSA_LOCALES[locale].base}/${suffix}`
}

export function sansaCanonical(locale: SansaLocaleId, slug: 'home' | 'how-to' = 'home') {
  const path = slug === 'home' ? `${SANSA_LOCALES[locale].base}/` : `${SANSA_LOCALES[locale].base}/how-to/`
  return new URL(path, siteBase()).toString()
}

export function getSansaPage(locale: SansaLocaleId, slug: string): SansaPage | null {
  if (slug !== 'home' && slug !== 'how-to') return null
  return SANSA_PAGES[locale][slug]
}

export function sansaHead(locale: SansaLocaleId, page: SansaPage) {
  const canonical = sansaCanonical(locale, page.slug)
  const alternates = (['ko', 'ja', 'fr', 'en'] as SansaLocaleId[]).map((item) => ({
    rel: 'alternate',
    hrefLang: item,
    href: sansaCanonical(item, page.slug),
  }))
  const data = page.slug === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: NAMES[locale],
        url: canonical,
        inLanguage: locale,
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
        inLanguage: locale,
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
      { property: 'og:locale', content: SANSA_LOCALES[locale].locale },
      { name: 'theme-color', content: '#24251f' },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      ...alternates,
      { rel: 'alternate', hrefLang: 'x-default', href: sansaCanonical('ko', page.slug) },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}
