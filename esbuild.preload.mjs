import * as esbuild from 'esbuild'
import { builtinModules } from 'node:module'

await esbuild.build({
  entryPoints: ['src/preload/index.ts'],
  outfile: 'out/preload/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: [
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
    'electron',
  ],
  sourcemap: true,
  tsconfig: 'tsconfig.node.json',
})

console.log('Preload built: out/preload/index.js')
