import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { DrawingBlocks, DrawingNav } from '../../drawing-games/Article'
import { drawingHead, getDrawingPage } from '../../drawing-games/seo'

const page = getDrawingPage()

export const Route = createFileRoute('/drawing-games/')({
  ssr: true,
  head: () => drawingHead(page),
  component: DrawingGamesPage,
})

function DrawingGamesPage() {
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <DrawingBlocks blocks={page.blocks} />
        <DrawingNav />
      </article>
    </main>
  )
}
