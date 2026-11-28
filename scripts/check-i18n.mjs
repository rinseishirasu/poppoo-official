import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../assets/js/site.js', import.meta.url), 'utf8');
const start = '// Public UI language foundation';
const end = 'function translateStaticPublic(root)';
assert.ok(source.startsWith(start) && source.includes(end), 'Dictionary boundaries changed');
const context = vm.createContext({location: new URL('https://example.invalid/index.html'), window: {} , URL, URLSearchParams, Intl});
vm.runInContext('window.parent = window;', context);
const prefix = source.slice(0, source.indexOf(end));
vm.runInContext(prefix, context, {timeout: 3000});
const {languages, ui, texts} = vm.runInContext('({languages: PUBLIC_LANGUAGES, ui: PUBLIC_UI, texts: {en: PUBLIC_EN_TEXT, ...PUBLIC_OTHER_TEXT}})', context);
assert.deepEqual(Object.keys(languages).sort(), ['ja','en','ko','zh-Hant','zh-Hans','id','th'].sort());
let failures = 0;
function check(label, dictionaries, expected) {
  const keys = new Set(Object.values(dictionaries).flatMap(Object.keys));
  for (const lang of expected) {
    const dict = dictionaries[lang] || {};
    const missing = [...keys].filter(key => !Object.hasOwn(dict, key) || typeof dict[key] !== 'string' || !dict[key].trim());
    console.log(label + ' ' + lang + ': ' + (keys.size - missing.length) + '/' + keys.size);
    for (const key of missing) console.error('Missing/empty: ' + lang + ' ' + key);
    failures += missing.length;
  }
}
check('Navigation', ui, Object.keys(languages));
check('Public text', texts, Object.keys(languages).filter(lang => lang !== 'ja'));
if (failures) process.exitCode = 1;
