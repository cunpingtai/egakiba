import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { OmmojiBlocks, OmmojiNav } from '../../ommoji/Article'
import { getOmmojiPage, ommojiHead, ommojiHref } from '../../ommoji/seo'

export const Route = createFileRoute('/omurice/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getOmmojiPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? ommojiHead(loaderData) : {},
  component: OmmojiGuide,
})

function OmmojiGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={ommojiHref()}>オム文字シミュレーターのガイドへ</a></p>
        <OmmojiBlocks blocks={page.blocks} />
        <OmmojiNav current={page.slug} />
      </article>
    </main>
  )
}
