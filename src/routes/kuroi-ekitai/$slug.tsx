import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { KuroBlocks, KuroNav } from '../../kuroi-ekitai/Article'
import { getKuroPage, kuroHead, kuroHref } from '../../kuroi-ekitai/seo'

export const Route = createFileRoute('/kuroi-ekitai/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getKuroPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? kuroHead(loaderData) : {},
  component: KuroGuide,
})

function KuroGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={kuroHref()}>黒い液体へ</a></p>
        <KuroBlocks blocks={page.blocks} />
        <KuroNav current={page.slug} />
      </article>
    </main>
  )
}
