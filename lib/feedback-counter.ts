/**
 * 易經反馬校準 - 實時計數器系統
 * ============================================================================
 * 功能：
 * 1. 本地樂觀更新（點擊立即 +1）
 * 2. 後端異步同步
 * 3. WebSocket 全球實時推送
 * 4. 浏覽計數自動 +1
 * 5. 防止重複點擊
 */

export interface FeedbackCounter {
  id: string;
  type: 'like' | 'disagree'; // 認同 | 不認同
  count: number;
  lastUpdated: string;
}

export interface FeedbackEvent {
  action: 'like' | 'disagree' | 'view';
  deviceId: string;
  timestamp: string;
  sessionId: string;
}

export interface CounterState {
  like: number;
  disagree: number;
  views: number;
  lastSync: string;
}

/**
 * 生成設備 ID（用於防止重複點擊）
 */
export function generateDeviceId(): string {
  // 優先使用 sessionStorage
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    const key = 'deviceId';
    let deviceId = sessionStorage.getItem(key);

    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(key, deviceId);
    }

    return deviceId;
  }

  // 備用方案
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成會話 ID（每次頁面加載）
 */
export function generateSessionId(): string {
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    const key = 'sessionId';
    let sessionId = sessionStorage.getItem(key);

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(key, sessionId);
    }

    return sessionId;
  }

  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 檢查用戶是否已經在本會話中點擊過
 */
export function hasUserVoted(type: 'like' | 'disagree'): boolean {
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    const key = `voted_${type}`;
    return sessionStorage.getItem(key) === 'true';
  }
  return false;
}

/**
 * 標記用戶已投票
 */
export function markAsVoted(type: 'like' | 'disagree'): void {
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    const key = `voted_${type}`;
    sessionStorage.setItem(key, 'true');
  }
}

/**
 * 清除投票標記（用於重新投票）
 */
export function clearVoteHistory(): void {
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('voted_like');
    sessionStorage.removeItem('voted_disagree');
  }
}

/**
 * 發送反饋事件到後端
 */
export async function submitFeedback(
  type: 'like' | 'disagree',
  cardId: string = 'home-ai-feedback'
): Promise<{ success: boolean; newCount: number }> {
  const deviceId = generateDeviceId();
  const sessionId = generateSessionId();

  try {
    const response = await fetch('/api/feedback/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        cardId,
        deviceId,
        sessionId,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    markAsVoted(type);

    return {
      success: true,
      newCount: data.newCount,
    };
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return {
      success: false,
      newCount: 0,
    };
  }
}

/**
 * 記錄頁面訪問
 */
export async function recordPageView(
  cardId: string = 'home-ai-feedback'
): Promise<{ success: boolean; newViewCount: number }> {
  const deviceId = generateDeviceId();
  const sessionId = generateSessionId();

  try {
    const response = await fetch('/api/feedback/view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardId,
        deviceId,
        sessionId,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      newViewCount: data.newViewCount,
    };
  } catch (error) {
    console.error('Failed to record page view:', error);
    return {
      success: false,
      newViewCount: 0,
    };
  }
}

/**
 * 初始化計數器（獲取最新數據）
 */
export async function initializeCounter(
  cardId: string = 'home-ai-feedback'
): Promise<CounterState | null> {
  try {
    const response = await fetch(`/api/feedback/counter/${cardId}`);

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to initialize counter:', error);
    return null;
  }
}

/**
 * WebSocket 連接管理
 */
export class CounterWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Map<string, Function[]> = new Map();

  constructor(wsUrl: string = `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost'}`) {
    this.url = `${wsUrl}/api/feedback/ws`;
  }

  /**
   * 連接 WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✓ WebSocket 已連接');
          this.reconnectAttempts = 0;
          this.emit('connected', null);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit('update', data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket 已斷開');
          this.emit('disconnected', null);
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 嘗試重新連接
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`Attempting to reconnect in ${delay}ms...`);
      setTimeout(() => this.connect().catch(console.error), delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  /**
   * 發送消息
   */
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  /**
   * 訂閱事件
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * 取消訂閱
   */
  off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 發送事件
   */
  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => callback(data));
    }
  }

  /**
   * 斷開連接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
