import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'main_test*/**', 'theme/**', 'test/fixtures/**']},
  {files: ['**/*.{js,cjs,mjs}'], ...js.configs.recommended,
    languageOptions: {globals: globals.node},
    rules: {'no-unused-vars': ['error', {argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_'}]}},
  {files: ['lib/**/*.ts'], extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {parserOptions: {projectService: true, tsconfigRootDir: import.meta.dirname}},
    rules: {
      // Async service boundaries reject synchronous filesystem/validation failures.
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_'}],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    }},
  {files: ['lib/help/safeName.ts', 'lib/help/removeEtx.ts'], rules: {'no-control-regex': 'off'}},
  {files: ['lib/{configuration,http,resources,operations,sync}/**/*.ts'], rules: {
    'no-console': 'error',
    'no-restricted-imports': ['error', {patterns: [{group: ['**/cli', '**/cli/**', 'commander'], message: 'Application services must not depend on the CLI.'}]}],
  }},
  {files: ['lib/cli/{commands,io}/**/*.ts'], rules: {
    'no-restricted-imports': ['error', {patterns: [{group: ['../index', '../program', '../run'], message: 'CLI leaf modules must not import the composition root.'}]}],
  }},
  // A type-only namespace exposes named types alongside the callable CommonJS export.
  {files: ['lib/index.ts'], rules: {'@typescript-eslint/no-namespace': 'off'}},
);
