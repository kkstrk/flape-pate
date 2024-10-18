import globals from 'globals';
import js from '@eslint/js';
import restrictedGlobals from 'confusing-browser-globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.builtin,
                ...globals.browser,
            },
        },
        rules: {
            'no-restricted-globals': ['error'].concat(restrictedGlobals.filter((item) => item !== 'self')),
        },
    },
    {
        files: ['**/worker.js'],
        languageOptions: {
            globals: globals.serviceworker,
        },
    },
];
