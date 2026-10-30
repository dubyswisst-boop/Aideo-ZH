import { useState, useRef, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { RefreshCw, X, Tv2, ChevronUp, ChevronDown } from 'lucide-react';
import { fmt, baseName, cleanSearchQuery, getVariantPenalty } from '../utils';
import { LyricsDisplayMode } from '../store/types';
import { KaraokeActiveLine } from './KaraokeActiveLine';

interface SearchResult { id: string; title: string; artist: string; source: string; content_id?: string; raw_lrc?: string; duration?: number; }

export function LyricsPanel() {
  const {
    currentTrack, lyrics, lyricOffset, lyricStatus, lyricsDisplayMode,
    setLyricsDisplayMode, seek, adjustLyricOffset, setLyricOffset, saveLyrics,
    translateLyrics, getRomaji, isTranslating, showRomaji, setShowRomaji,
    showTranslation, setShowTranslation, showLyricsHeader, toggleLyricsHeader,
    setCustomPrompt, desktopLyricsOpen, toggleDesktopLyrics, desktopLyricsLocked,
    toggleDesktopLyricsLocked,
    playbackPositionSecs,
    playbackStatus,
    playbackCurrentTrack
  } = useStore(useShallow(s => ({
    currentTrack: s.currentTrack,
    lyrics: s.lyrics,
    playbackPositionSecs: s.playback.position_secs,
    playbackStatus: s.playback.status,
    playbackCurrentTrack: s.playback.current_track,
    lyricOffset: s.lyricOffset,
    lyricStatus: s.lyricStatus,
    lyricsDisplayMode: s.lyricsDisplayMode,
    setLyricsDisplayMode: s.setLyricsDisplayMode,
    seek: s.seek,
    adjustLyricOffset: s.adjustLyricOffset,
    setLyricOffset: s.setLyricOffset,
    saveLyrics: s.saveLyrics,
    translateLyrics: s.translateLyrics,
    getRomaji: s.getRomaji,
    isTranslating: s.isTranslating,
    showRomaji: s.showRomaji,
    setShowRomaji: s.setShowRomaji,
    showTranslation: s.showTranslation,
    setShowTranslation: s.setShowTranslation,
    showLyricsHeader: s.showLyricsHeader,
    toggleLyricsHeader: s.toggleLyricsHeader,
    setCustomPrompt: s.setCustomPrompt,
    desktopLyricsOpen: s.desktopLyricsOpen,
    toggleDesktopLyrics: s.toggleDesktopLyrics,
    desktopLyricsLocked: s.desktopLyricsLocked,
    toggleDesktopLyricsLocked: s.toggleDesktopLyricsLocked,
  })));
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTranslateClick = async () => {
    const hasTranslation = lyrics.some(l => l.translation);
    if (!hasTranslation && lyrics.length > 0) {
      try {
        await translateLyrics();
        setShowTranslation(true);
      } catch (err) {
        console.error('Translation error:', err);
      }
    } else {
      setShowTranslation(!showTranslation);
    }
  };
  
  // Auto Translation & Romaji on track change / startup when user has toggle enabled
  useEffect(() => {
    if (!currentTrack || lyrics.length === 0 || isTranslating) return;

    const checkAndFetch = async () => {
      if (showTranslation) {
        const hasTranslation = lyrics.some(l => l.translation);
        if (!hasTranslation) {
          try {
            await translateLyrics();
          } catch (err) {
            console.error('Auto-translation failed:', err);
          }
          return;
        }
      }

      if (showRomaji) {
        const hasRomaji = lyrics.some(l => l.romaji);
        if (!hasRomaji) {
          try {
            await getRomaji();
          } catch (err) {
            console.error('Auto-romaji failed:', err);
          }
        }
      }
    };

    checkAndFetch();
  }, [currentTrack?.path, lyrics.length, showRomaji, showTranslation, isTranslating]);

  const [userScrolling, setUserScrolling] = useState(false);
  const userScrollTimer = useRef<number | null>(null);
  const [showFinder, setShowFinder] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const lyricSearchVersion = useRef(0);
  const lyricPickVersion = useRef(0);
  const activeLyricPath = useRef(playbackCurrentTrack);
  activeLyricPath.current = playbackCurrentTrack;
  useEffect(() => {
    lyricSearchVersion.current += 1;
    lyricPickVersion.current += 1;
    setResults([]);
    setSearching(false);
    setShowFinder(false);
  }, [playbackCurrentTrack]);
  const [editContent, setEditContent] = useState('');
  const [showFallbackSearch, setShowFallbackSearch] = useState(false);

  useEffect(() => {
    if (lyricStatus === 'loading') {
      const timer = setTimeout(() => {
        setShowFallbackSearch(true);
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      setShowFallbackSearch(false);
    }
  }, [lyricStatus]);

  const activeIdx = useMemo(() => {
    if (!lyrics.length) return -1;
    const now = playbackPositionSecs + lyricOffset / 1000;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time_secs <= now) idx = i; else break;
    }
    return idx;
  }, [lyrics, playbackPositionSecs, lyricOffset]);

  useEffect(() => {
    if (lyricsDisplayMode === 'static' || userScrolling || !scrollRef.current || activeIdx === -1) return;
    const el = scrollRef.current.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null;
    if (el) {
      const container = scrollRef.current;
      const targetTop = el.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2);
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }, [activeIdx, userScrolling, lyricsDisplayMode]);

  const handleUserInteraction = () => {
    setUserScrolling(true);
    if (userScrollTimer.current) clearTimeout(userScrollTimer.current);
    userScrollTimer.current = window.setTimeout(() => setUserScrolling(false), 3000);
  };

  const doSearch = async (manualQuery?: string) => {
    if (!currentTrack && !manualQuery) return;
    const requestId = ++lyricSearchVersion.current;
    const trackAtStart = activeLyricPath.current;
    const isLive = () => requestId === lyricSearchVersion.current &&
      activeLyricPath.current === trackAtStart;
    setSearching(true); setShowFinder(true); setResults([]);
    try {
      let query = '';
      let cleanTitle = '';
      let cleanArtist = '';
      if (manualQuery) {
        query = manualQuery;
        const { artist, title } = cleanSearchQuery('', manualQuery);
        cleanArtist = artist;
        cleanTitle = title;
      } else {
        const { artist, title } = cleanSearchQuery(currentTrack?.artist, currentTrack?.title ?? baseName(currentTrack?.path ?? ''));
        cleanArtist = artist;
        cleanTitle = title;
        query = `${cleanArtist} ${cleanTitle}`.trim();
      }
      const r: SearchResult[] = await invoke('search_lyrics_online', {
        query,
        title: cleanTitle || undefined,
        artist: cleanArtist || undefined,
        album: currentTrack?.album || undefined,
        duration: currentTrack?.duration || undefined,
      });

      // Score and rank the results so the exact match floats to the top
      const targetTitle = cleanTitle || currentTrack?.title || '';
      const targetArtist = cleanArtist || currentTrack?.artist || '';
      const targetDuration = currentTrack?.duration;

      const scored = r.map((item, index) => {
        const cleanStr = (s: string) => s.toLowerCase()
          .replace(/[()\[\]\-\s_]+/g, '')
          .replace(/[^\p{L}\p{N}]/gu, '');

        const pTitle = cleanStr(targetTitle);
        const rTitle = cleanStr(item.title);

        let titleScore = 0;
        if (pTitle === rTitle) {
          titleScore = 1.0;
        } else if (pTitle.includes(rTitle) || rTitle.includes(pTitle)) {
          titleScore = 0.6;
        }

        const pArtist = cleanStr(targetArtist);
        const rArtist = cleanStr(item.artist);
        let artistScore = 0;
        if (pArtist && rArtist) {
          if (pArtist === rArtist || rArtist.includes(pArtist) || pArtist.includes(rArtist)) {
            artistScore = 1.0;
          }
        } else if (!targetArtist || targetArtist.trim() === '') {
          artistScore = 0.5;
        }

        let durationBonus = 0;
        if (targetDuration && item.duration) {
          const diff = Math.abs(targetDuration - item.duration);
          if (diff <= 3) {
            durationBonus = 0.5;
          } else if (diff <= 15) {
            durationBonus = 0.2;
          } else if (diff > 60) {
            durationBonus = -0.3;
          }
        }

        let syncBonus = 0.0;
        if (item.source === 'Unison' || (item.raw_lrc && (item.raw_lrc.includes('<span') || item.raw_lrc.includes('<tt') || item.raw_lrc.includes('(')))) {
          syncBonus = 0.25;
        } else if (item.raw_lrc || item.source !== 'iTunes') {
          syncBonus = 0.10;
        }

        let sourceBonus = 0.0;
        if (item.source === 'Unison' || item.source === 'BiniLyrics' || item.source === 'Better Lyrics') sourceBonus = 0.20;
        else if (item.source === 'Kugou') sourceBonus = 0.15;
        else if (item.source === 'QQMusic') sourceBonus = 0.10;
        else if (item.source === 'LRCLIB') sourceBonus = 0.05;
        else if (item.source === 'NetEase') sourceBonus = 0.0;

        const variantPenalty = getVariantPenalty(targetTitle, item.title);
        const rankBonus = Math.max(0, 0.15 - (index * 0.03));
        const score = (titleScore * 0.5) + (artistScore * 0.3) + durationBonus + syncBonus + sourceBonus + rankBonus + variantPenalty;

        return { item, score };
      });

      scored.sort((a, b) => b.score - a.score);
      if (isLive()) setResults(scored.map(s => s.item));
    } catch (e) {
      if (isLive()) {
        console.error(e);
        window.dispatchEvent(new CustomEvent('ui-toast', { detail: { message: `歌词搜索失败：${e}`, type: 'error' } }));
      }
    } finally { if (isLive()) setSearching(false); }
  };

  const pickResult = async (r: SearchResult) => {
    const pickId = ++lyricPickVersion.current;
    const selectedPath = activeLyricPath.current;
    const isLive = () => pickId === lyricPickVersion.current &&
      activeLyricPath.current === selectedPath;
    setSearching(true);
    try {
      if (!selectedPath) return;

      let lrc = r.raw_lrc ?? '';
      if (!lrc && (r.source === 'BiniLyrics' || r.source === 'Better Lyrics' || r.source === 'Unison')) {
        lrc = await invoke<string>('get_unison_ttml', {
          song: r.title,
          artist: r.artist || undefined,
          duration: r.duration || undefined,
        }).catch(() => '');
      }
      if (!lrc && r.source === 'Kugou' && r.content_id) {
        lrc = await invoke<string>('get_kugou_krc', { id: r.content_id, accesskey: r.id }).catch(() => '');
      }
      if (!lrc && r.source === 'NetEase' && r.content_id)
        lrc = await invoke<string>('get_netease_lrc', { id: r.content_id }).catch(() => '');
      if (!lrc && r.source === 'QQMusic' && r.content_id)
        lrc = await invoke<string>('get_qqmusic_lrc', { mid: r.content_id }).catch(() => '');

      if (lrc && isLive()) {
        await saveLyrics(selectedPath, lrc);
        if (!isLive()) return;

        if (currentTrack && currentTrack.duration && r.duration) {
          const diffSec = currentTrack.duration - r.duration;
          if (diffSec > 2 && diffSec < 120) {
            const calculatedMs = Math.round(diffSec * 10) * 100;
            setLyricOffset(calculatedMs);
            window.dispatchEvent(new CustomEvent('ui-toast', { 
              detail: { message: `✨ 同步：歌词偏移已设为 +${(calculatedMs/1000).toFixed(1)}秒，以匹配视频时长`, type: 'info' } 
            }));
          } else {
            setLyricOffset(0);
          }
        } else {
          setLyricOffset(0);
        }
      }

      if (isLive()) setShowFinder(false);
    } catch (e) {
      if (isLive()) {
        console.error(e);
        window.dispatchEvent(new CustomEvent('ui-toast', { detail: { message: `歌词下载失败：${e}`, type: 'error' } }));
      }
    } finally { if (isLive()) setSearching(false); }
  };

  return (
    <div className="np-right">
      {/* Header / Toolbar */}
      <AnimatePresence initial={false}>
        {showLyricsHeader ? (
          <motion.div
            key="lyrics-toolbar"
            className="lyrics-toolbar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="sync-controls">
              <button className="lyric-btn" title="让歌词提前显示" onClick={() => adjustLyricOffset(-100)}>–</button>
              <div className="sync-value" onClick={() => adjustLyricOffset(-lyricOffset)} title="点击重置">
                {lyricOffset > 0 ? `+${lyricOffset}` : lyricOffset}ms
              </div>
              <button className="lyric-btn" title="让歌词延后显示" onClick={() => adjustLyricOffset(100)}>+</button>
            </div>

            <button className="lyric-btn" onClick={() => doSearch()}>🔍 自动搜索</button>
            <button className="lyric-btn" onClick={() => {
              setCustomPrompt({
                open: true,
                title: '手动搜索歌词',
                placeholder: '请输入歌手及歌曲名称...',
                initialValue: `${currentTrack?.artist ?? ''} ${currentTrack?.title ?? ''}`.trim(),
                actionLabel: '在线搜索',
                onSubmit: (val) => doSearch(val)
              });
            }}>🔍 手动搜索</button>

            <button className="lyric-btn" onClick={() => {
              const raw = lyrics.map(l => `[${fmt(l.time_secs).padStart(5, '0')}.00]${l.text}`).join('\n');
              setEditContent(raw);
              setShowEditor(true);
            }}>编辑歌词</button>

            {/* Status Indicator */}
            <div style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase',
              color: lyricStatus === 'loading' ? 'var(--accent)' : lyricStatus === 'not_found' ? '#ef4444' : 'var(--text-dim)',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: lyricStatus === 'loading' ? 'var(--accent)' : lyricStatus === 'not_found' ? '#ef4444' : lyricStatus === 'found' ? '#10b981' : 'transparent',
                boxShadow: lyricStatus === 'found' ? '0 0 8px #10b981' : 'none',
                animation: lyricStatus === 'loading' ? 'pulse 1.5s infinite' : 'none'
              }} />
              {lyricStatus === 'loading' ? '正在搜索…' : lyricStatus === 'found' ? '已同步' : lyricStatus === 'not_found' ? '无歌词' : ''}
            </div>
            <button className={`lyric-btn ${showTranslation && lyrics.some(l => l.translation) ? 'active' : ''}`} onClick={handleTranslateClick} disabled={isTranslating}>
              {isTranslating ? '处理中…' : showTranslation && lyrics.some(l => l.translation) ? '🌐 隐藏翻译' : '🌐 翻译歌词'}
            </button>
            <button
              className={`lyric-btn ${showRomaji ? 'active' : ''}`}
              disabled={isTranslating}
              onClick={async () => {
                const hasRomaji = lyrics.some(l => l.romaji);
                if (!hasRomaji && lyrics.length > 0) {
                  await getRomaji();
                  setShowRomaji(true);
                } else {
                  setShowRomaji(!showRomaji);
                }
              }}
            >
              {isTranslating ? '处理中…' : '罗马音'}
            </button>
            <button
              className={`lyric-btn ${lyricsDisplayMode === 'karaoke' ? 'active' : ''}`}
              onClick={() => {
                const nextMode: LyricsDisplayMode =
                  lyricsDisplayMode === 'karaoke' ? 'line_sync' :
                  lyricsDisplayMode === 'line_sync' ? 'static' : 'karaoke';
                setLyricsDisplayMode(nextMode);
              }}
              title={`显示模式：${lyricsDisplayMode === 'karaoke' ? '卡拉 OK（逐字）' : lyricsDisplayMode === 'line_sync' ? '逐行同步' : '纯文本'} — 点击切换`}
            >
              {lyricsDisplayMode === 'karaoke' && '🎤 逐字歌词'}
              {lyricsDisplayMode === 'line_sync' && '⏱️ 逐行同步'}
              {lyricsDisplayMode === 'static' && '📄 纯文本'}
            </button>
            <button
              className={`lyric-btn ${desktopLyricsOpen ? 'active' : ''}`}
              onClick={toggleDesktopLyrics}
              onContextMenu={(e) => {
                e.preventDefault();
                toggleDesktopLyricsLocked();
              }}
              title={desktopLyricsOpen ? (desktopLyricsLocked ? "桌面歌词：已锁定（右键解锁）" : "桌面歌词：已开启（右键锁定）") : "打开桌面歌词悬浮栏"}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Tv2 size={13} />
              <span>桌面歌词悬浮栏</span>
            </button>

            {/* 隐藏工具栏 Button */}
            <button
              className="lyric-btn lyric-header-hide-btn"
              onClick={toggleLyricsHeader}
              title="隐藏歌词工具栏和控制项"
            >
              <ChevronUp size={13} />
              <span>隐藏工具栏</span>
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="lyrics-reveal-btn"
            className="lyric-header-reveal-btn"
            onClick={toggleLyricsHeader}
            title="显示歌词工具栏和控制项"
            initial={{ opacity: 0, scale: 0.9, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={13} />
            <span>显示工具栏</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Lyrics scroll */}
      <div className={`lyrics-fade-wrap ${lyricsDisplayMode === 'static' ? 'plain-mode' : ''}`}>
        <div
          className="lyrics-scroll"
          ref={scrollRef}
          onWheel={handleUserInteraction}
          onTouchMove={handleUserInteraction}
          onPointerDown={handleUserInteraction}
        >
          <div className="lyric-spacer-top" />
          {lyrics.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 16, padding: '48px 24px' }}>
              {lyricStatus === 'loading' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <RefreshCw size={32} className="spin" style={{ color: 'var(--accent)' }} />
                  <div style={{ fontSize: 14 }}>正在获取歌词…</div>
                  {showFallbackSearch && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        搜索时间较长，可以在线搜索或手动编辑：
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => doSearch()}>
                          🔍 自动搜索
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => {
                          setCustomPrompt({
                            open: true,
                            title: '手动搜索歌词',
                            placeholder: '请输入歌手及歌曲名称...',
                            initialValue: `${currentTrack?.artist ?? ''} ${currentTrack?.title ?? ''}`.trim(),
                            actionLabel: '在线搜索',
                            onSubmit: (val) => doSearch(val)
                          });
                        }}>
                          🔍 手动搜索
                        </button>
                        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => {
                          setEditContent('');
                          setShowEditor(true);
                        }}>
                          编辑歌词
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : lyricStatus === 'not_found' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <X size={32} style={{ color: '#ef4444' }} />
                  <div style={{ fontSize: 14 }}>未找到歌词。</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => doSearch()}>🔍 自动搜索</button>
                    <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => {
                      setCustomPrompt({
                        open: true,
                        title: '手动搜索歌词',
                        placeholder: '请输入歌手及歌曲名称...',
                        initialValue: `${currentTrack?.artist ?? ''} ${currentTrack?.title ?? ''}`.trim(),
                        actionLabel: '在线搜索',
                        onSubmit: (val) => doSearch(val)
                      });
                    }}>🔍 手动搜索</button>
                    <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => { setEditContent(''); setShowEditor(true); }}>编辑歌词</button>
                  </div>
                </div>
              ) : (
                <>暂无歌词。点击<strong>搜索歌词</strong>在线查找。</>
              )}
            </div>
          ) : (
            lyrics.map((l, i) => (
              <div 
                key={i} 
                data-idx={i} 
                className={`lyric-line${(lyricsDisplayMode !== 'static' && i === activeIdx) ? ' active' : ''}`}
                style={{ cursor: lyricsDisplayMode !== 'static' ? 'pointer' : 'default' }}
                onClick={() => {
                  if (lyricsDisplayMode !== 'static') {
                    setUserScrolling(false);
                    if (userScrollTimer.current) clearTimeout(userScrollTimer.current);
                    seek(l.time_secs - lyricOffset / 1000);
                    const container = scrollRef.current;
                    if (container) {
                      const el = container.querySelector(`[data-idx="${i}"]`) as HTMLElement | null;
                      if (el) {
                        const targetTop = el.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2);
                        container.scrollTo({ top: targetTop, behavior: 'smooth' });
                      }
                    }
                  }
                }}
              >
                <div>
                  {lyricsDisplayMode === 'karaoke' && i === activeIdx && l.words && l.words.length > 0 ? (
                    <KaraokeActiveLine
                      words={l.words}
                      positionSecs={playbackPositionSecs}
                      lyricOffset={lyricOffset}
                      isPlaying={playbackStatus === 'Playing'}
                    />
                  ) : (
                    l.text || '♪'
                  )}
                </div>
                {showRomaji && l.romaji && l.romaji !== l.text && <div className="lyric-romaji">{l.romaji}</div>}
                {showTranslation && l.translation && <div className="lyric-translation">{l.translation}</div>}
              </div>
            ))
          )}
          <div className="lyric-spacer-bottom" />
        </div>
      </div>

      {/* 歌词搜索 Modal */}
      <AnimatePresence>
        {showFinder && (
          <div className="modal-overlay" onClick={() => setShowFinder(false)}>
            <motion.div className="modal-box" onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="modal-header">
                <h3>歌词搜索</h3>
                <button className="modal-close" onClick={() => setShowFinder(false)}>✕</button>
              </div>
              <div className="modal-body">
                {searching && results.length === 0 && <div className="modal-empty">正在搜索…</div>}
                {!searching && results.length === 0 && <div className="modal-empty">未找到搜索结果。</div>}
                {results.map((r, i) => (
                  <div key={i} className="modal-item" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 16px', borderRadius: 8, transition: 'background 0.2s' }}
                    onClick={() => pickResult(r)}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="modal-item-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>{r.title}</span>
                        {r.duration && currentTrack?.duration && Math.abs(currentTrack.duration - r.duration) <= 2 && (
                          <span style={{ padding: '1px 5px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>时长匹配</span>
                        )}
                        {r.duration && currentTrack?.duration && currentTrack.duration > r.duration + 2 && currentTrack.duration < r.duration + 120 && (
                          <span style={{ padding: '1px 5px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>建议偏移 +{(currentTrack.duration - r.duration).toFixed(1)}秒</span>
                        )}
                      </div>
                      <div className="modal-item-sub">
                        {r.artist} · {r.source}
                        {r.duration ? ` · ${fmt(r.duration)}` : ''}
                      </div>
                    </div>
                    <div>
                      <button className="btn btn-primary" style={{ fontSize: 10, padding: '6px 12px' }}
                        onClick={(e) => { e.stopPropagation(); pickResult(r); }}>
                        🎵 选择
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lyric Editor Modal (Studio) */}
      <AnimatePresence>
        {showEditor && (
          <div className="modal-overlay" onClick={() => setShowEditor(false)}>
            <motion.div className="modal-box" onClick={e => e.stopPropagation()}
              style={{ width: 600, height: 700 }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>编辑歌词</h3>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>请在下方粘贴 LRC 或同步歌词文本。</div>
                </div>
                <button className="modal-close" onClick={() => setShowEditor(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: 0 }}>
                <textarea
                  className="studio-editor"
                  placeholder="在此粘贴歌词…"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                />
              </div>
              <div className="modal-footer" style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => setShowEditor(false)}>取消</button>
                <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 32px' }} onClick={async () => {
                  if (playbackCurrentTrack) {
                    await saveLyrics(playbackCurrentTrack, editContent);
                    setShowEditor(false);
                  }
                }}>保存到文件</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
