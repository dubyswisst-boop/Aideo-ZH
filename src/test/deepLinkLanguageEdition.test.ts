import { describe, expect, it } from 'vitest';
import { stripAideoDeepLinkScheme } from '../utils/deepLinkScheme';

describe('Aideo Chinese edition deep link scheme', () => {
  it('retains original deep links and accepts the isolated community scheme', () => {
    expect(stripAideoDeepLinkScheme('aideo://play?path=x')).toBe('play?path=x');
    expect(stripAideoDeepLinkScheme('aideozh://queue?path=y')).toBe('queue?path=y');
  });

  it('rejects unrelated or partial protocols', () => {
    expect(stripAideoDeepLinkScheme('http://play?path=x')).toBeNull();
    expect(stripAideoDeepLinkScheme('aideozhx://play?path=x')).toBeNull();
  });
});
