import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { zhCN } from './zh-CN';

export type Language = 'zh-CN' | 'en-US';
export type PackLoadResult = 'loaded' | 'missing' | 'error';
type Values = Record<string, string | number>;

const STORAGE_KEY = 'aideo-language';

function initialLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en-US' ? 'en-US' : 'zh-CN';
  } catch {
    return 'zh-CN';
  }
}

let currentLanguage: Language = initialLanguage();
let externalPack: Record<string, string> = {};
let revision = 0;
const listeners = new Set<() => void>();

function notify() {
  revision += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function snapshot() { return revision; }

export function getLanguage(): Language { return currentLanguage; }

export function setLanguage(language: Language) {
  if (language !== 'zh-CN' && language !== 'en-US') return;
  currentLanguage = language;
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  try { localStorage.setItem(STORAGE_KEY, language); } catch { /* Storage may be disabled. */ }
  notify();
}

export function t(source: string, values: Values = {}): string {
  const lookup = (dictionary: Record<string, string>) =>
    Object.prototype.hasOwnProperty.call(dictionary, source) ? dictionary[source] : undefined;
  const translated = currentLanguage === 'zh-CN'
    ? (lookup(externalPack) || lookup(zhCN) || source)
    : source;
  return translated.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}

export function useTranslation() {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  return { t, language: currentLanguage, setLanguage, reloadLanguagePack };
}

/** Reloads declarative translations only; no code, HTML or arbitrary paths. */
export async function reloadLanguagePack(): Promise<PackLoadResult> {
  try {
    const data: unknown = await invoke('read_language_pack');
    if (data === null) {
      externalPack = {};
      notify();
      return 'missing';
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return 'error';
    const strings = Object.entries(data).filter(([key, value]) =>
      key.length > 0 && typeof value === 'string' && value.length > 0
    );
    externalPack = Object.fromEntries(strings);
    notify();
    return 'loaded';
  } catch {
    return 'error';
  }
}

if (typeof document !== 'undefined') document.documentElement.lang = currentLanguage;
