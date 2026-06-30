import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitepress'

// Match what build-lib.mjs does: resolve onnxruntime-web to the external-wasm
// variant (ort.wasm.min.mjs) so the playground never loads the full ORT bundle
// with JSEP/WebGPU probing (which fetches ort-wasm-simd-threaded.jsep.mjs —
// a file our minimal scanic-ml CDN build does not include).
const viteCfg = {
  resolve: {
    alias: [{ find: /^onnxruntime-web$/, replacement: 'onnxruntime-web/wasm' }],
    conditions: [
      'onnxruntime-web-use-extern-wasm',
      'module', 'browser', 'production', 'import', 'default',
    ],
  },
}

// Read the version from package.json so the nav never goes stale.
const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)))

// https://vitepress.dev/reference/site-config
export default defineConfig({
  vite: viteCfg,

  title: 'Scanic',
  description: 'Ultra-fast, production-ready document scanning for the modern Web — pure JavaScript + Rust/WebAssembly.',

  // GitHub project page is served from /scanic/
  base: '/scanic/',

  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/scanic/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://marquaye.github.io/scanic/' }],
    ['meta', { property: 'og:title', content: 'Scanic — Modern document scanner' }],
    ['meta', { property: 'og:description', content: 'Document edge detection and perspective correction in the browser and Node.js. ~100KB, WASM-accelerated.' }],
    ['meta', { property: 'og:image', content: 'https://marquaye.github.io/scanic/scanic-logo-bg.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Scanic — Modern document scanner' }],
    ['meta', { name: 'twitter:description', content: 'Document edge detection and perspective correction in the browser and Node.js. ~100KB, WASM-accelerated.' }],
    ['meta', { name: 'twitter:image', content: 'https://marquaye.github.io/scanic/scanic-logo-bg.png' }]
  ],

  // Internal/dev docs that should not be published.
  srcExclude: [
    'RELEASE.md',
    'REFACTOR-OPPORTUNITIES.md',
    'react-example.md',
    'vue-example.md'
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/scanic-icon.png',

    search: {
      provider: 'local'
    },

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/reference' },
      { text: 'Playground', link: '/guide/getting-started#playground' },
      { text: 'Live Demo', link: '/scanic/demo/', target: '_blank', rel: 'noopener' },
      {
        text: `v${version}`,
        items: [
          { text: 'Changelog', link: 'https://github.com/marquaye/scanic/releases' },
          { text: 'npm', link: 'https://npmjs.com/package/scanic' }
        ]
      }
    ],

    sidebar: {
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Scanic?', link: '/guide/introduction' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'How It Works', link: '/guide/how-it-works' }
          ]
        },
        {
          text: 'Guides',
          items: [
            { text: 'Browser / Web', link: '/guide/web' },
            { text: 'Node.js', link: '/guide/nodejs' },
            { text: 'Electron', link: '/guide/electron' },
            { text: 'React & Vue', link: '/guide/frameworks' },
            { text: 'Corner Editor', link: '/guide/corner-editor' },
            { text: 'ML Detection', link: '/guide/ml-detection' },
            { text: 'Performance', link: '/guide/performance' }
          ]
        },
        {
          text: 'Reference',
          items: [
            { text: 'API Reference', link: '/api/reference' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/marquaye/scanic' }
    ],

    editLink: {
      pattern: 'https://github.com/marquaye/scanic/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present marquaye'
    }
  }
})
