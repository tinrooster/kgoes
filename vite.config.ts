import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import os from 'os'
import { readFileSync, writeFileSync } from 'fs'
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

function resolveGitHash(): string {
  const fromEnv =
    process.env.GIT_COMMIT?.trim() ||
    process.env.CI_COMMIT_SHORT_SHA?.trim() ||
    process.env.SOURCE_VERSION?.trim() ||
    process.env.BUILD_ID?.trim() ||
    process.env.CI_PIPELINE_IID?.trim() ||
    ''
  if (fromEnv && fromEnv !== 'unknown') return fromEnv
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    // Launch Docker builds often omit .git — still need a unique id per image so
    // productionBuildCheck can bust stale PWA shells after redeploy.
    return `b${Date.now().toString(36)}`
  }
}

const gitHash = resolveGitHash()

function buildInfoPayload(hash = gitHash) {
  return {
    version: pkg.version,
    buildCommit: hash,
    hash,
  }
}

function writeBuildInfoJson(outDir: string, hash = gitHash) {
  const target = path.join(outDir, 'build-info.json')
  writeFileSync(target, `${JSON.stringify(buildInfoPayload(hash))}\n`, 'utf-8')
}

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
    // Avoid resolving react from trackIT parent node_modules (React 18) when building in the monorepo checkout.
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    extensions: ['.mjs', '.mts', '.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered in src/pwaAutoUpdate.ts so we reload when a new SW is ready.
      injectRegister: null,
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
          // Network-only: precached index.html keeps users on old hashed bundles after deploy.
          '**/index.html',
          '**/build-info.json',
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
        const serveBuildInfo = (_req: unknown, res: { setHeader: (k: string, v: string) => void; end: (body: string) => void }) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(buildInfoPayload(resolveGitHash())))
        }
        server.middlewares.use('/__kgoes-build-info.json', serveBuildInfo)
        server.middlewares.use('/build-info.json', serveBuildInfo)
      },
      closeBundle() {
        const outDir = path.resolve(__dirname, 'dist')
        writeBuildInfoJson(outDir)
        const indexPath = path.join(outDir, 'index.html')
        try {
          const html = readFileSync(indexPath, 'utf-8')
          const hash = resolveGitHash()
          const marker = `<!-- kgoes-build:${hash} -->`
          if (!html.includes('kgoes-build:')) {
            writeFileSync(indexPath, html.replace('<head>', `<head>\n    ${marker}`), 'utf-8')
          }
        } catch {
          /* dist/index missing in partial builds */
        }
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
