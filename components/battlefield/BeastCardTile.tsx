'use client';

/**
 * 神獸卡片框架
 * ============================================================================
 *
 * 業主定調：「把卡片的主軸卡片顯示出來就好，剩下的說明都把它折起來，
 * 客戶需要看的時候再點閱……簡單、簡潔、有力，乾淨俐落，
 * 每一張卡片都一樣，用這種高規格、科技感。」
 *
 * 【一個元件，六十張長得一樣】
 *
 * 尺寸、比例、圓角、邊框、名字位置都在這裡決定。
 * 任何地方要顯示神獸卡就用它，不另外排一套版——
 * 「每一張都一樣」靠的是只有一份實作，不是靠每次都記得對齊。
 *
 * 【格子裡只有卡面與名字】
 *
 * 元素、階級、角色、技能、數值全部收進底部詳情。
 * 原本每格底下掛四段小字，六十格排下來是一面字牆，卡面被擠成配角。
 * 想知道的人點一下就有；不想知道的人不必先讀完才看得到圖。
 */

import { useEffect } from 'react';
import styles from './BeastCardTile.module.css';
import { guardianOf, tierOf, TIER_LABEL } from '@/lib/beast-guardians';
import { useGuideBook } from './GuideBookContext';
import BattlePowerAnalysis from './BattlePowerAnalysis';
// 正統比例與圖窗的唯一來源。這裡不重新定義，只疊手感與狀態。
import frame from '@/components/BeastCardFrame.module.css';
import { weaponFor } from '@/lib/beast-game/weapons';
import type { BeastElement } from '@/lib/beast-game/elements';
// 自研卡框 v1：卡面數值取卡檔原始 stats（與詳情頁 /api/beast-game 的 card.stats 同源），
// 不用 interactiveCatalog 的對戰正規化值（fighter() 會把 hp 壓成 160±、attack 43/46）。
import { CARD_FACE_STATS, CARD_FACE_SKILL } from '@/lib/beast-game/card-face-stats';

/**
 * 重繪卡面（2026-10-23 業主批准：先重繪標準卡一張當樣本）。
 * 原圖不覆蓋，備份在 public/beast-game/_orig-20261023/；這裡只把卡面指到新檔。
 * 有登記的卡同時開「印刷質感 v2」（data-art="v2"），其他卡維持現狀。
 */

