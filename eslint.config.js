// @ts-check
import js from '@eslint/js';
import ts from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: [
      '**/*.cjs',
      '**/*.mjs',
      '**/*.js',
      'node_modules/**',
      'dist/**',
      'migrations/**',
      'attached_assets/**',
      'svgs/**',
      'client/public/**',
      'tools/**',
      'test-*/**',
      'setup-*/**',
      '*.md',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['client/src/**/*.{ts,tsx}', 'server/**/*.{ts,tsx}', 'shared/**/*.{ts,tsx}'],
    languageOptions: {
      parser: ts.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks, import: importPlugin },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      'no-undef': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
];