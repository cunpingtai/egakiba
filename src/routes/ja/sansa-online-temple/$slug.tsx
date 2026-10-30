import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../../draw-fight/src/notebook/seo.css'
import { SansaBlocks, SansaNav } from '../../../sansa/Article'
import { getSansaPage, sansaHead, sansaHref, SANSA_LOCALES } from '../../../sansa/seo'

export const Route = createFileRoute('/ja/sansa-online-temple/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getSansaPage('ja', params.slug)
    if (!page || page.slug === 'home') throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? sansaHead('ja', loaderData) : {},
  component: SansaGuide,
})

function SansaGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={sansaHref('ja')}>{SANSA_LOCALES.ja.back}</a></p>
        <SansaBlocks blocks={page.blocks} />
        <SansaNav locale="ja" current="how-to" />
      </article>
    </main>
  )
}