/** v2 每張圖的垂直取景（依主體外框量測，使主體在圖窗內上下置中） */
const ART_V2_POS: Record<string, number> = {"beast_y01":50,"beast_y02":50,"beast_y03":50,"beast_y04":50,"beast_y05":50,"beast_y06":50,"beast_y07":50,"beast_y08":50,"beast_y09":50,"beast_y10":50,"beast_y11":50,"beast_y12":50,"beast_y13":50,"beast_y14":50,"beast_y15":72.4,"beast_y16":60.4,"beast_y17":79.7,"beast_y18":60,"beast_y19":71.6,"beast_y20":66.6,"beast_y21":60,"beast_y22":60.5,"beast_y23":60.4,"beast_y24":58,"beast_y25":65.1,"beast_y26":60.5,"beast_y27":63.6,"beast_y28":66.1,"beast_a01":50,"beast_a02":50,"beast_a03":55,"beast_a04":30,"beast_a05":50,"beast_a06":50,"beast_a07":50,"beast_a08":50,"beast_a09":50,"beast_a10":50,"beast_a11":50,"beast_a12":50,"beast_a13":50,"beast_a14":50,"beast_a15":50,"beast_a16":50,"beast_a17":50,"beast_a18":50,"beast_a19":50,"beast_a20":50,"beast_a21":50,"beast_a22":50,"beast_a23":50,"beast_a24":50,"beast_a25":50,"beast_a26":50,"beast_a27":50,"beast_a28":50,"beast_g_qinglong":50,"beast_g_zhuque":50,"beast_g_baihu":50,"beast_g_xuanwu":50};
const ART_V2: Record<string, { thumb: string; mid: string; front: string }> = {
  beast_y01: {
    thumb: '/beast-game/thumb/young-01.v2.webp?v=6207f137be27',
    mid: '/beast-game/thumb/young-01.v2-480.webp?v=dcf3cdd45378',
    front: '/beast-game/front/young-01.v2.webp?v=eed5b8f52ea5',
  },
  beast_y02: {
    thumb: '/beast-game/thumb/young-02.v2.webp?v=8a9f83381fb5',
    mid: '/beast-game/thumb/young-02.v2-480.webp?v=87be10ac3864',
    front: '/beast-game/front/young-02.v2.webp?v=7191ec14618e',
  },
  beast_y03: {
    thumb: '/beast-game/thumb/young-03.v2.webp?v=86d0f1075eba',
    mid: '/beast-game/thumb/young-03.v2-480.webp?v=db14629474fa',
    front: '/beast-game/front/young-03.v2.webp?v=891a22dfedd3',
  },
  beast_y04: {
    thumb: '/beast-game/thumb/young-04.v2.webp?v=83c564fc93cf',
    mid: '/beast-game/thumb/young-04.v2-480.webp?v=0d494024b34b',
    front: '/beast-game/front/young-04.v2.webp?v=a194aeef0b51',
  },
  beast_y05: {
    thumb: '/beast-game/thumb/young-05.v2.webp?v=71250631fa23',
    mid: '/beast-game/thumb/young-05.v2-480.webp?v=3f00cd5904b9',
    front: '/beast-game/front/young-05.v2.webp?v=21a10ce94c86',
  },
  beast_y06: {
    thumb: '/beast-game/thumb/young-06.v2.webp?v=17a0c899988e',
    mid: '/beast-game/thumb/young-06.v2-480.webp?v=5ac9a1fe08d1',
    front: '/beast-game/front/young-06.v2.webp?v=48ea20912d28',
  },
  beast_y07: {
    thumb: '/beast-game/thumb/young-07.v2.webp?v=0cae45d61297',
    mid: '/beast-game/thumb/young-07.v2-480.webp?v=0cddca1c1ac1',
    front: '/beast-game/front/young-07.v2.webp?v=c131a14dd20e',
  },
  beast_y08: {
    thumb: '/beast-game/thumb/young-08.v2.webp?v=e18b975426d1',
    mid: '/beast-game/thumb/young-08.v2-480.webp?v=1194771ca003',
    front: '/beast-game/front/young-08.v2.webp?v=fd71f4e46d53',
  },
  beast_y09: {
    thumb: '/beast-game/thumb/young-09.v2.webp?v=dd0b4ee418a4',
    mid: '/beast-game/thumb/young-09.v2-480.webp?v=fc13422a08b8',
    front: '/beast-game/front/young-09.v2.webp?v=4a9f0bee5773',
  },
  beast_y10: {
    thumb: '/beast-game/thumb/young-10.v2.webp?v=60b293681178',
    mid: '/beast-game/thumb/young-10.v2-480.webp?v=86a13c3c8c55',
    front: '/beast-game/front/young-10.v2.webp?v=e5724cd804a0',
  },
  beast_y11: {
    thumb: '/beast-game/thumb/young-11.v2.webp?v=918a71c2bdc6',
    mid: '/beast-game/thumb/young-11.v2-480.webp?v=55d77643f84c',
    front: '/beast-game/front/young-11.v2.webp?v=9a74281f87a9',
  },
  beast_y12: {
    thumb: '/beast-game/thumb/young-12.v2.webp?v=ddd6095e2b50',
    mid: '/beast-game/thumb/young-12.v2-480.webp?v=b52c90cc4d59',
    front: '/beast-game/front/young-12.v2.webp?v=ed1d198e9fc8',
  },
  beast_y13: {
    thumb: '/beast-game/thumb/young-13.v2.webp?v=fb94696c032e',
    mid: '/beast-game/thumb/young-13.v2-480.webp?v=092a41a760c0',
    front: '/beast-game/front/young-13.v2.webp?v=f75ff8bd1bc7',
  },
  beast_y14: {
    thumb: '/beast-game/thumb/young-14.v2.webp?v=9c1aaefe85aa',
    mid: '/beast-game/thumb/young-14.v2-480.webp?v=84f4da20c6e3',
    front: '/beast-game/front/young-14.v2.webp?v=6cb009a832f3',
  },
  beast_y15: {
    thumb: '/beast-game/thumb/young-15.v2.webp?v=753c33f127ad',
    mid: '/beast-game/thumb/young-15.v2-480.webp?v=b04e025421e0',
    front: '/beast-game/front/young-15.v2.webp?v=fd61e3f6dd3e',
  },
  beast_y16: {
    thumb: '/beast-game/thumb/young-16.v2.webp?v=fa9884076167',
    mid: '/beast-game/thumb/young-16.v2-480.webp?v=1cb9ef82fa14',
    front: '/beast-game/front/young-16.v2.webp?v=36c78d0b0171',
  },
  beast_y17: {
    thumb: '/beast-game/thumb/young-17.v2.webp?v=7e36ea24eed3',
    mid: '/beast-game/thumb/young-17.v2-480.webp?v=287bcedd655b',
    front: '/beast-game/front/young-17.v2.webp?v=99cf88037a3a',
  },
  beast_y18: {
    thumb: '/beast-game/thumb/young-18.v2.webp?v=c9d58da2d2d1',
    mid: '/beast-game/thumb/young-18.v2-480.webp?v=c88a8bb75e95',
    front: '/beast-game/front/young-18.v2.webp?v=b7eeaa41dac4',
  },
  beast_y19: {
    thumb: '/beast-game/thumb/young-19.v2.webp?v=d88d811756f0',
    mid: '/beast-game/thumb/young-19.v2-480.webp?v=aae7df0e52aa',
    front: '/beast-game/front/young-19.v2.webp?v=119395b13767',
  },
  beast_y20: {
    thumb: '/beast-game/thumb/young-20.v2.webp?v=c297c684e98e',
    mid: '/beast-game/thumb/young-20.v2-480.webp?v=e010fc831dbe',
    front: '/beast-game/front/young-20.v2.webp?v=44ca98a513ab',
  },
  beast_y21: {
    thumb: '/beast-game/thumb/young-21.v2.webp?v=1d52b69cdb47',
    mid: '/beast-game/thumb/young-21.v2-480.webp?v=4ff34b17e49e',
    front: '/beast-game/front/young-21.v2.webp?v=df100c6c4318',
  },
  beast_y22: {
    thumb: '/beast-game/thumb/young-22.v2.webp?v=390ac1715826',
    mid: '/beast-game/thumb/young-22.v2-480.webp?v=9a45635b2a41',
    front: '/beast-game/front/young-22.v2.webp?v=6ecebff2f366',
  },
  beast_y23: {
    thumb: '/beast-game/thumb/young-23.v2.webp?v=63a4664f69df',
    mid: '/beast-game/thumb/young-23.v2-480.webp?v=68e4dd382c8f',
    front: '/beast-game/front/young-23.v2.webp?v=91cc9ca081e4',
  },
  beast_y24: {
    thumb: '/beast-game/thumb/young-24.v2.webp?v=c6814f308052',
    mid: '/beast-game/thumb/young-24.v2-480.webp?v=34fd5b28e699',
    front: '/beast-game/front/young-24.v2.webp?v=b61705600f86',
  },
  beast_y25: {
    thumb: '/beast-game/thumb/young-25.v2.webp?v=f2c04c3db412',
    mid: '/beast-game/thumb/young-25.v2-480.webp?v=83ca9e3b1000',
    front: '/beast-game/front/young-25.v2.webp?v=e45c7190dc5e',
  },
  beast_y26: {
    thumb: '/beast-game/thumb/young-26.v2.webp?v=fc7f33929315',
    mid: '/beast-game/thumb/young-26.v2-480.webp?v=d4610918ced0',
    front: '/beast-game/front/young-26.v2.webp?v=35f5e9429383',
  },
  beast_y27: {
    thumb: '/beast-game/thumb/young-27.v2.webp?v=1513e051abce',
    mid: '/beast-game/thumb/young-27.v2-480.webp?v=ac6e6a233b3b',
    front: '/beast-game/front/young-27.v2.webp?v=f27821da5feb',
  },
  beast_y28: {
    thumb: '/beast-game/thumb/young-28.v2.webp?v=758a7bd8b502',
    mid: '/beast-game/thumb/young-28.v2-480.webp?v=03dfaa10ebc0',
    front: '/beast-game/front/young-28.v2.webp?v=ffdc2fb1330b',
  },
  beast_a01: {
    thumb: '/beast-game/thumb/adult-01.v2.webp?v=47f80d915551',
    mid: '/beast-game/thumb/adult-01.v2-480.webp?v=9298e2134322',
    front: '/beast-game/front/adult-01.v2.webp?v=b07b42a5b17a',
  },
  beast_a02: {
    thumb: '/beast-game/thumb/adult-02.v2.webp?v=efecb89fd773',
    mid: '/beast-game/thumb/adult-02.v2-480.webp?v=d12a9af6402a',
    front: '/beast-game/front/adult-02.v2.webp?v=9ebd19c2f60e',
  },
  beast_a03: {
    thumb: '/beast-game/thumb/adult-03.v2.webp?v=c6e0ebbccd56',
    mid: '/beast-game/thumb/adult-03.v2-480.webp?v=b09e8ca50158',
    front: '/beast-game/front/adult-03.v2.webp?v=907c1f1f370d',
  },
  beast_a04: {
    thumb: '/beast-game/thumb/adult-04.v2.webp?v=85cd000920b9',
    mid: '/beast-game/thumb/adult-04.v2-480.webp?v=f81e52e6ffd6',
    front: '/beast-game/front/adult-04.v2.webp?v=c71eb510258e',
  },
  beast_a05: {
    thumb: '/beast-game/thumb/adult-05.v2.webp?v=f0dfa11f7d92',
    mid: '/beast-game/thumb/adult-05.v2-480.webp?v=cb33ca4f57fe',
    front: '/beast-game/front/adult-05.v2.webp?v=7daf27fb1153',
  },
  beast_a06: {
    thumb: '/beast-game/thumb/adult-06.v2.webp?v=59915bb810ed',
    mid: '/beast-game/thumb/adult-06.v2-480.webp?v=514a10ddb285',
    front: '/beast-game/front/adult-06.v2.webp?v=aad477c1a5b4',
  },
  beast_a07: {
    thumb: '/beast-game/thumb/adult-07.v2.webp?v=9cdd12d843d1',
    mid: '/beast-game/thumb/adult-07.v2-480.webp?v=c5cffa414d0a',
    front: '/beast-game/front/adult-07.v2.webp?v=edffa3f94cbf',
  },
  beast_a08: {
    thumb: '/beast-game/thumb/adult-08.v2.webp?v=efb02d321e0c',
    mid: '/beast-game/thumb/adult-08.v2-480.webp?v=882849c27d0d',
    front: '/beast-game/front/adult-08.v2.webp?v=02a24e6faad7',
  },
  beast_a09: {
    thumb: '/beast-game/thumb/adult-09.v2.webp?v=009753ae1295',
    mid: '/beast-game/thumb/adult-09.v2-480.webp?v=cb5b6c77e039',
    front: '/beast-game/front/adult-09.v2.webp?v=3da781184047',
  },
  beast_a10: {
    thumb: '/beast-game/thumb/adult-10.v2.webp?v=236812463bdc',
    mid: '/beast-game/thumb/adult-10.v2-480.webp?v=c36d2c013af9',
    front: '/beast-game/front/adult-10.v2.webp?v=feca0017e7c9',
  },
  beast_a11: {
    thumb: '/beast-game/thumb/adult-11.v2.webp?v=6b80b63a650c',
    mid: '/beast-game/thumb/adult-11.v2-480.webp?v=0cfd8773fc13',
    front: '/beast-game/front/adult-11.v2.webp?v=4591be6e3802',
  },
  beast_a12: {
    thumb: '/beast-game/thumb/adult-12.v2.webp?v=d909a720a631',
    mid: '/beast-game/thumb/adult-12.v2-480.webp?v=f1e8bd091212',
    front: '/beast-game/front/adult-12.v2.webp?v=f74f885a4c61',
  },
  beast_a13: {
    thumb: '/beast-game/thumb/adult-13.v2.webp?v=9f78e50c201f',
    mid: '/beast-game/thumb/adult-13.v2-480.webp?v=99d90e602eb8',
    front: '/beast-game/front/adult-13.v2.webp?v=3218fcaf4478',
  },
  beast_a14: {
    thumb: '/beast-game/thumb/adult-14.v2.webp?v=1b7fc173a781',
    mid: '/beast-game/thumb/adult-14.v2-480.webp?v=95445b855ac4',
    front: '/beast-game/front/adult-14.v2.webp?v=39f6e680b191',
  },
  beast_a15: {
    thumb: '/beast-game/thumb/adult-15.v2.webp?v=e49edd805c8f',
    mid: '/beast-game/thumb/adult-15.v2-480.webp?v=588998b725f6',
    front: '/beast-game/front/adult-15.v2.webp?v=1051d2759b60',
  },
  beast_a16: {
    thumb: '/beast-game/thumb/adult-16.v2.webp?v=97f8e230546e',
    mid: '/beast-game/thumb/adult-16.v2-480.webp?v=21cbd86cb3f6',
    front: '/beast-game/front/adult-16.v2.webp?v=a8e50c9af267',
  },
  beast_a17: {
    thumb: '/beast-game/thumb/adult-17.v2.webp?v=56d479b8bd4a',
    mid: '/beast-game/thumb/adult-17.v2-480.webp?v=b0617c44bf41',
    front: '/beast-game/front/adult-17.v2.webp?v=b456a1c86899',
  },
  beast_a18: {
    thumb: '/beast-game/thumb/adult-18.v2.webp?v=02c99918bf39',
    mid: '/beast-game/thumb/adult-18.v2-480.webp?v=3ac15ba628e3',
    front: '/beast-game/front/adult-18.v2.webp?v=2030d74cc856',
  },
  beast_a19: {
    thumb: '/beast-game/thumb/adult-19.v2.webp?v=e8414f1ed983',
    mid: '/beast-game/thumb/adult-19.v2-480.webp?v=daed208c5120',
    front: '/beast-game/front/adult-19.v2.webp?v=6d78ba88c5e3',
  },
  beast_a20: {
    thumb: '/beast-game/thumb/adult-20.v2.webp?v=5f649fa9e157',
    mid: '/beast-game/thumb/adult-20.v2-480.webp?v=89fdc6caf7f1',
    front: '/beast-game/front/adult-20.v2.webp?v=f09a20edb2a8',
  },
  beast_a21: {
    thumb: '/beast-game/thumb/adult-21.v2.webp?v=499bb49b28a4',
    mid: '/beast-game/thumb/adult-21.v2-480.webp?v=5458ccf352fa',
    front: '/beast-game/front/adult-21.v2.webp?v=cb9e64d4aada',
  },
  beast_a22: {
    thumb: '/beast-game/thumb/adult-22.v2.webp?v=50f61d737cc1',
    mid: '/beast-game/thumb/adult-22.v2-480.webp?v=dea89e5089af',
    front: '/beast-game/front/adult-22.v2.webp?v=cc34e208a613',
  },
  beast_a23: {
    thumb: '/beast-game/thumb/adult-23.v2.webp?v=8f410d63dedc',
    mid: '/beast-game/thumb/adult-23.v2-480.webp?v=96f42f571358',
    front: '/beast-game/front/adult-23.v2.webp?v=0f1e187fa5f7',
  },
  beast_a24: {
    thumb: '/beast-game/thumb/adult-24.v2.webp?v=4013256d988d',
    mid: '/beast-game/thumb/adult-24.v2-480.webp?v=31a2c2e2d94b',
    front: '/beast-game/front/adult-24.v2.webp?v=acaa839ce8ad',
  },
  beast_a25: {
    thumb: '/beast-game/thumb/adult-25.v2.webp?v=c263f846f689',
    mid: '/beast-game/thumb/adult-25.v2-480.webp?v=e100b73d215d',
    front: '/beast-game/front/adult-25.v2.webp?v=2d81d90a4217',
  },
  beast_a26: {
    thumb: '/beast-game/thumb/adult-26.v2.webp?v=7e0c77a67581',
    mid: '/beast-game/thumb/adult-26.v2-480.webp?v=9779deb408de',
    front: '/beast-game/front/adult-26.v2.webp?v=e0897fce331e',
  },
  beast_a27: {
    thumb: '/beast-game/thumb/adult-27.v2.webp?v=465feddddd9a',
    mid: '/beast-game/thumb/adult-27.v2-480.webp?v=e37309b58439',
    front: '/beast-game/front/adult-27.v2.webp?v=0602d75ae31a',
  },
  beast_a28: {
    thumb: '/beast-game/thumb/adult-28.v2.webp?v=84559117dd9e',
    mid: '/beast-game/thumb/adult-28.v2-480.webp?v=afe04159c3f7',
    front: '/beast-game/front/adult-28.v2.webp?v=5885b0f553c5',
  },
  beast_g_qinglong: {
    thumb: '/beast-game/thumb/guardian-qinglong.v2.webp?v=837f2cc5010f',
    mid: '/beast-game/thumb/guardian-qinglong.v2-480.webp?v=829c1ab6a840',
    front: '/beast-game/front/guardian-qinglong.v2.webp?v=1dab8819ab3f',
  },
  beast_g_zhuque: {
    thumb: '/beast-game/thumb/guardian-zhuque.v2.webp?v=16828f14f76e',
    mid: '/beast-game/thumb/guardian-zhuque.v2-480.webp?v=41e9ff104e64',
    front: '/beast-game/front/guardian-zhuque.v2.webp?v=40c405ecb734',
  },
  beast_g_baihu: {
    thumb: '/beast-game/thumb/guardian-baihu.v2.webp?v=9261ab45150d',
    mid: '/beast-game/thumb/guardian-baihu.v2-480.webp?v=87bd08c78b3d',
    front: '/beast-game/front/guardian-baihu.v2.webp?v=f7b4bba225f1',
  },
  beast_g_xuanwu: {
    thumb: '/beast-game/thumb/guardian-xuanwu.v2.webp?v=56a99f9b197b',
    mid: '/beast-game/thumb/guardian-xuanwu.v2-480.webp?v=3607859f81a3',
    front: '/beast-game/front/guardian-xuanwu.v2.webp?v=e95f0ca1405e',
  },
};

