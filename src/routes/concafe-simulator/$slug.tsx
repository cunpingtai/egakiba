import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { CafeBlocks, CafeEndingList, CafeNav, CafeTables } from '../../concafe-simulator/Article'
import { concafeHead, concafeHref, getCafePage } from '../../concafe-simulator/seo'

export const Route = createFileRoute('/concafe-simulator/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getCafePage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? concafeHead(loaderData) : {},
  component: CafeGuide,
})

function CafeGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={concafeHref()}>コンカフェ嬢シミュレーターへ</a></p>
        <CafeBlocks blocks={page.blocks} />
        {page.slug === 'guide' ? <CafeTables /> : null}
        {page.slug === 'endings' ? <CafeEndingList /> : null}
        <CafeNav current={page.slug} />
      </article>
    </main>
  )
}
