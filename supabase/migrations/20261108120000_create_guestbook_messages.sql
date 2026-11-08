-- 首頁不記名公開留言板。
-- 沒有姓名、Email 欄位。
-- author_key：後端用伺服器祕密對「來訪 IP」做 HMAC 的結果。同一個 IP 永遠同一個匿名人物，
-- 也用來限速；資料庫不存原始 IP，也無法從 author_key 反推 IP。頭像由後端用它算出來，不存資料庫。
-- 不審核：寫入即公開（status = 'visible'）；管理員可改成 'removed' 下架（可復原，不刪資料）。
create table if not exists public.guestbook_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 200),
  status text not null default 'visible' check (status in ('visible', 'removed')),
  author_key text not null,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);

create index if not exists guestbook_messages_visible_idx
  on public.guestbook_messages (created_at desc)
  where status = 'visible';

create index if not exists guestbook_messages_author_idx
  on public.guestbook_messages (author_key, created_at desc);

-- 開啟 RLS 且不建任何 policy：前端（anon／authenticated）完全不能直接讀寫，
-- 一律走後端 API（service role）。
alter table public.guestbook_messages enable row level security;
revoke all on public.guestbook_messages from anon, authenticated;
