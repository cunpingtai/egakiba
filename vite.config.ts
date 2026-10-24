import { defineConfig, loadEnv, type Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function quietFavicon(): Plugin {
  return {
    name: 'quiet-favicon',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/favicon.ico') {
          res.statusCode = 204
          res.end()
          return
        }
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const defaultSiteUrl = 'https://egakiba.com/'
  const configuredSiteUrl = process.env.VITE_SITE_URL || env.VITE_SITE_URL || defaultSiteUrl
  const configuredUrl = new URL(configuredSiteUrl)
  const defaultBasePath = configuredUrl.pathname.endsWith('/') ? configuredUrl.pathname : `${configuredUrl.pathname}/`
  const configuredBase = process.env.VITE_BASE_PATH || env.VITE_BASE_PATH
  const base = configuredBase || (mode === 'development' ? '/' : defaultBasePath)

  return {
    base,
    resolve: { tsconfigPaths: true },
    plugins: [quietFavicon(), devtools(), tailwindcss(), tanstackStart({ prerender: { enabled: true, crawlLinks: true, concurrency: 6, failOnError: true } }), viteReact()],
  }
})
