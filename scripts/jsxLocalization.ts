import ts from 'typescript';
import type { Plugin } from 'vite';

/** Match React's normal JSXText line-cleaning without disturbing inline spaces. */
function normalizedJsxText(raw: string): string {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  let lastNonEmpty = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim()) lastNonEmpty = i;
  }
  let result = '';
  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i].replace(/\t/g, ' ');
    if (i !== 0) line = line.replace(/^ +/, '');
    if (i !== lines.length - 1) line = line.replace(/ +$/, '');
    if (line) {
      if (i !== lastNonEmpty) line += ' ';
      result += line;
    }
  }
  return result;
}

export function transformJsxLocalization(code: string, id: string): string | null {
  const sourcePath = id.replace(/\\/g, '/').split('?')[0];
  if (!sourcePath.endsWith('.tsx') || !sourcePath.includes('/src/')
    || sourcePath.includes('/src/test/') || sourcePath.includes('/src/i18n/')) return null;

  const ast = ts.createSourceFile(sourcePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits: { start: number; end: number; replacement: string }[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const raw = code.slice(node.pos, node.end);
      if (!raw.trim() || /&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(raw)) return;
      const cleaned = normalizedJsxText(raw);
      if (!cleaned.trim()) return;

      const parent = node.parent;
      const tag = ts.isJsxElement(parent) ? parent.openingElement.tagName.getText(ast).toLowerCase() : '';
      if (['script', 'style', 'textarea', 'option', 'title', 'svg', 'tspan'].includes(tag)) return;

      const source = cleaned.trim();
      const prefix = cleaned.slice(0, cleaned.indexOf(source));
      const suffix = cleaned.slice(prefix.length + source.length);
      const props = [`source={${JSON.stringify(source)}}`];
      if (prefix) props.push(`prefix={${JSON.stringify(prefix)}}`);
      if (suffix) props.push(`suffix={${JSON.stringify(suffix)}}`);
      edits.push({ start: node.pos, end: node.end, replacement: `<LocalizedText ${props.join(' ')} />` });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  if (edits.length === 0) return null;

  let transformed = code;
  for (const edit of edits.reverse()) {
    transformed = transformed.slice(0, edit.start) + edit.replacement + transformed.slice(edit.end);
  }
  return `import { LocalizedText } from '/src/i18n/LocalizedText';\n${transformed}`;
}

export function jsxLocalizationPlugin(): Plugin {
  return {
    name: 'aideo-static-jsx-localization',
    enforce: 'pre',
    transform(code, id) {
      const localized = transformJsxLocalization(code, id);
      return localized === null ? null : { code: localized, map: null };
    },
  };
}
