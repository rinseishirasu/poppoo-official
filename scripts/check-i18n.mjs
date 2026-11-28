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

const nav = vm.runInContext('publicNavigationUrl', context);
const resolve = vm.runInContext('resolvePublicLanguage', context);
const read = vm.runInContext('readPublicLanguage', context);
const base = new URL('https://example.invalid/poppoo/index.html?lang=en');
for (const lang of Object.keys(languages)) {
  const url = nav('talent.html?id=test#profile', base, lang);
  assert.equal(url.searchParams.get('lang'), lang);
  assert.equal(url.searchParams.get('id'), 'test');
  assert.equal(url.hash, '#profile');
  assert.equal(resolve(null, lang), lang);
  assert.equal(resolve(lang, 'ja', false), 'ja');
}
for (const href of ['#main', 'admin.html', 'talents.html?cmsPreview=1', 'talents.html?lang=th', 'https://other.invalid/index.html', '/outside/index.html', 'mailto:test@example.invalid']) {
  assert.equal(nav(href, base, 'en'), null, href);
}
const storage = {value: 'th', getItem(){return this.value}, setItem(key,value){this.value=value}};
assert.equal(read(base, storage, true), 'en');
assert.equal(storage.value, 'en');
assert.equal(read(new URL('https://example.invalid/poppoo/news.html'), storage, true), 'en');
assert.equal(read(base, {getItem(){throw Error()},setItem(){throw Error()}}, true), 'en');
assert.equal(read(new URL('https://example.invalid/poppoo/news.html?lang=invalid'), storage, true), 'en');
console.log('Language navigation checks passed');
