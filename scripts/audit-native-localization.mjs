import fs from 'node:fs';

const dictionary = JSON.parse(fs.readFileSync('locales/zh-CN.json', 'utf8'));
const source = fs.readFileSync('src-tauri/src/localization.rs', 'utf8');
const blocks = [...source.matchAll(/for source in \[([\s\S]*?)\]\s*\{/g)].map(match => match[1]);
const candidates = new Set();
for (const block of blocks) {
  for (const match of block.matchAll(/"((?:\\.|[^"\\])*)"/g)) {
    let value;
    try { value = JSON.parse(`"${match[1]}"`); }
    catch { value = match[1]; }
    if (value && value.trim()) candidates.add(value);
  }
}
const missing = [...candidates].filter(key => !Object.prototype.hasOwnProperty.call(dictionary, key));
const report = {
  nativePresentationKeys: candidates.size,
  dictionaryEntries: Object.keys(dictionary).length,
  missingNativeTranslations: missing,
};
console.log(JSON.stringify(report, null, 2));
if (missing.length) process.exitCode = 1;
