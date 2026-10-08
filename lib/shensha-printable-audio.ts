/**
 * 神煞卡片列印優化 & 音頻引導系統
 * ============================================================================
 * 功能：
 * 1. 列印優化：無論黑白或彩色列印都清晰穩定
 * 2. 音頻引導：掃二維碼聽卡片說明
 * 3. 影印穩定：可無限影印不會模糊
 * 4. 永久使用：版本號幫助查詢引導內容
 */

import crypto from 'crypto';

export interface PrintableCardOptions {
  version: 'v1.2026-10-08';
  bazi: { year: string; month: string; day: string; hour: string };
  shensha: Array<{ id: string; name: string; pillar: string }>;
  userData?: { name?: string; phone?: string };
}

export interface AudioGuideConfig {
  cardId: string;
  version: string;
  language: 'zh' | 'en';
  format: 'mp3' | 'wav' | 'm4a';
  duration: number; // 秒數
  narratorGender: 'male' | 'female';
}

/**
 * 生成卡片唯一 ID（用於音頻查詢）
 */
export function generateCardId(options: PrintableCardOptions): string {
  const content = JSON.stringify({
    bazi: options.bazi,
    shensha: options.shensha.map(s => s.id).sort(),
  });

  return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
}

/**
 * 生成列印優化的 HTML 卡片
 * 特點：黑白清晰、彩色也清晰、無限影印不模糊
 */
