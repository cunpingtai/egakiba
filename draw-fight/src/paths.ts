function siteRoot() {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

export function drawHref(suffix = '') {
  return `${siteRoot()}draw-fight/${suffix}`
}

export function prefixDrawLinks(html: string) {
  return html
    .replaceAll('href="__SITE_HOME__"', `href="${siteRoot()}"`)
    .replaceAll('href="/studio', `href="${drawHref('studio')}`)
    .replaceAll('href="/gpu-check"', `href="${drawHref('gpu-check/')}"`)
    .replaceAll('href="/"', `href="${drawHref()}"`)
}
