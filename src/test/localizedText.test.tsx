import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { setLanguage } from '../i18n';
import { LocalizedText } from '../i18n/LocalizedText';

describe('LocalizedText', () => {
  it('reactively replaces text without adding DOM wrappers or losing spaces', () => {
    act(() => setLanguage('zh-CN'));
    const { container } = render(<div><LocalizedText source="Settings" suffix=" " /><strong>ABC</strong></div>);
    expect(container.firstChild?.textContent).toBe('设置 ABC');
    expect(container.querySelectorAll('span')).toHaveLength(0);
    act(() => setLanguage('en-US'));
    expect(container.firstChild?.textContent).toBe('Settings ABC');
    expect(screen.getByText('ABC')).toBeInTheDocument();
  });
});
