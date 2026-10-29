import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { useTranslation } from '../i18n';

export function WindowChrome() {
  const { t } = useTranslation();

  return (
    <div className="window-chrome" role="toolbar" aria-label={t('Window controls')}>
      <div className="window-chrome-drag" data-tauri-drag-region />
      <button type="button" title={t('Minimize')} aria-label={t('Minimize')} onClick={() => { void getCurrentWindow().minimize(); }}>
        <Minus size={15} />
      </button>
      <button type="button" title={t('Maximize or restore')} aria-label={t('Maximize or restore')} onClick={() => { void getCurrentWindow().toggleMaximize(); }}>
        <Square size={13} />
      </button>
      <button type="button" className="window-chrome-close" title={t('Close window')} aria-label={t('Close window')} onClick={() => { void getCurrentWindow().close(); }}>
        <X size={15} />
      </button>
    </div>
  );
}