/** 對不到宿位也不在四象表內的未知卡才不印武器列（現有 60 張都有）。 */
function hasDesignedWeapon(weapon: { part: string }): boolean {
  return weapon.part !== '四象本體';
}

export interface BeastTileCard {
  id: string;
  name: string;
  thumbnail: string;
  element: string;
  /** 以下都是「折起來」的內容，格子上不顯示。 */
  role?: string;
  tier?: string;
  skillName?: string;
  description?: string;
  passive?: string;
  story?: string;
  stats?: { hp: number; attack: number; defense: number; speed: number };
  /** 高解析卡面。標準卡在高密度螢幕上用它，避免 256px 縮圖被放大而糊掉。 */
  front?: string;
  /** 技能耗氣（來自戰鬥核心 profile，只照印）。 */
  cost?: number;
}

const ELEMENT_COLOR: Record<string, string> = {
  SPACE: '#e2e8f0', AIR: '#6ee7b7', WATER: '#7dd3fc', FIRE: '#fda4af', EARTH: '#fcd34d',
};
const ELEMENT_LABEL: Record<string, string> = {
  SPACE: '空', AIR: '風', WATER: '水', FIRE: '火', EARTH: '地',
};

/** 一格卡片。只有卡面、名字、一枚元素色點。 */
export function BeastCardTile({
  card, selected, owned, onOpen,
}: {
  card: BeastTileCard;
  selected?: boolean;
  owned?: boolean;
  onOpen: () => void;
}) {
  return <FrameV1Tile card={card} selected={selected} owned={owned} onOpen={onOpen} />;
}

