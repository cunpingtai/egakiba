import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { DashimakiBlocks, DashimakiNav } from '../../dashimaki-game/Article'
import { dashimakiHead, dashimakiHref, getDashimakiPage } from '../../dashimaki-game/seo'

export const Route = createFileRoute('/dashimaki-game/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getDashimakiPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? dashimakiHead(loaderData) : {},
  component: DashimakiGuide,
})

function DashimakiGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={dashimakiHref()}>だし巻きゲームのガイドへ</a></p>
        <DashimakiBlocks blocks={page.blocks} />
        <DashimakiNav current={page.slug} />
      </article>
    </main>
  )
}
