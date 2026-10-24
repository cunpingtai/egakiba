export type SeoLocale = 'ja' | 'en' | 'zh' | 'ko'
export type SeoPageKey = 'home' | 'play' | 'stages' | 'glyphs' | 'compare' | 'strongest' | 'how-to-play'
export interface SeoSection { title: string; body: string; bullets?: string[] }
export interface SeoFaq { 0: string; 1: string }
export interface SeoPage { title: string; description: string; h1: string; eyebrow: string; intro: string[]; sections: SeoSection[]; faqs: [string, string][] }
export const SEO_LOCALES: readonly SeoLocale[]
export const SEO_INDEXABLE_PAGES: readonly Exclude<SeoPageKey, 'home'>[]
export const DEFAULT_SITE_URL: string
export function getSeoPage(pageKey: SeoPageKey | string, locale?: SeoLocale | string): SeoPage
export function normalizeSiteBase(value?: string): string
export function canonicalUrl(pageKey: SeoPageKey | string, locale?: SeoLocale | string, siteBase?: string): string
export function routeHref(pageKey: SeoPageKey | string, locale?: SeoLocale | string, routeBase?: string): string
export function getSeoHead(pageKey: SeoPageKey | string, locale?: SeoLocale | string, siteBase?: string): { title: string; description: string; canonical: string; alternates: {lang: string; href: string}[]; structuredData: Record<string, unknown> }