/**
 * 標準卡面（集換式卡牌版式）。
 *
 * 由上到下：名字列 → 圖窗 → 武器列 → 技能列。像一張正規的實體卡：
 * 外框是一圈素面黃銅，裡面是米白卡紙，字用墨色——不靠發光撐質感。
 *
 * 【武器與技能】
 * 武器名取自 lib/beast-game/weapons.ts（宿位部位＋級數），那份檔案明定武器只是演出、
 * 不進傷害公式（規格第十二條）。所以卡面上真正「有作用」的那一行是技能：
 * 名稱、耗氣、效果全部照戰鬥核心 profile 印出，不在這裡改數字、也不另寫效果。
 */
const ELEMENT_INK: Record<string, string> = {
  SPACE: '#6b6478', AIR: '#4f7f52', WATER: '#2f6f8f', FIRE: '#b4462f', EARTH: '#9a7432',
};


/**
 * 自研卡框 v1（2026-10-23，ref: fused benchmark — 現代全幅插畫卡 × 早期典藏卡的象牙邊金線）。
 * 體／攻 = 卡檔 cards/beasts/*.ts 的原始 stats，與詳情頁相同。
 * 我們自己的設計語彙：五行圖示取代屬性符號、四象／二十八宿紋飾、中文字體名稱、自訂稀有度記號。
 * 只顯示既有資料（stats、guide.wuxing、skill），不新增數值、不改規則。
 * 範圍：目前只開給四象守護（業主看過後再決定是否擴到成獸）。
 */
