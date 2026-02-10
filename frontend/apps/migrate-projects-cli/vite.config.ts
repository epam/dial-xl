import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import path from 'path';
import { fileURLToPath } from 'url';
import checker from 'vite-plugin-checker';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/migrate-projects-cli',
  plugins: [
    nxViteTsPaths({ debug: false }),
    checker({
      typescript: {
        buildMode: true,
        tsconfigPath: path.resolve(__dirname, 'tsconfig.app.json'),
      },
    }),
  ],
  test: {
    name: 'migrate-projects-cli',
    environment: 'node',
    dir: './src',
    include: ['**/*.{test,spec}.{js,ts}'],
    globals: true,
    watch: false,
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-output/junit-report.xml',
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './test-output/vitest/coverage',
      exclude: ['node_modules/**', 'dist/**'],
    },
  },
});
