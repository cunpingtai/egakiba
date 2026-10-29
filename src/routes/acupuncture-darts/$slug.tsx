import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { HariBlocks, HariNav } from '../../acupuncture-darts/Article'
import { getHariPage, hariHead, hariHref } from '../../acupuncture-darts/seo'

export const Route = createFileRoute('/acupuncture-darts/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getHariPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? hariHead(loaderData) : {},
  component: HariGuide,
})

function HariGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={hariHref()}>鍼ダーツへ</a></p>
        <HariBlocks blocks={page.blocks} />
        <HariNav current={page.slug} />
      </article>
    </main>
  )
}
