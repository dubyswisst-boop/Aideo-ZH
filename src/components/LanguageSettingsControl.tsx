import { useState } from 'react';
import { useTranslation, type PackLoadResult } from '../i18n';

/** One control shared by the built-in UI and any future external translation pack. */
export function LanguageSettingsControl() {
  const { t, language, setLanguage, reloadLanguagePack } = useTranslation();
  const [reloadStatus, setReloadStatus] = useState<PackLoadResult | null>(null);
  const [reloading, setReloading] = useState(false);

  const reload = async () => {
    setReloading(true);
    try { setReloadStatus(await reloadLanguagePack()); }
    finally { setReloading(false); }
  };

  const statusMessage = reloadStatus === 'loaded' ? 'Language pack reloaded'
    : reloadStatus === 'missing' ? 'Language file missing; using built-in translations'
      : reloadStatus === 'error' ? 'Language pack could not be loaded' : null;

  return (
    <div className="settings-ctrl-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label htmlFor="aideo-ui-language" style={{ fontSize: 12, fontWeight: 600 }}>
        {t('Language')}
      </label>
      <select
        id="aideo-ui-language"
        className="settings-search-input"
        style={{ width: '100%', maxWidth: 300, padding: '8px 12px' }}
        value={language}
        onChange={(event) => setLanguage(event.target.value === 'en-US' ? 'en-US' : 'zh-CN')}
      >
        <option value="zh-CN">简体中文</option>
        <option value="en-US">English</option>
      </select>
      <div>
        <button className="btn btn-secondary" onClick={() => void reload()} disabled={reloading}>
          {t('Reload Language Pack')}
        </button>
      </div>
      {statusMessage && <p role="status" style={{ fontSize: 12 }}>{t(statusMessage)}</p>}
    </div>
  );
}
