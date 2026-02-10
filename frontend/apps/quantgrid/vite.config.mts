import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import { AssetPack, type AssetPackConfig } from '@assetpack/core';
import { pixiManifest } from '@assetpack/core/manifest';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import tailwindcss from '@tailwindcss/vite';
import checker from 'vite-plugin-checker';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTestAliases, commonInlineDeps } from '../../vite.shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assetpackPlugin(): Plugin {
  const apConfig: AssetPackConfig = {
    entry: './public/raw-pixi-assets',
    output: './public/pixi-assets',
    pipes: [
      pixiManifest({
        output: 'manifest.json',
        createShortcuts: false,
        trimExtensions: false,
        includeMetaData: true,
        includeFileSizes: false,
        nameStyle: 'short',
      }),
    ],
  };
  let mode: ResolvedConfig['command'];
  let ap: AssetPack | undefined;

  return {
    name: 'vite-plugin-assetpack',
    configResolved(resolvedConfig) {
      mode = resolvedConfig.command;
    },
    buildStart: async () => {
      if (mode === 'serve') {
        if (ap) return;
        ap = new AssetPack(apConfig);
        void ap.watch();
      } else {
        await new AssetPack(apConfig).run();
      }
    },
    buildEnd: async () => {
      if (ap) {
        await ap.stop();
        ap = undefined;
      }
    },
  };
}

const isTest = !!process.env.VITEST;

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/quantgrid',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [
    nxViteTsPaths({ debug: false }),
    react({
      tsDecorators: true,
    }),
    tailwindcss(),
    checker({
      typescript: {
        buildMode: true,
        tsconfigPath: path.resolve(__dirname, 'tsconfig.app.json'),
      },
    }),
    !isTest && assetpackPlugin(),
  ].filter(Boolean),
  resolve: isTest ? { alias: getTestAliases(__dirname, '../..') } : undefined,
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      'zustand',
      'antd',
      'echarts',
      'date-fns',
      'classnames',
      'rxjs',
    ],
  },
  build: {
    target: 'esnext',
    sourcemap: !isTest && process.env.NODE_ENV !== 'production',
    outDir: '../../dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router'],
          // UI framework
          'vendor-antd': ['antd'],
          // Charts
          'vendor-charts': ['echarts', 'echarts-for-react'],
          // Editor
          'vendor-monaco': ['monaco-editor', '@monaco-editor/react'],
          // Canvas/Graphics
          'vendor-pixi': ['pixi.js', '@pixi/react'],
          // Reactive extensions
          'vendor-rxjs': ['rxjs'],
          // Utilities
          'vendor-utils': ['zustand', 'date-fns', 'classnames', 'fuse.js'],
        },
      },
    },
  },
  test: {
    name: '@quantgrid/quantgrid',
    environment: 'happy-dom',
    dir: './src',
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['**/playwright/**/*'],
    globals: true,
    watch: false,
    setupFiles: ['../../vitest-setup.ts'],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-output/junit-report.xml',
    },
    server: {
      deps: {
        inline: commonInlineDeps,
      },
    },
    coverage: {
      provider: 'v8' as const,
      reportsDirectory: './test-output/vitest/coverage',
      exclude: ['node_modules/**', 'dist/**', '**/__mocks__/**'],
    },
  },
}));
