import { defineConfig } from 'vitest/config';

/**
 * Root Vitest configuration for local development.
 * This config aggregates all project tests for running `vitest` from the root.
 *
 * CI uses `nx run-many --target=test` which runs each project's test target individually.
 */
export default defineConfig({
  test: {
    projects: ['apps/*', 'libs/*'],
  },
});
