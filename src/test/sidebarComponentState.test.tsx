import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Sidebar } from '../components/Sidebar';
import { setLanguage } from '../i18n';
import { useStore } from '../store';

// Mount the REAL Sidebar component, while modeling the public three-state contract.
// This intentionally does not claim to mount App.tsx or verify native Tauri behavior.
function SidebarHarness() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  return (
    <div data-testid="shell" className={`app sidebar-auto-hidden ${visible ? 'sidebar-auto-visible' : ''} ${expanded ? 'sidebar-auto-expanded' : 'sidebar-collapsed'}`}>
      <div data-testid="edge" onMouseEnter={() => setVisible(true)} />
      <Sidebar
        expanded={expanded}
        onToggleExpansion={() => { setVisible(true); setExpanded(value => !value); }}
        onMouseLeave={() => { setVisible(false); setExpanded(false); }}
      />
    </div>
  );
}

const has = (element: HTMLElement, name: string) => element.classList.contains(name);

describe('Real Sidebar component three-state integration contract', () => {
  beforeEach(() => {
    setLanguage('zh-CN');
    useStore.setState({ appMode: 'local', view: 'library', playlists: [], currentPlaylist: null });
  });

  it('starts hidden; edge hover reveals rail; real toggle expands and collapses without hiding', () => {
    render(<SidebarHarness />);
    const shell = screen.getByTestId('shell');
    expect(has(shell, 'sidebar-auto-visible')).toBe(false);
    expect(has(shell, 'sidebar-auto-expanded')).toBe(false);

    fireEvent.mouseEnter(screen.getByTestId('edge'));
    expect(has(shell, 'sidebar-auto-visible')).toBe(true);
    expect(has(shell, 'sidebar-auto-expanded')).toBe(false);

    const toggle = shell.querySelector<HTMLButtonElement>('.sidebar-toggle-btn');
    expect(toggle).not.toBeNull();
    fireEvent.click(toggle!);
    expect(has(shell, 'sidebar-auto-visible')).toBe(true);
    expect(has(shell, 'sidebar-auto-expanded')).toBe(true);

    fireEvent.click(toggle!);
    expect(has(shell, 'sidebar-auto-visible')).toBe(true);
    expect(has(shell, 'sidebar-auto-expanded')).toBe(false);

    fireEvent.mouseLeave(shell.querySelector('.app-sidebar')!);
    expect(has(shell, 'sidebar-auto-visible')).toBe(false);
    expect(has(shell, 'sidebar-auto-expanded')).toBe(false);
  });

  it('renders a single toggle button in icon-only and expanded modes', () => {
    render(<SidebarHarness />);
    fireEvent.mouseEnter(screen.getByTestId('edge'));
    const shell = screen.getByTestId('shell');
    expect(shell.querySelectorAll('.sidebar-toggle-btn')).toHaveLength(1);
    fireEvent.click(shell.querySelector('.sidebar-toggle-btn')!);
    expect(shell.querySelectorAll('.sidebar-toggle-btn')).toHaveLength(1);
  });
});