const CARD_FILE_STATS = CARD_FACE_STATS;
const WX_SHENG_NEXT: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const WX_KE_NEXT: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const WX_INK: Record<string, string> = { 木: '#3f7a4a', 火: '#b0412c', 土: '#9a7432', 金: '#a88a3c', 水: '#2c5f86' };
function wxGeneratedBy(w: string): string | undefined {
  return Object.keys(WX_SHENG_NEXT).find((k) => WX_SHENG_NEXT[k] === w);
}
export function usesFrameV1(cardId: string): boolean {
  // 2026-10-23 業主批准：以四象卡框為基準，套到 56 張星宿神獸（成獸＋幼子）。
  return /^beast_(g_[a-z]+|[ay]\d{2})$/.test(cardId);
}
const FV1_STAGE: Record<string, string> = { GUARDIAN: '四象', ADULT: '成獸', YOUNG: '幼子' };
const FV1_MARK: Record<string, string> = { GUARDIAN: '◆◆◆', ADULT: '◆◆', YOUNG: '◆' };

/**
 * 新卡面（自研卡框 v1）的「非按鈕版」。
 * 選卡頁以外的畫面（牌庫挑選、手牌、出戰席、賭注…）要放同一張新卡面，
 * 但那些地方本身已是按鈕，按鈕不能包按鈕，所以用這個純顯示版嵌進去——
 * 資料、字型、金框、技能列全部與 FrameV1Tile 同一份實作，不另寫第二套。
 */
