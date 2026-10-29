import { describe, expect, it } from 'vitest';
import dictionary from '../../locales/zh-CN.json';
import { useStore } from '../store';

describe('Aideo 中文版功能补丁回归', () => {
  it('includes Chinese translations for the new native window controls and theater lock', () => {
    expect(dictionary['Window controls']).toBe('窗口控制');
    expect(dictionary['Lock / Unlock Theater to Desktop']).toBe('锁定/解锁影院全屏');
  });

  it('ships a configurable system-wide theater lock shortcut', () => {
    expect(useStore.getState().globalHotkeys.toggleTheaterLock).toBe('Ctrl+Alt+F12');
  });
});
