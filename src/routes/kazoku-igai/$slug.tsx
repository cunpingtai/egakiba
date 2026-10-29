import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { KazokuBlocks, KazokuNav } from '../../kazoku-igai/Article'
import { getKazokuPage, kazokuHead, kazokuHref } from '../../kazoku-igai/seo'

export const Route = createFileRoute('/kazoku-igai/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getKazokuPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? kazokuHead(loaderData) : {},
  component: KazokuGuide,
})

function KazokuGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={kazokuHref()}>家族以外は入れないでくださいへ</a></p>
        <KazokuBlocks blocks={page.blocks} />
        <KazokuNav current={page.slug} />
      </article>
    </main>
  )
}
