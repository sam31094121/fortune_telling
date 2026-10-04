const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
module.exports = function loadShenShaUi(file, language = 'zh-Hant', cache = new Map()) {
  file = path.resolve(root, file);
  if (cache.has(file)) return cache.get(file).exports;
  const target = { exports: {} };
  cache.set(file, target);
  const localRequire = createRequire(file);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { module: target, exports: target.exports, require(id) {
    if (id.endsWith('.module.css')) return {};
    if (id === './ElementRing') return () => null;
    if (id === '@/components/HomeTranslatedText') return ({ text }) => text;
    if (id === '@/components/InterfaceLanguage') return { useInterfaceLanguage: () => ({ language }) };
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(file), id);
      const source = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]
        .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (source && /\.tsx?$/.test(source)) return module.exports(source, language, cache);
      if (source) return localRequire(source);
    }
    return localRequire(id);
  } });
  return target.exports;
};