export function BeastCardFace({ card, owned }: { card: Omit<BeastTileCard, 'element'> & { element?: string }; owned?: boolean }) {
  return <FrameV1Tile card={{ ...card, element: card.element ?? '' }} owned={owned} onOpen={() => undefined} face />;
}

/** 小卡（約 70px 以下）放不下字時用：回傳新版卡圖路徑，搭配 .metal 金框。查不到才退回原圖。 */
export function cardArtThumb(cardId: string): string {
  return ART_V2[cardId]?.front ?? '';
}

/**
 * 小卡縮圖（新版）：用新版卡圖加 .metal 金框。給放不下整張新卡面（名字、體力、技能）的小格子用，
 * 讓六十張卡在所有畫面都是同一副金框與同一版卡圖。查不到新版圖才退回原圖。
 */
export function BeastThumb({ id, thumbnail, alt = '', className, draggable }: {
  id: string; thumbnail: string; alt?: string; className?: string; draggable?: boolean; loading?: 'lazy' | 'eager';
}) {
  const book = useGuideBook();
  const guide = book?.cards[id];
  return <span data-card-thumbnail className={[styles.fullFaceThumb, className].filter(Boolean).join(' ')} draggable={draggable}>
    <BeastCardFace card={{ id, thumbnail, name: guide?.name ?? alt, element: guide?.element }} />
  </span>;
}

