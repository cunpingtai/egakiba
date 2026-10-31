import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { NnkoBlocks, NnkoNav } from '../../nnko-quiz/Article'
import { getNnkoPage, nnkoHead } from '../../nnko-quiz/seo'

export const Route = createFileRoute('/nnko-quiz/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getNnkoPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? nnkoHead(loaderData) : {},
  component: NnkoGuide,
})

function NnkoGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <NnkoBlocks blocks={page.blocks} />
        <NnkoNav current={page.slug} />
      </article>
    </main>
  )
}
