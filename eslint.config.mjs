import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// `eslint-config-next` still ships in the legacy eslintrc format, so bridge it
// into ESLint 9's flat config rather than keeping the deprecated `next lint`.
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      '.next/**',
      '.next-production/**',
      '.next-production-verify/**',
      '.next-production-final-*/**',
      'out/**',
      'build/**',
      'node_modules/**',
      // Committed snapshot of a past release. Linting it doubles every finding
      // in this repo without telling us anything about the code we ship today.
      '.release-verified-ziwei/**',
      // Throwaway `tsc` output from the test scripts in package.json.
      '.*-test-build/**',
      '.*-audit-build/**',
      'reports/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
    },
    linterOptions: {
      // Several deliberately-disabled blocks carry `eslint-disable` comments for
      // core rules this config does not turn on. The comments document why the
      // block is dead, so keep them instead of reporting them as unused.
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      // `//` is used as a decorative prefix inside UI copy across the site
      // (e.g. `// 易經靈魂配對`). It is intended text, not a stray comment.
      'react/jsx-no-comment-textnodes': 'off',
      // Pre-existing debt worth chipping away at, but not a release blocker.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Components switched off at the source per the "hidden stays hidden" rule:
    // they `return null` before their hooks run and keep the original body
    // intact for a future revival, which trips rules-of-hooks by design.
    files: ['components/MegaInputGuide.tsx', 'components/TaijiStandaloneCard.tsx'],
    plugins: { 'react-hooks': reactHooksPlugin },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
];

export default config;
