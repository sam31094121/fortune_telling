import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { avatarFor } from '../lib/guestbook-avatar';
import { checkGuestbookBody, guestbookTimeLabel, GUESTBOOK_MAX_LENGTH } from '../lib/guestbook-filter';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
let n = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); n += 1; };
const rejected = (text: string, msg: string) => ok(!checkGuestbookBody(text).ok, msg);

// ── 內容檢查：通過 ──
const fine = checkGuestbookBody('  用了之後覺得很準，謝謝老師！ ');
ok(fine.ok && fine.body === '用了之後覺得很準，謝謝老師！', '一般留言通過並去頭尾空白');
ok(checkGuestbookBody('x'.repeat(GUESTBOOK_MAX_LENGTH)).ok, '剛好 200 字通過');
ok(checkGuestbookBody('今年運勢 2026 年很期待').ok, '一般年份數字不誤擋');

// ── 內容檢查：擋下（公開後收不回來的東西）──
rejected('', '空白擋下');
rejected('   \n  ', '只有空白擋下');
rejected('x'.repeat(GUESTBOOK_MAX_LENGTH + 1), '超過 200 字擋下');
rejected(12345 as unknown as string, '非字串擋下');
rejected('寄到 abc@gmail.com', 'Email 擋下');
rejected('看這個 https://example.com', 'https 網址擋下');
rejected('去 www.abc.tw 看', 'www 網址擋下');
rejected('找我 shop.com', '裸網域擋下');
rejected('我的電話 0912-345-678', '手機擋下');
rejected('打 0912 345 678', '空白分隔手機擋下');
rejected('身分證 A123456789', '身分證擋下');
rejected('我生於 1974-07-02', '西元生日（連字號）擋下');
rejected('1974/7/2 出生', '西元生日（斜線）擋下');
rejected('1974年7月2日', '西元生日（中文）擋下');
rejected('民國63年7月', '民國生日擋下');
rejected('19740702', '八碼生日擋下');
const bd = checkGuestbookBody('我 1974-07-02 出生');
ok(bd.ok === false && bd.reason.includes('出生年月日'), '生日被擋時提示講生日，不講電話');

// ── 時間文字由後端算 ──
const now = Date.parse('2026-11-08T12:00:00Z');
ok(guestbookTimeLabel('2026-11-08T11:59:30Z', now) === '剛剛', '30 秒內＝剛剛');
ok(guestbookTimeLabel('2026-11-08T09:00:00Z', now) === '3 小時前', '3 小時前');
ok(guestbookTimeLabel('2026-11-06T12:00:00Z', now) === '2 天前', '2 天前');

// ── 匿名人物：同一個 IP 固定、不同 IP 不同 ──
const a1 = avatarFor('device-key-A');
const a2 = avatarFor('device-key-A');
ok(JSON.stringify(a1) === JSON.stringify(a2), '同一個 authorKey 永遠同一個人物');
ok(/^匿名的.+ #\d{4}$/.test(a1.label), '名稱格式：匿名的龍 #4821');
ok(/^#[0-9a-f]{6}$/i.test(a1.color) && a1.symbol.length > 0, '有顏色與生肖符號');
const labels = new Set(Array.from({ length: 300 }, (_, i) => avatarFor('k' + i).label));
ok(labels.size > 290, '300 個不同裝置幾乎不會撞名（實測 ' + labels.size + ' 種）');
ok(!JSON.stringify(a1).includes('device-key-A'), '人物結果不含原始金鑰');

// ── 後端守門：公開資料不得含身分欄位 ──
const store = read('lib/guestbook-store.ts');
const publicSelects = store.match(/\.select\('[^']*'\)/g) ?? [];
ok(publicSelects.length > 0, '有 select 查詢');
ok(!/device_hash/.test(store), '不再有裝置雜湊欄位（身分只看 IP）');
ok(/\.eq\('status', 'visible'\)/.test(store), '公開列表只取 visible');
ok(!/author_key:\s*r\.author_key|authorKey:\s*r\./.test(store), '回傳物件不得帶出 author_key');
ok(/avatarFor\(r\.author_key\)/.test(store), '頭像由後端用 author_key 算出');
ok(/createHmac/.test(store), '用 HMAC，不存原始 IP');
ok(!/insert\(\{[^}]*\bip\b/.test(store), '寫入資料庫的欄位不含原始 IP');
ok(/\.eq\('author_key', authorKey\)/.test(store), '限速用同一個 IP 金鑰');

const route = read('app/api/guestbook/route.ts');
ok(/sameOrigin/.test(route), '公開 POST 要檢查同源');
ok(/payload\.website/.test(route), '有蜜罐');
ok(/429/.test(route), '有限速回應');
ok(!/cookies\.set|cookies\.get|Set-Cookie/i.test(route), '公開留言 API 不發也不讀任何 Cookie');
ok(/authorKeyFor\(request\)/.test(route), '身分由後端依 IP 算出');
ok(!/listAllMessagesForAdmin/.test(route), '公開 API 不得呼叫管理員列表');

const admin = read('app/api/admin/guestbook/route.ts');
ok(/isAuthorizedDevice/.test(admin) && /validAdminSession/.test(admin) && /sameOrigin/.test(admin), '管理員 API 三層認證');
ok(/'remove'/.test(admin) && /'restore'/.test(admin), '可下架也可復原');
ok(!/\.delete\(/.test(store), '下架不刪資料');

// ── 資料表：RLS 開、前端不能直接碰 ──
const sql = read('supabase/migrations/20261108120000_create_guestbook_messages.sql');
ok(/enable row level security/.test(sql), '資料表開 RLS');
ok(/revoke all on public\.guestbook_messages from anon, authenticated/.test(sql), '收回 anon／authenticated 權限');
ok(!/create policy/i.test(sql), '不建任何前端 policy');
ok(/author_key text not null/.test(sql), '資料表有 author_key');
ok(!/\b(name|email|ip|device_hash)\b\s+text/i.test(sql), '資料表沒有姓名、Email、IP 欄位');

// ── 前端只顯示：不運算、不寫死留言 ──
const ui = read('components/HomeGuestbook.tsx');
ok(!/checkGuestbookBody|guestbookTimeLabel/.test(ui), '前端不得自己驗證或算時間');
ok(/目前還沒有留言/.test(ui), '空狀態有明確中文');
ok(/messages\.map/.test(ui) && !/\[\s*\{\s*id:/.test(ui), '留言只來自後端結果，不寫死假留言');
ok(!/Math\.random/.test(ui), '前端不得亂數');
ok(!/avatarFor|createHash|ZODIAC/.test(ui), '前端不得自己算頭像');
ok(/m\.avatar\.label/.test(ui) && /m\.avatar\.symbol/.test(ui), '頭像與名稱只照印後端結果');
ok(/m\.mine/.test(ui), '「你」的標示來自後端 mine 欄位');
ok(!/document\.cookie|localStorage|sessionStorage/.test(ui), '前端不存任何身分資料');

console.log(`guestbook: ${n} checks passed`);
