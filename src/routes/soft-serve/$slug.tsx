import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { SoftServeBlocks, SoftServeNav } from '../../soft-serve/Article'
import { getSoftServePage, softServeHead, softServeHref } from '../../soft-serve/seo'

export const Route = createFileRoute('/soft-serve/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getSoftServePage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? softServeHead(loaderData) : {},
  component: SoftServeGuide,
})

function SoftServeGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={softServeHref()}>ソフトクリームシミュレーターのガイドへ</a></p>
        <SoftServeBlocks blocks={page.blocks} />
        <SoftServeNav current={page.slug} />
      </article>
    </main>
  )
}
