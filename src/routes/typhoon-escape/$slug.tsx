import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { TyphoonBlocks, TyphoonNav } from '../../typhoon-escape/Article'
import { getTyphoonPage, typhoonHead, typhoonHref } from '../../typhoon-escape/seo'

export const Route = createFileRoute('/typhoon-escape/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getTyphoonPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? typhoonHead(loaderData) : {},
  component: TyphoonGuide,
})

function TyphoonGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={typhoonHref('#play')}>タイフーンエスケープをプレイ</a></p>
        <TyphoonBlocks blocks={page.blocks} />
        <TyphoonNav current={page.slug} />
      </article>
    </main>
  )
}
