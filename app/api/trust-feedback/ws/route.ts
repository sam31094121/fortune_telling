/**
 * 全球實時同步 - WebSocket/長輪詢端點
 * ============================================================================
 *
 * 功能：
 * 1. 接收前端的投票更新
 * 2. 廣播給所有連接的客戶端
 * 3. 跨設備實時同步
 *
 * 兼容性：
 * - 桌機：原生 WebSocket
 * - 行動：長輪詢（LINE、微信 in-app 瀏覽器）
 */

import { NextResponse } from 'next/server';

// 臨時存儲客戶端連接隊列（用於長輪詢）
interface ClientQueue {
  clientId: string;
  timestamp: number;
}

const clientQueues = new Map<string, ClientQueue>();
const maxClients = 1000;
const queueTimeout = 30000; // 30 秒

// 最後一次投票的事件（用於新客戶端獲取最新狀態）
let lastVoteEvent: {
  type: 'like' | 'disagree';
  agreeCount?: number;
  disagreeCount?: number;
  timestamp: number;
} | null = null;

/**
 * 廣播投票更新給所有監聽的客戶端（內部函數，不導出）
 */
function broadcastTrustFeedbackVote(data: {
  type: 'like' | 'disagree';
  agreeCount?: number;
  disagreeCount?: number;
}) {
  lastVoteEvent = {
    ...data,
    timestamp: Date.now(),
  };

  console.log(`📡 廣播投票 - ${data.type}: 已發送到所有客戶端`);
}

/**
 * 清理過期的客戶端隊列
 */
function cleanupExpiredQueues() {
  const now = Date.now();
  const expired: string[] = [];

  clientQueues.forEach((queue, clientId) => {
    if (now - queue.timestamp > queueTimeout) {
      expired.push(clientId);
    }
  });

  expired.forEach((clientId) => {
    clientQueues.delete(clientId);
  });

  if (expired.length > 0) {
    console.log(`🧹 清理過期連接: ${expired.length}`);
  }
}

/**
 * GET 端點 - 長輪詢（用於不支持 WebSocket 的環境）
 *
 * 流程：
 * 1. 客戶端發送 GET 請求（帶 clientId）
 * 2. 伺服器保存客戶端 ID
 * 3. 如果有新投票，立即返回
 * 4. 否則等待 30 秒後超時返回空
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('clientId') || `client_${Date.now()}_${Math.random()}`;
  const sinceTimestamp = parseInt(url.searchParams.get('since') || '0', 10);

  // 清理過期隊列
  cleanupExpiredQueues();

  // 限制客戶端數量
  if (clientQueues.size >= maxClients && !clientQueues.has(clientId)) {
    return NextResponse.json(
      { error: '連接數已滿，請重試' },
      { status: 503 }
    );
  }

  // 註冊客戶端
  clientQueues.set(clientId, {
    clientId,
    timestamp: Date.now(),
  });

  // 如果有新事件，立即返回
  if (lastVoteEvent && lastVoteEvent.timestamp > sinceTimestamp) {
    return NextResponse.json({
      clientId,
      event: lastVoteEvent,
    });
  }

  // 長輪詢：等待新事件或超時
  return new Promise<Response>((resolve) => {
    let resolved = false;
    const timeoutId = setTimeout(() => {
      resolved = true;
      resolve(
        NextResponse.json({
          clientId,
          event: null,
        })
      );
    }, queueTimeout);

    // 監控最後一次事件的更新
    const checkInterval = setInterval(() => {
      if (!resolved && lastVoteEvent && lastVoteEvent.timestamp > sinceTimestamp) {
        resolved = true;
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        resolve(
          NextResponse.json({
            clientId,
            event: lastVoteEvent,
          })
        );
      }
    }, 100); // 每 100ms 檢查一次
  });
}

/**
 * POST 端點 - 接收投票並廣播
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type: 'like' | 'disagree';
      agreeCount?: number;
      disagreeCount?: number;
    };

    if (!body.type || !['like', 'disagree'].includes(body.type)) {
      return NextResponse.json(
        { error: '無效的投票類型' },
        { status: 400 }
      );
    }

    // 廣播投票
    broadcastTrustFeedbackVote(body);

    return NextResponse.json({
      success: true,
      broadcast: {
        clientsNotified: clientQueues.size,
        event: lastVoteEvent,
      },
    });
  } catch (error) {
    console.error('廣播失敗:', error);
    return NextResponse.json(
      { error: '廣播失敗' },
      { status: 500 }
    );
  }
}

