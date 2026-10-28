import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import pack from '../../locales/zh-CN.json';
import { analyzeJsxLocalization } from '../../scripts/jsxLocalization';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    const path = join(dir, item.name);
    if (item.isDirectory()) return ['test', 'i18n'].includes(item.name) ? [] : sourceFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

describe('shipped localization contract', () => {
  it('covers inventoried display strings across all frontend views', () => {
    const missing = new Set<string>();
    const dictionary: Record<string, string> = pack;
    for (const file of sourceFiles(resolve('src'))) {
      for (const key of analyzeJsxLocalization(readFileSync(file, 'utf8'), file).messages) {
        if (/[a-zA-Z]{2}/.test(key) && !dictionary[key]) missing.add(key);
      }
    }
    expect([...missing]).toEqual([]);
  // This scans every production TSX file; allow for contention in the full suite.
  }, 30_000);

  it('retains interpolation names and stays within native pack limits', () => {
    const parameters = (text: string) => [...new Set(text.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g) || [])].sort();
    for (const [key, value] of Object.entries(pack)) {
      expect(parameters(value), key).toEqual(parameters(key));
      expect(value.length, key).toBeGreaterThan(0);
      expect(new TextEncoder().encode(key).length, key).toBeLessThanOrEqual(500);
    }
    expect(readFileSync('locales/zh-CN.json').byteLength).toBeLessThanOrEqual(2 * 1024 * 1024);
  });
});
