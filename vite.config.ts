import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import os from 'os'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import {
  KGO_ES_DESCRIPTION,
  KGO_ES_NAME,
  KGO_ES_PAGE_TITLE,
  KGO_ES_PWA_THEME_COLOR,
} from './src/branding'

// Use a repo-specific temp cache dir to avoid stale cross-project Vite transforms.
const cacheDir = path.join(os.tmpdir(), 'vite-kgoes-trackit-v2')

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

let gitHash = 'unknown'
try {
  gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
} catch { /* not a git repo or git not available */ }

/** trackIT repo .env.local (envDir below) — IIS hostname e.g. http://ow-casf-trackit:5174/ */
const devPublicHost = process.env.VITE_DEV_PUBLIC_HOST?.trim()
const devPublicClientPort = process.env.VITE_DEV_PUBLIC_PORT?.trim()

const devAllowedHosts = [
  ...(devPublicHost ? [devPublicHost] : ['ow-casf-trackit']),
  'localhost',
  '127.0.0.1',
]

export default defineConfig({
  // Pick up VITE_DEV_PUBLIC_* from trackIT .env.local when running via npm run dev:all
  envDir: path.resolve(__dirname, '..'),
  // Resolve TypeScript sources before .js so stale emitted .js shadows can't silently win.
  resolve: {
    extensions: ['.mjs', '.mts', '.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // Force a freshly-installed SW to activate and claim all open tabs
        // immediately, instead of waiting for every client to close. Without
        // these, users who keep the app open for days run stale code (e.g.
        // pre-Apr-27 export pipeline at 144 DPI instead of 480).
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,ttf,json}'],
        globIgnores: [
          '**/deviceLibrary.fallback.json',
          '**/og-image.png',
          '**/github-social.png',
          '**/landing-screenshot.png',
          '**/email-logo.png',
        ],
      },
      manifest: {
        name: KGO_ES_PAGE_TITLE,
        short_name: KGO_ES_NAME,
        description: KGO_ES_DESCRIPTION,
        theme_color: KGO_ES_PWA_THEME_COLOR,
        background_color: KGO_ES_PWA_THEME_COLOR,
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
    {
      name: 'kgoes-build-info',
      configureServer(server: ViteDevServer) {
        server.middlewares.use('/__kgoes-build-info.json', (_req, res) => {
          let hash = gitHash
          try {
            hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
          } catch { /* ignore */ }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ version: pkg.version, hash }))
        })
      },
    },
  ],
  cacheDir,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__: JSON.stringify(gitHash),
  },
  server: {
    strictPort: true,
    // Vite 6+ blocks unknown Host headers (IIS / corporate DNS → ow-casf-trackit:5174).
    allowedHosts: devAllowedHosts,
    hmr: devPublicHost
      ? {
          host: devPublicHost,
          ...(devPublicClientPort ? { clientPort: Number(devPublicClientPort) } : {}),
        }
      : undefined,
  },
  preview: {
    allowedHosts: devAllowedHosts,
  },
})
