import { spawn } from 'node:child_process'
import { createServer } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

async function start() {
  // Start Vite dev server for renderer
  const server = await createServer({
    configFile: resolve(root, 'vite.renderer.config.ts'),
    root: resolve(root, 'src/renderer'),
  })
  await server.listen()
  console.log(`\nRenderer dev server: ${server.resolvedUrls?.local?.[0] ?? 'http://localhost:5173'}\n`)

  // Start Electron
  const electronPath = resolve(root, 'node_modules/electron/dist/electron')
  const electron = spawn(electronPath, [
    resolve(root, 'out/main/index.js'),
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--ignore-certificate-errors',
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: server.resolvedUrls?.local?.[0] ?? 'http://localhost:5173',
    },
  })

  electron.on('exit', (code) => {
    server.close()
    process.exit(code ?? 0)
  })

  process.on('SIGINT', () => {
    electron.kill()
    server.close()
    process.exit(0)
  })
}

start()
