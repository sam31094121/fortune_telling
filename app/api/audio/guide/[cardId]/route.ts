/**
 * 音頻引導 API 端點
 * ============================================================================
 * GET /api/audio/guide/[cardId]
 *
 * 返回卡片的語音引導（掃二維碼時調用）
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AUDIO_DIR = path.join(process.cwd(), 'public/audio/guides');

export async function GET(
  request: Request,
  { params }: { params: { cardId: string } }
) {
  const { cardId } = params;

  // 驗證卡片 ID 格式
  if (!/^[a-f0-9]{12}$/.test(cardId)) {
    return NextResponse.json(
      { error: '無效的卡片 ID' },
      { status: 400 }
    );
  }

  try {
    // 查找對應的音頻文件
    const audioPath = path.join(AUDIO_DIR, `${cardId}.mp3`);

    if (!fs.existsSync(audioPath)) {
      // 如果沒有特定卡片的音頻，返回通用引導
      return getUniversalAudioGuide();
    }

    // 返回音頻文件
    const audioBuffer = fs.readFileSync(audioPath);
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `inline; filename="${cardId}.mp3"`,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    console.error('音頻讀取錯誤:', error);
    return getUniversalAudioGuide();
  }
}

/**
 * 返回通用引導（文本或預錄音頻）
 */
function getUniversalAudioGuide() {
  // 可返回 JSON 格式的引導說明（待實現音頻生成）
  return NextResponse.json({
    cardId: 'universal',
    version: 'v1.2026-10-08',
    guide: {
      zh: {
        title: '神煞易經卡片使用說明',
        content: [
          '歡迎使用神煞易經永久穩定版卡片。',
          '本卡片的神煞規則已凍結在版本 1.2026-10-08',
          '無論黑白或彩色列印，卡片都會保持穩定和清晰。',
          '卡片 ID 用於查詢和驗證完整性。',
          '您可以無限影印本卡片，內容永不改變。',
          '如有任何問題，請掃描卡片上的二維碼取得幫助。',
        ],
        instructions: [
          '1. 列印或影印卡片（支持黑白和彩色）',
          '2. 掃描卡片上的二維碼即可聽取詳細說明',
          '3. 卡片內容受 SHA256 校驗碼保護，無法篡改',
          '4. 版本號確保您總能找到正確的解讀方式',
        ],
      },
    },
    audioStatus: 'pending', // 待生成音頻
    availableFormats: ['text', 'audio-pending'],
  });
}

/**
 * 卡片二維碼掃描記錄（用於統計）
 */
export async function POST(
  request: Request,
  { params }: { params: { cardId: string } }
) {
  const { cardId } = params;

  try {
    // 記錄掃描事件
    const scanLog = {
      cardId,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
    };

    // 可以存儲到日誌系統
    console.log('📱 卡片被掃描:', scanLog);

    return NextResponse.json({
      status: 'success',
      message: '感謝掃描！這是永久穩定的神煞卡片。',
    });
  } catch (error) {
    return NextResponse.json(
      { error: '記錄失敗' },
      { status: 500 }
    );
  }
}
