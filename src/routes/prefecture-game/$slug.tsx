import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { PrefBlocks, PrefNav, PrefNeighborList } from '../../prefecture-game/Article'
import { getPrefPage, prefHead, prefHref } from '../../prefecture-game/seo'

export const Route = createFileRoute('/prefecture-game/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getPrefPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? prefHead(loaderData) : {},
  component: PrefGuide,
})

function PrefGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={prefHref()}>新・都道府県ゲームへ</a></p>
        <PrefBlocks blocks={page.blocks} />
        {page.slug === 'adjacency' ? <PrefNeighborList /> : null}
        <PrefNav current={page.slug} />
      </article>
    </main>
  )
}
