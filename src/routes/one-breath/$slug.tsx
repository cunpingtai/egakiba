import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { BreathBlocks, BreathNav } from '../../one-breath/Article'
import { breathHead, breathHref, getBreathPage } from '../../one-breath/seo'

export const Route = createFileRoute('/one-breath/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getBreathPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? breathHead(loaderData) : {},
  component: BreathGuide,
})

function BreathGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={breathHref()}>一息で何歳までのガイドへ</a></p>
        <BreathBlocks blocks={page.blocks} />
        <BreathNav current={page.slug} />
      </article>
    </main>
  )
}
