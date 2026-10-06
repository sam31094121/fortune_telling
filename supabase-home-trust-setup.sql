-- 建立 home_trust_counters 表
CREATE TABLE IF NOT EXISTS home_trust_counters (
    id VARCHAR(32) PRIMARY KEY,
    agree_count BIGINT NOT NULL DEFAULT 714 CHECK (agree_count >= 714),
    disagree_count BIGINT NOT NULL DEFAULT 74 CHECK (disagree_count >= 74),
    view_count BIGINT NOT NULL DEFAULT 110397 CHECK (view_count >= 110397),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 初始化 home 記錄（如果不存在）
INSERT INTO home_trust_counters (id, agree_count, disagree_count, view_count, updated_at)
VALUES ('home', 714, 74, 110397, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 建立遞增認同計數的 RPC 函式
CREATE OR REPLACE FUNCTION increment_home_trust_agree()
RETURNS TABLE (agree_count BIGINT, disagree_count BIGINT, view_count BIGINT) AS $$
BEGIN
    UPDATE home_trust_counters
    SET agree_count = agree_count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = 'home';

    RETURN QUERY
    SELECT
        home_trust_counters.agree_count,
        home_trust_counters.disagree_count,
        home_trust_counters.view_count
    FROM home_trust_counters
    WHERE id = 'home';
END;
$$ LANGUAGE plpgsql;

-- 建立遞增不認同計數的 RPC 函式
CREATE OR REPLACE FUNCTION increment_home_trust_disagree()
RETURNS TABLE (agree_count BIGINT, disagree_count BIGINT, view_count BIGINT) AS $$
BEGIN
    UPDATE home_trust_counters
    SET disagree_count = disagree_count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = 'home';

    RETURN QUERY
    SELECT
        home_trust_counters.agree_count,
        home_trust_counters.disagree_count,
        home_trust_counters.view_count
    FROM home_trust_counters
    WHERE id = 'home';
END;
$$ LANGUAGE plpgsql;

-- 建立遞增瀏覽次數的 RPC 函式
CREATE OR REPLACE FUNCTION increment_home_trust_view()
RETURNS TABLE (agree_count BIGINT, disagree_count BIGINT, view_count BIGINT) AS $$
BEGIN
    UPDATE home_trust_counters
    SET view_count = view_count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = 'home';

    RETURN QUERY
    SELECT
        home_trust_counters.agree_count,
        home_trust_counters.disagree_count,
        home_trust_counters.view_count
    FROM home_trust_counters
    WHERE id = 'home';
END;
$$ LANGUAGE plpgsql;

-- 設置表級權限（如需要）
ALTER TABLE home_trust_counters ENABLE ROW LEVEL SECURITY;

-- 建立簡單的 RLS 策略（允許讀取，限制寫入）
CREATE POLICY "Allow read home_trust_counters"
    ON home_trust_counters FOR SELECT
    USING (true);

CREATE POLICY "Allow rpc increment"
    ON home_trust_counters FOR UPDATE
    USING (true);
