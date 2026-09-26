const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
module.exports = function loadShenShaUi(file, language = 'zh-Hant') {
  const target = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { module: target, exports: target.exports, require(id) {
    if (id.endsWith('.module.css')) return {};
    if (id === './ElementRing') return () => null;
    if (id === '@/components/HomeTranslatedText') return ({ text }) => text;
    if (id === '@/components/InterfaceLanguage') return { useInterfaceLanguage: () => ({ language }) };
    if (id === '@/lib/shensha-display-copy') return module.exports('lib/shensha-display-copy.ts', language);
    if (id.endsWith('/ShenShaSourceEvidence')) return module.exports('components/bazi/customer/ShenShaSourceEvidence.tsx', language);
    return require(id);
  } });
  return target.exports;
};
