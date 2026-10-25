import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { setLanguage } from '../i18n';
import { LanguageSettingsControl } from '../components/LanguageSettingsControl';
import { Sidebar } from '../components/Sidebar';
import { useStore } from '../store';

describe('Language control', () => {
  beforeEach(() => {
    setLanguage('zh-CN');
    vi.mocked(invoke).mockReset().mockResolvedValue(null);
  });

  it('defaults to Chinese and switches to the existing English interface immediately', () => {
    render(<LanguageSettingsControl />);
    expect(screen.getByRole('combobox', { name: '界面语言' })).toHaveValue('zh-CN');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en-US' } });
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en-US');
    expect(localStorage.getItem('aideo-language')).toBe('en-US');
  });

  it('reloads translations from the drop-in folder and reports the result', async () => {
    vi.mocked(invoke).mockResolvedValue({ Settings: '偏好设置' });
    render(<LanguageSettingsControl />);
    fireEvent.click(screen.getByRole('button', { name: '重新加载语言包' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('语言包已重新加载'));
    expect(invoke).toHaveBeenCalledWith('read_language_pack');
  });

  it('translates navigation labels without changing source playlist names', () => {
    useStore.setState({
      sidebarCollapsed: false,
      appMode: 'local',
      playlists: [{ id: 88, name: 'My English Playlist' }],
    });
    render(<Sidebar />);
    expect(screen.getByText('音乐库')).toBeInTheDocument();
    expect(screen.getByText('My English Playlist')).toBeInTheDocument();
    act(() => setLanguage('en-US'));
    expect(screen.getByText('Library')).toBeInTheDocument();
  });
});
