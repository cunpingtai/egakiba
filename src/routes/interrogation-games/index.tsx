import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { InterrogationBlocks, InterrogationNav } from '../../interrogation-games/Article'
import { getInterrogationPage, interrogationHead } from '../../interrogation-games/seo'

const page = getInterrogationPage()

export const Route = createFileRoute('/interrogation-games/')({
  ssr: true,
  head: () => interrogationHead(page),
  component: InterrogationGamesPage,
})

function InterrogationGamesPage() {
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <InterrogationBlocks blocks={page.blocks} />
        <InterrogationNav />
      </article>
    </main>
  )
}
