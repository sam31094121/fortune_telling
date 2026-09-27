"use strict";
/**
 * 真太陽時換算（均時差＋經度修正）
 * ============================================================================
 *
 * 2026-09-16 業主批准：@ziweijs/core 已從 npm 下架（registry 與 tarball 皆 HTTP 404），
 * 全新安裝或 Vercel 清快取重建會失敗。本站只用到這一支函式，依 MIT 授權逐字搬入，
 * 行為與 @ziweijs/core 0.3.0 的 calculateTrueSolarTime 相同（tests/true-solar-time.test.mjs 逐筆比對）。
 *
 * 來源：@ziweijs/core 0.3.0 dist/index.js（https://github.com/lzm0x219/ziwei）
 *
 * MIT License
 *
 * Copyright (c) 2025 lzm0x219
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTrueSolarTime = calculateTrueSolarTime;
/**
 * @param date 當地鐘錶時間
 * @param longitude 出生地經度（東經為正）
 * @param timezoneOffsetHours 時區（臺灣 +8）；缺省用執行環境時區
 * @returns 真太陽時
 */
function calculateTrueSolarTime(date, longitude, timezoneOffsetHours = -date.getTimezoneOffset() / 60) {
    const timezoneOffsetMinutes = 60 * timezoneOffsetHours;
    const localTime = new Date(date.getTime() + 60000 * timezoneOffsetMinutes);
    const startOfYear = Date.UTC(localTime.getUTCFullYear(), 0, 0);
    const dayOfYear = Math.floor((localTime.getTime() - startOfYear) / 86400000);
    const minutesPastMidnight = 60 * localTime.getUTCHours() + localTime.getUTCMinutes() + localTime.getUTCSeconds() / 60 + localTime.getUTCMilliseconds() / 60000;
    const gamma = 2 * Math.PI * (dayOfYear - 1 + minutesPastMidnight / 1440) / 365;
    const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
    const longitudeCorrection = 4 * longitude;
    const correctionMinutes = equationOfTime + longitudeCorrection - timezoneOffsetMinutes;
    return new Date(date.getTime() + 60000 * correctionMinutes);
}
