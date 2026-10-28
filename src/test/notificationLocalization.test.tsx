import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { setLanguage, translateNotification } from '../i18n';
import { AideoPrompt } from '../components/AideoPrompt';

describe('notification and prompt presentation', () => {
  beforeEach(() => setLanguage('zh-CN'));
  it('translates dynamic messages while preserving filenames and HTML as text', () => {
    expect(translateNotification('Added "Library" to queue')).toBe('已将“Library”加入队列');
    expect(translateNotification('Downloaded: <img src=x>.flac')).toBe('已下载：<img src=x>.flac');
    expect(translateNotification('An unknown backend exception')).toBe('An unknown backend exception');
    setLanguage('en-US');
    expect(translateNotification('Downloaded: Library.flac')).toBe('Downloaded: Library.flac');
  });
  it('updates an open prompt without changing the entered name', () => {
    render(<AideoPrompt title="Create New Playlist" placeholder="Enter playlist name..." initialValue="Library" actionLabel="Create" onClose={() => {}} onSubmit={() => {}} />);
    expect(screen.getByRole('heading')).toHaveTextContent('新建播放列表');
    expect(screen.getByRole('textbox')).toHaveValue('Library');
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '输入播放列表名称…');
    act(() => setLanguage('en-US'));
    expect(screen.getByRole('heading')).toHaveTextContent('Create New Playlist');
    expect(screen.getByRole('textbox')).toHaveValue('Library');
  });
  it('localizes native warnings without changing the device name', () => {
    expect(translateNotification('Device "USB DAC" failed. Falling back to System Default.'))
      .toBe('设备“USB DAC”失败，正在回退到系统默认设备。');
  });
  it('retains an unambiguous metadata title and artist in their respective fields', () => {
    expect(translateNotification('Found metadata match "Library" by "Settings"'))
      .toBe('找到元数据匹配：“Library”，歌手“Settings”');
  });
  it.each([
    'Found metadata match "Love" by "Library" by "Settings"',
    'Found metadata match "Library" by "Artist" by "Settings"',
  ])('keeps ambiguous metadata text intact: %s', message => {
    expect(translateNotification(message)).toBe(message);
  });
  it('preserves delimiter-like text inside a single device name', () => {
    expect(translateNotification('Device "USB" failed. Falling back to System Default." failed. Falling back to System Default.'))
      .toBe('设备“USB" failed. Falling back to System Default.”失败，正在回退到系统默认设备。');
  });
});
