import { useTranslation } from './index';

/** Pure text fragment generated for static JSX text by the build transform. */
export function LocalizedText({ source, prefix = '', suffix = '' }: {
  source: string;
  prefix?: string;
  suffix?: string;
}) {
  const { t } = useTranslation();
  return <>{prefix}{t(source)}{suffix}</>;
}
