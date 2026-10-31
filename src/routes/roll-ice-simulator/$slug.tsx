import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { RollIceBlocks, RollIceNav } from '../../roll-ice-simulator/Article'
import { getRollIcePage, rollIceHead } from '../../roll-ice-simulator/seo'

export const Route = createFileRoute('/roll-ice-simulator/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getRollIcePage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? rollIceHead(loaderData) : {},
  component: RollIceGuide,
})

function RollIceGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <RollIceBlocks blocks={page.blocks} />
        <RollIceNav current={page.slug} />
      </article>
    </main>
  )
}
