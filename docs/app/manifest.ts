import type { MetadataRoute } from 'next'

const basePath = process.env.DOCS_BASE_PATH ?? '/zaileys-mcp'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'zaileys-mcp — WhatsApp for AI agents',
    short_name: 'zaileys-mcp',
    description:
      'WhatsApp for AI agents — an MCP server powered by Zaileys.',
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: `${basePath}/favicon/web-app-manifest-192x192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${basePath}/favicon/web-app-manifest-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${basePath}/favicon/web-app-manifest-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
