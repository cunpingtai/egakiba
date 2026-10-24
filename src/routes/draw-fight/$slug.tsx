import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { GuideNav, SeoBlocks } from '../../draw-fight/SeoArticle'
import { getRakugakiPage, rakugakiHead, rakugakiHref } from '../../draw-fight/seo'

export const Route = createFileRoute('/draw-fight/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getRakugakiPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? rakugakiHead(loaderData) : {},
  component: DrawFightGuide,
})

function DrawFightGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={rakugakiHref('/draw-fight#play')}>ラクガキファイターをプレイ</a></p>
        <SeoBlocks blocks={page.blocks} />
        <GuideNav current={page.slug} />
      </article>
    </main>
  )
}
