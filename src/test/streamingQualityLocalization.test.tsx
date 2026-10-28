import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { StreamingQualityControl } from '../components/SettingsView';
import { setLanguage } from '../i18n';
import type { StreamingQuality } from '../store/types';

const tiers: { id: StreamingQuality; title: string; resolution: string; source: 'auto' | 'youtube' }[] = [
  { id: 'best_available', title: '最佳可用音质', resolution: '最高 24 位 / 192 kHz', source: 'auto' },
  { id: 'standard_lossless', title: '标准无损', resolution: '16 位 / 44.1 kHz FLAC', source: 'auto' },
  { id: 'data_saver', title: '节省流量', resolution: '压缩音频流', source: 'youtube' },
];

describe('streaming quality localization at runtime', () => {
  beforeEach(() => setLanguage('zh-CN'));

  it.each(tiers)('interpolates the $id preset and accessible step labels', tier => {
    const setStreamingQuality = vi.fn();
    const setPreferredSource = vi.fn();
    const view = render(<StreamingQualityControl
      streamingQuality={tier.id} preferredSource={tier.source}
      setStreamingQuality={setStreamingQuality} setPreferredSource={setPreferredSource}
      tidalConnected={false} qobuzConnected={false} qobuzExperimentalEnabled={false}
    />);
    expect(screen.getByText(`首选目标分辨率：${tier.resolution}`)).toBeInTheDocument();
    tiers.forEach((step, index) => {
      expect(screen.getByRole('button', { name: `选择${step.title}（第 ${index + 1}/3 档）` }))
        .toHaveAttribute('title', `选择${step.title}`);
    });
    const index = tiers.indexOf(tier);
    if (index > 0) expect(screen.getByText(`更高音质（${tiers[index - 1].title}）`)).toBeInTheDocument();
    if (index < 2) expect(screen.getByText(`更低音质（${tiers[index + 1].title}）`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '选择节省流量（第 3/3 档）' }));
    expect(setStreamingQuality).toHaveBeenCalledWith('data_saver');
    expect(setPreferredSource).toHaveBeenCalledWith('youtube');
    expect(view.container.textContent).not.toMatch(/\{(?:value\d+|quality|resolution|source|index|total)\}/);
    act(() => setLanguage('en-US'));
    expect(screen.getByText(/^Preferred target resolution:/)).toBeInTheDocument();
    act(() => setLanguage('zh-CN'));
    expect(screen.getByText(`首选目标分辨率：${tier.resolution}`)).toBeInTheDocument();
  });

  it.each(tiers)('renders a complete custom routing sentence for $id and restores defaults', tier => {
    const setStreamingQuality = vi.fn();
    const setPreferredSource = vi.fn();
    render(<StreamingQualityControl
      streamingQuality={tier.id} preferredSource="local"
      setStreamingQuality={setStreamingQuality} setPreferredSource={setPreferredSource}
      tidalConnected={false} qobuzConnected={false} qobuzExperimentalEnabled={false}
    />);
    expect(screen.getByText(`基础音质：${tier.title}`)).toBeInTheDocument();
    expect(screen.getByText(`分辨率：${tier.resolution} · 优先音源：本地文件`)).toBeInTheDocument();
    expect(screen.getByText(`当前启用手动音源路由。远程音频流以${tier.title}档位的${tier.resolution}为目标，音源选择优先考虑本地文件。点击上方箭头或预设档位圆点可恢复标准预设。`)).toBeInTheDocument();
    if (tier.id !== 'standard_lossless') {
      fireEvent.click(screen.getByText(`恢复为${tier.title}`));
      expect(setStreamingQuality).toHaveBeenCalledWith(tier.id);
      expect(setPreferredSource).toHaveBeenCalledWith(tier.source);
    }
  });
});
