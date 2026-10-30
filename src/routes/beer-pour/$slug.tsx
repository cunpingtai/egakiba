import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { BeerBlocks, BeerNav } from '../../beer-pour/Article'
import { beerHead, beerHref, getBeerPage } from '../../beer-pour/seo'

export const Route = createFileRoute('/beer-pour/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getBeerPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? beerHead(loaderData) : {},
  component: BeerGuide,
})

function BeerGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={beerHref()}>ビールをいい感じにつぐへ</a></p>
        <BeerBlocks blocks={page.blocks} />
        <BeerNav current={page.slug} />
      </article>
    </main>
  )
}
