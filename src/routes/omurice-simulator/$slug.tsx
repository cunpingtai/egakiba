import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { OmuriceBlocks, OmuriceNav } from '../../omurice-simulator/Article'
import { getOmuricePage, omuriceHead, omuriceHref } from '../../omurice-simulator/seo'

export const Route = createFileRoute('/omurice-simulator/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getOmuricePage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? omuriceHead(loaderData) : {},
  component: OmuriceGuide,
})

function OmuriceGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={omuriceHref()}>オムライスシミュレーターのガイドへ</a></p>
        <OmuriceBlocks blocks={page.blocks} />
        <OmuriceNav current={page.slug} />
      </article>
    </main>
  )
}
