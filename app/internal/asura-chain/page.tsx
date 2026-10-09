// 內部唯讀檢視頁：阿修羅技能文件—循環鏈（只在開發環境；不從任何地方連入）
// 使用者 15:25：新增檔案；15:33 徽章改「已鎖定」並顯示鎖定數；15:46 加 7.1d 十相以史類推（總計 78），不改既有元件、卡片、路由、API、導覽；不 commit、不 push。
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { renderChainDoc } from './chain-markdown';
import styles from './asura-chain.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '循環鏈（內部唯讀）',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const DOC_PATH = path.join(process.cwd(), 'docs', '技能戰鬥檔案', '鬼魅阿修羅', '阿修羅技能文件-循環鏈.md');

export default function AsuraChainViewerPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  let text: string;
  let bytes = 0;
  let mtime = '';
  try {
    text = readFileSync(DOC_PATH, 'utf8');
    const st = statSync(DOC_PATH);
    bytes = st.size;
    mtime = `${st.mtime.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })}（UTC+8）`;
  } catch {
    notFound();
  }
  const { nodes, counts } = renderChainDoc(text);
  return (
    <main className={styles.page} data-asura-chain-viewer="">
      <header className={styles.meta}>
        <p className={styles.readonly}>內部唯讀檢視（開發環境限定，不對外）</p>
        <p>來源：docs/技能戰鬥檔案/鬼魅阿修羅/阿修羅技能文件-循環鏈.md（{bytes.toLocaleString('en-US')} bytes；修改時間 {mtime}）</p>
        <p data-locked-summary="">
          <span className={styles.badge}>已鎖定</span> locked by user approval 15:33：7.1a 意象 {counts.a} 句；7.1b 類推句 {counts.b} 句；7.1c 意境 {counts.c} 句；共 {counts.a + counts.b + counts.c} 句。15:46：7.1d 十相以史類推 {counts.d} 句。另有〈鎖定話術〉原鎖定 {counts.original} 句（14:56）。鎖定總計 <strong data-locked-total="">{counts.a + counts.b + counts.c + counts.d + counts.original}</strong> 句。只鎖措辭；登錄檔與 VERIFIED 狀態不動。
        </p>
      </header>
      <article className={styles.doc}>{nodes}</article>
    </main>
  );
}
