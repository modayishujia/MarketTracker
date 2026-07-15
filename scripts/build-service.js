const { build } = require('esbuild')
const path = require('path')
const fs = require('fs')

const outDir = path.resolve(__dirname, '../dist-electron/services')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

async function buildService() {
  try {
    await build({
      entryPoints: [path.resolve(__dirname, '../electron/services/fetch-analysis-service.ts')],
      bundle: true,
      outfile: path.join(outDir, 'fetch-analysis-service.js'),
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      external: ['rss-parser'],
      sourcemap: false,
      minify: false
    })
    console.log('✓ Fetch-analysis service built')

    await build({
      entryPoints: [path.resolve(__dirname, '../electron/services/mcp-server.ts')],
      bundle: true,
      outfile: path.join(outDir, 'mcp-server.js'),
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      external: ['better-sqlite3'],
      sourcemap: false,
      minify: false
    })
    console.log('✓ MCP server built')
  } catch (err) {
    console.error('Failed to build services:', err)
    process.exit(1)
  }
}

buildService()
