/**
 * 鬼魅阿修羅 - 秘卷分享卡生成器
 * 將秘卷轉為可分享的精美圖片
 */

export interface ShareCardData {
  title: string;           // 秘卷標題（鬼魅阿修羅）
  subtitle: string;        // 副標題（本命阿修羅 | 命魂戰局）
  birthDate: string;       // 出生日期（已格式化）
  gender: string;          // 性別
  mainImpressions: string[]; // 主要印記（前 3 個）
  generatedAt: Date;       // 生成時間
}

/**
 * 生成分享卡片的 HTML
 */
export function generateShareCardHTML(data: ShareCardData): string {
  const dateStr = new Date(data.generatedAt).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const impressionsHTML = data.mainImpressions
    .map(
      (imp, i) => `
    <div class="impression-item" style="animation-delay: ${i * 0.1}s;">
      <div class="impression-dot">✦</div>
      <div class="impression-name">${imp}</div>
    </div>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="zh-Hant">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>分享卡片</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
          background: transparent;
        }
        .card {
          width: 1080px;
          height: 1350px;
          background: linear-gradient(135deg, #0d0c10 0%, #1a1317 50%, #0d0c10 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 60px 40px;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
          text-align: center;
        }
        .header {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .emblem {
          font-size: 120px;
          font-weight: 900;
          color: #d4af37;
          line-height: 1;
          text-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
        }
        .title {
          font-size: 64px;
          font-weight: 900;
          color: #f5eeea;
          letter-spacing: 2px;
          line-height: 1.2;
        }
        .subtitle {
          font-size: 24px;
          color: #ceaa83;
          letter-spacing: 0.1em;
        }
        .divider {
          width: 100px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #d4af37, transparent);
          margin: 20px 0;
        }
        .birth-info {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin: 20px 0;
          font-size: 18px;
          color: #bdb0ad;
        }
        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .info-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d4af37;
        }
        .impressions {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin: 20px 0;
        }
        .impression-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          color: #f5eeea;
          animation: slideIn 0.5s ease-out forwards;
          opacity: 0;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .impression-dot {
          font-size: 16px;
          color: #d4af37;
        }
        .impression-name {
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .description {
          font-size: 18px;
          color: #c4bab7;
          line-height: 1.8;
          max-width: 600px;
          margin: 20px 0;
        }
        .footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          font-size: 16px;
          color: #aca19f;
        }
        .generated-at {
          font-size: 14px;
          color: #8b8280;
        }
        .cta {
          margin-top: 40px;
          padding: 16px 32px;
          border: 2px solid #d4af37;
          border-radius: 8px;
          color: #d4af37;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.05em;
          background: transparent;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="content">
          <div class="header">
            <div class="emblem">修</div>
            <div class="title">鬼魅阿修羅</div>
            <div class="subtitle">${data.subtitle}</div>
          </div>

          <div class="divider"></div>

          <div class="birth-info">
            <div class="info-item">
              <div class="info-dot"></div>
              <span>${data.birthDate}</span>
            </div>
            <div class="info-item">
              <div class="info-dot"></div>
              <span>${data.gender === 'female' ? '女性' : '男性'}</span>
            </div>
          </div>

          <div class="impressions">
            ${impressionsHTML}
          </div>

          <div class="description">
            別人還沒有看見風暴，阿修羅先看見。
            <br />
            命盤是戰場，不是保護區。
          </div>

          <div class="footer">
            <div>立即開啟你的阿修羅秘卷</div>
            <div class="generated-at">生成於 ${dateStr}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 獲取分享連結（用於 LINE、複製等）
 */
export function getShareURL(baseURL: string, params: Record<string, string>): string {
  const url = new URL('/ghost-asura', baseURL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

/**
 * LINE 分享連結
 */
export function getLineShareURL(url: string, title: string): string {
  const lineURL = new URL('https://line.me/R/msg/text/');
  const message = `${title}\n${url}`;
  lineURL.pathname += encodeURIComponent(message);
  return lineURL.toString();
}

/**
 * 複製到剪貼板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * 調用系統分享（Web Share API）
 */
export async function shareViaSystem(data: ShareData): Promise<boolean> {
  if (!navigator.share) {
    console.warn('Web Share API not supported');
    return false;
  }

  try {
    await navigator.share(data);
    return true;
  } catch (err) {
    console.error('Share failed:', err);
    return false;
  }
}

export interface ShareData {
  title: string;
  text: string;
  url: string;
}
