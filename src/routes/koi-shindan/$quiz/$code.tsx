import { createFileRoute, notFound } from '@tanstack/react-router'

import { ResultView } from '../../../koi-shindan/Result'
import { SITE_NAME, cleanName, personalize, presentResult, resultSeo } from '../../../koi-shindan/score.mjs'
import { koiCanonical, koiHead } from '../../../koi-shindan/seo'

type ResultSearch = { n?: string; s?: string }

function asText(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

export const Route = createFileRoute('/koi-shindan/$quiz/$code')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>): ResultSearch => {
    const n = cleanName(asText(search.n))
    const s = asText(search.s)
    return { ...(n ? { n } : {}), ...(s ? { s } : {}) }
  },
  loader: ({ params }) => {
    const page = presentResult(params.quiz, params.code)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData, params, match }) => {
    if (!loaderData) return {}
    const search = match.search
    const personal = Boolean(search.n || search.s)
    const seo = resultSeo(loaderData)
    const suffix = `${params.quiz}/${loaderData.code}/`
    const canonical = koiCanonical(suffix)
    return koiHead(seo.title, seo.description, suffix, {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: SITE_NAME, item: koiCanonical() },
            { '@type': 'ListItem', position: 2, name: loaderData.kicker, item: koiCanonical(`${params.quiz}/`) },
            { '@type': 'ListItem', position: 3, name: loaderData.name, item: canonical },
          ],
        },
        {
          '@type': 'Article',
          headline: loaderData.name,
          description: loaderData.description,
          inLanguage: 'ja',
          url: canonical,
        },
      ],
    }, !personal)
  },
  component: ResultRoute,
})

function ResultRoute() {
  const page = Route.useLoaderData()
  const search = Route.useSearch()
  const { personal, page: view } = personalize(page, search.s ?? '')
  const url = new URL(koiCanonical(`${view.quizId}/${view.code}/`))
  if (search.n) url.searchParams.set('n', JSON.stringify(search.n))
  if (personal && search.s) url.searchParams.set('s', JSON.stringify(search.s))
  return (
    <main>
      <ResultView page={view} name={search.n ?? ''} personal={personal} url={url.toString()} />
    </main>
  )
}
