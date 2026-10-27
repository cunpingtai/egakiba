import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { HamburgBlocks, HamburgNav } from '../../hamburg/Article'
import { getHamburgPage, hamburgHead, hamburgHref } from '../../hamburg/seo'

export const Route = createFileRoute('/hamburg/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getHamburgPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? hamburgHead(loaderData) : {},
  component: HamburgGuide,
})

function HamburgGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={hamburgHref()}>ハンバーグ作りのガイドへ</a></p>
        <HamburgBlocks blocks={page.blocks} />
        <HamburgNav current={page.slug} />
      </article>
    </main>
  )
}
