import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { IceBlocks, IceNav } from '../../turkish-ice-cream-3d/Article'
import { getIcePage, turkishIceHead } from '../../turkish-ice-cream-3d/seo'

export const Route = createFileRoute('/turkish-ice-cream-3d/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getIcePage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? turkishIceHead(loaderData) : {},
  component: TurkishIceGuide,
})

function TurkishIceGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <IceBlocks blocks={page.blocks} />
        <IceNav current={page.slug} />
      </article>
    </main>
  )
}
