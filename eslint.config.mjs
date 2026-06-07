import prettier from 'eslint-config-prettier';

import apify from '@apify/eslint-config/js.js';

export default [{ ignores: ['**/dist'] }, ...apify, prettier, { rules: { 'import-x/no-default-export': 'off' } }];
