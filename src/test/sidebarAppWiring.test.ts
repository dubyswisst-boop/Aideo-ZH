import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static contracts against actual App.tsx. Does NOT mount the complete App.
// Deliberately avoid import.meta.url and AST node traversal in Vitest's transform.
const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/App.css'), 'utf8');
const compact = (text: string) => text.replace(/\s+/g, ' ');

function arrowBody(name: string): string {
  const declaration = new RegExp(`\\bconst\\s+${name}\\s*=\\s*\\(\\)\\s*=>\\s*\\{`);
  const match = declaration.exec(app);
  expect(match, `${name} must be declared in App.tsx`).not.toBeNull();
  // This source-bound contract looks only between this declaration and the
  // next top-level constant/effect; assertions below still require full logic.
  const start = match!.index;
  const end = app.indexOf('\n  };', start);
  expect(end, `${name} must have a closing function body`).toBeGreaterThan(start);
  return compact(app.slice(start, end + 5));
}

function sidebarElement(): string {
  const matches = [...app.matchAll(/<Sidebar\b[^>]*\/>/g)];
  expect(matches, 'App.tsx must render exactly one self-closing Sidebar').toHaveLength(1);
  return compact(matches[0][0]);
}

describe('App.tsx sidebar state/event wiring (static source contract)', () => {
  it('initializes visibility and expansion independently', () => {
    expect(app).toMatch(/\[sidebarAutoVisible,\s*setSidebarAutoVisible\]\s*=\s*useState\(false\)/);
    expect(app).toMatch(/\[sidebarExpanded,\s*setSidebarExpanded\]\s*=\s*useState\(false\)/);
    expect(app).toMatch(/sidebarCollapseGuard\s*=\s*useRef\(false\)/);
  });

  it('preserves visible rail during collapse and guards synthetic mouseleave', () => {
    const toggle = arrowBody('toggleSidebarExpansion');
    const leave = arrowBody('onSidebarMouseLeave');
    expect(toggle).toContain('if (sidebarExpanded) sidebarCollapseGuard.current = true');
    expect(toggle).toContain('setSidebarAutoVisible(true)');
    expect(toggle).toContain('setSidebarExpanded(value => !value)');
    expect(leave).toContain('if (sidebarCollapseGuard.current) return');
    expect(leave).toContain('setSidebarAutoVisible(false)');
    expect(leave).toContain('setSidebarExpanded(false)');
  });

  it('releases guard on real pointer movement and cleans up listener', () => {
    expect(app).toContain("window.addEventListener('pointermove', onPointerMove)");
    expect(app).toContain("window.removeEventListener('pointermove', onPointerMove)");
    expect(app).toMatch(/const inside\s*=\s*event\.clientX\s*>=\s*bounds\.left/);
    expect(app).toContain('sidebarCollapseGuard.current = false;');
    expect(app).toMatch(/if \(!inside\)\s*\{\s*setSidebarAutoVisible\(false\);\s*setSidebarExpanded\(false\);\s*\}/);
  });

  it('binds the real Sidebar to App callbacks and its edge trigger', () => {
    const sidebar = sidebarElement();
    expect(sidebar).toMatch(/expanded=\{sidebarExpanded\}/);
    expect(sidebar).toMatch(/onToggleExpansion=\{toggleSidebarExpansion\}/);
    expect(sidebar).toMatch(/onMouseLeave=\{onSidebarMouseLeave\}/);
    expect(app).toContain('className="sidebar-hover-zone" onMouseEnter={() => setSidebarAutoVisible(true)}');
  });

  it('hides navigation in theater mode using the real CSS rule', () => {
    expect(app).toContain('${view === "fullscreen" ? "theater-active" : ""}');
    expect(css).toMatch(/\.app\.sidebar-auto-hidden\.theater-active\s+\.app-sidebar[\s\S]*?display:\s*none\s*!important/);
  });
});
