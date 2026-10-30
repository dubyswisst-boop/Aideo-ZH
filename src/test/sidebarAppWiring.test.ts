import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

// Source-bound checks for real App.tsx. These DO NOT mount App or simulate Tauri.
const file = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const sf = ts.createSourceFile('App.tsx', file, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const all = (node: ts.Node): ts.Node[] => {
  const items: ts.Node[] = [node];
  ts.forEachChild(node, child => items.push(...all(child)));
  return items;
};
const nodes = all(sf);
const namedVariable = (name: string): ts.VariableDeclaration[] => nodes.filter(
  (n): n is ts.VariableDeclaration => ts.isVariableDeclaration(n) && n.name.getText(sf) === name,
);
const namedFunction = (name: string): ts.ArrowFunction[] => namedVariable(name)
  .map(n => n.initializer)
  .filter((n): n is ts.ArrowFunction => !!n && ts.isArrowFunction(n));
const normal = (value: string) => value.replace(/\s+/g, ' ');
const functionBody = (name: string) => normal(namedFunction(name)[0]?.body.getText(sf) ?? '');
const jsxByName = (name: string) => nodes.filter(
  (n): n is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(n) && n.tagName.getText(sf) === name,
);
const getJsxAttribute = (node: ts.JsxSelfClosingElement, name: string) => {
  const attr = node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.text === name);
  return attr?.getText(sf) ?? '';
};

describe('App.tsx actual sidebar state/event wiring (static contract)', () => {
  it('has distinct initial visibility and expansion states', () => {
    expect(namedVariable('sidebarAutoVisible')).toHaveLength(0); // destructured state, not name declaration
    expect(file).toMatch(/\[sidebarAutoVisible,\s*setSidebarAutoVisible\]\s*=\s*useState\(false\)/);
    expect(file).toMatch(/\[sidebarExpanded,\s*setSidebarExpanded\]\s*=\s*useState\(false\)/);
    expect(file).toMatch(/sidebarCollapseGuard\s*=\s*useRef\(false\)/);
  });
  it('preserves rail on explicit collapse and guards geometry-induced mouseleave', () => {
    const toggle = functionBody('toggleSidebarExpansion');
    const leave = functionBody('onSidebarMouseLeave');
    expect(toggle).toContain('if (sidebarExpanded) sidebarCollapseGuard.current = true');
    expect(toggle).toContain('setSidebarAutoVisible(true)');
    expect(toggle).toContain('setSidebarExpanded(value => !value)');
    expect(leave).toContain('if (sidebarCollapseGuard.current) return');
    expect(leave).toContain('setSidebarAutoVisible(false)');
    expect(leave).toContain('setSidebarExpanded(false)');
  });
  it('clears the guard on genuine pointer movement and has listener cleanup', () => {
    expect(file).toContain("window.addEventListener('pointermove', onPointerMove)");
    expect(file).toContain("window.removeEventListener('pointermove', onPointerMove)");
    expect(file).toMatch(/const inside\s*=\s*event\.clientX\s*>=\s*bounds\.left/);
    expect(file).toContain('sidebarCollapseGuard.current = false;');
    expect(file).toMatch(/if \(!inside\)\s*\{\s*setSidebarAutoVisible\(false\);\s*setSidebarExpanded\(false\);\s*\}/);
  });
  it('wires the actual Sidebar element to App handlers and edge trigger', () => {
    const sidebar = jsxByName('Sidebar');
    expect(sidebar).toHaveLength(1);
    expect(getJsxAttribute(sidebar[0], 'expanded')).toContain('sidebarExpanded');
    expect(getJsxAttribute(sidebar[0], 'onToggleExpansion')).toContain('toggleSidebarExpansion');
    expect(getJsxAttribute(sidebar[0], 'onMouseLeave')).toContain('onSidebarMouseLeave');
    expect(file).toContain('className="sidebar-hover-zone" onMouseEnter={() => setSidebarAutoVisible(true)}');
  });
  it('ties theater mode to hidden sidebar CSS class', () => {
    expect(file).toContain('${view === "fullscreen" ? "theater-active" : ""}');
    const css = readFileSync(resolve(process.cwd(), 'src/App.css'), 'utf8');
    expect(css).toMatch(/\.app\.sidebar-auto-hidden\.theater-active\s+\.app-sidebar[\s\S]*?display:\s*none\s*!important/);
  });
});
