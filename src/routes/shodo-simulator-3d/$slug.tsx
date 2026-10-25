import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { ShodoBlocks, ShodoNav } from '../../shodo-simulator-3d/Article'
import { getShodoPage, shodoHead, shodoHref } from '../../shodo-simulator-3d/seo'

export const Route = createFileRoute('/shodo-simulator-3d/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getShodoPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? shodoHead(loaderData) : {},
  component: ShodoGuide,
})

function ShodoGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={shodoHref('#play')}>書道ゲームをはじめる</a></p>
        <ShodoBlocks blocks={page.blocks} />
        <ShodoNav current={page.slug} />
      </article>
    </main>
  )
}
