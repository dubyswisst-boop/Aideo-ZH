import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setLanguage, t } from '../i18n';
import { DownloadProgress } from '../components/DownloadManager';
import { mixDisplayTitle } from '../components/aideo/mixPresentation';
import type { DownloadJob } from '../store/downloadStore';

describe('localized presentation preserves content and state', () => {
  beforeEach(() => setLanguage('zh-CN'));
  it('preserves user playlist names even when they match a UI key', () => {
    expect(mixDisplayTitle({ id: 'local_playlist_1', title: 'Library' }, t)).toBe('Library');
    expect(mixDisplayTitle({ id: 'supermix', title: 'Supermix' }, t)).toBe('超级混音');
  });
  it('translates download progress without changing progress numbers or metadata', () => {
    const job: DownloadJob = {
      id: 'test', revision: 1, status: 'downloading', downloaded: 1048576, total: 2097152, percent: 50.8,
      saved: false, error: null, path: 'C:/Music/Library.flac',
      source: { provider: 'tidal', id: '1', metadata: { title: 'Library', artist: 'Settings', duration: 180 } },
      option: { id: 'flac', label: 'FLAC', extension: 'flac', quality: {} },
    };
    render(<DownloadProgress job={job} />);
    expect(screen.getByRole('status')).toHaveTextContent('正在下载 · 50% · 1.0 MB');
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '50.8');
    expect(screen.getByText('Library', { selector: 'strong' })).toBeInTheDocument();
    expect(job.status).toBe('downloading');
  });
});
