import { useTranslation } from './index';
import { createElement, type ElementType, type ReactNode } from 'react';
import type { t } from './index';

/** A reactive boundary for string-valued JSX expressions. */
export function LocalizedMessage({ translate }: { translate: (translate: typeof t) => ReactNode }) {
  const { t } = useTranslation();
  return <>{translate(t)}</>;
}

/** Retains the DOM element, ref and callbacks; only display props change. */
export function LocalizedElement({ element, translate, ...props }: {
  element: ElementType;
  translate: (translate: typeof t) => Record<string, unknown>;
  [key: string]: unknown;
}) {
  const { t } = useTranslation();
  return createElement(element, { ...props, ...translate(t) });
}

/** Pure text fragment generated for static JSX text by the build transform. */
export function LocalizedText({ source, prefix = '', suffix = '' }: {
  source: string;
  prefix?: string;
  suffix?: string;
}) {
  const { t } = useTranslation();
  return <>{prefix}{t(source)}{suffix}</>;
}