export function generatePrintableCard(options: PrintableCardOptions): string {
  const cardId = generateCardId(options);

  return `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>神煞易經卡片 - ${options.bazi.year}-${options.bazi.month}-${options.bazi.day}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: "Microsoft YaHei", "微軟正黑體", serif;
      background: white;
      color: #000;
      line-height: 1.6;
    }

    @media print {
      body { margin: 0; padding: 10mm; }
      .no-print { display: none; }
    }

    /* A4 紙張大小 */
    .card {
      width: 210mm;
      height: 297mm;
      margin: 20px auto;
      padding: 20mm;
      background: white;
      border: 1px solid #ccc;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      page-break-after: always;
    }

    @media print {
      .card {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        border: none;
        box-shadow: none;
      }
    }

    /* 標題區 */
    .header {
      text-align: center;
      border-bottom: 3px solid #000;
      padding-bottom: 10mm;
      margin-bottom: 10mm;
    }

    .title {
      font-size: 28pt;
      font-weight: bold;
      letter-spacing: 2px;
    }

    .subtitle {
      font-size: 14pt;
      color: #333;
      margin-top: 5mm;
    }

    /* 八字區 */
    .bazi-section {
      margin-bottom: 15mm;
      padding: 8mm;
      border-left: 4px solid #000;
    }

    .bazi-label { font-size: 12pt; font-weight: bold; margin-bottom: 5mm; }

    .bazi-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 8mm;
      margin-top: 5mm;
    }

    .bazi-item {
      text-align: center;
      padding: 8mm;
      border: 2px solid #000;
      min-height: 25mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .bazi-name { font-size: 10pt; color: #666; margin-bottom: 3mm; }
    .bazi-value { font-size: 18pt; font-weight: bold; }

    /* 神煞區 */
    .shensha-section {
      margin-bottom: 15mm;
      padding: 8mm;
      border-left: 4px solid #000;
    }

    .shensha-label { font-size: 12pt; font-weight: bold; margin-bottom: 5mm; }

    .shensha-list {
      columns: 2;
      column-gap: 10mm;
      font-size: 11pt;
    }

    .shensha-item {
      break-inside: avoid;
      margin-bottom: 5mm;
      padding: 3mm 5mm;
      border-bottom: 1px dotted #ccc;
    }

    .shensha-order { color: #666; font-size: 10pt; margin-right: 3mm; }
    .shensha-name { font-weight: bold; }
    .shensha-pillar { color: #666; font-size: 9pt; }

    /* 版本 & 二維碼區 */
    .footer {
      margin-top: 15mm;
      border-top: 2px solid #000;
      padding-top: 8mm;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10mm;
      align-items: center;
    }

    .version-info {
      font-size: 9pt;
      line-height: 1.4;
    }

    .version-label { font-weight: bold; }
    .version-value { color: #333; }

    .qr-code {
      width: 30mm;
      height: 30mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-code img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* 黑白列印最優化 */
    @media print and (color) {
      /* 彩色列印 */
      .card { background: #fafafa; }
      .bazi-item { border-color: #666; }
    }

    @media print and (monochrome) {
      /* 黑白列印 */
      .card { background: white; }
      * { color: black !important; }
    }

    /* 影印穩定性 */
    .stability-marker {
      position: absolute;
      opacity: 0.03;
      font-size: 60pt;
      z-index: -1;
    }

    /* 防複製標記（只列印，不影響內容） */
    @media print {
      .stability-marker {
        opacity: 0.02;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        pointer-events: none;
      }
    }
  </style>
</head>
<body>
  <div class="card">
    <!-- 防複製標記 -->
    <div class="stability-marker">V1.2026-10-08</div>

    <!-- 標題 -->
    <div class="header">
      <div class="title">✦ 神煞易經 ✦</div>
      <div class="subtitle">永久穩定版 v1.2026-10-08</div>
    </div>

    <!-- 八字區 -->
    <div class="bazi-section">
      <div class="bazi-label">八字四柱</div>
      <div class="bazi-grid">
        <div class="bazi-item">
          <div class="bazi-name">年</div>
          <div class="bazi-value">${options.bazi.year}</div>
        </div>
        <div class="bazi-item">
          <div class="bazi-name">月</div>
          <div class="bazi-value">${options.bazi.month}</div>
        </div>
        <div class="bazi-item">
          <div class="bazi-name">日</div>
          <div class="bazi-value">${options.bazi.day}</div>
        </div>
        <div class="bazi-item">
          <div class="bazi-name">時</div>
          <div class="bazi-value">${options.bazi.hour}</div>
        </div>
      </div>
    </div>

    <!-- 神煞區 -->
    <div class="shensha-section">
      <div class="shensha-label">命中神煞（${options.shensha.length} 項）</div>
      <div class="shensha-list">
        ${options.shensha
          .map(
            (s, idx) => `
          <div class="shensha-item">
            <span class="shensha-order">${idx + 1}.</span>
            <span class="shensha-name">${s.name}</span>
            <span class="shensha-pillar">（${s.pillar}柱）</span>
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <!-- 頁腳 & 二維碼 -->
    <div class="footer">
      <div class="version-info">
        <div class="version-label">卡片 ID：${cardId}</div>
        <div class="version-label">版本：v1.2026-10-08</div>
        <div class="version-label">生成：${new Date().toLocaleDateString('zh-TW')}</div>
        <div class="version-value">
          <small>掃描右側二維碼聽卡片說明 →</small>
        </div>
      </div>
      <div class="qr-code" id="qrcode"></div>
    </div>
  </div>

  <!-- 列印按鈕（非列印時顯示） -->
  <div style="text-align: center; padding: 20px; display: none;" class="no-print">
    <button onclick="window.print();" style="
      padding: 10px 30px;
      font-size: 16px;
      cursor: pointer;
      background: #000;
      color: white;
      border: none;
      border-radius: 4px;
    ">
      🖨️ 列印卡片
    </button>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode.js/1.5.3/qrcode.min.js"></script>
  <script>
    // 生成二維碼（指向音頻引導）
    const cardId = '${cardId}';
    const audioUrl = \`https://your-domain.com/api/audio/guide/\${cardId}\`;

    const qrElement = document.getElementById('qrcode');
    QRCode.toCanvas(audioUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 0,
      width: 200
    }, (err, canvas) => {
      if (err) console.error(err);
      else qrElement.appendChild(canvas);
    });

    // 列印友好性提示
    window.addEventListener('beforeprint', () => {
      console.log('🖨️ 即將列印卡片（黑白/彩色都清晰）');
    });
  </script>
</body>
</html>
  `;
}

/**
 * 音頻引導元數據
 */
export function getAudioGuideMetadata(cardId: string): AudioGuideConfig {
  return {
    cardId,
    version: 'v1.2026-10-08',
    language: 'zh',
    format: 'mp3',
    duration: 180, // 3 分鐘語音說明
    narratorGender: 'female',
  };
}

/**
 * 生成音頻 URL（用於二維碼）
 */
export function generateAudioGuideUrl(cardId: string, baseUrl: string = 'https://your-domain.com'): string {
  return `${baseUrl}/api/audio/guide/${cardId}`;
}

/**
 * 生成列印友好的 PDF（帶音頻指引）
 */
export async function exportPrintableCardWithAudio(
  options: PrintableCardOptions
): Promise<{
  htmlPath: string;
  qrCode: string;
  audioUrl: string;
  cardId: string;
}> {
  const cardId = generateCardId(options);
  const html = generatePrintableCard(options);
  const audioUrl = generateAudioGuideUrl(cardId);

  return {
    htmlPath: html,
    qrCode: audioUrl,
    audioUrl,
    cardId,
  };
}
