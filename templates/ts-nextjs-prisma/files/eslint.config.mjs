import { FlatCompat } from '@eslint/eslintrc';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // The a11y invariant starts at lint time: full jsx-a11y recommended set, as errors.
  {
    files: ['**/*.tsx'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: jsxA11y.configs.recommended.rules,
  },
];

export default config;
