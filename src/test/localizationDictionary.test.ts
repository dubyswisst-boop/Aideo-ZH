import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

describe('shipped dictionary integrity', () => {
  it('has no exact duplicate keys and preserves case-sensitive playlist labels', () => {
    const source = readFileSync('locales/zh-CN.json', 'utf8');
    const pack = JSON.parse(source);
    const ast = ts.parseJsonText('zh-CN.json', source);
    const keys: string[] = [];
    function visit(node: ts.Node) {
      if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) keys.push(node.name.text);
      ts.forEachChild(node, visit);
    }
    visit(ast);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.filter((key, index) => keys.indexOf(key) !== index)).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(pack, 'Playlists')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(pack, 'PLAYLISTS')).toBe(true);
    expect(pack.Playlists).toBe('播放列表');
    expect(pack.PLAYLISTS).toBe('播放列表');
  });
});
