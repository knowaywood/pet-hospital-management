import * as esbuild from 'esbuild'
import { builtinModules } from 'node:module'

const isWatch = process.argv.includes('--watch')

const opts = {
  entryPoints: ['src/main/index.ts'],
  outfile: 'out/main/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: [
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
    'electron',
    'better-sqlite3',
    'drizzle-orm',
    'drizzle-orm/better-sqlite3',
    'drizzle-orm/sqlite-core',
  ],
  sourcemap: true,
  tsconfig: 'tsconfig.node.json',
}

if (isWatch) {
  const ctx = await esbuild.context(opts)
  await ctx.watch()
  console.log('Watching main process...')
} else {
  await esbuild.build(opts)
  console.log('Main process built: out/main/index.js')
}
