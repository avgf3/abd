// @ts-check
import js from '@eslint/js';
import ts from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

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
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: ts.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks, import: importPlugin, 'unused-imports': unusedImports },
    rules: {
      'react/react-in-jsx-scope': 'off',
      // تعطيل ترتيب الاستيرادات لعدم تعطيل الـ CI بتحذيرات شكلية
      'import/order': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // تعطيل هذا التحذير لأننا نستخدم module augmentation وأساليب import() لأنواع Express
      '@typescript-eslint/consistent-type-imports': 'off',
      // نعطل قاعدة TS الافتراضية ونستخدم إضافة تزيل الاستيرادات غير المستخدمة تلقائياً
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      'no-undef': 'off',
      'no-redeclare': 'error',
    },
    settings: { react: { version: 'detect' } },
  },
];
