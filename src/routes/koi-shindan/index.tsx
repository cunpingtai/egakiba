import { createFileRoute } from '@tanstack/react-router'

import { QUIZ_LIST } from '../../koi-shindan/score.mjs'
import { koiCanonical, koiHead, koiHref } from '../../koi-shindan/seo'
import { Mascot } from '../../koi-shindan/ui'

export const Route = createFileRoute('/koi-shindan/')({
  ssr: true,
  head: () => koiHead(
    '恋愛診断｜ツンデレ比率・ラブタイプ・何デレ・ドパガキ',
    '無料の性格診断。ツンデレ比率診断、ラブタイプ診断、何デレ診断（デレデレ診断・ヤンデレ診断）、ドパガキ診断。答えはこの端末だけに残ります。',
    '',
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: '恋愛診断',
      description: 'ツンデレ比率診断、ラブタイプ診断、何デレ診断、ドパガキ診断。',
      inLanguage: 'ja',
      url: koiCanonical(),
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: QUIZ_LIST.map((quiz, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: quiz.ja,
          url: koiCanonical(`${quiz.id}/`),
        })),
      },
    },
  ),
  component: KoiHome,
})

function KoiHome() {
  return (
    <main className="relative mx-auto max-w-[680px] overflow-hidden px-5 py-8 md:px-8">
      <div aria-hidden="true" className="absolute -left-10 top-0 size-40 rounded-full bg-[#FFD6E0]" />
      <div className="relative lg:grid lg:grid-cols-[220px_1fr] lg:items-center lg:gap-6">
        <Mascot mood="dere" className="relative mx-auto size-48" />
        <div>
          <p className="text-[13px] text-[#6B6270]">無料 · 答えは送りません</p>
          <h1 className="mt-2 text-balance text-[30px] font-bold leading-tight">恋愛診断</h1>
          <p className="mt-3 text-pretty text-base leading-relaxed text-[#6B6270]">無料の性格診断です。ツンデレ比率診断、ラブタイプ診断、何デレ診断、ドパガキ診断。デレデレ診断とヤンデレ診断は、何デレの結果にあります。正解はなく、シェアしなくても大丈夫です。</p>
        </div>
      </div>
      <ul className="relative mt-8 grid gap-4">
        {QUIZ_LIST.map((quiz) => (
          <li key={quiz.id}>
            <a className="block rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(42,36,48,0.08)] hover:bg-[#FFFCFD] md:p-6" href={koiHref(`${quiz.id}/`)}>
              <span className="text-[13px] text-[#6B6270]">{quiz.title}</span>
              <span className="mt-1 block text-balance text-xl font-semibold">{quiz.ja}</span>
              <span className="mt-2 block text-pretty text-base leading-relaxed text-[#6B6270]">{quiz.lede}</span>
              <span className="mt-3 block text-[13px] tabular-nums text-[#B84D6A]">{quiz.countLabel} · 約{quiz.minutes}分</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
