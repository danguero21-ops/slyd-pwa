
import js from '@eslint/js';
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  js.configs.recommended,
  {
    ignores: ['dist/**', 'dev-dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.rules'],
    ...firebaseRulesPlugin.configs['flat/recommended']
  }
];
