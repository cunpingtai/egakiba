import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import { SiteFrame } from '../site-ads'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'theme-color',
        content: '#f6f1e8',
      },
    ],
    links: [
      {
        rel: 'icon',
        href: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="%23c45642"/><text x="16" y="23" text-anchor="middle" font-size="18" fill="white" font-family="serif">文</text></svg>',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
        <meta name="google-adsense-account" content="ca-pub-8048514016010081" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8048514016010081"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <SiteFrame>{children}</SiteFrame>
        <Scripts />
        <script data-cfasync="false" src="https://bauval.org/14/3362c7c294cf1727cf40c02e534019ec" />
      </body>
    </html>
  )
}
