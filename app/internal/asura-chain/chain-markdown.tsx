// 循環鏈文件的極簡 Markdown 轉 React（只用於內部唯讀檢視頁；不輸出原始 HTML）
import type { ReactNode } from 'react';
import styles from './asura-chain.module.css';

export interface UnlockedCounts { a: number; b: number; c: number; d: number; original: number }

// 15:33 使用者核准鎖定：徽章改為「已鎖定」（仍依文件自身標記判定位置）；15:46 加 7.1d 十相以史類推 7 句
const Badge = () => <span className={styles.badge} data-locked-badge="">已鎖定</span>;

function inline(src: string, keyBase: string): ReactNode[] {
  const s = src.replace(/<a id="[^"]*"><\/a>/g, '');
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+|[^)\s]+)\))/g;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const key = `${keyBase}-${k++}`;
    if (m[1]) out.push(<strong key={key}>{inline(m[2], key)}</strong>);
    else if (m[3]) out.push(<code key={key}>{m[4]}</code>);
    else if (m[5]) {
      const href = m[7];
      out.push(/^https?:\/\//.test(href)
        ? <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow">{inline(m[6], key)}</a>
        : <span key={key}>{inline(m[6], key)}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const isSep = (l: string) => /^\|(\s*:?-+:?\s*\|)+\s*$/.test(l);

export function renderChainDoc(text: string): { nodes: ReactNode[]; counts: UnlockedCounts } {
  const lines = text.replace(/\r/g, '').split('\n');
  const nodes: ReactNode[] = [];
  const counts: UnlockedCounts = { a: 0, b: 0, c: 0, d: 0, original: 0 };
  const originalIds = new Set<string>(); let inLockedSection = false;
  let section = '';          // 目前的 ### 小節（7.1a / 7.1b / 7.1c / 7.1d）
  let pendingImagery = false; // 7.1c：上一段是「(6) 阿修羅意境」
  let i = 0; let n = 0;
  const key = () => `n${n++}`;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*```/.test(l)) {
      const buf: string[] = []; i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
      i++; nodes.push(<pre key={key()} className={styles.pre}>{buf.join('\n')}</pre>); continue;
    }
    const h = /^(#{1,6}) (.*)$/.exec(l);
    if (h) {
      const level = h[1].length; const body = h[2];
      if (level === 2) inLockedSection = body.startsWith('鎖定話術');
      if (level <= 3) section = level === 3 ? (/^7\.1([abcd]) /.exec(body)?.[1] ?? '') : '';
      const Tag = (`h${Math.min(level, 6)}`) as 'h1';
      nodes.push(<Tag key={key()} id={`s-${n}`} data-section={level === 3 ? body.split(' ')[0] : undefined}>{inline(body, `h${n}`)}</Tag>);
      pendingImagery = false; i++; continue;
    }
    if (/^---+\s*$/.test(l)) { nodes.push(<hr key={key()} />); i++; continue; }
    if (l.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const head = cells(rows[0]); const body = rows.slice(isSep(rows[1] ?? '') ? 2 : 1).map(cells);
      const badgeCol = section === 'a' ? head.findIndex((c) => c.includes('鎖')) : -1;
      if (inLockedSection) for (const r of body) if (/^L\d$/.test(r[0] ?? '')) originalIds.add(r[0]);
      const tk = key();
      nodes.push(
        <div key={tk} className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>{head.map((c, j) => <th key={j}>{inline(c, `${tk}h${j}`)}</th>)}</tr></thead>
            <tbody>{body.map((r, ri) => {
              const derived = (section === 'b' || section === 'd') && r.some((c) => /^【源詞：[^】]+】$/.test(c));
              if (derived) { if (section === 'd') counts.d++; else counts.b++; }
              return (
                <tr key={ri} data-locked-row={derived ? (section === 'd' ? 'history' : 'derived') : undefined}>
                  {r.map((c, j) => {
                    const img = j === badgeCol && c !== '' && c !== '—';
                    if (img) counts.a++;
                    return <td key={j}>{(derived && j === 1) || img ? <Badge /> : null}{inline(c, `${tk}r${ri}c${j}`)}</td>;
                  })}
                </tr>
              );
            })}</tbody>
          </table>
        </div>,
      );
      pendingImagery = false; continue;
    }
    if (l.startsWith('>')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      const img = section === 'c' && pendingImagery;
      if (img) counts.c++;
      const bk = key();
      nodes.push(<blockquote key={bk} className={styles.quote} data-locked-imagery={img ? '' : undefined}>{img ? <Badge /> : null}{buf.map((b, j) => <p key={j}>{inline(b, `${bk}-${j}`)}</p>)}</blockquote>);
      pendingImagery = false; continue;
    }
    if (/^\s*(- |\d+\. )/.test(l)) {
      const ordered = /^\s*\d+\. /.test(l); const items: string[] = [];
      while (i < lines.length && /^\s*(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^\s*(- |\d+\. )/, ''));
      const lk = key(); const List = ordered ? 'ol' : 'ul';
      nodes.push(<List key={lk} className={styles.list}>{items.map((t, j) => <li key={j}>{inline(t, `${lk}-${j}`)}</li>)}</List>);
      pendingImagery = false; continue;
    }
    if (l.trim() === '') { i++; continue; }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6} |\||>|\s*```|---+\s*$|\s*(- |\d+\. ))/.test(lines[i])) buf.push(lines[i++]);
    const text0 = buf.join('\n');
    pendingImagery = section === 'c' && text0.includes('(6) 阿修羅意境');
    const pk = key();
    nodes.push(<p key={pk}>{buf.map((b, j) => <span key={j}>{j > 0 ? <br /> : null}{inline(b, `${pk}-${j}`)}</span>)}</p>);
  }
  counts.original = originalIds.size;
  return { nodes, counts };
}
