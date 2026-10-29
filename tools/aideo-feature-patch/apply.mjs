import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'package.json',
  'src/App.tsx',
  'src/App.css',
  'src/components/Sidebar.tsx',
  'src/components/LyricsPanel.tsx',
  'src/components/FullscreenView.tsx',
  'src/components/SettingsView.tsx',
  'src/utils/playerShortcuts.ts',
  'src/store/uiSlice.ts',
  'src-tauri/src/lib.rs',
  'src-tauri/src/lastfm.rs',
  'src-tauri/src/lastfm_api.rs',
  'src-tauri/src/hotkeys.rs',
  'src-tauri/tauri.zh.conf.json',
  'locales/zh-CN.json',
  '.github/workflows/build-zh.yml',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`缺少必要文件：${file}`);
    console.error('请在 Aideo-ZH 仓库根目录运行本脚本，不要在 ZIP 解压目录外运行。');
    process.exit(2);
  }
}

const pending = new Map();
const changed = new Set();
const lineEndings = new Map();
function read(file) {
  if (!pending.has(file)) {
    const raw = fs.readFileSync(path.join(root, file), 'utf8');
    lineEndings.set(file, raw.includes('\r\n') ? '\r\n' : '\n');
    pending.set(file, raw.replace(/\r\n/g, '\n'));
  }
  return pending.get(file);
}
function write(file, content) {
  pending.set(file, content);
  changed.add(file);
}
function replaceOnce(file, oldText, newText, label, marker = newText) {
  const source = read(file);
  if (source.includes(marker)) return;
  const count = source.split(oldText).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: 预期找到 1 个锚点，实际 ${count} 个。未写入任何文件。`);
  }
  write(file, source.replace(oldText, newText));
}
function replaceExactCount(file, oldText, newText, expected, label) {
  const source = read(file);
  const oldCount = source.split(oldText).length - 1;
  const newCount = source.split(newText).length - 1;
  if (oldCount === 0 && newCount === expected) return;
  if (oldCount !== expected || newCount !== 0) {
    throw new Error(`${label}: expected ${expected} unpatched sites, found ${oldCount} old and ${newCount} new. No files changed.`);
  }
  write(file, source.split(oldText).join(newText));
}
function replaceInRegion(file, startMarker, endMarker, oldText, newText, label, marker = newText) {
  const source = read(file);
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${label}: 找不到起始锚点 ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`${label}: 找不到结束锚点 ${endMarker}`);
  const region = source.slice(start, end);
  if (region.includes(marker)) return;
  const count = region.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: 目标区域内预期 1 处，实际 ${count} 处。未写入任何文件。`);
  write(file, source.slice(0, start) + region.replace(oldText, newText) + source.slice(end));
}
function appendOnce(file, marker, addition) {
  const source = read(file);
  if (source.includes(marker)) return;
  write(file, `${source.replace(/\s*$/, '')}\n\n${addition.trim()}\n`);
}
function insertAfterOnce(file, anchor, addition, marker, label) {
  const source = read(file);
  if (source.includes(marker)) return;
  const count = source.split(anchor).length - 1;
  if (count !== 1) throw new Error(`${label}: 锚点数量应为 1，实际 ${count}。未写入任何文件。`);
  write(file, source.replace(anchor, `${anchor}${addition}`));
}

