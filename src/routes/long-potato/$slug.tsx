import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { PotatoBlocks, PotatoNav } from '../../long-potato/Article'
import { getPotatoPage, potatoHead, potatoHref } from '../../long-potato/seo'

export const Route = createFileRoute('/long-potato/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getPotatoPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? potatoHead(loaderData) : {},
  component: PotatoGuide,
})

function PotatoGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={potatoHref()}>ぐるぐるポテトメーカーのガイドへ</a></p>
        <PotatoBlocks blocks={page.blocks} />
        <PotatoNav current={page.slug} />
      </article>
    </main>
  )
}
