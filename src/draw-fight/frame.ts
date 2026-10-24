import drawCss from '../../draw-fight/src/draw.css?inline'
import { prefixDrawLinks } from '../../draw-fight/src/paths'

export function openDrawFrame(host: HTMLElement, frameClass: string, shell: string) {
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `<style>${drawCss}</style><div class="rf-root ${frameClass}">${prefixDrawLinks(shell)}</div>`
  const root = shadow.querySelector<HTMLElement>('.rf-root')
  if (!root) throw new Error('draw-fight frame failed')
  return { shadow, root }
}
