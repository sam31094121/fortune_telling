/**
 * 簡體中文顯示轉換回歸測試（lib/zh-hans/convert.ts）。
 * 2026-11-18 詳細檢查時抓到 OpenCC 的「台灣軟體用語→大陸軟體用語」詞組在命理語境會換錯意思：
 *   核心→内核、執行→运行、智慧→智能、指標→指针、整合→集成、複製→拷貝。
 * 這支測試把「必須換對」與「必須保留」的詞固定下來，之後改轉換規則若又換錯會直接 FAIL。
 * 只測顯示轉換，轉換結果不可當排盤輸入。
 */
import { toSimplified } from '../lib/zh-hans/convert';

let failed = 0;
function expectConvert(source: string, expected: string) {
  const actual = toSimplified(source);
  if (actual !== expected) { failed++; console.error(`FAIL  ${source} → ${actual}（應為 ${expected}）`); }
}

// 軟體用語誤換：本站是命理語境，不是程式語境。
expectConvert('核心', '核心');
expectConvert('易經三核心', '易经三核心');
expectConvert('執行力', '执行力');
expectConvert('天地人智慧分析', '天地人智慧分析');
expectConvert('12 個人格指標', '12 个人格指标');
expectConvert('整合層', '整合层');
expectConvert('已複製到剪貼簿', '已复制到剪贴板');
expectConvert('需要覆核', '需要复核');
expectConvert('行事曆', '日历');
expectConvert('磁軌', '磁轨');
expectConvert('過載', '过载');

// 易經卦名與卦辭：「乾」是卦名，不是乾燥。
expectConvert('乾為天', '乾为天');
expectConvert('乾卦', '乾卦');
expectConvert('乾，元亨利貞。', '乾，元亨利贞。');
expectConvert('乾坤', '乾坤');
expectConvert('乾淨', '干净');
expectConvert('乾脆', '干脆');

// 天干地支與常見多音字：該換的要換、該留的要留。
expectConvert('天干地支', '天干地支');
expectConvert('才幹', '才干');
expectConvert('皇后', '皇后');
expectConvert('後來', '后来');
expectConvert('丑時', '丑时');
expectConvert('醜陋', '丑陋');
expectConvert('繫辭', '系辞');
expectConvert('聯繫', '联系');
expectConvert('象徵調和', '象征调和');
expectConvert('紫微斗數', '紫微斗数');
expectConvert('台灣標準時間', '台湾标准时间');
expectConvert('回覆', '回复');
expectConvert('復卦', '复卦');
expectConvert('占卜', '占卜');
expectConvert('佔有', '占有');

if (failed > 0) { console.error(`簡體轉換測試：${failed} 項失敗`); process.exit(1); }
console.log('簡體轉換測試：全部通過');
