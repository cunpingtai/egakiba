import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { RegionBlocks, RegionNav } from '../../regional-differences/Article'
import { getRegionPage, regionHead, regionHref } from '../../regional-differences/seo'

export const Route = createFileRoute('/regional-differences/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getRegionPage(params.slug)
    if (!page || page.slug === 'home') throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? regionHead(loaderData) : {},
  component: RegionalGuide,
})

function RegionalGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={regionHref()}>日本の地域差クイズへ</a></p>
        <RegionBlocks blocks={page.blocks} />
        <RegionNav current={page.slug} />
      </article>
    </main>
  )
}
