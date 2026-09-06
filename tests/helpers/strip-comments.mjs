/**
 * 把 JS/TS 的註解剝掉，只留下真正會執行的程式碼。
 * ============================================================================
 *
 * 【為什麼要這個】
 *
 * 守門測試常常要確認「程式碼裡不得出現 X」。直接對整份檔案做字串比對會出事：
 * 說明為什麼不用 X 的那句註解裡就有 X，測試於是報錯——
 * 抓到的不是違規，是自己的說明文字。
 *
 * 這個坑在這個專案裡踩過三次（beast-ritual、battlefield、battle-bridge），
 * 所以抽成共用的一份，不再各寫各的。
 *
 * 【為什麼逐字掃描而不是正規式】
 *
 * 正規式碰到字串裡的 // 或 /* 會誤判，而誤判的方向剛好是最糟的那一邊：
 * 把真正的違規當成註解放行。逐字掃描要多寫十行，但不會放過該擋的。
 */

export function stripComments(source) {
  let out = '';
  let mode = 'code';
  for (let i = 0; i < source.length; i += 1) {
    const two = source.slice(i, i + 2);
    if (mode === 'code') {
      if (two === '//') { mode = 'line'; i += 1; continue; }
      if (two === '/*') { mode = 'block'; i += 1; continue; }
      if (source[i] === "'" || source[i] === '"' || source[i] === '`') {
        mode = source[i];
        out += source[i];
        continue;
      }
      out += source[i];
    } else if (mode === 'line') {
      if (source[i] === '\n') { mode = 'code'; out += '\n'; }
    } else if (mode === 'block') {
      if (two === '*/') { mode = 'code'; i += 1; }
    } else {
      // 字串內容照留——真正的違規常常就寫在字串裡。
      out += source[i];
      if (source[i] === mode && source[i - 1] !== '\\') mode = 'code';
    }
  }
  return out;
}
