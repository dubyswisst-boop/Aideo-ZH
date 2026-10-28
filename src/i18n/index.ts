import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { zhCN } from './zh-CN';
import notificationTemplates from './notificationTemplates.json';

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
  // Optional display properties may be absent; preserve their React semantics.
  if (typeof source !== 'string') return source;
  const lookup = (dictionary: Record<string, string>) =>
    Object.prototype.hasOwnProperty.call(dictionary, source) ? dictionary[source] : undefined;
  const translated = currentLanguage === 'zh-CN'
    ? (lookup(externalPack) || lookup(zhCN) || source)
    : source;
  return translated.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}

// Only templates inventoried from application notifications are matched here.
// This is a presentation adapter; IPC payloads, deduplication and logs stay raw.
const notificationPatterns = notificationTemplates.map(source => {
  const names: string[] = [];
  const parts = source.split(/(\{value\d+\})/g);
  const patternParts = parts.map(part => {
    if (/^\{value\d+\}$/.test(part)) {
      names.push(part.slice(1, -1));
      return null;
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  const pattern = patternParts.map(part => part ?? '([\\s\\S]*?)').join('');
  const greedyRegex = names.length > 1
    ? new RegExp(`^${patternParts.map(part => part ?? '([\\s\\S]*)').join('')}$`)
    : null;
  return { source, names, regex: new RegExp(`^${pattern}$`), greedyRegex, specificity: source.replace(/\{value\d+\}/g, '').length };
}).filter(item => item.specificity >= 8).sort((a, b) => b.specificity - a.specificity);

export function translateNotification(source: string): string {
  const exact = t(source);
  if (currentLanguage !== 'zh-CN' || exact !== source || source.length > 10_000) return exact;
  for (const { source: template, names, regex, greedyRegex } of notificationPatterns) {
    const match = regex.exec(source);
    if (match) {
      // Different minimal/maximal captures mean metadata contains a template
      // delimiter. Keep the original message rather than guess its boundaries.
      const maximal = greedyRegex?.exec(source);
      if (maximal && names.some((_, index) => match[index + 1] !== maximal[index + 1])) return source;
      return t(template, Object.fromEntries(names.map((name, index) => [name, match[index + 1]])));
    }
  }
  return source;
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
    const placeholders = (value: string) => [...new Set(value.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g) || [])].sort().join('|');
    const strings = Object.entries(data).filter(([key, value]) =>
      key.length > 0 && typeof value === 'string' && value.length > 0
      && placeholders(key) === placeholders(value)
    );
    externalPack = Object.fromEntries(strings);
    notify();
    return 'loaded';
  } catch {
    return 'error';
  }
}

if (typeof document !== 'undefined') document.documentElement.lang = currentLanguage;
