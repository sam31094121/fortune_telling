/**
 * 全站顯示層翻譯（只在瀏覽器、只改畫面文字，不改 React 狀態或任何計算輸入）。
 *
 * - 掃描 root 底下的文字節點與 aria-label／title／placeholder／alt，交給 translate() 換成目標語言；
 *   translate() 回傳 undefined 代表「沒有現成譯文」，該段保留繁體中文原文（不做機器翻譯、不捏造）。
 * - MutationObserver 追蹤之後 React 寫進來的新文字；我們自己寫入的值會被記下來，不會重複處理。
 * - stop() 會把仍是我們寫入值的節點還原成原文（切回繁體中文時用）。
 *
 * 不處理：<script>/<style>/<code>/<pre> 等、輸入框內文、translate="no"、data-i18n-skip、語言選擇卡（data-language-picker）、可編輯區，
 * 以及 lang 標成非中文（例如已經是 en/ja/ko 的元件）的區塊。
 */
export type Translate = (text: string) => string | undefined;

const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'KBD', 'SAMP', 'TEMPLATE', 'IFRAME', 'CANVAS']);
/** 使用者輸入區：內文（=使用者輸入值）不動，但 placeholder／aria-label 仍翻譯。 */
const INPUT_TAGS = new Set(['TEXTAREA', 'INPUT']);
const HAS_CJK = /[\u3400-\u9fff\uf900-\ufaff]/;

type Written = { original: string; written: string };

export function startDomTranslation(root: HTMLElement, translate: Translate, targetLang: string): () => void {
  const texts = new Map<Text, Written>();
  const attrs = new Map<Element, Map<string, Written>>();
  const langMarked = new Map<Element, string>();
  let writes = 0;

  const blocked = (el: Element | null, forAttribute = false): boolean => {
    if (el && !forAttribute && INPUT_TAGS.has(el.tagName)) return true;
    for (let e = el; e; e = e.parentElement) {
      if (SKIP_TAGS.has(e.tagName) || e.getAttribute('translate') === 'no' || e.hasAttribute('data-i18n-skip') || e.hasAttribute('data-language-picker')) return true;
      if (e.getAttribute('contenteditable') === 'true' || e.getAttribute('contenteditable') === '') return true;
      const lang = langMarked.has(e) ? null : e.getAttribute('lang');
      if (lang) return !lang.toLowerCase().startsWith('zh'); // 最近一層標了非中文 lang：元件已自行翻譯
      if (e === root) break;
    }
    return false;
  };

  const split = (value: string) => {
    const lead = value.match(/^\s*/)![0];
    const trail = value.slice(lead.length).match(/\s*$/)![0];
    return { lead, core: value.slice(lead.length, value.length - trail.length), trail };
  };

  const prune = () => {
    if (++writes % 1000) return;
    for (const node of texts.keys()) if (!node.isConnected) texts.delete(node);
    for (const el of attrs.keys()) if (!el.isConnected) attrs.delete(el);
  };

  const markLang = (el: Element | null) => {
    if (!el || el === root || el.hasAttribute('lang') || el.childNodes.length !== 1) return;
    el.setAttribute('lang', targetLang); langMarked.set(el, targetLang);
  };

  const doText = (node: Text) => {
    const value = node.nodeValue ?? '';
    const record = texts.get(node);
    if (record && value === record.written) return;
    if (record) texts.delete(node);
    if (!HAS_CJK.test(value) || blocked(node.parentElement)) return;
    const { lead, core, trail } = split(value);
    const out = translate(core);
    if (out === undefined || out === core) return;
    const written = lead + out + trail;
    texts.set(node, { original: value, written });
    node.nodeValue = written;
    markLang(node.parentElement);
    prune();
  };

  const doAttr = (el: Element, name: string) => {
    const value = el.getAttribute(name);
    const map = attrs.get(el);
    const record = map?.get(name);
    if (value === null) { map?.delete(name); return; }
    if (record && value === record.written) return;
    if (record) map!.delete(name);
    if (!HAS_CJK.test(value) || blocked(el, true)) return;
    const { lead, core, trail } = split(value);
    const out = translate(core);
    if (out === undefined || out === core) return;
    const written = lead + out + trail;
    (map ?? attrs.set(el, new Map()).get(el)!).set(name, { original: value, written });
    el.setAttribute(name, written);
    prune();
  };

  const scan = (start: Node) => {
    if (start.nodeType === 3) { doText(start as Text); return; }
    if (start.nodeType !== 1) return;
    const first = start as Element;
    if (blocked(first, true)) return;
    const doc = root.ownerDocument;
    const walker = doc.createTreeWalker(first, 1 | 4, {
      acceptNode: n => n.nodeType === 1 && (SKIP_TAGS.has((n as Element).tagName) || (n as Element).getAttribute('translate') === 'no' || (n as Element).hasAttribute('data-i18n-skip') || (n as Element).hasAttribute('data-language-picker')) ? 2 /* REJECT */ : 1,
    });
    for (let n: Node | null = walker.currentNode; n; n = walker.nextNode()) {
      if (n.nodeType === 3) doText(n as Text);
      else for (const name of ATTRS) if ((n as Element).hasAttribute(name)) doAttr(n as Element, name);
    }
  };

  scan(root);
  const view = root.ownerDocument.defaultView!;
  const observer = new view.MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'characterData') doText(r.target as Text);
      else if (r.type === 'attributes' && r.attributeName) doAttr(r.target as Element, r.attributeName);
      else r.addedNodes.forEach(scan);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });

  return () => {
    observer.disconnect();
    for (const [node, { original, written }] of texts) if (node.nodeValue === written) node.nodeValue = original;
    for (const [el, map] of attrs) for (const [name, { original, written }] of map) if (el.getAttribute(name) === written) el.setAttribute(name, original);
    for (const [el, lang] of langMarked) if (el.getAttribute('lang') === lang) el.removeAttribute('lang');
    texts.clear(); attrs.clear(); langMarked.clear();
  };
}
