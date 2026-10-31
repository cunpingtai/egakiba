import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { DerbyBlocks, DerbyNav } from '../../prefecture-derby/Article'
import { derbyHead, getDerbyPage } from '../../prefecture-derby/seo'

export const Route = createFileRoute('/prefecture-derby/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getDerbyPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? derbyHead(loaderData) : {},
  component: DerbyGuide,
})

function DerbyGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <DerbyBlocks blocks={page.blocks} />
        <DerbyNav current={page.slug} />
      </article>
    </main>
  )
}
