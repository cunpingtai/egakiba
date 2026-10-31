import { createFileRoute } from '@tanstack/react-router'

import { koiHead } from '../../koi-shindan/seo'

export const Route = createFileRoute('/koi-shindan/privacy')({
  ssr: true,
  head: () => koiHead('恋愛診断のプライバシー', '診断の答えは、この端末のセッションに残ります。結果を出すためにサーバーへは送りません。', 'privacy/'),
  component: Privacy,
})

function Privacy() {
  return (
    <main className="mx-auto max-w-[680px] px-5 py-8 md:px-8">
      <h1 className="text-balance text-2xl font-bold">プライバシー</h1>
      <div className="mt-4 grid gap-4 text-pretty text-base leading-relaxed">
        <p>回答の進み具合とニックネームは、この端末の sessionStorage に書きます。キー名は koi-shindan: から始まります。このタブを閉じると、ブラウザが消します。</p>
        <p>結果が出たあと、タイプとニックネームと点数はアドレスバーに入ります。リンクをコピーしやすくするためです。このアドレスを持っている人は、その結果を見られます。見られたくなければ、リンクは送らないでください。</p>
        <p>恋愛の相手と年齢の2問は、この端末だけに残ります。結果のリンクには書かず、採点にも入りません。</p>
        <p>途中の進み具合を消すには、その診断をもう一度やるか、ブラウザでこのサイトのセッション保存を消してください。</p>
        <details className="rounded-2xl bg-white p-5">
          <summary className="cursor-pointer font-semibold">もう少し詳しく</summary>
          <p className="mt-3">このサイトのほかのページは、広告のスクリプトと、サイト自身のプライバシーポリシーを使うことがあります。診断の採点はブラウザの中で終わり、アカウントは要りません。</p>
        </details>
      </div>
    </main>
  )
}
