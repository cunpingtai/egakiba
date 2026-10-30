import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { CoasterBlocks, CoasterNav } from '../../rakugaki-coaster/Article'
import { coasterHead, coasterHref, getCoasterPage } from '../../rakugaki-coaster/seo'

export const Route = createFileRoute('/rakugaki-coaster/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getCoasterPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? coasterHead(loaderData) : {},
  component: CoasterGuide,
})

function CoasterGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={coasterHref()}>らくがきコースターのガイドへ</a></p>
        <CoasterBlocks blocks={page.blocks} />
        <CoasterNav current={page.slug} />
      </article>
    </main>
  )
}
