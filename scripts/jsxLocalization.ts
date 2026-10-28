import ts from 'typescript';
import type { Plugin } from 'vite';

const UI_ATTRIBUTES = new Set(['title', 'placeholder', 'aria-label', 'aria-description', 'aria-valuetext', 'alt']);
const UI_FIELDS = new Set(['label', 'description', 'desc', 'subtitle', 'badge', 'sub']);
const RAW_TAGS = new Set(['script', 'style', 'textarea', 'code', 'pre']);

/** Let TypeScript decode JSX entities and normalize multiline whitespace. */
function decodeText(raw: string): string {
  const js = ts.transpileModule(`const x = <span>${raw}</span>`, {
    compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: '__jsx', target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const ast = ts.createSourceFile('text.js', js, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let text = '';
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === '__jsx') {
      text = node.arguments.slice(2).filter(ts.isStringLiteral).map(x => x.text).join('');
    } else ts.forEachChild(node, visit);
  }
  visit(ast);
  return text;
}

export function analyzeJsxLocalization(code: string, id: string) {
  const sourcePath = id.replace(/\\/g, '/').split('?')[0];
  const messages = new Set<string>();
  if (!sourcePath.endsWith('.tsx') || !sourcePath.includes('/src/')
    || sourcePath.includes('/src/test/') || sourcePath.includes('/src/i18n/')) {
    return { code: null, messages: [] as string[] };
  }
  const ast = ts.createSourceFile(sourcePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits: { start: number; end: number; replacement: string }[] = [];
  const used = new Set<string>();
  const textCall = (text: string) => {
    if (text.trim()) messages.add(text);
    return `__aideoT(${JSON.stringify(text)})`;
  };
  const edit = (node: ts.Node, replacement: string) => edits.push({ start: node.getStart(ast), end: node.end, replacement });

  // Only display expressions are translated. Conditions, IDs, values, handlers,
  // user names and metadata references remain original source expressions.
  function expression(node: ts.Expression): string | null {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return textCall(node.text);
    if (ts.isParenthesizedExpression(node)) {
      const inner = expression(node.expression);
      return inner === null ? null : `(${inner})`;
    }
    if (ts.isConditionalExpression(node)) {
      const yes = expression(node.whenTrue), no = expression(node.whenFalse);
      if (yes === null && no === null) return null;
      return `${node.condition.getText(ast)} ? ${yes ?? node.whenTrue.getText(ast)} : ${no ?? node.whenFalse.getText(ast)}`;
    }
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(node.operatorToken.kind)) {
      const right = expression(node.right);
      return right === null ? null : `${node.left.getText(ast)} ${node.operatorToken.getText(ast)} (${right})`;
    }
    if (ts.isTemplateExpression(node)) {
      let key = node.head.text;
      const values = node.templateSpans.map((span, index) => {
        key += `{value${index}}${span.literal.text}`;
        return `value${index}: (${expression(span.expression) ?? span.expression.getText(ast)})`;
      });
      messages.add(key);
      return `__aideoT(${JSON.stringify(key)}, {${values.join(', ')}})`;
    }
    if (ts.isPropertyAccessExpression(node) && UI_FIELDS.has(node.name.text)) return `__aideoT(${node.getText(ast)})`;
    return null;
  }

  function containsJsx(node: ts.Node): boolean {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return true;
    return ts.forEachChild(node, containsJsx) || false;
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 't' && node.arguments[0]
      && ts.isStringLiteralLike(node.arguments[0])) messages.add(node.arguments[0].text);
    if (ts.isPropertyAssignment(node) && UI_FIELDS.has(node.name.getText(ast)) && ts.isStringLiteralLike(node.initializer)) messages.add(node.initializer.text);
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = opening.tagName.getText(ast);
      if (RAW_TAGS.has(tag)) return;
      const translated: string[] = [];
      let preserveOptionChildren = false;
      for (const [index, attr] of opening.attributes.properties.entries()) {
        if (!ts.isJsxAttribute(attr) || !UI_ATTRIBUTES.has(attr.name.getText(ast)) || !attr.initializer) continue;
        // Preserve a later spread's precedence. Such defaults should use explicit t().
        if (opening.attributes.properties.slice(index + 1).some(ts.isJsxSpreadAttribute)) continue;
        const init = attr.initializer;
        const value = ts.isStringLiteral(init) ? textCall(init.text)
          : ts.isJsxExpression(init) && init.expression ? expression(init.expression) : null;
        if (value !== null) {
          translated.push(`${JSON.stringify(attr.name.getText(ast))}: (${value})`);
          edit(attr, '');
        }
      }
      // Native options and SVG text require plain strings, not React fragments.
      if (ts.isJsxElement(node) && ['option', 'title', 'text', 'tspan'].includes(tag) && node.children.length === 1) {
        const child = node.children[0];
        const hasOptionValue = opening.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'value');
        // Dynamic implicit option labels also define the submitted value. Keep them
        // intact; explicit value props are required for automatic localization.
        preserveOptionChildren = tag === 'option' && !hasOptionValue && ts.isJsxExpression(child)
          && !!child.expression && !ts.isStringLiteralLike(child.expression);
        const value = preserveOptionChildren ? null : ts.isJsxText(child) ? textCall(decodeText(child.getFullText(ast)))
          : ts.isJsxExpression(child) && child.expression ? expression(child.expression) : null;
        if (value !== null) {
          translated.push(`children: (${value})`);
          if (tag === 'option' && !hasOptionValue) {
            // An option without value uses its original English text as its ID.
            const originalValue = ts.isJsxText(child) ? JSON.stringify(decodeText(child.getFullText(ast)))
              : ts.isJsxExpression(child) && child.expression ? child.expression.getText(ast) : '""';
            translated.push(`value: (${originalValue})`);
          }
          edits.push({ start: child.pos, end: child.end, replacement: '' });
        }
      }
      if (translated.length) {
        used.add('LocalizedElement');
        edit(opening.tagName, 'LocalizedElement');
        edits.push({ start: opening.tagName.end, end: opening.tagName.end,
          replacement: ` element={${/^[a-z][\w-]*$/.test(tag) ? JSON.stringify(tag) : tag}} translate={(__aideoT) => ({${translated.join(', ')}})}` });
        if (ts.isJsxElement(node)) edit(node.closingElement.tagName, 'LocalizedElement');
      }
      if (ts.isJsxElement(node) && !preserveOptionChildren) {
        for (const child of node.children) {
          if (!edits.some(e => e.start <= child.pos && e.end >= child.end)) visit(child);
        }
      }
      return;
    }
    if (ts.isJsxText(node)) {
      const cleaned = decodeText(node.getFullText(ast));
      const source = cleaned.trim();
      if (!source) return;
      messages.add(source);
      const prefix = cleaned.slice(0, cleaned.indexOf(source));
      const suffix = cleaned.slice(prefix.length + source.length);
      used.add('LocalizedText');
      const props = [`source={${JSON.stringify(source)}}`];
      if (prefix) props.push(`prefix={${JSON.stringify(prefix)}}`);
      if (suffix) props.push(`suffix={${JSON.stringify(suffix)}}`);
      edits.push({ start: node.pos, end: node.end, replacement: `<LocalizedText ${props.join(' ')} />` });
      return;
    }
    if (ts.isJsxExpression(node) && node.expression && !containsJsx(node.expression)) {
      const value = expression(node.expression);
      if (value !== null) {
        used.add('LocalizedMessage');
        edit(node, `<LocalizedMessage translate={(__aideoT) => (${value})} />`);
        return;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!edits.length) return { code: null, messages: [...messages] };
  let transformed = code;
  for (const item of edits.sort((a, b) => b.start - a.start || b.end - a.end)) {
    transformed = transformed.slice(0, item.start) + item.replacement + transformed.slice(item.end);
  }
  return { code: `import { ${[...used].join(', ')} } from '/src/i18n/LocalizedText';\n${transformed}`, messages: [...messages] };
}

export function transformJsxLocalization(code: string, id: string): string | null {
  return analyzeJsxLocalization(code, id).code;
}

export function jsxLocalizationPlugin(): Plugin {
  return {
    name: 'aideo-jsx-localization', enforce: 'pre',
    transform(code, id) {
      const localized = transformJsxLocalization(code, id);
      return localized === null ? null : { code: localized, map: null };
    },
  };
}
