import fs from 'node:fs';
import path from 'node:path';
import { analyzeJsxLocalization } from './jsxLocalization.ts';

const dictionary = JSON.parse(fs.readFileSync('locales/zh-CN.json', 'utf8'));
const messages = new Map();
function scan(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory() && !['test', 'i18n'].includes(item.name)) scan(file);
    if (!item.isFile() || !file.endsWith('.tsx')) continue;
    const result = analyzeJsxLocalization(fs.readFileSync(file, 'utf8'), path.resolve(file));
    for (const key of result.messages) {
      if (!messages.has(key)) messages.set(key, []);
      messages.get(key).push(file.replaceAll('\\', '/'));
    }
  }
}
scan('src');
const missing = [...messages].filter(([key]) => !dictionary[key] && /[a-zA-Z]{2}/.test(key));
const report = { keys: messages.size, dictionaryEntries: Object.keys(dictionary).length, missing: Object.fromEntries(missing) };
console.log(JSON.stringify(report, null, 2));
if (missing.length) process.exitCode = 1;
