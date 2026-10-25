import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

const loadI18n = async () => import('../i18n');

describe('Aideo language packs', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.mocked(invoke).mockReset().mockResolvedValue(null);
  });

  it('starts in Simplified Chinese and retains English as a safe fallback', async () => {
    const { getLanguage, t } = await loadI18n();
    expect(getLanguage()).toBe('zh-CN');
    expect(t('Settings')).toBe('设置');
    expect(t('An untranslated label')).toBe('An untranslated label');
  });

  it('persists a language change without touching player state', async () => {
    const { setLanguage, getLanguage, t } = await loadI18n();
    setLanguage('en-US');
    expect(getLanguage()).toBe('en-US');
    expect(localStorage.getItem('aideo-language')).toBe('en-US');
    expect(document.documentElement.lang).toBe('en-US');
    expect(t('Settings')).toBe('Settings');
    setLanguage('zh-CN');
    expect(t('Settings')).toBe('设置');
  });

  it('rejects a corrupt stored language choice', async () => {
    localStorage.setItem('aideo-language', '../private');
    const { getLanguage } = await loadI18n();
    expect(getLanguage()).toBe('zh-CN');
  });

  it('allows a drop-in JSON dictionary to override bundled translations', async () => {
    vi.mocked(invoke).mockResolvedValue({ Settings: '个性设置', 'Hello, {name}': '你好，{name}' });
    const { reloadLanguagePack, t } = await loadI18n();
    expect(await reloadLanguagePack()).toBe('loaded');
    expect(invoke).toHaveBeenCalledWith('read_language_pack');
    expect(t('Settings')).toBe('个性设置');
    expect(t('Hello, {name}', { name: '<小明>' })).toBe('你好，<小明>');
  });

  it('keeps bundled translations if the file is missing or fails to load', async () => {
    const { reloadLanguagePack, t } = await loadI18n();
    expect(await reloadLanguagePack()).toBe('missing');
    expect(t('Settings')).toBe('设置');
    vi.mocked(invoke).mockRejectedValue(new Error('invalid JSON'));
    expect(await reloadLanguagePack()).toBe('error');
    expect(t('Settings')).toBe('设置');
  });

  it('ignores unsafe non-string translations without executing HTML', async () => {
    vi.mocked(invoke).mockResolvedValue({ Settings: '<img src=x>', Library: 8 });
    const { reloadLanguagePack, t } = await loadI18n();
    expect(await reloadLanguagePack()).toBe('loaded');
    expect(t('Settings')).toBe('<img src=x>');
    expect(t('Library')).toBe('音乐库');
  });

  it('does not treat object prototype members as translated text', async () => {
    const { t } = await loadI18n();
    expect(t('toString')).toBe('toString');
    expect(t('constructor')).toBe('constructor');
  });
});
