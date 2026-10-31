import { createFileRoute, Outlet } from '@tanstack/react-router'

import { koiHref } from '../../koi-shindan/seo'
import '../../koi-shindan/koi.css'

export const Route = createFileRoute('/koi-shindan')({
  component: KoiLayout,
})

function KoiLayout() {
  return (
    <div className="ks min-h-dvh bg-[#FFF9F5] text-[#2A2430]">
      <Outlet />
      <footer className="mx-auto flex max-w-[680px] flex-wrap justify-center gap-x-5 gap-y-2 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-sm text-[#6B6270]">
        <a className="underline decoration-[#E8E0E4] underline-offset-4 hover:text-[#2A2430]" href={koiHref()}>診断トップ</a>
        <a className="underline decoration-[#E8E0E4] underline-offset-4 hover:text-[#2A2430]" href={koiHref('about/')}>この診断について</a>
        <a className="underline decoration-[#E8E0E4] underline-offset-4 hover:text-[#2A2430]" href={koiHref('privacy/')}>プライバシー</a>
      </footer>
    </div>
  )
}
