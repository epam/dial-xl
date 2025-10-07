import playwright from 'eslint-plugin-playwright';
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  playwright.configs['flat/recommended'],
  ...nx.configs['flat/react'],
  ...baseConfig,
  {
    ignores: ['**/__mocks__/**', '**/index.ts'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {
      'playwright/no-standalone-expect': 'off',
      'playwright/no-unsafe-references': 'off',
      'playwright/valid-title': 'off',
      'playwright/expect-expect': 'off',
      'playwright/no-conditional-in-test': 'off',
      'playwright/valid-describe-callback': 'off',
    },
  },
  {
    files: [
      '**/playwright/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/external-env.js',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
