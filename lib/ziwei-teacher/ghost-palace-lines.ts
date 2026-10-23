/**
 * 2026-10-23 ghost-asura：鬼魅老師（阿修羅語氣）十二宮×十四主星古籍條文表。
 * 資料來源：/workspace/ziwei-palace-copy-1023/palace-star-matrix.json（ghost_asura 欄），逐字複製，未改寫；
 * sourced:false 代表古籍暫無對應條文，前端只能顯示提示，不得補寫。
 */
import type { PalaceId } from './types';

export interface GhostPalaceLineEntry {
  sourced: boolean;
  lines?: string[];
  source?: string | null;
  sourceLink?: string | null;
  original?: string | null;
  skillSource?: string | null;
  sourceLine?: string | null;
  gap?: unknown;
}

export const GHOST_PALACE_LINES: Record<PalaceId, Record<string, GhostPalaceLineEntry>> = {
 "LIFE": {
  "紫微": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「忠厚老成」「謙恭耿直」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉紫微條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E5%BF%A0%E5%8E%9A%E8%80%81%E6%88%90",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 570 行",
   "original": "為人忠厚老成，謙恭耿直",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:883"
  },
  "天機": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「性急心慈」「機謀多變」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉天機條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E6%80%A7%E6%80%A5%E5%BF%83%E6%85%88",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 600 行",
   "original": "性急心慈，機謀多變",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:983"
  },
  "太陽": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「形貌堂堂」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉太陽條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E5%BD%A2%E8%B2%8C%E5%A0%82%E5%A0%82",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 628 行",
   "original": "太陽入廟形貌堂堂",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1101"
  },
  "武曲": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「性剛果決」「心直無毒」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉武曲條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E6%80%A7%E5%88%9A%E6%9E%9C%E5%86%B3",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 660 行",
   "original": "武曲性剛果決，心直無毒",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:368"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「仁慈耿直」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉天同條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E4%BB%81%E6%85%88%E8%80%BF%E7%9B%B4",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 690 行",
   "original": "天同入廟肥滿清明，仁慈耿直",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1192"
  },
  "廉貞": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「性硬浮蕩」「好忿爭」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉廉貞條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E6%80%A7%E7%A1%AC%E6%B5%AE%E8%8D%A1",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 718 行",
   "original": "性硬浮蕩，好忿爭",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1265"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「心性溫和」「聰明俊秀」「博學機變」「能解一切災厄」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉天府條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E5%BF%83%E6%80%A7%E6%B8%A9%E5%92%8C",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 752 行",
   "original": "心性溫和，聰明俊秀，博學機變，能解一切災厄",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1356"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「化富」「為田宅主」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉太陰條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E5%8C%96%E5%AF%8C",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 780 行",
   "original": "太陰水，南北斗化富，為母宿……為田宅主",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1465"
  },
  "貪狼": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「作事急速不耐靜」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉貪狼條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E4%BD%9C%E4%BA%8B%E6%80%A5%E9%80%9F%E4%B8%8D%E8%80%90%E9%9D%99",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 811 行",
   "original": "性格不常，心多計較，作事急速不耐靜",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1538"
  },
  "巨門": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「主是非」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉巨門條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E4%B8%BB%E6%98%AF%E9%9D%9E",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 840 行",
   "original": "巨門水，北斗化暗，主是非",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1656"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「敦厚持重」「衣祿豐足」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉天相條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E6%95%A6%E5%8E%9A%E6%8C%81%E9%87%8D",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 871 行",
   "original": "為人相貌敦厚持重，清白好酒食，衣祿豐足",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1738"
  },
  "天梁": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「聰明耿直」「心無私曲好濟施」「有壽」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉天梁條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E8%81%AA%E6%98%8E%E8%80%BF%E7%9B%B4",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 901 行",
   "original": "厚重清秀，聰明耿直，心無私曲好濟施，有壽",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1829"
  },
  "七殺": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「性急」「喜怒無常」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉七殺條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E6%80%A7%E6%80%A5",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 926 行",
   "original": "為人目大性急，喜怒無常",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:648"
  },
  "破軍": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「性剛寡合」「好爭強」。"
   ],
   "source": "《紫微斗數全書》卷二〈一 命宮〉破軍條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%80_%E5%91%BD%E5%AE%AB:~:text=%E6%80%A7%E5%88%9A%E5%AF%A1%E5%90%88",
   "sourceLine": "《紫微斗數全書》卷二〈一 命宮〉 raw 第 956 行",
   "original": "性剛寡合，好爭強",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1920"
  }
 },
 "SIBLINGS": {
  "紫微": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「有倚靠年長之兄」。"
   ],
   "source": "《紫微斗數全書》卷二〈二 兄弟〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%8C%E5%85%84%E5%BC%9F:~:text=%E6%9C%89%E5%80%9A%E9%9D%A0%E5%B9%B4%E9%95%BF%E4%B9%8B%E5%85%84",
   "sourceLine": "《紫微斗數全書》卷二〈二兄弟〉 raw 第 1322 行",
   "original": "紫微有倚靠年長之兄",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1322"
  },
  "天機": {
   "sourced": true,
   "lines": [
    "陷地——門縫裡傳來一句老話：「相背不一心」。"
   ],
   "source": "《紫微斗數全書》卷二〈二 兄弟〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%8C%E5%85%84%E5%BC%9F:~:text=%E7%9B%B8%E8%83%8C%E4%B8%8D%E4%B8%80%E5%BF%83",
   "sourceLine": "《紫微斗數全書》卷二〈二兄弟〉 raw 第 1323 行",
   "original": "陷地，相背不一心",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1323"
  },
  "太陽": {
   "sourced": true,
   "lines": [
    "陷地——門外有人壓低聲音唸了一句：「不和欠力」。"
   ],
   "source": "《紫微斗數全書》卷二〈二 兄弟〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%8C%E5%85%84%E5%BC%9F:~:text=%E4%B8%8D%E5%92%8C%E6%AC%A0%E5%8A%9B",
   "sourceLine": "《紫微斗數全書》卷二〈二兄弟〉 raw 第 1324 行",
   "original": "陷地，不和欠力",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1324"
  },
  "武曲": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「不合」。"
   ],
   "source": "《紫微斗數全書》卷二〈二 兄弟〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%8C%E5%85%84%E5%BC%9F:~:text=%E4%B8%8D%E5%90%88",
   "sourceLine": "《紫微斗數全書》卷二〈二兄弟〉 raw 第 1325 行",
   "original": "武曲廟旺有二人，不合",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1325"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "見羊陀火鈴空劫忌——書頁在這間房停住了：「宜分居」。"
   ],
   "source": "《紫微斗數全書》卷二〈二 兄弟〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%8C%E5%85%84%E5%BC%9F:~:text=%E5%AE%9C%E5%88%86%E5%B1%85",
   "sourceLine": "《紫微斗數全書》卷二〈二兄弟〉 raw 第 1326 行",
   "original": "見羊陀火鈴空劫忌，少宜分居不和",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1326"
  },
  "廉貞": {
   "sourced": true,
   "lines": [
    "與貪狼同宮——門縫裡傳來一句老話：「招怨」。"
   ],
   "source": "《紫微斗數全書》卷二〈二 兄弟〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%8C%E5%85%84%E5%BC%9F:~:text=%E6%8B%9B%E6%80%A8",
   "sourceLine": "《紫微斗數全書》卷二〈二兄弟〉 raw 第 1327 行",
   "original": "貪狼同招怨",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1327"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「以兄弟為平常」。"
   ],
   "source": "《紫微斗數全書》卷一〈諸星問答論〉問天府",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%80#%E5%95%8F%E5%A4%A9%E5%BA%9C%E6%89%80%E4%B8%BB%E8%8B%A5%E4%BD%95%EF%BC%9F:~:text=%E4%BB%A5%E5%85%84%E5%BC%9F%E7%82%BA%E5%B9%B3%E5%B8%B8",
   "sourceLine": "《紫微斗數全書》卷一〈問天府所主若何？〉 raw 第 298 行",
   "original": "以田宅財帛為廟樂，以奴僕相貌為陷弱。以兄弟為平常",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1365"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "見煞——隔著門，我只聽清這一句：「宜分居」。"
   ],
   "source": "《紫微斗數全書》卷二〈二 兄弟〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%8C%E5%85%84%E5%BC%9F:~:text=%E5%AE%9C%E5%88%86%E5%B1%85",
   "sourceLine": "《紫微斗數全書》卷二〈二兄弟〉 raw 第 1329 行",
   "original": "見羊陀火鈴空劫減半，且剋宜分居相背",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1329"
  },
  "貪狼": {
   "sourced": true,
   "lines": [
    "陷地——書頁在這間房停住了：「宜各胞」。"
   ],
   "source": "《紫微斗數全書》卷二〈二 兄弟〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%8C%E5%85%84%E5%BC%9F:~:text=%E5%AE%9C%E5%90%84%E8%83%9E",
   "sourceLine": "《紫微斗數全書》卷二〈二兄弟〉 raw 第 1330 行",
   "original": "陷地宜各胞",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1330"
  },
  "巨門": {
   "sourced": true,
   "lines": [
    "陷地——門縫裡傳來一句老話：「宜分居」。"
   ],
   "source": "《紫微斗數全書》卷二〈二 兄弟〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%8C%E5%85%84%E5%BC%9F:~:text=%E5%AE%9C%E5%88%86%E5%B1%85",
   "sourceLine": "《紫微斗數全書》卷二〈二兄弟〉 raw 第 1331 行",
   "original": "陷地，各胞有，宜分居",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1331"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「和平」。"
   ],
   "source": "《紫微斗數全書》卷二〈二 兄弟〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%8C%E5%85%84%E5%BC%9F:~:text=%E5%92%8C%E5%B9%B3",
   "sourceLine": "《紫微斗數全書》卷二〈二兄弟〉 raw 第 1332 行",
   "original": "天相和平",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1332"
  },
  "天梁": {
   "sourced": true,
   "lines": [
    "廟旺——隔著門，我只聽清這一句：「和順」。"
   ],
   "source": "《紫微斗數全書》卷二〈二 兄弟〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%8C%E5%85%84%E5%BC%9F:~:text=%E5%92%8C%E9%A1%BA",
   "sourceLine": "《紫微斗數全書》卷二〈二兄弟〉 raw 第 1333 行",
   "original": "天梁廟旺二人和順",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1333"
  },
  "七殺": {
   "sourced": false,
   "gap": "卷二本條「七殺主孤剋」、卷一「在子息…孤單」皆屬刑剋孤斷語（排除項），其餘為人數"
  },
  "破軍": {
   "sourced": false,
   "gap": "卷二「陷地加殺孤單」與卷一「在兄弟骨肉參商」皆為負面定論；嚴格標準下不得自行軟化，其餘為人數"
  }
 },
 "SPOUSE": {
  "紫微": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「晚聘諧老」。"
   ],
   "source": "《紫微斗數全書》卷二〈三 妻妾〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%89%E5%A6%BB%E5%A6%BE:~:text=%E6%99%9A%E8%81%98%E8%B0%90%E8%80%81",
   "sourceLine": "《紫微斗數全書》卷二〈三妻妾〉 raw 第 1347 行",
   "original": "紫微晚聘諧老性剛",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1347"
  },
  "天機": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「晚娶吉」。"
   ],
   "source": "《紫微斗數全書》卷二〈三 妻妾〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%89%E5%A6%BB%E5%A6%BE:~:text=%E6%99%9A%E5%A8%B6%E5%90%89",
   "sourceLine": "《紫微斗數全書》卷二〈三妻妾〉 raw 第 1348 行",
   "original": "晚娶吉",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1348"
  },
  "太陽": {
   "sourced": true,
   "lines": [
    "廟旺——門外有人壓低聲音唸了一句：「遲娶吉」「因妻得貴」。"
   ],
   "source": "《紫微斗數全書》卷二〈三 妻妾〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%89%E5%A6%BB%E5%A6%BE:~:text=%E8%BF%9F%E5%A8%B6%E5%90%89",
   "sourceLine": "《紫微斗數全書》卷二〈三妻妾〉 raw 第 1349 行",
   "original": "太陽廟旺遲娶吉……因妻得貴",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1349"
  },
  "武曲": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「宜遲娶」「同年夫婦也相當」。"
   ],
   "source": "《紫微斗數全書》卷二〈三 妻妾〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%89%E5%A6%BB%E5%A6%BE:~:text=%E5%AE%9C%E8%BF%9F%E5%A8%B6",
   "sourceLine": "《紫微斗數全書》卷二〈三妻妾〉 raw 第 1351 行",
   "original": "武曲背剋宜遲娶，同年夫婦也相當",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1351"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「遲娶諧老」。"
   ],
   "source": "《紫微斗數全書》卷二〈三 妻妾〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%89%E5%A6%BB%E5%A6%BE:~:text=%E8%BF%9F%E5%A8%B6%E8%B0%90%E8%80%81",
   "sourceLine": "《紫微斗數全書》卷二〈三妻妾〉 raw 第 1352 行",
   "original": "天同遲娶諧老",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1352"
  },
  "廉貞": {
   "sourced": false,
   "gap": "本條「三度作新郎」為婚變定論；卷一廉貞條無夫妻斷語；不得軟化"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「相生寵愛」。"
   ],
   "source": "《紫微斗數全書》卷二〈三 妻妾〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%89%E5%A6%BB%E5%A6%BE:~:text=%E7%9B%B8%E7%94%9F%E5%AE%A0%E7%88%B1",
   "sourceLine": "《紫微斗數全書》卷二〈三妻妾〉 raw 第 1354 行",
   "original": "天府相生寵愛",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1354"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "入廟——門外有人壓低聲音唸了一句：「男女皆貴美夫婦」。"
   ],
   "source": "《紫微斗數全書》卷二〈三 妻妾〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%89%E5%A6%BB%E5%A6%BE:~:text=%E7%94%B7%E5%A5%B3%E7%9A%86%E8%B4%B5%E7%BE%8E%E5%A4%AB%E5%A6%87",
   "sourceLine": "《紫微斗數全書》卷二〈三妻妾〉 raw 第 1355 行",
   "original": "太陰入廟男女皆貴美夫婦，加昌曲極美",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1355"
  },
  "貪狼": {
   "sourced": false,
   "gap": "卷二「男女不得美」、卷一「夫妻宮男女俱不得美」皆負面定論，不得軟化"
  },
  "巨門": {
   "sourced": true,
   "lines": [
    "與太陽同宮、無四煞——隔著門，我只聽清這一句：「諧老」。"
   ],
   "source": "《紫微斗數全書》卷二〈三 妻妾〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%89%E5%A6%BB%E5%A6%BE:~:text=%E8%B0%90%E8%80%81",
   "sourceLine": "《紫微斗數全書》卷二〈三妻妾〉 raw 第 1357 行",
   "original": "太陽同無四殺加諧老",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1357"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「貌美賢淑」。"
   ],
   "source": "《紫微斗數全書》卷二〈三 妻妾〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%89%E5%A6%BB%E5%A6%BE:~:text=%E8%B2%8C%E7%BE%8E%E8%B4%A4%E6%B7%91",
   "sourceLine": "《紫微斗數全書》卷二〈三妻妾〉 raw 第 1358 行",
   "original": "天相貌美賢淑",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1358"
  },
  "天梁": {
   "sourced": true,
   "lines": [
    "與天同同宮——門縫裡傳來一句老話：「和氣」。"
   ],
   "source": "《紫微斗數全書》卷二〈三 妻妾〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%89%E5%A6%BB%E5%A6%BE:~:text=%E5%92%8C%E6%B0%94",
   "sourceLine": "《紫微斗數全書》卷二〈三妻妾〉 raw 第 1359 行",
   "original": "天同同和氣",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1359"
  },
  "七殺": {
   "sourced": false,
   "gap": "本條「七殺早剋」屬刑剋（排除項）；卷一「鴛衾半冷」亦負面"
  },
  "破軍": {
   "sourced": false,
   "gap": "本條「剋別聚主生離」屬刑剋；卷一「在夫妻不正」亦負面"
  }
 },
 "CHILDREN": {
  "紫微": {
   "sourced": true,
   "lines": [
    "得祥佐吉星——門外有人壓低聲音唸了一句：「主生貴子」。"
   ],
   "source": "《紫微斗數全書》卷一〈諸星問答論〉問紫微",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%80#%E5%95%8F%E7%B4%AB%E5%BE%AE%E6%89%80%E4%B8%BB%E8%8B%A5%E4%BD%95%EF%BC%9F:~:text=%E4%B8%BB%E7%94%9F%E8%B2%B4%E5%AD%90",
   "sourceLine": "《紫微斗數全書》卷一〈問紫微所主若何？〉 raw 第 229 行",
   "original": "男女宮得祥佐吉星，主生貴子",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:892"
  },
  "天機": {
   "sourced": false,
   "gap": "卷二本條全為人數；卷一問天機無子女宮斷語；先前用交互引用不符單一條文標準"
  },
  "太陽": {
   "sourced": true,
   "lines": [
    "入廟——隔著門，我只聽清這一句：「晚子貴」。"
   ],
   "source": "《紫微斗數全書》卷二〈四 子女〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%9B%9B%E5%AD%90%E5%A5%B3:~:text=%E6%99%9A%E5%AD%90%E8%B4%B5",
   "sourceLine": "《紫微斗數全書》卷二〈四子女〉 raw 第 1381 行",
   "original": "太陽入廟男三女二晚子貴",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1381"
  },
  "武曲": {
   "sourced": true,
   "lines": [
    "與貪狼同宮——書頁在這間房停住了：「晚招」。"
   ],
   "source": "《紫微斗數全書》卷二〈四 子女〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%9B%9B%E5%AD%90%E5%A5%B3:~:text=%E6%99%9A%E6%8B%9B",
   "sourceLine": "《紫微斗數全書》卷二〈四子女〉 raw 第 1382 行",
   "original": "貪狼晚招二子",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1382"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "廟旺——門縫裡傳來一句老話：「有貴」。"
   ],
   "source": "《紫微斗數全書》卷二〈四 子女〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%9B%9B%E5%AD%90%E5%A5%B3:~:text=%E6%9C%89%E8%B4%B5",
   "sourceLine": "《紫微斗數全書》卷二〈四子女〉 raw 第 1383 行",
   "original": "天同廟旺五子有貴",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1383"
  },
  "廉貞": {
   "sourced": true,
   "lines": [
    "與天府同宮——門外有人壓低聲音唸了一句：「主貴子」。"
   ],
   "source": "《紫微斗數全書》卷二〈四 子女〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%9B%9B%E5%AD%90%E5%A5%B3:~:text=%E4%B8%BB%E8%B4%B5%E5%AD%90",
   "sourceLine": "《紫微斗數全書》卷二〈四子女〉 raw 第 1385 行",
   "original": "天府同主貴子三人",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1385"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "與紫微同宮、加昌曲左右——隔著門，我只聽清這一句：「有貴子」。"
   ],
   "source": "《紫微斗數全書》卷二〈四 子女〉紫微條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%9B%9B%E5%AD%90%E5%A5%B3:~:text=%E6%9C%89%E8%B4%B5%E5%AD%90",
   "sourceLine": "《紫微斗數全書》卷二〈四子女〉 raw 第 1379 行",
   "original": "天府同加吉星四五人，加昌曲左右有貴子",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1379"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "廟旺——書頁在這間房停住了：「有貴子」。"
   ],
   "source": "《紫微斗數全書》卷二〈四 子女〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%9B%9B%E5%AD%90%E5%A5%B3:~:text=%E6%9C%89%E8%B4%B5%E5%AD%90",
   "sourceLine": "《紫微斗數全書》卷二〈四子女〉 raw 第 1387 行",
   "original": "廟旺有貴子",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1387"
  },
  "貪狼": {
   "sourced": true,
   "lines": [
    "與武曲同宮——門縫裡傳來一句老話：「先難後易」。"
   ],
   "source": "《紫微斗數全書》卷二〈四 子女〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%9B%9B%E5%AD%90%E5%A5%B3:~:text=%E5%85%88%E9%9A%BE%E5%90%8E%E6%98%93",
   "sourceLine": "《紫微斗數全書》卷二〈四子女〉 raw 第 1389 行",
   "original": "武曲同三人，先難後易",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1389"
  },
  "巨門": {
   "sourced": true,
   "lines": [
    "入廟——門外有人壓低聲音唸了一句：「先難後易」。"
   ],
   "source": "《紫微斗數全書》卷二〈四 子女〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%9B%9B%E5%AD%90%E5%A5%B3:~:text=%E5%85%88%E9%9A%BE%E5%90%8E%E6%98%93",
   "sourceLine": "《紫微斗數全書》卷二〈四子女〉 raw 第 1390 行",
   "original": "巨門入廟二入，先難後易",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1390"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「子息得之而嗣續昌」。"
   ],
   "source": "《紫微斗數全書》卷一〈諸星問答論〉問天相星",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%80#%E5%95%8F%E5%A4%A9%E7%9B%B8%E6%98%9F%E6%89%80%E4%B8%BB%E8%8B%A5%E4%BD%95%EF%BC%9F:~:text=%E5%AD%90%E6%81%AF%E5%BE%97%E4%B9%8B%E8%80%8C%E5%97%A3%E7%BA%8C%E6%98%8C",
   "sourceLine": "《紫微斗數全書》卷一〈問天相星所主若何？〉 raw 第 321 行",
   "original": "子息得之而嗣續昌",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1747"
  },
  "天梁": {
   "sourced": false,
   "gap": "卷二本條全為人數（「天同同加昌曲左右吉星有三人」只有人數）；卷一「蔭於身福及子孫」非子女宮條，不採"
  },
  "七殺": {
   "sourced": false,
   "gap": "卷二只有人數與「強橫敗家」；卷一「子息孤單」屬孤斷；皆不可用"
  },
  "破軍": {
   "sourced": true,
   "lines": [
    "入廟——書頁在這間房停住了：「剛強之子」。"
   ],
   "source": "《紫微斗數全書》卷二〈四 子女〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%9B%9B%E5%AD%90%E5%A5%B3:~:text=%E5%88%9A%E5%BC%BA%E4%B9%8B%E5%AD%90",
   "sourceLine": "《紫微斗數全書》卷二〈四子女〉 raw 第 1395 行",
   "original": "破軍入廟三人，剛強之子",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1395"
  }
 },
 "WEALTH": {
  "紫微": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「豐足倉箱」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E4%B8%B0%E8%B6%B3%E4%BB%93%E7%AE%B1",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1409 行",
   "original": "紫微豐足倉箱",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1409"
  },
  "天機": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「勞心費力生財」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E5%8A%B3%E5%BF%83%E8%B4%B9%E5%8A%9B%E7%94%9F%E8%B4%A2",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1411 行",
   "original": "天機勞心費力生財",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1411"
  },
  "太陽": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「入廟豐足」「陷宮勞碌不遂」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E5%85%A5%E5%BA%99%E4%B8%B0%E8%B6%B3",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1412 行",
   "original": "太陽入廟豐足，陷宮勞碌不遂",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1412"
  },
  "武曲": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「豐足」「化吉有巨萬家資」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E4%B8%B0%E8%B6%B3",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1413 行",
   "original": "武曲豐足化吉有巨萬家資",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1413"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「白手生財晚發」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E7%99%BD%E6%89%8B%E7%94%9F%E8%B4%A2%E6%99%9A%E5%8F%91",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1415 行",
   "original": "天同白手生財晚發",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1415"
  },
  "廉貞": {
   "sourced": true,
   "lines": [
    "陷宮——門外有人壓低聲音唸了一句：「先難後易」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E5%85%88%E9%9A%BE%E5%90%8E%E6%98%93",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1416 行",
   "original": "陷宮先難後易",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1416"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「富足」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E5%AF%8C%E8%B6%B3",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1418 行",
   "original": "天府富足",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1418"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "入廟——書頁在這間房停住了：「富足倉箱」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E5%AF%8C%E8%B6%B3%E4%BB%93%E7%AE%B1",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1419 行",
   "original": "太陰入廟富足倉箱",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1419"
  },
  "貪狼": {
   "sourced": true,
   "lines": [
    "廟旺——門縫裡傳來一句老話：「橫發」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E6%A8%AA%E5%8F%91",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1420 行",
   "original": "貪狼廟旺橫發",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1420"
  },
  "巨門": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「白手生財成家」「宜鬧中取」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E7%99%BD%E6%89%8B%E7%94%9F%E8%B4%A2%E6%88%90%E5%AE%B6",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1421 行",
   "original": "巨門白手生財成家，宜鬧中取",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1421"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「富足」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E5%AF%8C%E8%B6%B3",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1423 行",
   "original": "天相富足",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1423"
  },
  "天梁": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「富足」「入廟上等富貴」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E5%AF%8C%E8%B6%B3",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1424 行",
   "original": "天梁富足入廟上等富貴",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1424"
  },
  "破軍": {
   "sourced": true,
   "lines": [
    "在子午宮——門縫裡傳來一句老話：「多有金銀寶貝蓄積」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E5%A4%9A%E6%9C%89%E9%87%91%E9%93%B6%E5%AE%9D%E8%B4%9D%E8%93%84%E7%A7%AF",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1426 行",
   "original": "破軍在子午宮，多有金銀寶貝蓄積",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1426"
  },
  "七殺": {
   "sourced": true,
   "lines": [
    "與武曲同宮——門外有人壓低聲音唸了一句：「白手生財成家」。"
   ],
   "source": "《紫微斗數全書》卷二〈五 財帛〉武曲條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%BA%94%E8%B4%A2%E5%B8%9B:~:text=%E7%99%BD%E6%89%8B%E7%94%9F%E8%B4%A2%E6%88%90%E5%AE%B6",
   "sourceLine": "《紫微斗數全書》卷二〈五財帛〉 raw 第 1414 行",
   "original": "七殺同白手生財成家",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1414"
  }
 },
 "HEALTH": {
  "紫微": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「災少」。"
   ],
   "source": "《紫微斗數全書》卷二〈六 疾厄〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AD%E7%96%BE%E5%8E%84:~:text=%E7%81%BE%E5%B0%91",
   "sourceLine": "《紫微斗數全書》卷二〈六疾厄〉 raw 第 1442 行",
   "original": "紫微災少",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1442"
  },
  "天機": {
   "sourced": false,
   "gap": "本條「襁褓多災」為病災定論，不得自行改寫為保養建議"
  },
  "太陽": {
   "sourced": false,
   "gap": "本條「頭風」僅病症名；改寫為保養建議屬添加"
  },
  "武曲": {
   "sourced": false,
   "gap": "本條「手足頭面有傷」屬傷殘類（排除項）"
  },
  "巨門": {
   "sourced": false,
   "gap": "本條「少年膿血之厄」為病症定論"
  },
  "七殺": {
   "sourced": false,
   "gap": "本條「幼年多災」為病災定論；卷一「終身殘疾」屬排除項"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "入廟——書頁在這間房停住了：「災少」。"
   ],
   "source": "《紫微斗數全書》卷二〈六 疾厄〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AD%E7%96%BE%E5%8E%84:~:text=%E7%81%BE%E5%B0%91",
   "sourceLine": "《紫微斗數全書》卷二〈六疾厄〉 raw 第 1446 行",
   "original": "天同入廟災少",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1446"
  },
  "廉貞": {
   "sourced": true,
   "lines": [
    "入廟加吉——門縫裡傳來一句老話：「和平」。"
   ],
   "source": "《紫微斗數全書》卷二〈六 疾厄〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AD%E7%96%BE%E5%8E%84:~:text=%E5%92%8C%E5%B9%B3",
   "sourceLine": "《紫微斗數全書》卷二〈六疾厄〉 raw 第 1447 行",
   "original": "入廟加吉和平",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1447"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「災少臨災有救」。"
   ],
   "source": "《紫微斗數全書》卷二〈六 疾厄〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AD%E7%96%BE%E5%8E%84:~:text=%E7%81%BE%E5%B0%91%E4%B8%B4%E7%81%BE%E6%9C%89%E6%95%91",
   "sourceLine": "《紫微斗數全書》卷二〈六疾厄〉 raw 第 1448 行",
   "original": "天府災少臨災有救",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1448"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "廟旺——隔著門，我只聽清這一句：「無災」。"
   ],
   "source": "《紫微斗數全書》卷二〈六 疾厄〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AD%E7%96%BE%E5%8E%84:~:text=%E6%97%A0%E7%81%BE",
   "sourceLine": "《紫微斗數全書》卷二〈六疾厄〉 raw 第 1449 行",
   "original": "太陰廟旺無災",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1449"
  },
  "貪狼": {
   "sourced": true,
   "lines": [
    "與武曲同宮廟旺——書頁在這間房停住了：「無疾」。"
   ],
   "source": "《紫微斗數全書》卷二〈六 疾厄〉武曲條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AD%E7%96%BE%E5%8E%84:~:text=%E6%97%A0%E7%96%BE",
   "sourceLine": "《紫微斗數全書》卷二〈六疾厄〉 raw 第 1445 行",
   "original": "貪狼同廟旺無疾",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1445"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「災少」。"
   ],
   "source": "《紫微斗數全書》卷二〈六 疾厄〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AD%E7%96%BE%E5%8E%84:~:text=%E7%81%BE%E5%B0%91",
   "sourceLine": "《紫微斗數全書》卷二〈六疾厄〉 raw 第 1452 行",
   "original": "天相災少",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1452"
  },
  "天梁": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「居奴僕、疾厄、相貌作豐餘之論」。"
   ],
   "source": "《紫微斗數全書》卷一〈諸星問答論〉問天梁星",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%80#%E5%95%8F%E5%A4%A9%E6%A2%81%E6%98%9F%E6%89%80%E4%B8%BB%E8%8B%A5%E4%BD%95%EF%BC%9F:~:text=%E5%B1%85%E5%A5%B4%E5%83%95%E3%80%81%E7%96%BE%E5%8E%84%E3%80%81%E7%9B%B8%E8%B2%8C%E4%BD%9C%E8%B1%90%E9%A4%98",
   "sourceLine": "《紫微斗數全書》卷一〈問天梁星所主若何？〉 raw 第 331 行",
   "original": "居奴僕、疾厄、相貌作豐餘之論",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1838"
  },
  "破軍": {
   "sourced": true,
   "lines": [
    "與紫微同宮——隔著門，我只聽清這一句：「災少」。"
   ],
   "source": "《紫微斗數全書》卷二〈六 疾厄〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AD%E7%96%BE%E5%8E%84:~:text=%E7%81%BE%E5%B0%91",
   "sourceLine": "《紫微斗數全書》卷二〈六疾厄〉 raw 第 1454 行",
   "original": "紫微同災少",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1454"
  }
 },
 "TRAVEL": {
  "紫微": {
   "sourced": true,
   "lines": [
    "會左右——書頁在這間房停住了：「出外貴人扶持發福」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%87%BA%E5%A4%96%E8%B4%B5%E4%BA%BA%E6%89%B6%E6%8C%81%E5%8F%91%E7%A6%8F",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1467 行",
   "original": "紫微同左右出外貴人扶持發福",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1467"
  },
  "天機": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「出外遇貴」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%87%BA%E5%A4%96%E9%81%87%E8%B4%B5",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1468 行",
   "original": "天機出外遇貴居家有是非",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1468"
  },
  "太陽": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「宜出外發福」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%AE%9C%E5%87%BA%E5%A4%96%E5%8F%91%E7%A6%8F",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1469 行",
   "original": "太陽宜出外發福不耐靜守",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1469"
  },
  "武曲": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「不宜靜守」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E4%B8%8D%E5%AE%9C%E9%9D%99%E5%AE%88",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1470 行",
   "original": "武曲鬧忙中進少不宜靜守",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1470"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「出外遇貴人扶持」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%87%BA%E5%A4%96%E9%81%87%E8%B4%B5%E4%BA%BA%E6%89%B6%E6%8C%81",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1471 行",
   "original": "天同出外遇貴人扶持",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1471"
  },
  "廉貞": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「出外通達近貴」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%87%BA%E5%A4%96%E9%80%9A%E8%BE%BE%E8%BF%91%E8%B4%B5",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1472 行",
   "original": "廉貞出外通達近貴",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1472"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「出外遇貴人扶」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%87%BA%E5%A4%96%E9%81%87%E8%B4%B5%E4%BA%BA%E6%89%B6",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1473 行",
   "original": "天府出外遇貴人扶",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1473"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "入廟——隔著門，我只聽清這一句：「出外遇貴發財」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%87%BA%E5%A4%96%E9%81%87%E8%B4%B5%E5%8F%91%E8%B4%A2",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1474 行",
   "original": "太陰入廟出外遇貴發財",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1474"
  },
  "貪狼": {
   "sourced": true,
   "lines": [
    "獨守——書頁在這間房停住了：「在外勞碌」「鬧中橫進財」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%9C%A8%E5%A4%96%E5%8A%B3%E7%A2%8C",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1475 行",
   "original": "貪狼獨守在外勞碌，鬧中橫進財",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1475"
  },
  "巨門": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「多是非」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%A4%9A%E6%98%AF%E9%9D%9E",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1476 行",
   "original": "巨門出外勞心不安，與人不足多是非",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1476"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「出外貴人提撕」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%87%BA%E5%A4%96%E8%B4%B5%E4%BA%BA%E6%8F%90%E6%92%95",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1477 行",
   "original": "天相出外貴人提撕",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1477"
  },
  "天梁": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「出外近貴」「貴人成就」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%87%BA%E5%A4%96%E8%BF%91%E8%B4%B5",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1478 行",
   "original": "天梁出外近貴貴人成就",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1478"
  },
  "七殺": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「在外日多，在家日少」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%9C%A8%E5%A4%96%E6%97%A5%E5%A4%9A%EF%BC%8C%E5%9C%A8%E5%AE%B6%E6%97%A5%E5%B0%91",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1479 行",
   "original": "七殺在外日多，在家日少",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1479"
  },
  "破軍": {
   "sourced": true,
   "lines": [
    "入廟——門縫裡傳來一句老話：「在外崢嶸」。"
   ],
   "source": "《紫微斗數全書》卷二〈七 遷移〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B8%83%E8%BF%81%E7%A7%BB:~:text=%E5%9C%A8%E5%A4%96%E5%B3%A5%E5%B5%98",
   "sourceLine": "《紫微斗數全書》卷二〈七遷移〉 raw 第 1480 行",
   "original": "入廟在外崢嶸",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1480"
  }
 },
 "FRIENDS": {
  "紫微": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「成行得力」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E6%88%90%E8%A1%8C%E5%BE%97%E5%8A%9B",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1494 行",
   "original": "紫微成行得力",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1494"
  },
  "天機": {
   "sourced": true,
   "lines": [
    "入廟——隔著門，我只聽清這一句：「得力」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E5%BE%97%E5%8A%9B",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1495 行",
   "original": "天機入廟得力",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1495"
  },
  "太陽": {
   "sourced": true,
   "lines": [
    "入廟——書頁在這間房停住了：「旺主發」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E6%97%BA%E4%B8%BB%E5%8F%91",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1496 行",
   "original": "太陽入廟旺主發",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1496"
  },
  "武曲": {
   "sourced": true,
   "lines": [
    "旺宮——門縫裡傳來一句老話：「一呼百諾」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E4%B8%80%E5%91%BC%E7%99%BE%E8%AF%BA",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1497 行",
   "original": "武曲旺宮不少，一呼百諾",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1497"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「得力旺相」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E5%BE%97%E5%8A%9B%E6%97%BA%E7%9B%B8",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1498 行",
   "original": "天同得力旺相",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1498"
  },
  "廉貞": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「晚年方招得」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E6%99%9A%E5%B9%B4%E6%96%B9%E6%8B%9B%E5%BE%97",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1499 行",
   "original": "晚年方招得",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1499"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「得力」「一呼百諾」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E5%BE%97%E5%8A%9B",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1500 行",
   "original": "天府得力一呼百諾",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1500"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "廟地——門縫裡傳來一句老話：「得力成行」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E5%BE%97%E5%8A%9B%E6%88%90%E8%A1%8C",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1501 行",
   "original": "太陰廟地得力成行",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1501"
  },
  "貪狼": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「初難」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E5%88%9D%E9%9A%BE",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1502 行",
   "original": "貪狼初難",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1502"
  },
  "巨門": {
   "sourced": true,
   "lines": [
    "入廟——隔著門，我只聽清這一句：「早年不得力」「招是非」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E6%97%A9%E5%B9%B4%E4%B8%8D%E5%BE%97%E5%8A%9B",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1503 行",
   "original": "巨門入廟早年不得力，招是非",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1503"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「末年招得」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E6%9C%AB%E5%B9%B4%E6%8B%9B%E5%BE%97",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1504 行",
   "original": "天相末年招得",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1504"
  },
  "天梁": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「旺主」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E6%97%BA%E4%B8%BB",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1505 行",
   "original": "天梁奴多旺主",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1505"
  },
  "破軍": {
   "sourced": true,
   "lines": [
    "入廟——門外有人壓低聲音唸了一句：「得力」。"
   ],
   "source": "《紫微斗數全書》卷二〈八 奴僕〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%85%AB%E5%A5%B4%E4%BB%86:~:text=%E5%BE%97%E5%8A%9B",
   "sourceLine": "《紫微斗數全書》卷二〈八奴僕〉 raw 第 1507 行",
   "original": "破軍入廟得力",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1507"
  },
  "七殺": {
   "sourced": false,
   "gap": "本條「七殺欺主有剛強之僕」核心為「欺主」，截取「剛強之僕」會改變原意，故不採"
  }
 },
 "CAREER": {
  "紫微": {
   "sourced": true,
   "lines": [
    "廟旺遇左右昌曲魁鉞——隔著門，我只聽清這一句：「位至封候伯」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E4%BD%8D%E8%87%B3%E5%B0%81%E5%80%99%E4%BC%AF",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1521 行",
   "original": "紫微廟旺遇左右昌曲魁鉞，軒勝位至封候伯",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1521"
  },
  "天機": {
   "sourced": true,
   "lines": [
    "入廟——書頁在這間房停住了：「權貴」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%9D%83%E8%B4%B5",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1522 行",
   "original": "天機入廟權貴",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1522"
  },
  "太陽": {
   "sourced": true,
   "lines": [
    "入廟——門縫裡傳來一句老話：「文武為良」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%96%87%E6%AD%A6%E4%B8%BA%E8%89%AF",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1523 行",
   "original": "太陽入廟文武為良",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1523"
  },
  "武曲": {
   "sourced": true,
   "lines": [
    "入廟與昌曲左右同宮——門外有人壓低聲音唸了一句：「武職崢嶸」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%AD%A6%E8%81%8C%E5%B3%A5%E5%B5%98",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1524 行",
   "original": "武曲入廟與昌曲左右同宮，武職崢嶸",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1524"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "入廟——隔著門，我只聽清這一句：「文武皆宜」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%96%87%E6%AD%A6%E7%9A%86%E5%AE%9C",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1526 行",
   "original": "天同入廟文武皆宜",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1526"
  },
  "廉貞": {
   "sourced": true,
   "lines": [
    "入廟——書頁在這間房停住了：「武職權貴不耐久」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%AD%A6%E8%81%8C%E6%9D%83%E8%B4%B5%E4%B8%8D%E8%80%90%E4%B9%85",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1527 行",
   "original": "廉貞入廟武職權貴不耐久",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1527"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "入廟——門縫裡傳來一句老話：「文武皆吉」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%96%87%E6%AD%A6%E7%9A%86%E5%90%89",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1528 行",
   "original": "天府入廟文武皆吉",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1528"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "入廟——門外有人壓低聲音唸了一句：「多貴」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E5%A4%9A%E8%B4%B5",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1529 行",
   "original": "太陰入廟多貴",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1529"
  },
  "貪狼": {
   "sourced": true,
   "lines": [
    "入廟遇火鈴——隔著門，我只聽清這一句：「武職掌大權」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%AD%A6%E8%81%8C%E6%8E%8C%E5%A4%A7%E6%9D%83",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1530 行",
   "original": "貪狼入廟遇火鈴武職掌大權",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1530"
  },
  "巨門": {
   "sourced": true,
   "lines": [
    "入廟——書頁在這間房停住了：「武職權貴」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%AD%A6%E8%81%8C%E6%9D%83%E8%B4%B5",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1531 行",
   "original": "巨門入廟武職權貴",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1531"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "入廟——門縫裡傳來一句老話：「文武皆宜」「食祿千鍾」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%96%87%E6%AD%A6%E7%9A%86%E5%AE%9C",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1533 行",
   "original": "天相入廟文武皆宜食祿千鍾",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1533"
  },
  "天梁": {
   "sourced": true,
   "lines": [
    "廟午會左右魁鉞——門外有人壓低聲音唸了一句：「文武之材」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%96%87%E6%AD%A6%E4%B9%8B%E6%9D%90",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1535 行",
   "original": "天梁廟午會左右魁鉞，文武之材",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1535"
  },
  "七殺": {
   "sourced": true,
   "lines": [
    "廟旺——隔著門，我只聽清這一句：「武職崢嶸」「權貴非小」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%AD%A6%E8%81%8C%E5%B3%A5%E5%B5%98",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1536 行",
   "original": "七殺廟旺武職崢嶸權貴非小",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1536"
  },
  "破軍": {
   "sourced": true,
   "lines": [
    "廟旺——書頁在這間房停住了：「武職軒勝」。"
   ],
   "source": "《紫微斗數全書》卷二〈九 官祿〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E4%B9%9D%E5%AE%98%E7%A6%84:~:text=%E6%AD%A6%E8%81%8C%E8%BD%A9%E8%83%9C",
   "sourceLine": "《紫微斗數全書》卷二〈九官祿〉 raw 第 1537 行",
   "original": "破軍廟旺武職軒勝",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1537"
  }
 },
 "PROPERTY": {
  "紫微": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「茂盛自置旺相」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E8%8C%82%E7%9B%9B%E8%87%AA%E7%BD%AE%E6%97%BA%E7%9B%B8",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1571 行",
   "original": "紫微茂盛自置旺相",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1571"
  },
  "天機": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「退祖新創置」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E9%80%80%E7%A5%96%E6%96%B0%E5%88%9B%E7%BD%AE",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1572 行",
   "original": "天機退祖新創置",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1572"
  },
  "太陽": {
   "sourced": true,
   "lines": [
    "入廟——隔著門，我只聽清這一句：「得祖業」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E5%BE%97%E7%A5%96%E4%B8%9A",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1573 行",
   "original": "太陽入廟得祖業",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1573"
  },
  "武曲": {
   "sourced": true,
   "lines": [
    "單居旺地——書頁在這間房停住了：「得祖父大業」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E5%BE%97%E7%A5%96%E7%88%B6%E5%A4%A7%E4%B8%9A",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1574 行",
   "original": "武曲單居旺地，得祖父大業",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1574"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「先少後多」「自置甚旺」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E5%85%88%E5%B0%91%E5%90%8E%E5%A4%9A",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1576 行",
   "original": "天同先少後多，自置甚旺",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1576"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「田園茂盛」「守祖自置旺相」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E7%94%B0%E5%9B%AD%E8%8C%82%E7%9B%9B",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1578 行",
   "original": "天府田園茂盛，守祖自置旺相",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1578"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "入廟——隔著門，我只聽清這一句：「田多」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E7%94%B0%E5%A4%9A",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1579 行",
   "original": "太陰入廟田多",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1579"
  },
  "貪狼": {
   "sourced": true,
   "lines": [
    "廟旺——書頁在這間房停住了：「有祖業」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E6%9C%89%E7%A5%96%E4%B8%9A",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1580 行",
   "original": "廟旺有祖業",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1580"
  },
  "巨門": {
   "sourced": true,
   "lines": [
    "廟旺——門縫裡傳來一句老話：「橫發置買」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E6%A8%AA%E5%8F%91%E7%BD%AE%E4%B9%B0",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1581 行",
   "original": "巨門廟旺橫發置買",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1581"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "廟旺——門外有人壓低聲音唸了一句：「有分」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E6%9C%89%E5%88%86",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1582 行",
   "original": "天相廟旺有分",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1582"
  },
  "天梁": {
   "sourced": true,
   "lines": [
    "入廟——隔著門，我只聽清這一句：「旺有祖業」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E6%97%BA%E6%9C%89%E7%A5%96%E4%B8%9A",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1583 行",
   "original": "天梁入廟旺有祖業",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1583"
  },
  "破軍": {
   "sourced": true,
   "lines": [
    "在子午宮——書頁在這間房停住了：「守祖業榮昌，但見有進退」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E5%AE%88%E7%A5%96%E4%B8%9A%E8%8D%A3%E6%98%8C%EF%BC%8C%E4%BD%86%E8%A7%81%E6%9C%89%E8%BF%9B%E9%80%80",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1584 行",
   "original": "破軍在子午宮守祖業榮昌，但見有進退",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1584"
  },
  "廉貞": {
   "sourced": true,
   "lines": [
    "與貪狼同宮——門縫裡傳來一句老話：「有祖業」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E6%9C%89%E7%A5%96%E4%B8%9A",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1577 行",
   "original": "貪狼同有祖業",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1577"
  },
  "七殺": {
   "sourced": true,
   "lines": [
    "與廉貞同宮——門外有人壓低聲音唸了一句：「自置」。"
   ],
   "source": "《紫微斗數全書》卷二〈十 田宅〉廉貞條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E7%94%B0%E5%AE%85:~:text=%E8%87%AA%E7%BD%AE",
   "sourceLine": "《紫微斗數全書》卷二〈十田宅〉 raw 第 1577 行",
   "original": "七殺同自置",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1577"
  }
 },
 "FORTUNE": {
  "紫微": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「福厚享福安樂」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E7%A6%8F%E5%8E%9A%E4%BA%AB%E7%A6%8F%E5%AE%89%E4%B9%90",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1597 行",
   "original": "紫微福厚享福安樂",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1597"
  },
  "天機": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「先勞後逸」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E5%85%88%E5%8A%B3%E5%90%8E%E9%80%B8",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1598 行",
   "original": "天機先勞後逸",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1598"
  },
  "太陽": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「忙中發福」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E5%BF%99%E4%B8%AD%E5%8F%91%E7%A6%8F",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1599 行",
   "original": "太陽忙中發福",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1599"
  },
  "武曲": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「勞心費力」「入廟安然享福」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E5%8A%B3%E5%BF%83%E8%B4%B9%E5%8A%9B",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1601 行",
   "original": "武曲勞心費力，入廟安然享福",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1601"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「快樂有福有壽」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E5%BF%AB%E4%B9%90%E6%9C%89%E7%A6%8F%E6%9C%89%E5%AF%BF",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1603 行",
   "original": "天同快樂有福有壽",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1603"
  },
  "廉貞": {
   "sourced": true,
   "lines": [
    "獨守——書頁在這間房停住了：「忙中生福」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E5%BF%99%E4%B8%AD%E7%94%9F%E7%A6%8F",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1604 行",
   "original": "廉貞獨守忙中生福",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1604"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「安靜享福」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E5%AE%89%E9%9D%99%E4%BA%AB%E7%A6%8F",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1605 行",
   "original": "天府安靜享福",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1605"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "入廟——門外有人壓低聲音唸了一句：「享福快樂」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E4%BA%AB%E7%A6%8F%E5%BF%AB%E4%B9%90",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1606 行",
   "original": "太陰入廟享福快樂",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1606"
  },
  "貪狼": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「勞心不安」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E5%8A%B3%E5%BF%83%E4%B8%8D%E5%AE%89",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1607 行",
   "original": "貪狼勞心不安",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1607"
  },
  "巨門": {
   "sourced": true,
   "lines": [
    "書頁在這間房停住了：「勞力不安」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E5%8A%B3%E5%8A%9B%E4%B8%8D%E5%AE%89",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1608 行",
   "original": "巨門勞力不安",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1608"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「安逸享福有壽」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E5%AE%89%E9%80%B8%E4%BA%AB%E7%A6%8F%E6%9C%89%E5%AF%BF",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1609 行",
   "original": "天相安逸享福有壽",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1609"
  },
  "七殺": {
   "sourced": true,
   "lines": [
    "入廟——門外有人壓低聲音唸了一句：「享福」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E4%BA%AB%E7%A6%8F",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1610 行",
   "original": "七殺入廟享福",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1610"
  },
  "破軍": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「勞心費力」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E5%8A%B3%E5%BF%83%E8%B4%B9%E5%8A%9B",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1612 行",
   "original": "破軍勞心費力",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1612"
  },
  "天梁": {
   "sourced": true,
   "lines": [
    "與天機同宮——書頁在這間房停住了：「享福」。"
   ],
   "source": "《紫微斗數全書》卷二〈十一 福德〉天機條",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%B8%80%E7%A6%8F%E5%BE%B7:~:text=%E4%BA%AB%E7%A6%8F",
   "sourceLine": "《紫微斗數全書》卷二〈十一福德〉 raw 第 1598 行",
   "original": "天梁同享福",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1598"
  }
 },
 "PARENTS": {
  "紫微": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「無剋」。"
   ],
   "source": "《紫微斗數全書》卷二〈十二 父母〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%BA%8C%E7%88%B6%E6%AF%8D:~:text=%E6%97%A0%E5%85%8B",
   "sourceLine": "《紫微斗數全書》卷二〈十二父母〉 raw 第 1631 行",
   "original": "紫微無剋",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1631"
  },
  "天機": {
   "sourced": true,
   "lines": [
    "廟旺——門外有人壓低聲音唸了一句：「無刑」。"
   ],
   "source": "《紫微斗數全書》卷二〈十二 父母〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%BA%8C%E7%88%B6%E6%AF%8D:~:text=%E6%97%A0%E5%88%91",
   "sourceLine": "《紫微斗數全書》卷二〈十二父母〉 raw 第 1632 行",
   "original": "天機廟旺無刑",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1632"
  },
  "太陽": {
   "sourced": true,
   "lines": [
    "隔著門，我只聽清這一句：「有輝則吉」。"
   ],
   "source": "《紫微斗數全書》卷一〈諸星問答論〉問太陽",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%80#%E5%95%8F%E5%A4%AA%E9%99%BD%E6%89%80%E4%B8%BB%E8%8B%A5%E4%BD%95%EF%BC%9F:~:text=%E6%9C%89%E8%BC%9D%E5%89%87%E5%90%89",
   "sourceLine": "《紫微斗數全書》卷一〈問太陽所主若何？〉 raw 第 266 行",
   "original": "父母宮男子單作父星，有輝則吉",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1092"
  },
  "武曲": {
   "sourced": false,
   "gap": "本條「武曲剋早」屬刑剋（排除項），不得軟化"
  },
  "天同": {
   "sourced": true,
   "lines": [
    "獨守廟旺——書頁在這間房停住了：「無刑」。"
   ],
   "source": "《紫微斗數全書》卷二〈十二 父母〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%BA%8C%E7%88%B6%E6%AF%8D:~:text=%E6%97%A0%E5%88%91",
   "sourceLine": "《紫微斗數全書》卷二〈十二父母〉 raw 第 1637 行",
   "original": "天同獨守廟旺無刑",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1637"
  },
  "廉貞": {
   "sourced": false,
   "gap": "本條「難為父母」為負面定論，嚴格標準下不得改寫為建議"
  },
  "天府": {
   "sourced": true,
   "lines": [
    "門縫裡傳來一句老話：「父母雙全」。"
   ],
   "source": "《紫微斗數全書》卷二〈十二 父母〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%BA%8C%E7%88%B6%E6%AF%8D:~:text=%E7%88%B6%E6%AF%8D%E5%8F%8C%E5%85%A8",
   "sourceLine": "《紫微斗數全書》卷二〈十二父母〉 raw 第 1639 行",
   "original": "天府父母雙全",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1639"
  },
  "太陰": {
   "sourced": true,
   "lines": [
    "入廟——門外有人壓低聲音唸了一句：「無剋」。"
   ],
   "source": "《紫微斗數全書》卷二〈十二 父母〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%BA%8C%E7%88%B6%E6%AF%8D:~:text=%E6%97%A0%E5%85%8B",
   "sourceLine": "《紫微斗數全書》卷二〈十二父母〉 raw 第 1640 行",
   "original": "太陰入廟無剋",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1640"
  },
  "貪狼": {
   "sourced": true,
   "lines": [
    "與紫微同宮、無煞——隔著門，我只聽清這一句：「雙全」。"
   ],
   "source": "《紫微斗數全書》卷二〈十二 父母〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%BA%8C%E7%88%B6%E6%AF%8D:~:text=%E5%8F%8C%E5%85%A8",
   "sourceLine": "《紫微斗數全書》卷二〈十二父母〉 raw 第 1641 行",
   "original": "紫微同無殺加雙全",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1641"
  },
  "巨門": {
   "sourced": true,
   "lines": [
    "與太陽同宮——書頁在這間房停住了：「少和」。"
   ],
   "source": "《紫微斗數全書》卷二〈十二 父母〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%BA%8C%E7%88%B6%E6%AF%8D:~:text=%E5%B0%91%E5%92%8C",
   "sourceLine": "《紫微斗數全書》卷二〈十二父母〉 raw 第 1642 行",
   "original": "太陽同少和",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1642"
  },
  "天相": {
   "sourced": true,
   "lines": [
    "廟旺——門縫裡傳來一句老話：「無刑」。"
   ],
   "source": "《紫微斗數全書》卷二〈十二 父母〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%BA%8C%E7%88%B6%E6%AF%8D:~:text=%E6%97%A0%E5%88%91",
   "sourceLine": "《紫微斗數全書》卷二〈十二父母〉 raw 第 1643 行",
   "original": "天相廟旺無刑",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1643"
  },
  "天梁": {
   "sourced": true,
   "lines": [
    "門外有人壓低聲音唸了一句：「在父母宮則厚重威嚴」。"
   ],
   "source": "《紫微斗數全書》卷一〈諸星問答論〉問天梁星（希夷先生曰）",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%80#%E5%95%8F%E5%A4%A9%E6%A2%81%E6%98%9F%E6%89%80%E4%B8%BB%E8%8B%A5%E4%BD%95%EF%BC%9F:~:text=%E5%9C%A8%E7%88%B6%E6%AF%8D%E5%AE%AE%E5%89%87%E5%8E%9A%E9%87%8D%E5%A8%81%E5%9A%B4",
   "sourceLine": "《紫微斗數全書》卷一〈問天梁星所主若何？〉 raw 第 332 行",
   "original": "在父母宮則厚重威嚴",
   "skillSource": "C:\\Users\\DRAGON\\Desktop\\命理\\docs\\技能戰鬥檔案\\鬼魅阿修羅\\權威來源\\紫微-十四主星-權威來源.json:1838"
  },
  "七殺": {
   "sourced": true,
   "lines": [
    "與紫微同宮加吉星——隔著門，我只聽清這一句：「無刑」。"
   ],
   "source": "《紫微斗數全書》卷二〈十二 父母〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%BA%8C%E7%88%B6%E6%AF%8D:~:text=%E6%97%A0%E5%88%91",
   "sourceLine": "《紫微斗數全書》卷二〈十二父母〉 raw 第 1646 行",
   "original": "紫微同加吉星無刑",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1646"
  },
  "破軍": {
   "sourced": true,
   "lines": [
    "與紫微同宮——書頁在這間房停住了：「無刑」。"
   ],
   "source": "《紫微斗數全書》卷二〈十二 父母〉",
   "sourceLink": "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C#%E5%8D%81%E4%BA%8C%E7%88%B6%E6%AF%8D:~:text=%E6%97%A0%E5%88%91",
   "sourceLine": "《紫微斗數全書》卷二〈十二父母〉 raw 第 1647 行",
   "original": "紫微同無刑",
   "skillSource": "docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紫微斗數全書-卷二-維基文庫錄文.txt:1647"
  }
 }
};
