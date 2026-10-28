import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useStore } from '../store';
import { SettingsView, StreamingQualityControl } from '../components/SettingsView';
import { AudioControlCenter } from '../components/AudioControlCenter';
import { setLanguage } from '../i18n';

beforeEach(() => {
  setLanguage('en-US'); // This suite tests existing English control labels, not localization.
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;

  useStore.setState({
    visualizerMode: 'bars',
    visualizerDecayRate: 'balanced',
    visualizerExpanded: false,
    pendingSettingsTab: null,
  });
});

describe('SettingsView Audio Spectrum Visualizer Card', () => {

  it('updates visualizerMode in store when clicking a style chip', () => {
    render(<SettingsView />);

    expect(useStore.getState().visualizerMode).toBe('bars');

    const waveChip = screen.getByRole('button', { name: 'Wave' });
    act(() => {
      fireEvent.click(waveChip);
    });

    expect(useStore.getState().visualizerMode).toBe('wave');

    const dotsChip = screen.getByRole('button', { name: 'Dots' });
    act(() => {
      fireEvent.click(dotsChip);
    });

    expect(useStore.getState().visualizerMode).toBe('dots');
  });

  it('updates visualizerDecayRate in store when clicking a decay profile pill', () => {
    render(<SettingsView />);

    expect(useStore.getState().visualizerDecayRate).toBe('balanced');

    const silkyBtn = screen.getByRole('button', { name: 'Slow' });
    act(() => {
      fireEvent.click(silkyBtn);
    });

    expect(useStore.getState().visualizerDecayRate).toBe('silky');

    const snappyBtn = screen.getByRole('button', { name: 'Fast' });
    act(() => {
      fireEvent.click(snappyBtn);
    });

    expect(useStore.getState().visualizerDecayRate).toBe('snappy');
  });

  it('updates visualizerExpanded in store when toggling the canvas switch', () => {
    render(<SettingsView />);

    expect(useStore.getState().visualizerExpanded).toBe(false);

    const canvasLabel = screen.getByText('Expanded Now Playing Canvas');
    const switchEl = canvasLabel.parentElement?.nextElementSibling as HTMLElement;
    expect(switchEl).toBeInTheDocument();

    act(() => {
      fireEvent.click(switchEl!);
    });

    expect(useStore.getState().visualizerExpanded).toBe(true);

    act(() => {
      fireEvent.click(switchEl!);
    });

    expect(useStore.getState().visualizerExpanded).toBe(false);
  });
});

describe('Settings navigation and playback speed', () => {
  it('consumes the pending Library request and permits subsequent tab selection', () => {
    useStore.setState({ pendingSettingsTab: 'library' });
    const settings = render(<SettingsView />);
    expect(screen.getByRole('button', { name: 'Library' })).toHaveClass('active');
    expect(useStore.getState().pendingSettingsTab).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    settings.rerender(<SettingsView />);
    expect(screen.getByRole('button', { name: 'Appearance' })).toHaveClass('active');
  });

  it('disables speed controls in Bit-Perfect mode and enables them when it is off', () => {
    const original = useStore.getState();
    useStore.setState({ showControlCenter: true, playback: { ...original.playback, bit_perfect: true } });
    try {
      render(<AudioControlCenter />);
      fireEvent.click(screen.getByRole('button', { name: 'Telemetry & Utilities' }));
      expect(screen.getByRole('slider', { name: 'Playback speed' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '1.25x' })).toBeDisabled();

      act(() => useStore.setState({ playback: { ...useStore.getState().playback, bit_perfect: false } }));
      expect(screen.getByRole('slider', { name: 'Playback speed' })).toBeEnabled();
      expect(screen.getByRole('button', { name: '1.25x' })).toBeEnabled();
    } finally {
      useStore.setState({ showControlCenter: original.showControlCenter, playback: original.playback });
    }
  });
});

describe('Chinese settings card content', () => {
  it('adds appropriate Chinese Windows font fallbacks to the selected Latin typeface', () => {
    localStorage.setItem('aideo-font', 'Outfit');
    act(() => setLanguage('zh-CN'));
    try {
      const view = render(<SettingsView />);
      const fontFamily = document.documentElement.style.getPropertyValue('--font-family');
      expect(fontFamily).toContain("'Outfit'");
      expect(fontFamily).toContain("'Microsoft YaHei UI'");
      expect(fontFamily).toContain("'Noto Sans CJK SC'");
      view.unmount();
    } finally {
      act(() => setLanguage('en-US'));
    }
  });

  it('translates dynamic section headings and HUD option descriptions without altering settings behavior', () => {
    act(() => setLanguage('zh-CN'));
    try {
      const view = render(<SettingsView />);
      expect(screen.getByText('影院模式播放控制界面')).toBeInTheDocument();
      expect(screen.getByText('选择全屏模式中显示的播放控制样式。')).toBeInTheDocument();
      expect(screen.getByText('带进度拖动和快捷设置的圆角悬浮播放栏。')).toBeInTheDocument();
      expect(screen.getByText('方形控制键')).toBeInTheDocument();
      expect(screen.getByText('音频频谱可视化')).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText('搜索设置、音频驱动、快捷键……'), {
        target: { value: '影院模式播放控制' },
      });
      expect(screen.getByText('影院模式播放控制界面')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '清除' })).toBeInTheDocument();
      view.unmount();
    } finally {
      act(() => setLanguage('en-US'));
    }
  });

  it('translates the streaming quality preset and source picker', () => {
    act(() => setLanguage('zh-CN'));
    try {
      const view = render(<StreamingQualityControl
        streamingQuality="best_available"
        setStreamingQuality={() => {}}
        preferredSource="auto"
        setPreferredSource={() => {}}
        tidalConnected={false}
        qobuzConnected={false}
        qobuzExperimentalEnabled={false}
      />);
      expect(screen.getByText('最佳可用音质')).toBeInTheDocument();
      expect(screen.getByText('最高 24 位 / 192 kHz')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '自动选择（智能路由）' })).toBeInTheDocument();
      view.unmount();
    } finally {
      act(() => setLanguage('en-US'));
    }
  });
});
