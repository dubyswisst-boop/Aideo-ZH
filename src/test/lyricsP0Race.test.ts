import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { invoke } from '@tauri-apps/api/core';
import { createMetadataSlice } from '../store/metadataSlice';
import type { PlayerState, Track } from '../store/types';

// Use the app's real metadata slice. Only Tauri IPC is simulated.
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ emit: vi.fn().mockResolvedValue(undefined) }));
const ipc = vi.mocked(invoke);
let serial = 0;
const track = (name: string): Track => ({
  id: ++serial, path: `C:/P0-validation/${name}-${serial}.mp3`,
  title: `Song ${name}`, artist: 'Test Artist', duration: 180,
  format: 'mp3', lyric_offset: 0,
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
function makeStore(t: Track) {
  return createStore<PlayerState>()((set, get, api) => ({
    ...createMetadataSlice(set, get, api),
    currentTrack: t,
    playback: { status: 'Playing', current_track: t.path, position_secs: 0 },
    appMode: 'hybrid',
    tracks: [t],
    lyrics: [], lyricOffset: 0, lyricStatus: 'idle',
  } as PlayerState));
}
const lines = (content: string) => [{ time_secs: 0, text: content }];

beforeEach(() => { ipc.mockReset(); });

describe('Lyrics P0: actual metadata slice, controlled asynchronous IPC', () => {
  it('blocks a delayed auto search after manual lyrics have been selected', async () => {
    const a = track('delayed-auto');
    const store = makeStore(a);
    const search = deferred<any[]>();
    const disk = new Map<string, string>();
    ipc.mockImplementation(async (cmd, args: any) => {
      if (cmd === 'search_lyrics_online') return search.promise;
      if (cmd === 'save_lyrics_file') { disk.set(args.path, args.content); return null; }
      if (cmd === 'get_lyrics') return lines(disk.get(args.path) ?? '');
      return null;
    });
    const auto = store.getState().autoFetchLyricsOnline(a);
    expect(await store.getState().saveLyrics(a.path, '[00:00.00]MANUAL')).toBe(true);
    search.resolve([{ title: a.title, artist: a.artist, source: 'LRCLIB', raw_lrc: '[00:00.00]AUTO', duration: 180 }]);
    await auto;
    expect(disk.get(a.path)).toBe('[00:00.00]MANUAL');
    expect(store.getState().lyrics[0]?.text).toContain('MANUAL');
  });

  it('serializes a pending manual B behind a running manual A; B wins on disk and UI', async () => {
    const a = track('manual-order');
    const store = makeStore(a);
    const firstWrite = deferred<null>();
    const disk = new Map<string, string>();
    const writes: string[] = [];
    ipc.mockImplementation(async (cmd, args: any) => {
      if (cmd === 'save_lyrics_file') {
        writes.push(args.content);
        if (writes.length === 1) await firstWrite.promise;
        disk.set(args.path, args.content);
        return null;
      }
      if (cmd === 'get_lyrics') return lines(disk.get(args.path) ?? '');
      return null;
    });
    const old = store.getState().saveLyrics(a.path, '[00:00.00]OLD');
    await vi.waitFor(() => expect(writes).toHaveLength(1));
    const latest = store.getState().saveLyrics(a.path, '[00:00.00]NEW');
    firstWrite.resolve(null);
    expect(await old).toBe(false);
    expect(await latest).toBe(true);
    expect(writes).toEqual(['[00:00.00]OLD', '[00:00.00]NEW']);
    expect(disk.get(a.path)).toContain('NEW');
    expect(store.getState().lyrics[0]?.text).toContain('NEW');
  });

  it('does not let a stale automatic save queued before manual intent win', async () => {
    const a = track('queued-auto');
    const store = makeStore(a);
    const firstWrite = deferred<null>();
    const disk = new Map<string, string>();
    let count = 0;
    ipc.mockImplementation(async (cmd, args: any) => {
      if (cmd === 'save_lyrics_file') {
        count++;
        if (count === 1) await firstWrite.promise;
        disk.set(args.path, args.content);
        return null;
      }
      if (cmd === 'get_lyrics') return lines(disk.get(args.path) ?? '');
      return null;
    });
    const initial = store.getState().saveLyrics(a.path, 'manual-in-flight');
    await vi.waitFor(() => expect(count).toBe(1));
    // An auto task with a stale epoch cannot begin its backend write.
    const auto = store.getState().saveLyrics(a.path, 'stale-auto', 'auto', 0);
    const latest = store.getState().saveLyrics(a.path, 'new-manual');
    firstWrite.resolve(null);
    await initial;
    expect(await auto).toBe(false);
    expect(await latest).toBe(true);
    expect(count).toBe(2);
    expect(disk.get(a.path)).toBe('new-manual');
  });

  it('switching tracks during auto lookup never writes A results into B or adjusts B offset', async () => {
    const a = track('track-A');
    const b = track('track-B');
    const store = makeStore(a);
    const search = deferred<any[]>();
    const disk = new Map<string, string>();
    ipc.mockImplementation(async (cmd, args: any) => {
      if (cmd === 'search_lyrics_online') return search.promise;
      if (cmd === 'save_lyrics_file') { disk.set(args.path, args.content); return null; }
      if (cmd === 'get_lyrics') return lines(disk.get(args.path) ?? '');
      return null;
    });
    const auto = store.getState().autoFetchLyricsOnline(a);
    store.setState({ currentTrack: b, playback: { ...store.getState().playback, current_track: b.path }, lyrics: [], lyricOffset: 777 });
    search.resolve([{ title: a.title, artist: a.artist, source: 'LRCLIB', raw_lrc: 'A-ONLY', duration: 120 }]);
    await auto;
    expect(disk.has(b.path)).toBe(false);
    expect(disk.has(a.path)).toBe(false);
    expect(store.getState().lyricOffset).toBe(777);
    expect(store.getState().lyrics).toEqual([]);
  });

  it('does not clear a valid lyric on search failure after a newer manual selection', async () => {
    const a = track('search-error');
    const store = makeStore(a);
    const search = deferred<any[]>();
    const disk = new Map<string, string>();
    ipc.mockImplementation(async (cmd, args: any) => {
      if (cmd === 'search_lyrics_online') return search.promise;
      if (cmd === 'save_lyrics_file') { disk.set(args.path, args.content); return null; }
      if (cmd === 'get_lyrics') return lines(disk.get(args.path) ?? '');
      return null;
    });
    const auto = store.getState().autoFetchLyricsOnline(a);
    await store.getState().saveLyrics(a.path, 'VALID');
    search.reject(new Error('simulated network failure'));
    await auto;
    expect(store.getState().lyricStatus).toBe('found');
    expect(store.getState().lyrics[0]?.text).toBe('VALID');
  });
});
