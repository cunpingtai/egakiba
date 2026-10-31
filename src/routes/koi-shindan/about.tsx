import { createFileRoute } from '@tanstack/react-router'

import { SITE_NAME } from '../../koi-shindan/score.mjs'
import { koiHead, koiHref } from '../../koi-shindan/seo'

export const Route = createFileRoute('/koi-shindan/about')({
  ssr: true,
  head: () => koiHead('恋愛診断について｜採点の仕方', 'ツンデレ比率診断、ラブタイプ診断、何デレ診断、ドパガキ診断の採点方法。答えはブラウザだけに残ります。', 'about/'),
  component: About,
})

function About() {
  return (
    <main className="mx-auto max-w-[680px] px-5 py-8 md:px-8">
      <h1 className="text-balance text-2xl font-bold">{SITE_NAME}について</h1>
      <div className="mt-4 grid gap-4 text-pretty text-base leading-relaxed">
        <p>ここには4つの診断があります。ツンデレ比率診断、ラブタイプ診断、何デレ診断、ドパガキ診断。問題も結果も、このサイトのために書いています。自分で遊んで、友だちと見比べるためのものです。</p>
        <p>ツンと甘さは、選んだ点を足して7つの割合に落とします。恋愛キャラと刺激の好みは、いくつかの軸を文字にします。何デレは、4つの出し方のうち点がいちばん高いものです。</p>
        <p>相手と年齢を聞く2問は、点に入りません。結果は医学的な判断ではなく、どちらがよいかも言いません。</p>
        <p><a className="text-[#B84D6A] underline decoration-[#F2A8BA] underline-offset-4" href={koiHref()}>診断トップへ戻る</a></p>
      </div>
    </main>
  )
}
