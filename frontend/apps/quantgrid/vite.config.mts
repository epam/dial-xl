/// <reference types='vitest' />
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import { AssetPack, type AssetPackConfig } from '@assetpack/core';
import { pixiManifest } from '@assetpack/core/manifest';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import tailwindcss from '@tailwindcss/vite';
import checker from 'vite-plugin-checker';
import path from 'path';

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
    react(),
    nxViteTsPaths(),
    tailwindcss(),
    checker({
      typescript: {
        buildMode: true,
        tsconfigPath: path.resolve(__dirname, 'tsconfig.app.json'),
      },
    }),
    assetpackPlugin(),
  ],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
