import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../../draw-fight/src/notebook/seo.css'
import { SansaBlocks, SansaNav } from '../../../sansa/Article'
import { getSansaPage, sansaHead, sansaHref, SANSA_LOCALES } from '../../../sansa/seo'

export const Route = createFileRoute('/fr/sansa/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getSansaPage('fr', params.slug)
    if (!page || page.slug === 'home') throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? sansaHead('fr', loaderData) : {},
  component: SansaGuide,
})

function SansaGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={sansaHref('fr')}>{SANSA_LOCALES.fr.back}</a></p>
        <SansaBlocks blocks={page.blocks} />
        <SansaNav locale="fr" current="how-to" />
      </article>
    </main>
  )
}
