import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { StreamerBlocks, StreamerNav } from '../../streamer-life-simulator/Article'
import { getStreamerPage, streamerHead } from '../../streamer-life-simulator/seo'

export const Route = createFileRoute('/streamer-life-simulator/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getStreamerPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? streamerHead(loaderData) : {},
  component: StreamerGuide,
})

function StreamerGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <StreamerBlocks blocks={page.blocks} />
        <StreamerNav current={page.slug} />
      </article>
    </main>
  )
}