try {
  // 1. Add a borderless, theme-aware window chrome for the Chinese build.
  replaceOnce(
    'src/App.tsx',
    "import './App.css';",
    "import './App.css';\nimport { WindowChrome } from './components/WindowChrome';",
    '导入无边框窗口控件',
    "import { WindowChrome } from './components/WindowChrome';"
  );
  insertAfterOnce(
    'src/App.tsx',
    "  const [systemIsLight, setSystemIsLight] = useState(window.matchMedia('(prefers-color-scheme: light)').matches);",
    "\n  const [sidebarAutoVisible, setSidebarAutoVisible] = useState(false);",
    'const [sidebarAutoVisible, setSidebarAutoVisible]',
    '侧边栏自动隐藏状态'
  );
  insertAfterOnce(
    'src/App.tsx',
    "  const [sidebarAutoVisible, setSidebarAutoVisible] = useState(false);",
    "\n\n  useEffect(() => {\n    const blockLockedTheaterInput = (event: KeyboardEvent) => {\n      if (localStorage.getItem('aideo-theater-locked') !== 'true') return;\n      event.preventDefault();\n      event.stopImmediatePropagation();\n    };\n    window.addEventListener('keydown', blockLockedTheaterInput, true);\n    return () => window.removeEventListener('keydown', blockLockedTheaterInput, true);\n  }, []);",
    'blockLockedTheaterInput',
    '锁定时拦截应用内键盘输入'
  );
  replaceOnce(
    'src/App.tsx',
    '      <div className={`${lowSpecMode ? "app low-spec" : "app"} ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${isLightTheme ? "light-theme" : ""} playerbar-${playerBarDesign} ${playerBarTransparent ? "playerbar-transparent" : ""}`}>\n        <Sidebar />\n      <main className="app-main">',
    '      <div className={`${lowSpecMode ? "app low-spec" : "app"} ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${isLightTheme ? "light-theme" : ""} playerbar-${playerBarDesign} ${playerBarTransparent ? "playerbar-transparent" : ""} sidebar-auto-hidden ${sidebarAutoVisible ? "sidebar-auto-visible" : ""} ${view === "fullscreen" ? "theater-active" : ""}`}>\n        <div className="sidebar-hover-zone" onMouseEnter={() => setSidebarAutoVisible(true)} aria-hidden="true" />\n        <Sidebar onMouseLeave={() => setSidebarAutoVisible(false)} />\n        {view !== "fullscreen" && <WindowChrome />}\n      <main className="app-main">',
    '主布局：自动隐藏侧边栏及窗口控件',
    'sidebar-auto-hidden'
  );

  replaceOnce(
    'src/components/Sidebar.tsx',
    'export function Sidebar() {',
    'export function Sidebar({ onMouseLeave }: { onMouseLeave?: () => void } = {}) {',
    '侧边栏增加鼠标离开回调',
    'export function Sidebar({ onMouseLeave }'
  );
  replaceOnce(
    'src/components/Sidebar.tsx',
    '<aside className="app-sidebar">',
    '<aside className="app-sidebar" onMouseLeave={onMouseLeave}>',
    '侧边栏离开时自动收起',
    '<aside className="app-sidebar" onMouseLeave={onMouseLeave}>'
  );

  // 2. Correct lyric search metadata and reduce false-positive, non-downloadable results.
  replaceOnce(
    'src/components/LyricsPanel.tsx',
    "      const r: SearchResult[] = await invoke('search_lyrics_online', { query });",
    "      const r: SearchResult[] = await invoke('search_lyrics_online', {\n        query,\n        title: cleanTitle || undefined,\n        artist: cleanArtist || undefined,\n        album: currentTrack?.album || undefined,\n        duration: currentTrack?.duration || undefined,\n      });",
    '歌词搜索传入独立曲名/歌手/专辑/时长',
    "title: cleanTitle || undefined"
  );

  replaceInRegion(
    'src-tauri/src/lib.rs',
    'async fn search_lyrics_online(',
    '\n#[tauri::command]',
    'std::time::Duration::from_millis(3500)',
    'std::time::Duration::from_secs(12)',
    '歌词搜索超时从 3.5 秒增加到 12 秒',
    'std::time::Duration::from_secs(12)'
  );

  const biniOld = `                            results.push(SearchResult {
                                id: format!("binilyrics-{}", item["id"].as_str().unwrap_or("item")),
                                title: if track_name.is_empty() { bini_song_fallback.clone() } else { track_name },
                                artist: artist_name,
                                source: "BiniLyrics".to_string(),
                                synced: true,
                                content_id: Some(lyrics_url),
                                raw_lrc: raw_ttml,
                                duration: dur,
                            });
                            if timing == "word" {
                                break;
                            }`;
  const biniNew = `                            // Only offer a result when the actual lyric payload was fetched.
                            // Otherwise the UI may show a match that cannot be downloaded later.
                            if let Some(raw_ttml) = raw_ttml {
                                results.push(SearchResult {
                                    id: format!("binilyrics-{}", item["id"].as_str().unwrap_or("item")),
                                    title: if track_name.is_empty() { bini_song_fallback.clone() } else { track_name },
                                    artist: artist_name,
                                    source: "BiniLyrics".to_string(),
                                    synced: true,
                                    content_id: Some(lyrics_url),
                                    raw_lrc: Some(raw_ttml),
                                    duration: dur,
                                });
                                if timing == "word" {
                                    break;
                                }
                            }`;
  replaceOnce('src-tauri/src/lib.rs', biniOld, biniNew, '移除无法下载的 BiniLyrics 假匹配', 'Only offer a result when the actual lyric payload was fetched');

  // 3. Last.fm uses the shared HTTP client, status validation and explicit credential errors.
  replaceOnce(
    'src-tauri/src/lastfm.rs',
    'const API_URL: &str = "https://ws.audioscrobbler.com/2.0/";',
    `const API_URL: &str = "https://ws.audioscrobbler.com/2.0/";

fn validate_api_credentials(require_secret: bool) -> Result<(), String> {
    let key = get_api_key();
    if key.trim().is_empty() || key == "YOUR_LASTFM_API_KEY" {
        return Err("Last.fm API 密钥未配置。请配置 LASTFM_API_KEY 后重新构建。".to_string());
    }
    if require_secret {
        let secret = get_api_secret();
        if secret.trim().is_empty() || secret == "YOUR_LASTFM_API_SECRET" {
            return Err("Last.fm API Secret 未配置。请配置 LASTFM_API_SECRET 后重新构建。".to_string());
        }
    }
    Ok(())
}`,
    'Last.fm 凭据缺失时给出明确提示',
    'fn validate_api_credentials'
  );
  // All six request functions create their own client. Validate every occurrence
  // before changing any: one-site replaceOnce is incorrect for this file.
  {
    const f = 'src-tauri/src/lastfm.rs';
    const oldCall = 'let client = Client::new();';
    const newCall = 'let client = crate::get_http_client();';
    const s = read(f);
    const oldCount = s.split(oldCall).length - 1;
    const newCount = s.split(newCall).length - 1;
    if (!((oldCount === 6 && newCount === 0) || (oldCount === 0 && newCount === 6))) {
      throw new Error(`Last.fm 网络客户端：预期原始 6 处或完整已修改 6 处，实际原始 ${oldCount} 处、已修改 ${newCount} 处。未写入源码。`);
    }
    if (oldCount === 6) write(f, s.replaceAll(oldCall, newCall));
  }
  // The source has multiple independent functions with Client::new(); replace the remaining ones safely.
  {
    const f = 'src-tauri/src/lastfm.rs';
    let s = read(f);
    if (s.includes('use reqwest::Client;\n') && !s.includes('let client = Client::new();')) {
      s = s.replace('use reqwest::Client;\n', '');
    }
    write(f, s);
  }
  {
    const f = 'src-tauri/src/lastfm.rs';
    let s = read(f);
    const old = 'send().await.map_err(|e| e.to_string())?;';
    const replacement = 'send().await.map_err(|e| format!("Last.fm 网络请求失败：{e}"))?.error_for_status().map_err(|e| format!("Last.fm HTTP 错误：{e}"))?;';
    if (s.includes(old)) write(f, s.replaceAll(old, replacement));
  }
  const lastfmStarts = [
    ['pub async fn get_auth_token() -> Result<String, String> {', '    validate_api_credentials(true)?;'],
    ['pub async fn get_session(token: &str) -> Result<String, String> {', '    validate_api_credentials(true)?;'],
    ['pub async fn scrobble(artist: &str, track: &str, timestamp: i64, session_key: &str) -> Result<(), String> {', '    validate_api_credentials(true)?;'],
    ['pub async fn get_user_info(session_key: &str) -> Result<Value, String> {', '    validate_api_credentials(false)?;'],
    ['pub async fn get_recent_tracks(username: &str) -> Result<Value, String> {', '    validate_api_credentials(false)?;'],
    ['pub async fn get_top_artists(username: &str) -> Result<Value, String> {', '    validate_api_credentials(false)?;'],
  ];
  for (const [anchor, line] of lastfmStarts) {
    const marker = `// Aideo-ZH feature patch credential guard: ${anchor}`;
    insertAfterOnce('src-tauri/src/lastfm.rs', `${anchor}\n`, `    ${marker}\n    ${line}\n`, marker, `Last.fm 凭据检查：${anchor}`);
  }

  // Last.fm discovery endpoints also need a configured API key.
  replaceOnce(
    'src-tauri/src/lastfm_api.rs',
    'const API_URL: &str = "https://ws.audioscrobbler.com/2.0/";',
    `const API_URL: &str = "https://ws.audioscrobbler.com/2.0/";

fn validate_api_key() -> Result<(), String> {
    let key = get_api_key();
    if key.trim().is_empty() || key == "YOUR_LASTFM_API_KEY" {
        return Err("Last.fm API 密钥未配置。请配置 LASTFM_API_KEY 后重新构建。".to_string());
    }
    Ok(())
}`,
    'Last.fm 资料接口缺失密钥时给出明确提示',
    'fn validate_api_key()'
  );
  {
    const f = 'src-tauri/src/lastfm_api.rs';
    let s = read(f);
    const old = 'let api_key = get_api_key();';
    const replacement = 'validate_api_key()?;\n    let api_key = get_api_key();';
    if (s.includes(old)) write(f, s.replaceAll(old, replacement));
  }

  // 4. Global theater-lock hotkey; it is global so it can unlock even while mouse input passes through.
  replaceOnce(
    'src-tauri/src/hotkeys.rs',
    '    ToggleDesktopLyricsLock,\n}',
    '    ToggleDesktopLyricsLock,\n    ToggleTheaterLock,\n}',
    '新增影院锁定快捷键动作',
    '    ToggleTheaterLock,'
  );
  replaceOnce(
    'src-tauri/src/hotkeys.rs',
    '            "toggleDesktopLyricsLock" => Some(HotkeyAction::ToggleDesktopLyricsLock),',
    '            "toggleDesktopLyricsLock" => Some(HotkeyAction::ToggleDesktopLyricsLock),\n            "toggleTheaterLock" => Some(HotkeyAction::ToggleTheaterLock),',
    '注册影院锁定快捷键 ID',
    '"toggleTheaterLock" => Some(HotkeyAction::ToggleTheaterLock)'
  );
  replaceOnce(
    'src-tauri/src/hotkeys.rs',
    '            HotkeyAction::ToggleDesktopLyricsLock => "toggle-desktop-lyrics-lock",',
    '            HotkeyAction::ToggleDesktopLyricsLock => "toggle-desktop-lyrics-lock",\n            HotkeyAction::ToggleTheaterLock => "toggle-theater-lock",',
    '注册影院锁定事件名称',
    'HotkeyAction::ToggleTheaterLock => "toggle-theater-lock"'
  );
  replaceOnce(
    'src/store/uiSlice.ts',
    "    prev: 'Ctrl+Alt+Left'\n  };",
    "    prev: 'Ctrl+Alt+Left',\n    toggleTheaterLock: 'Ctrl+Alt+F12'\n  };",
    '添加默认影院锁定快捷键',
    "toggleTheaterLock: 'Ctrl+Alt+F12'"
  );

  // 5. Settings row + conflict warning before persisting a global shortcut.
  replaceOnce(
    'src/components/SettingsView.tsx',
    "            { id: 'prev', label: 'Previous Track' }\n          ].map(action => {",
    "            { id: 'prev', label: 'Previous Track' },\n            { id: 'toggleTheaterLock', label: 'Lock / Unlock Theater to Desktop' }\n          ].map(action => {",
    '设置页加入影院锁定快捷键',
    "id: 'toggleTheaterLock', label: 'Lock / Unlock Theater to Desktop'"
  );
  replaceOnce(
    'src/components/SettingsView.tsx',
    '      setGlobalHotkey(recordingGlobalAction, binding);\n      setRecordingGlobalAction(null);',
    `      const normalizeBinding = (value: string) => value.replace(/\\s+/g, '').toLowerCase();
      const conflict = Object.entries(globalHotkeys).find(([id, value]) =>
        id !== recordingGlobalAction && Boolean(value) && normalizeBinding(value as string) === normalizeBinding(binding)
      );
      if (conflict) {
        window.dispatchEvent(new CustomEvent('ui-toast', {
          detail: { message: \`快捷键冲突：该组合已分配给 \${conflict[0]}，请更换组合键。\`, type: 'warning' }
        }));
        return;
      }
      setGlobalHotkey(recordingGlobalAction, binding);
      setRecordingGlobalAction(null);`,
    '全局快捷键冲突检测',
    'const normalizeBinding = (value: string)'
  );
  replaceOnce(
    'src/components/SettingsView.tsx',
    '  }, [recordingGlobalAction, setGlobalHotkey]);',
    '  }, [recordingGlobalAction, setGlobalHotkey, globalHotkeys]);',
    '全局快捷键冲突检测依赖',
    '  }, [recordingGlobalAction, setGlobalHotkey, globalHotkeys]);'
  );
  replaceOnce(
    'src/components/SettingsView.tsx',
    "detail: { message: 'Global hotkey cleared', type: 'info' }",
    "detail: { message: '已清除全局快捷键', type: 'info' }",
    '汉化全局快捷键清除提示',
    "detail: { message: '已清除全局快捷键', type: 'info' }"
  );
  replaceOnce(
    'src/components/SettingsView.tsx',
    "detail: { message: 'Global hotkeys need a modifier (Ctrl/Alt/Shift)', type: 'warning' }",
    "detail: { message: '全局快捷键必须包含修饰键（Ctrl/Alt/Shift）', type: 'warning' }",
    '汉化全局快捷键修饰键提示',
    "detail: { message: '全局快捷键必须包含修饰键（Ctrl/Alt/Shift）', type: 'warning' }"
  );
  replaceOnce(
    'src/components/SettingsView.tsx',
    "detail: { message: `Global hotkey bound to ${binding}`, type: 'success' }",
    "detail: { message: `全局快捷键已设置为 ${binding}`, type: 'success' }",
    '汉化全局快捷键绑定提示',
    "detail: { message: `全局快捷键已设置为 ${binding}`, type: 'success' }"
  );
  replaceOnce(
    'src/store/uiSlice.ts',
    "detail: { message: `Global hotkey failed: ${e}`, type: 'error' }",
    "detail: { message: `全局快捷键注册失败：${e}`, type: 'error' }",
    '汉化全局快捷键注册失败提示',
    "detail: { message: `全局快捷键注册失败：${e}`, type: 'error' }"
  );
  replaceOnce(
    'src/components/FullscreenView.tsx',
    "detail: { message: `Fullscreen layout: ${THEATER_NAMES[next]}`, type: 'info' }",
    "detail: { message: `影院布局：${THEATER_NAMES[next]}`, type: 'info' }",
    '汉化影院布局切换提示',
    "detail: { message: `影院布局：${THEATER_NAMES[next]}`, type: 'info' }"
  );
  replaceExactCount(
    'src/components/FullscreenView.tsx',
    "detail: { message: `Theater HUD: ${THEATER_HUD_NAMES[nextHud]}`, type: 'info' }",
    "detail: { message: `影院显示层：${THEATER_HUD_NAMES[nextHud]}`, type: 'info' }",
    2,
    '汉化影院显示层切换提示'
  );

  // 6. Lock command: bottom of z-order + mouse click-through + release focus to desktop only if Aideo was focused.
  const lockCommandOld = `#[tauri::command]
fn enter_borderless_fullscreen(window: Window, fullscreen: bool) -> Result<(), String> {
    window.set_fullscreen(fullscreen).map_err(|e| e.to_string())
}`;
  const lockCommandNew = `${lockCommandOld}

#[tauri::command]
fn set_theater_lock(window: Window, locked: bool) -> Result<(), String> {
    let was_focused = window.is_focused().unwrap_or(false);
    if locked {
        window.set_always_on_bottom(true).map_err(|e| e.to_string())?;
        if let Err(error) = window.set_ignore_cursor_events(true) {
            let _ = window.set_always_on_bottom(false);
            return Err(error.to_string());
        }
        #[cfg(target_os = "windows")]
        if was_focused {
            // Move focus to the Windows desktop only when Aideo owned focus.
            // Do not steal focus from another application when the global hotkey
            // is pressed while that application is active.
            unsafe {
                use windows::Win32::UI::WindowsAndMessaging::{GetShellWindow, SetForegroundWindow};
                let shell = GetShellWindow();
                if shell.0 != 0 {
                    let _ = SetForegroundWindow(shell);
                }
            }
        }
    } else {
        window.set_ignore_cursor_events(false).map_err(|e| e.to_string())?;
        window.set_always_on_bottom(false).map_err(|e| e.to_string())?;
    }
    Ok(())
}`;
  replaceOnce('src-tauri/src/lib.rs', lockCommandOld, lockCommandNew, '增加影院底层锁定命令', 'fn set_theater_lock(window: Window, locked: bool)');
  replaceOnce(
    'src-tauri/src/lib.rs',
    '            enter_borderless_fullscreen,\n',
    '            enter_borderless_fullscreen,\n            set_theater_lock,\n',
    '注册影院锁定命令',
    '            set_theater_lock,'
  );
  replaceInRegion(
    'src-tauri/src/lib.rs',
    'async fn set_mini_player_mode(',
    '\n#[tauri::command]',
    'window.set_decorations(true).map_err(|e| e.to_string())?;',
    '// Aideo-ZH: keep the main window borderless when leaving mini-player mode.\n        window.set_decorations(false).map_err(|e| e.to_string())?;',
    '主窗口恢复时继续使用无边框窗口控件',
    '// Aideo-ZH: keep the main window borderless when leaving mini-player mode.'
  );

  const lockedMediaListeners = [
    ["const uPlay = await listen('media-play'", "const uPause = await listen('media-pause'", '播放快捷键锁定保护'],
    ["const uPause = await listen('media-pause'", "const uToggle = await listen('media-toggle'", '暂停快捷键锁定保护'],
    ["const uToggle = await listen('media-toggle'", "const uNext = await listen('media-next'", '播放/暂停快捷键锁定保护'],
    ["const uNext = await listen('media-next'", "const uPrev = await listen('media-prev'", '下一首快捷键锁定保护'],
    ["const uPrev = await listen('media-prev'", "const uSeek = await listen('media-seek'", '上一首快捷键锁定保护'],
    ["const uSeek = await listen('media-seek'", "const uVolume = await listen('media-volume'", '跳转快捷键锁定保护'],
    ["const uVolume = await listen('media-volume'", "const uShuffle = await listen('media-shuffle'", '音量快捷键锁定保护'],
    ["const uShuffle = await listen('media-shuffle'", "const uRepeat = await listen('media-repeat'", '随机播放快捷键锁定保护'],
    ["const uRepeat = await listen('media-repeat'", "const uDesktopToggle = await listen('toggle-desktop-lyrics'", '循环快捷键锁定保护'],
    ["const uDesktopToggle = await listen('toggle-desktop-lyrics'", "const uDesktopLock = await listen('toggle-desktop-lyrics-lock'", '桌面歌词快捷键锁定保护'],
    ["const uDesktopLock = await listen('toggle-desktop-lyrics-lock'", "const uDesktopClosed = await listen('desktop-lyrics-closed'", '桌面歌词锁定快捷键保护'],
  ];
  for (const [start, end, label] of lockedMediaListeners) {
    replaceInRegion(
      'src/App.tsx', start, end,
      'if (isCancelled) return;',
      "if (isCancelled || localStorage.getItem('aideo-theater-locked') === 'true') return;",
      label,
      "localStorage.getItem('aideo-theater-locked') === 'true'"
    );
  }

  replaceOnce(
    'src/App.tsx',
    '      cleanups.push(uDesktopLock);\n\n      const uDesktopClosed = await listen(\'desktop-lyrics-closed\', () => {',
    `      cleanups.push(uDesktopLock);

      const uTheaterLock = await listen('toggle-theater-lock', async () => {
        if (isCancelled) return;
        if (useStore.getState().view !== 'fullscreen') {
          window.dispatchEvent(new CustomEvent('ui-toast', {
            detail: { message: '请先进入 Now Playing 的影院全屏界面。', type: 'warning' }
          }));
          return;
        }
        const locked = localStorage.getItem('aideo-theater-locked') === 'true';
        const next = !locked;
        try {
          await invoke('set_theater_lock', { locked: next });
          localStorage.setItem('aideo-theater-locked', String(next));
          window.dispatchEvent(new CustomEvent('ui-toast', {
            detail: { message: next ? '影院已锁定到底层。按相同快捷键即可解锁。' : '影院锁定已解除。', type: 'info' }
          }));
        } catch (error) {
          window.dispatchEvent(new CustomEvent('ui-toast', {
            detail: { message: \`影院锁定失败：\${String(error)}\`, type: 'error' }
          }));
        }
      });
      if (isCancelled) { uTheaterLock(); return; }
      cleanups.push(uTheaterLock);

      const uDesktopClosed = await listen('desktop-lyrics-closed', () => {`,
    '注册影院锁定事件监听',
    "const uTheaterLock = await listen('toggle-theater-lock'"
  );
  replaceOnce(
    'src/App.tsx',
    '    // Restore user-configured global hotkeys (works when app is minimized)\n    useStore.getState().initGlobalHotkeys();',
    '    // A previous process cannot leave the new window in click-through mode.\n    localStorage.setItem(\'aideo-theater-locked\', \'false\');\n    invoke(\'set_theater_lock\', { locked: false }).catch(() => {});\n\n    // Restore user-configured global hotkeys (works when app is minimized)\n    useStore.getState().initGlobalHotkeys();',
    '启动时清除过期影院锁定状态',
    "localStorage.setItem('aideo-theater-locked', 'false');"
  );

  replaceOnce(
    'src/components/FullscreenView.tsx',
    '    const handleKeyDown = (e: KeyboardEvent) => {\n      if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.altKey || e.metaKey) return;',
    '    const handleKeyDown = (e: KeyboardEvent) => {\n      if (localStorage.getItem(\'aideo-theater-locked\') === \'true\') return;\n      if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.altKey || e.metaKey) return;',
    '锁定时禁用影院内部键盘操作',
    "if (localStorage.getItem('aideo-theater-locked') === 'true') return;"
  );
  replaceOnce(
    'src/components/FullscreenView.tsx',
    "    return () => {\n      invoke('enter_borderless_fullscreen', { fullscreen: false }).catch(() => {",
    "    return () => {\n      localStorage.setItem('aideo-theater-locked', 'false');\n      invoke('set_theater_lock', { locked: false }).catch(() => {});\n      invoke('enter_borderless_fullscreen', { fullscreen: false }).catch(() => {",
    '退出影院时解除鼠标穿透和底层锁定',
    "invoke('set_theater_lock', { locked: false }).catch(() => {});"
  );
  replaceOnce(
    'src/utils/playerShortcuts.ts',
    'export function handlePlayerShortcut(e: KeyboardEvent) {\n  if (e.defaultPrevented || e.isComposing) return;',
    "export function handlePlayerShortcut(e: KeyboardEvent) {\n  if (localStorage.getItem('aideo-theater-locked') === 'true') return;\n  if (e.defaultPrevented || e.isComposing) return;",
    '锁定时禁用播放器普通快捷键',
    "if (localStorage.getItem('aideo-theater-locked') === 'true') return;"
  );

  // 7. Add transparent window chrome to the Chinese Tauri config only.
  const confPath = path.join(root, 'src-tauri/tauri.zh.conf.json');
  let conf = JSON.parse(read('src-tauri/tauri.zh.conf.json'));
  const oldConfText = read('src-tauri/tauri.zh.conf.json');
  conf.app = {
    ...(conf.app || {}),
    windows: [{
      label: 'main',
      title: 'Aideo 中文版',
      width: 1000,
      height: 700,
      decorations: false,
      dragDropEnabled: false
    }]
  };
  const newConfText = JSON.stringify(conf, null, 2) + '\n';
  if (oldConfText !== newConfText) write('src-tauri/tauri.zh.conf.json', newConfText);

  // 8. Pass Last.fm build credentials through Actions without touching signing steps.
  const workflowFile = '.github/workflows/build-zh.yml';
  let workflow = read(workflowFile);
  if (!workflow.includes('npm run check:locales')) {
    const lines = workflow.split('\n');
    const validationIndex = lines.findIndex(line => /npx tsc --noEmit|npm run lint|npm test|npm run test|npm-cli\.js (?:run lint|test)/i.test(line));
    if (validationIndex < 0) throw new Error('无法安全定位前端测试/类型检查步骤以加入汉化审计；请先检查 build-zh.yml。');
    const indent = (lines[validationIndex].match(/^\s*/) || ['          '])[0];
    lines.splice(validationIndex, 0, `${indent}npm run check:locales`);
    workflow = lines.join('\n');
    write(workflowFile, workflow);
  }
  if (!workflow.includes('LASTFM_API_KEY: ${{ secrets.LASTFM_API_KEY }}')) {
    const lines = workflow.split('\n');
    const output = [];
    let step = [];
    let matchedBuildSteps = 0;
    const flush = () => {
      if (!step.length) return;
      const text = step.join('\n');
      if (!/tauri\s+--\s*build|cargo build/i.test(text)) {
        output.push(...step);
        step = [];
        return;
      }
      matchedBuildSteps++;
      if (!step.some(line => line.includes('LASTFM_API_KEY:'))) {
        const envIndex = step.findIndex(line => /^\s+env:\s*$/.test(line));
        const keyLine = '          LASTFM_API_KEY: ${{ secrets.LASTFM_API_KEY }}';
        const secretLine = '          LASTFM_API_SECRET: ${{ secrets.LASTFM_API_SECRET }}';
        if (envIndex >= 0) {
          const indent = (step[envIndex].match(/^\s*/) || ['        '])[0].length + 2;
          const extras = [];
          if (!step.some(line => line.includes('LASTFM_API_KEY:'))) extras.push(' '.repeat(indent) + 'LASTFM_API_KEY: ${{ secrets.LASTFM_API_KEY }}');
          if (!step.some(line => line.includes('LASTFM_API_SECRET:'))) extras.push(' '.repeat(indent) + 'LASTFM_API_SECRET: ${{ secrets.LASTFM_API_SECRET }}');
          step.splice(envIndex + 1, 0, ...extras);
        } else {
          const runIndex = step.findIndex(line => /^\s+run:/.test(line));
          if (runIndex >= 0) {
            step.splice(runIndex, 0, '        env:', keyLine, secretLine);
          }
        }
      }
      output.push(...step);
      step = [];
    };
    for (const line of lines) {
      if (/^      - name:/.test(line)) flush();
      step.push(line);
    }
    flush();
    if (matchedBuildSteps === 0) {
      throw new Error('工作流中没有找到 npm run tauri -- build 或 cargo build 步骤。为避免误改签名流程，已停止。');
    }
    write(workflowFile, output.join('\n'));
  }

  // Extend the existing locale gate to native tray/remote-presentation strings.
  const packageFile = 'package.json';
  const packageJson = JSON.parse(read(packageFile));
  const localeScript = 'node --experimental-strip-types scripts/audit-localization.mjs && node scripts/audit-native-localization.mjs';
  if (packageJson.scripts?.['check:locales'] !== localeScript) {
    packageJson.scripts = { ...(packageJson.scripts || {}), 'check:locales': localeScript };
    write(packageFile, JSON.stringify(packageJson, null, 2) + '\n');
  }

  // 9. Add required Chinese labels/errors to the existing dictionary.
  const localeFile = 'locales/zh-CN.json';
  const dictionary = JSON.parse(read(localeFile));
  const translations = {
    'Window controls': '窗口控制',
    'Minimize': '最小化',
    'Maximize': '最大化',
    'Restore': '还原',
    'Maximize or restore': '最大化/还原',
    'Close window': '关闭窗口',
    'Lock / Unlock Theater to Desktop': '锁定/解锁影院全屏',
    'Global shortcut': '全局快捷键',
    'Last.fm API key is not configured. Configure LASTFM_API_KEY in the build environment.': 'Last.fm API 密钥未配置。请配置 LASTFM_API_KEY 后重新构建。',
    'Last.fm API secret is not configured. Configure LASTFM_API_SECRET in the build environment.': 'Last.fm API Secret 未配置。请配置 LASTFM_API_SECRET 后重新构建。',
    'Theater locked to desktop bottom. Press the same shortcut to unlock.': '影院已锁定到底层。按相同快捷键即可解锁。',
    'Theater lock released.': '影院锁定已解除。',
    'Please enter Theater Fullscreen from Now Playing first.': '请先进入 Now Playing 的影院全屏界面。',
    'Theater lock failed: {error}': '影院锁定失败：{error}'
  };
  let localeChanged = false;
  for (const [key, value] of Object.entries(translations)) {
    if (dictionary[key] !== value) { dictionary[key] = value; localeChanged = true; }
  }
  if (localeChanged) write(localeFile, JSON.stringify(dictionary, null, 2) + '\n');

  // 10. Append the window chrome / sidebar behavior styles.
  const css = `/* Aideo 中文版功能补丁：透明标题栏与左侧热区自动隐藏侧边栏 */
.window-chrome {
  position: absolute;
  inset: 0 0 auto 0;
  height: 34px;
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  background: transparent;
  border: 0;
  pointer-events: none;
  z-index: 1200;
}
.window-chrome-drag {
  position: absolute;
  inset: 0 138px 0 0;
  background: transparent;
  pointer-events: auto;
}
.window-chrome button {
  pointer-events: auto;
  position: relative;
  z-index: 1;
  width: 46px;
  height: 34px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.window-chrome button:hover { background: var(--glass-h); color: var(--text); }
.window-chrome button.window-chrome-close:hover { background: #c42b1c; color: #fff; }

.app.sidebar-auto-hidden {
  grid-template-columns: 0 minmax(0, 1fr) !important;
}
.app.sidebar-auto-hidden .app-sidebar {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--sidebar-w);
  max-width: 85vw;
  height: 100vh;
  transform: translateX(-100%);
  opacity: 0;
  pointer-events: none;
  z-index: 1100;
  box-shadow: 12px 0 36px rgba(0, 0, 0, 0.28);
  transition: transform 180ms ease, opacity 180ms ease;
}
.app.sidebar-auto-hidden.sidebar-auto-visible .app-sidebar {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}
.sidebar-hover-zone {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  z-index: 1101;
  background: transparent;
}
.app.sidebar-auto-hidden.theater-active {
  grid-template-columns: minmax(0, 1fr) !important;
}
.app.sidebar-auto-hidden.theater-active .app-sidebar { display: none; }
.app.sidebar-auto-hidden.theater-active .app-main { grid-column: 1; }
.app.theater-active .window-chrome { display: none; }
`;
  appendOnce('src/App.css', 'Aideo 中文版功能补丁：透明标题栏与左侧热区自动隐藏侧边栏', css);

  // New component, written as a complete source file.
  const chromePath = 'src/components/WindowChrome.tsx';
  const chromeSource = `import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { useTranslation } from '../i18n';

export function WindowChrome() {
  const { t } = useTranslation();
  const appWindow = getCurrentWindow();

  return (
    <div className="window-chrome" role="toolbar" aria-label={t('Window controls')}>
      <div className="window-chrome-drag" data-tauri-drag-region />
      <button type="button" title={t('Minimize')} aria-label={t('Minimize')} onClick={() => { void appWindow.minimize(); }}>
        <Minus size={15} />
      </button>
      <button type="button" title={t('Maximize or restore')} aria-label={t('Maximize or restore')} onClick={() => { void appWindow.toggleMaximize(); }}>
        <Square size={13} />
      </button>
      <button type="button" className="window-chrome-close" title={t('Close window')} aria-label={t('Close window')} onClick={() => { void appWindow.close(); }}>
        <X size={15} />
      </button>
    </div>
  );
}
`;
  if (!fs.existsSync(path.join(root, chromePath))) {
    write(chromePath, chromeSource);
  } else if (!read(chromePath).includes('export function WindowChrome')) {
    throw new Error(`${chromePath} 已存在但内容不是本补丁版本，请先人工审阅。`);
  } else {
    changed.add(chromePath);
  }

  const testPath = 'src/test/featurePatchRegression.test.ts';
  const testSource = `import { describe, expect, it } from 'vitest';
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
`;
  if (!fs.existsSync(path.join(root, testPath))) write(testPath, testSource);
  else if (!read(testPath).includes('Aideo 中文版功能补丁回归')) {
    throw new Error(`${testPath} 已存在但内容不是本补丁版本，请先人工审阅。`);
  } else {
    changed.add(testPath);
  }
  changed.add('scripts/audit-native-localization.mjs');
  pending.set('scripts/audit-native-localization.mjs', fs.readFileSync(path.join(root, 'scripts/audit-native-localization.mjs'), 'utf8'));

  // Patch the native mini-player restore path so it doesn't re-enable the OS title bar.
  // The window config is borderless only for the Chinese build; signing settings are untouched.

  // Dry run is a full preflight; all transformations are held in memory until this point.
  console.log(`预检通过。将修改/新增 ${changed.size} 个文件：`);
  for (const file of [...changed].sort()) console.log(`  ${file}`);
  if (process.argv.includes('--check')) {
    console.log('仅检查模式：未写入文件。');
    process.exit(0);
  }
  for (const file of changed) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const content = pending.get(file);
    const eol = lineEndings.get(file) || '\n';
    fs.writeFileSync(target, eol === '\n' ? content : content.replace(/\n/g, eol), 'utf8');
  }
  console.log('\n补丁已应用。未执行 Git 提交、推送或发布。');
  console.log('请审阅 git diff，再运行 npm run check:locales、npx tsc --noEmit、npm test、npm run build。');
} catch (error) {
  console.error('\n补丁预检失败；脚本没有写入任何文件。');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
