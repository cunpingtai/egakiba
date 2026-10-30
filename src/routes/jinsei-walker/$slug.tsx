import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { WalkerBlocks, WalkerNav } from '../../jinsei-walker/Article'
import { getWalkerPage, walkerHead } from '../../jinsei-walker/seo'

export const Route = createFileRoute('/jinsei-walker/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getWalkerPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? walkerHead(loaderData) : {},
  component: WalkerGuide,
})

function WalkerGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <WalkerBlocks blocks={page.blocks} />
        <WalkerNav current={page.slug} />
      </article>
    </main>
  )
}
