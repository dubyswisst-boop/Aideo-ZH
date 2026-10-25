import { describe, expect, it } from 'vitest';
import { transformJsxLocalization } from '../../scripts/jsxLocalization';

describe('static JSX localization build transform', () => {
  it('converts static JSX text to reactive translated fragments', () => {
    const source = 'export function Example() { return <button>Save</button>; }';
    const result = transformJsxLocalization(source, '/repo/src/components/Example.tsx');
    expect(result).toContain('LocalizedText');
    expect(result).toContain('source={"Save"}');
    expect(result).toContain('import { LocalizedText }');
  });

  it('preserves meaningful whitespace around nested elements', () => {
    const source = 'export function Example() { return <div>Hello <strong>friend</strong> today</div>; }';
    const result = transformJsxLocalization(source, '/repo/src/components/Example.tsx');
    expect(result).toContain('source={"Hello"} suffix={" "}');
    expect(result).toContain('source={"today"} prefix={" "}');
    expect(result).not.toContain('source={" "}');
  });

  it('does not alter JS expression values, whitespace-only JSX or test files', () => {
    const source = 'export function Example() { return <div>\n  {song.title}\n</div>; }';
    expect(transformJsxLocalization(source, '/repo/src/components/Example.tsx')).toBeNull();
    expect(transformJsxLocalization('<div>Save</div>', '/repo/src/test/Example.test.tsx')).toBeNull();
  });
});
