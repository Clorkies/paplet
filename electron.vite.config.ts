import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
 main: {},
 preload: {
  build: {rollupOptions: {input: {
   index: resolve('src/preload/index.ts'),
   manager: resolve('src/preload/manager.ts')
  }}}
 },
 renderer: {
  plugins: [react()],
  server: {host:'127.0.0.1'},
  build: {
   minify: true,
   cssMinify: true,
   rollupOptions: {input: {
    index: resolve('src/renderer/index.html'),
    manager: resolve('src/renderer/manager.html')
   }}
  }
 }
})
