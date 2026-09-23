const fs = require('fs');
let page = fs.readFileSync('app/page.tsx', 'utf8');
const bakPage = 'app/page.tsx.bak-trust34';
if (!fs.existsSync(bakPage)) fs.writeFileSync(bakPage, page);

if (!page.includes("import HomeTrustReceipt from '@/components/HomeTrustReceipt'")) {
  const anchor = "import TodayDirectionQuest from '@/components/TodayDirectionQuest';";
  if (!page.includes(anchor)) throw new Error('TodayDirectionQuest import missing');
  page = page.replace(
    anchor,
    anchor + "\nimport HomeTrustReceipt from '@/components/HomeTrustReceipt';"
  );
}

const idxShellId = page.indexOf('id="home-top-empty-shell-card"');
const idxQuest = page.indexOf('<TodayDirectionQuest />');
const idxPulse = page.indexOf('href="#home-trust-strip"');
console.log({ idxShellId, idxQuest, idxPulse });
if (idxShellId < 0 || idxQuest < 0 || idxPulse < 0) throw new Error('missing anchors');

let start = page.lastIndexOf('<section', idxShellId);
const commentStart = page.lastIndexOf('{/*', idxShellId);
if (commentStart >= 0 && commentStart < start && start - commentStart < 500) start = commentStart;

const aEnd = page.indexOf('</a>', idxPulse);
if (aEnd < 0) throw new Error('pulse </a> missing');
let end = aEnd + 4;
const maybeDiv = page.indexOf('</div>', end);
if (maybeDiv >= 0 && maybeDiv - end < 20) end = maybeDiv + 6;

const old = page.slice(start, end);
console.log('OLD_HEAD', JSON.stringify(old.slice(0, 120)));
console.log('OLD_TAIL', JSON.stringify(old.slice(-120)));

// Detect Taiji component name used in the removed block
const taijiMatch = old.match(/<(Taiji[A-Za-z0-9_]+|TaiChi[A-Za-z0-9_]+)\s*\/>/);
const taijiName = taijiMatch ? taijiMatch[1] : 'TaijiTopShell3D';
console.log('taiji component', taijiName);

const replacementQuestTrust = `        {/* 第三段：手機首屏鎖死 今日一關 → 信任收據 → 主線；太極改為輔助（下移） */}
        <div className="home-primary-quest-wrap mb-3 sm:mb-5">
          <TodayDirectionQuest />
        </div>

        <HomeTrustReceipt />
        </div>`;

page = page.slice(0, start) + replacementQuestTrust + page.slice(end);

if (!page.includes('data-home-slot="taiji-auxiliary"')) {
  const s = page.indexOf('<HomeStickyJourneyPanel');
  if (s < 0) throw new Error('sticky missing');
  const close = page.indexOf('/>', s);
  if (close < 0) throw new Error('sticky self-close missing');
  const taijiAux = `

        <section
          id="home-top-empty-shell-card"
          className="home-taiji-aux home-top-brand-stage mx-auto mb-3 grid w-[min(92vw,440px)] place-items-center sm:mb-5"
          aria-label="輔助太極視覺（非首屏主線）"
          data-home-slot="taiji-auxiliary"
        >
          <${taijiName} />
        </section>`;
  page = page.slice(0, close + 2) + taijiAux + page.slice(close + 2);
}

fs.writeFileSync('app/page.tsx', page);
const q = page.indexOf('<TodayDirectionQuest />');
const receipt = page.indexOf('<HomeTrustReceipt');
const sticky = page.indexOf('<HomeStickyJourneyPanel');
const taiji = page.indexOf('data-home-slot="taiji-auxiliary"');
console.log('ORDER_CHECK', { q, receipt, sticky, taiji, ok: q < receipt && receipt < sticky && sticky < taiji });
