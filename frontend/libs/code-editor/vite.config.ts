/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { fileURLToPath } from 'url';
import { getTestAliases } from '../../vite.shared';
import checker from 'vite-plugin-checker';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isTest = !!process.env.VITEST;

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/quantgrid/libs/code-editor',
  plugins: [
    react({
      tsDecorators: true,
    }),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
    }),
    nxViteTsPaths({ debug: false }),
    checker({
      typescript: {
        buildMode: true,
        tsconfigPath: path.resolve(__dirname, 'tsconfig.lib.json'),
      },
    }),
  ],
  resolve: isTest ? { alias: getTestAliases(__dirname, '../..') } : undefined,
  build: {
    target: 'esnext',
    sourcemap: process.env.NODE_ENV !== 'production',
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: 'src/index.ts',
      name: '@quantgrid/code-editor',
      fileName: 'index',
      formats: ['es' as const],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
  test: {
    name: '@quantgrid/code-editor',
    environment: 'happy-dom',
    dir: './src',
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    globals: true,
    watch: false,
    passWithNoTests: true,
    setupFiles: ['../../vitest-setup.ts'],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-output/junit-report.xml',
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './test-output/vitest/coverage',
      exclude: ['node_modules/**', 'dist/**', '**/__mocks__/**'],
    },
  },
}));