function FrameV1Tile({
  card, selected, owned, onOpen, face,
}: {
  card: BeastTileCard;
  selected?: boolean;
  owned?: boolean;
  onOpen: () => void;
  face?: boolean;
}) {
  const book = useGuideBook();
  const guide = book?.cards[card.id];
  const art = ART_V2[card.id];
  // 只讀卡檔原始值；查不到就不顯示（不退回對戰正規化值）。
  const stats = CARD_FILE_STATS[card.id];
  // 幼子：顯示卡檔自己的技能（skills[0]）名稱與說明；成獸／四象維持原樣。
  const ownSkill = CARD_FACE_SKILL[card.id];
  const skillName = ownSkill?.name ?? card.skillName ?? guide?.skill.name;
  const skillText = ownSkill?.description ?? card.description ?? guide?.skill.description;
  const cost = CARD_FILE_STATS[card.id]?.cost; // 卡檔原始 cost，不用對戰正規化值
  const shortSkill = skillName?.split('・').pop();
  const wx = guide?.wuxing;
  const ke = wx ? WX_KE_NEXT[wx] : undefined;
  const genBy = wx ? wxGeneratedBy(wx) : undefined;
  const role = card.role ?? guide?.role;
  const tier = tierOf(card.id);
  const isGuardian = tier === 'GUARDIAN';
  const group = guardianOf(card.id);
  const faceName = card.name.replace(/・幼子$/, '');
  const src = art?.thumb;
  const srcSet = art ? `${art.thumb} 256w, ${art.mid} 480w, ${art.front} 720w` : undefined;
  if (!art) return <span role="status">暫時無法取得</span>;
  const Root = (face ? 'span' : 'button') as 'button';
  const rootProps = face
    ? { className: [styles.fv1Tile, styles.fv1Face].join(' ') }
    : {
        type: 'button' as const,
        className: [styles.tile, styles.stdTile, styles.fv1Tile, selected ? styles.stdSelected : ''].filter(Boolean).join(' '),
        onClick: onOpen,
        'aria-label': `${card.name}${stats ? `，體力${stats.hp}，攻擊${stats.attack}` : ''}${wx ? `，五行${wx}` : ''}${shortSkill ? `，技能${shortSkill}` : ''}${selected ? '，已選取' : ''}`,
        'aria-pressed': selected,
        'data-card-style': 'standard',
      };
  return (
    <Root
      {...rootProps}
      data-art={art ? 'v2' : undefined}
      data-frame="v1"
      style={{ '--fv1-wx': wx ? WX_INK[wx] : '#8a7a5a' } as React.CSSProperties}
    >
      <span className={`${frame.card} ${styles.fv1Card}`}>
        <span className={styles.fv1Inner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.fv1Back} src={src} srcSet={srcSet} sizes="(max-width: 480px) 46vw, 200px" alt="" aria-hidden="true" loading="lazy" decoding="async" />
          <span className={styles.fv1Head}>
            <span className={styles.fv1Stage}>{FV1_STAGE[tier]}</span>
            <span className={styles.fv1Name}>{faceName}</span>
            {stats && <span className={styles.fv1Hp}><small>體</small>{stats.hp}</span>}
            {wx && <span className={styles.fv1Wx} aria-hidden="true">{wx}</span>}
            {owned && <span className={styles.stdOwned}>藏</span>}
          </span>
          <span className={styles.fv1Window}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.stdArt}
              style={ART_V2_POS[card.id] != null ? { objectPosition: `center ${ART_V2_POS[card.id]}%` } : undefined}
              src={src}
              srcSet={srcSet}
              sizes="(max-width: 480px) 46vw, 200px"
              alt=""
              loading="lazy"
              decoding="async"
            />
          </span>
          <span className={styles.fv1Panel}>
            {shortSkill && (
              <span className={styles.fv1Atk}>
                {typeof cost === 'number' && <span className={styles.fv1Cost} aria-hidden="true">{cost}</span>}
                <span className={styles.fv1SkillName}>{shortSkill}</span>
                {stats && <span className={styles.fv1Dmg}><small>攻</small>{stats.attack}</span>}
              </span>
            )}
            {skillText && <span className={styles.fv1Text}>{skillText}</span>}
            {wx && (
              <span className={styles.fv1Rel}>
                {ke && <span>剋<b style={{ color: WX_INK[ke] }}>{ke}</b></span>}
                {genBy && <span>生我<b style={{ color: WX_INK[genBy] }}>{genBy}</b></span>}
              </span>
            )}
            <span className={styles.fv1Foot}>
              <span className={styles.fv1Rarity} aria-label={TIER_LABEL[tier]}>{FV1_MARK[tier]}</span>
              {role && <span>{role}</span>}
              <span>{isGuardian ? (group?.direction ?? '') : (group?.name ?? '')}</span>
            </span>
          </span>
        </span>
      </span>
    </Root>
  );
}

