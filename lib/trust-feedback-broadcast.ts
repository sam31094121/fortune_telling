/**
 * 全球實時同步廣播模塊
 * ============================================================================
 *
 * 當用戶投票時，透過此模塊廣播給所有連接的客戶端
 * 確保全設備實時同步
 */

/**
 * 廣播投票事件給所有連接的客戶端
 */
export async function broadcastTrustFeedbackVote(data: {
  type: 'like' | 'disagree';
  agreeCount?: number;
  disagreeCount?: number;
}) {
  try {
    // 向 WebSocket/長輪詢端點發送廣播請求
    const response = await fetch('/api/trust-feedback/ws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      // 不等待響應，非同步廣播
    });

    if (!response.ok) {
      console.warn(`廣播返回 ${response.status}`);
    }

    console.log(`📡 廣播完成 - ${data.type}: ${data.type === 'like' ? data.agreeCount : data.disagreeCount}`);
  } catch (error) {
    // 廣播失敗不應該中斷投票流程
    console.error('廣播請求失敗:', error);
  }
}

/**
 * 獲取最後一次廣播的事件（用於新客戶端連接時同步）
 */
export async function getLastTrustFeedbackEvent() {
  try {
    const response = await fetch('/api/trust-feedback/ws?since=0', {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`無法獲取最後事件: ${response.status}`);
      return null;
    }

    const data = await response.json() as {
      event?: {
        type: 'like' | 'disagree';
        agreeCount?: number;
        disagreeCount?: number;
        timestamp: number;
      };
    };

    return data.event || null;
  } catch (error) {
    console.error('獲取最後事件失敗:', error);
    return null;
  }
}
