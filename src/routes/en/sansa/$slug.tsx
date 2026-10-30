import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../../draw-fight/src/notebook/seo.css'
import { SansaBlocks, SansaNav } from '../../../sansa/Article'
import { getSansaPage, sansaHead, sansaHref, SANSA_LOCALES } from '../../../sansa/seo'

export const Route = createFileRoute('/en/sansa/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getSansaPage('en', params.slug)
    if (!page || page.slug === 'home') throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? sansaHead('en', loaderData) : {},
  component: SansaGuide,
})

function SansaGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={sansaHref('en')}>{SANSA_LOCALES.en.back}</a></p>
        <SansaBlocks blocks={page.blocks} />
        <SansaNav locale="en" current="how-to" />
      </article>
    </main>
  )
}
