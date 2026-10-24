import bosses from '../../draw-fight/seo/pages/bosses.md?raw'
import controls from '../../draw-fight/seo/pages/controls.md?raw'
import createFighter from '../../draw-fight/seo/pages/create-fighter.md?raw'
import faq from '../../draw-fight/seo/pages/faq.md?raw'
import fighterStats from '../../draw-fight/seo/pages/fighter-stats.md?raw'
import home from '../../draw-fight/seo/pages/home.md?raw'
import howToPlay from '../../draw-fight/seo/pages/how-to-play.md?raw'
import saveData from '../../draw-fight/seo/pages/save-data.md?raw'
import stages from '../../draw-fight/seo/pages/stages.md?raw'
import tips from '../../draw-fight/seo/pages/tips.md?raw'
import { drawHref } from '../../draw-fight/src/paths'
import { DEFAULT_SITE_URL } from '../seo/landing-content.mjs'

function siteBase() {
  const site = import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL
  const url = new URL(site)
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  url.search = ''
  url.hash = ''
  return url.toString()
}

export const GUIDE_PAGES = [
  ['how-to-play', '遊び方'],
  ['create-fighter', 'キャラの作り方'],
  ['controls', '操作方法'],
  ['stages', 'ステージ'],
  ['fighter-stats', '強さの決まり方'],
  ['tips', '戦い方のコツ'],
  ['bosses', 'ボス'],
  ['faq', 'よくある質問'],
  ['save-data', 'データ保存'],
] as const

const SOURCES: Record<string, string> = {
  home,
  'how-to-play': howToPlay,
  'create-fighter': createFighter,
  controls,
  stages,
  'fighter-stats': fighterStats,
  tips,
  bosses,
  faq,
  'save-data': saveData,
}

export type SeoBlock =
  | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }

export type RakugakiPage = {
  slug: string
  title: string
  description: string
  canonical: string
  blocks: SeoBlock[]
}

export function rakugakiCanonical(slug = 'home') {
  const path = slug === 'home' ? 'draw-fight/' : `draw-fight/${slug}/`
  return new URL(path, siteBase()).toString()
}

export function rakugakiPathCanonical(path: string) {
  const clean = path.replace(/^\/+/, '')
  return new URL(clean.endsWith('/') ? clean : `${clean}/`, siteBase()).toString()
}

export function rakugakiHref(href: string) {
  if (href.includes('#quick-start')) return drawHref('studio?demo=1')
  if (href.includes('#play')) return `${drawHref()}#play`
  if (href === '/draw-fight' || href === '/draw-fight/') return drawHref()
  const match = href.match(/^\/draw-fight\/([a-z0-9-]+)\/?(#.*)?$/)
  if (match && match[1] in SOURCES) return `${drawHref(`${match[1]}/`)}${match[2] ?? ''}`
  return href
}

export function getRakugakiPage(slug: string): RakugakiPage | null {
  const source = SOURCES[slug]
  if (!source) return null
  const parsed = parsePage(source)
  return {
    slug,
    title: parsed.title,
    description: parsed.description,
    canonical: rakugakiCanonical(slug),
    blocks: parseBlocks(parsed.body),
  }
}

export function rakugakiHead(page: RakugakiPage) {
  const isHome = page.slug === 'home'
  const data = isHome
    ? {
        '@context': 'https://schema.org',
        '@type': ['VideoGame', 'WebApplication'],
        name: 'ラクガキファイター',
        url: page.canonical,
        inLanguage: 'ja',
        description: page.description,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web browser',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: page.title,
        description: page.description,
        url: page.canonical,
        inLanguage: 'ja',
        isPartOf: { '@type': 'WebSite', name: 'ラクガキファイター', url: rakugakiCanonical('home') },
      }
  return {
    meta: [
      { title: page.title },
      { name: 'description', content: page.description },
      { name: 'robots', content: 'index,follow' },
      { property: 'og:title', content: page.title },
      { property: 'og:description', content: page.description },
      { property: 'og:url', content: page.canonical },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'ja' },
      { name: 'theme-color', content: '#f8f2e5' },
    ],
    links: [{ rel: 'canonical', href: page.canonical }],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(data) }],
  }
}

function parsePage(source: string) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error('Rakugaki SEO page is missing frontmatter')
  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const index = line.indexOf(':')
    if (index < 0) continue
    meta[line.slice(0, index).trim()] = line.slice(index + 1).trim()
  }
  return { title: meta.title, description: meta.description, body: match[2].trim() }
}

function parseBlocks(body: string): SeoBlock[] {
  const lines = body.split('\n')
  const blocks: SeoBlock[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }
    if (line.startsWith('|')) {
      const rows: string[][] = []
      while (index < lines.length && lines[index].startsWith('|')) {
        if (!/^\|\s*:?-{3,}/.test(lines[index])) rows.push(splitRow(lines[index]))
        index += 1
      }
      blocks.push({ type: 'table', headers: rows[0] ?? [], rows: rows.slice(1) })
      continue
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4).trim() })
      index += 1
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
      index += 1
      continue
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2).trim() })
      index += 1
      continue
    }
    const paragraph = [line.trim()]
    index += 1
    while (index < lines.length && lines[index].trim() && !lines[index].startsWith('#') && !lines[index].startsWith('|')) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push({ type: 'p', text: paragraph.join('') })
  }
  return blocks
}

function splitRow(line: string) {
  return line.split('|').slice(1, -1).map(cell => cell.trim())
}
