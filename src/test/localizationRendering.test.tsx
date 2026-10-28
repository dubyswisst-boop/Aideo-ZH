import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
import * as localized from '../i18n/LocalizedText';
import { setLanguage } from '../i18n';
import { transformJsxLocalization } from '../../scripts/jsxLocalization';

function compile(source: string) {
  const transformed = transformJsxLocalization(source, '/repo/src/components/Fixture.tsx') || source;
  const js = ts.transpileModule(transformed, { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  const exports: Record<string, React.ComponentType<Record<string, unknown>>> = {};
  new Function('require', 'exports', js)((id: string) => {
    if (id === 'react/jsx-runtime') return jsxRuntime;
    if (id === '/src/i18n/LocalizedText') return localized;
    throw new Error(`Unexpected fixture import: ${id}`);
  }, exports);
  return exports.Fixture;
}

describe('production localization rendering', () => {
  beforeEach(() => setLanguage('zh-CN'));

  it('updates dynamic controls and accessible attributes while retaining callbacks', () => {
    const Fixture = compile(`export function Fixture({playing, onClick}) {
      return <button title={playing ? 'Pause' : 'Play'} aria-label="Settings" onClick={onClick}>
        {playing ? 'Pause' : 'Play'}
      </button>;
    }`);
    let clicks = 0;
    render(<Fixture playing={true} onClick={() => { clicks += 1; }} />);
    expect(screen.getByRole('button', { name: '设置' })).toHaveAttribute('title', '暂停');
    expect(screen.getByRole('button')).toHaveTextContent('暂停');
    fireEvent.click(screen.getByRole('button'));
    expect(clicks).toBe(1);
    act(() => setLanguage('en-US'));
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('title', 'Pause');
    expect(screen.getByRole('button')).toHaveTextContent('Pause');
  });

  it('localizes option labels and entities while preserving form values and user metadata', () => {
    const Fixture = compile(`export function Fixture({song}) {
      return <div><select defaultValue="Settings"><option value="Settings">Settings</option></select>
        <input placeholder="Search" defaultValue="Settings" />
        <span>{song.title}</span><span>{song.artist || 'Unknown Artist'}</span>
        <button>Save &amp; Close</button></div>;
    }`);
    render(<Fixture song={{ title: 'Settings', artist: 'Library' }} />);
    expect(screen.getByRole('option', { name: '设置' })).toHaveValue('Settings');
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '搜索');
    expect(screen.getByRole('textbox')).toHaveValue('Settings');
    expect(screen.getByText('Settings', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Library', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('保存并关闭');
  });

  it('localizes template labels without translating interpolated user names', () => {
    const Fixture = compile("export function Fixture({name}) { return <button title={`Delete preset \"${name}\"`}>{'Settings'}</button>; }");
    render(<Fixture name="Library" />);
    expect(screen.getByRole('button')).toHaveAttribute('title', '删除预设“Library”');
    expect(screen.getByRole('button')).toHaveTextContent('设置');
  });

  it('preserves implicit option values, refs, and numeric children', () => {
    const Fixture = compile(`export function Fixture({inputRef}) {
      return <div><select defaultValue="Off"><option>Off</option></select>
        <input ref={inputRef} placeholder="Search" /><span>{42}</span></div>;
    }`);
    const ref = { current: null as HTMLInputElement | null };
    render(<Fixture inputRef={ref} />);
    expect(screen.getByRole('option', { name: '关闭' })).toHaveValue('Off');
    expect(screen.getByRole('combobox')).toHaveValue('Off');
    expect(ref.current).toBe(screen.getByRole('textbox'));
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('preserves attribute precedence when a later spread overrides a label', () => {
    const Fixture = compile(`export function Fixture({props}) { return <button title="Play" {...props}>Play</button>; }`);
    render(<Fixture props={{ title: 'User title' }} />);
    expect(screen.getByRole('button')).toHaveAttribute('title', 'User title');
  });

  it('evaluates an implicit option expression once per render', () => {
    const Fixture = compile(`export function Fixture({label}) { return <select><option>{label() || 'Off'}</option></select>; }`);
    let calls = 0;
    render(<Fixture label={() => { calls += 1; return 'Play'; }} />);
    expect(calls).toBe(1);
    expect(screen.getByRole('option')).toHaveValue('Play');
  });
});