/**
 * 底部詳情。
 *
 * 從下方升起，蓋住一部分畫面但不整頁跳走——客戶還看得到自己剛才在哪裡。
 * Esc 與點背景都能關；手機沒有 Esc，所以背景一定要能點。
 */
export function CardDetailSheet({
  card, owned, note, actionLabel, onAction, onClose,
}: {
  card: BeastTileCard;
  owned?: boolean;
  /** 額外一行狀態，例如成長進度。沒有就不顯示。 */
  note?: string;
  /** 主要動作，例如「選入隊伍」。沒有就只顯示關閉。 */
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}) {
  const book = useGuideBook();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <button type="button" className={styles.backdrop} aria-label="關閉卡片詳情" onClick={onClose} />
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label={`${card.name} 詳細資料`} data-card-sheet>
        <div className={styles.sheetHead}>
          <div className={`${styles.sheetArt} ${frame.card} ${frame.metal}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <BeastCardFace card={card} />
          </div>
          <div className={styles.sheetTitle}>
            <strong>{card.name}</strong>
            <span>
              {/*
                《四大神獸》歸屬：二十八宿本來就每七宿屬一象，
                不是新編的分組，資料裡的 season 就記著。
              */}
              {guardianOf(card.id)?.name ?? ''}
              {' · '}
              {ELEMENT_LABEL[card.element] ?? card.element}
              {' · '}
              {TIER_LABEL[tierOf(card.id)]}
              {card.role ? ` · ${card.role}` : ''}
              {owned ? ' · 已收藏' : ''}
            </span>
          </div>
        </div>

        {note && <p className={styles.block}><strong>狀態</strong>{note}</p>}

        {(() => {
          const weapon = weaponFor(card.id, card.name, (card.element in ELEMENT_LABEL ? card.element : 'SPACE') as BeastElement);
          if (!hasDesignedWeapon(weapon)) return null;
          return (
            <p className={styles.block} data-card-weapon>
              <strong>武器・{weapon.name}（{weapon.part}・{weapon.weaponClass}）</strong>
              {weapon.motion}武器是出招時的外觀演出，實際效果以下方技能為準。
            </p>
          );
        })()}
        <BattlePowerAnalysis cardId={card.id} />
        {(() => { const guide = book?.cards[card.id]; return guide ? <p className={styles.block}><strong>{guide.skill.name}・耗氣 {guide.skill.cost}</strong>{guide.skill.description}</p> : null; })()}

        {actionLabel && onAction && (
          <button
            type="button"
            className={styles.close}
            style={{ background: '#ffdfa4', color: '#302113', borderColor: 'transparent' }}
            onClick={() => { onAction(); onClose(); }}
          >
            {actionLabel}
          </button>
        )}
        <button type="button" className={styles.close} onClick={onClose}>關閉</button>
      </section>
    </>
  );
}

export default BeastCardTile;
