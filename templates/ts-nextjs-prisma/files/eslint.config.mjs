import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const config = [
  // next-env.d.ts is build-generated (its triple-slash reference trips
  // @typescript-eslint/triple-slash-reference) and gitignored — but ESLint
  // flat config does not read .gitignore, so it must be ignored here too.
  { ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  // The a11y invariant starts at lint time: full jsx-a11y recommended set, as
  // errors. The Next config already registers the jsx-a11y plugin (with a
  // handful of rules); redefining it is a config error, so only the rules go here.
  {
    files: ['**/*.tsx'],
    rules: jsxA11y.configs.recommended.rules,
  },
];

export default config;
