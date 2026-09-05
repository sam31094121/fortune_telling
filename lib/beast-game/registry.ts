/**
 * 神獸卡遊戲｜卡片登錄中心（Card Registry）
 * ============================================================================
 *
 * 規格第十七條：卡片放在 cards/，由 CardRegistry 統一讀取。
 * 規格第十八條：每新增一張卡都要通過驗證，有錯就禁止加入正式牌庫。
 *
 * 所以這裡做兩件事：把卡片收起來、把不合格的擋在外面。
 * 「擋在外面」是真的擋——invalid 的卡不會進 registry，
 * 而不是印個警告然後照樣讓它上場。
 */

import { allSkillIds } from '../../cards/skills';
import bi_shui_yu_young from '../../cards/beasts/bi-shui-yu-young';
import bi_shui_yu from '../../cards/beasts/bi-shui-yu';
import bi_yue_wu_young from '../../cards/beasts/bi-yue-wu-young';
import bi_yue_wu from '../../cards/beasts/bi-yue-wu';
import di_tu_he_young from '../../cards/beasts/di-tu-he-young';
import di_tu_he from '../../cards/beasts/di-tu-he';
import dou_mu_xie_young from '../../cards/beasts/dou-mu-xie-young';
import dou_mu_xie from '../../cards/beasts/dou-mu-xie';
import fang_ri_tu_young from '../../cards/beasts/fang-ri-tu-young';
import fang_ri_tu from '../../cards/beasts/fang-ri-tu';
import guardian_baihu from '../../cards/beasts/guardian-baihu';
import guardian_qinglong from '../../cards/beasts/guardian-qinglong';
import guardian_xuanwu from '../../cards/beasts/guardian-xuanwu';
import guardian_zhuque from '../../cards/beasts/guardian-zhuque';
import gui_jin_yang_young from '../../cards/beasts/gui-jin-yang-young';
import gui_jin_yang from '../../cards/beasts/gui-jin-yang';
import ji_shui_bao_young from '../../cards/beasts/ji-shui-bao-young';
import ji_shui_bao from '../../cards/beasts/ji-shui-bao';
import jiao_mu_jiao_young from '../../cards/beasts/jiao-mu-jiao-young';
import jiao_mu_jiao from '../../cards/beasts/jiao-mu-jiao';
import jing_mu_an_young from '../../cards/beasts/jing-mu-an-young';
import jing_mu_an from '../../cards/beasts/jing-mu-an';
import kang_jin_long_young from '../../cards/beasts/kang-jin-long-young';
import kang_jin_long from '../../cards/beasts/kang-jin-long';
import kui_mu_lang_young from '../../cards/beasts/kui-mu-lang-young';
import kui_mu_lang from '../../cards/beasts/kui-mu-lang';
import liu_tu_zhang_young from '../../cards/beasts/liu-tu-zhang-young';
import liu_tu_zhang from '../../cards/beasts/liu-tu-zhang';
import lou_jin_gou_young from '../../cards/beasts/lou-jin-gou-young';
import lou_jin_gou from '../../cards/beasts/lou-jin-gou';
import mao_ri_ji_young from '../../cards/beasts/mao-ri-ji-young';
import mao_ri_ji from '../../cards/beasts/mao-ri-ji';
import niu_jin_niu_young from '../../cards/beasts/niu-jin-niu-young';
import niu_jin_niu from '../../cards/beasts/niu-jin-niu';
import nu_tu_fu_young from '../../cards/beasts/nu-tu-fu-young';
import nu_tu_fu from '../../cards/beasts/nu-tu-fu';
import shen_shui_yuan_young from '../../cards/beasts/shen-shui-yuan-young';
import shen_shui_yuan from '../../cards/beasts/shen-shui-yuan';
import shi_huo_zhu_young from '../../cards/beasts/shi-huo-zhu-young';
import shi_huo_zhu from '../../cards/beasts/shi-huo-zhu';
import wei_huo_hu_young from '../../cards/beasts/wei-huo-hu-young';
import wei_huo_hu from '../../cards/beasts/wei-huo-hu';
import wei_tu_zhi_young from '../../cards/beasts/wei-tu-zhi-young';
import wei_tu_zhi from '../../cards/beasts/wei-tu-zhi';
import wei_yue_yan_young from '../../cards/beasts/wei-yue-yan-young';
import wei_yue_yan from '../../cards/beasts/wei-yue-yan';
import xin_yue_hu_young from '../../cards/beasts/xin-yue-hu-young';
import xin_yue_hu from '../../cards/beasts/xin-yue-hu';
import xing_ri_ma_young from '../../cards/beasts/xing-ri-ma-young';
import xing_ri_ma from '../../cards/beasts/xing-ri-ma';
import xu_ri_shu_young from '../../cards/beasts/xu-ri-shu-young';
import xu_ri_shu from '../../cards/beasts/xu-ri-shu';
import yi_huo_she_young from '../../cards/beasts/yi-huo-she-young';
import yi_huo_she from '../../cards/beasts/yi-huo-she';
import zhang_yue_lu_young from '../../cards/beasts/zhang-yue-lu-young';
import zhang_yue_lu from '../../cards/beasts/zhang-yue-lu';
import zhen_shui_yin_young from '../../cards/beasts/zhen-shui-yin-young';
import zhen_shui_yin from '../../cards/beasts/zhen-shui-yin';
import zi_huo_hou_young from '../../cards/beasts/zi-huo-hou-young';
import zi_huo_hou from '../../cards/beasts/zi-huo-hou';
import { validateCard, type BeastCard, type CardValidationIssue } from './schema';

/**
 * 正式牌庫：六十張。
 *
 *   二十八宿幼子 28 ＋ 二十八宿成獸 28 ＋ 四象 4
 *
 * 全部用既有素材，沒有新造任何一隻神獸。
 * 要加卡就在這個陣列加一行，其他什麼都不用改；
 * 驗證沒過的卡不會進來（下面 buildRegistry 會把它擋在外面）。
 */
const REGISTERED: BeastCard[] = [
  bi_shui_yu_young,
  bi_shui_yu,
  bi_yue_wu_young,
  bi_yue_wu,
  di_tu_he_young,
  di_tu_he,
  dou_mu_xie_young,
  dou_mu_xie,
  fang_ri_tu_young,
  fang_ri_tu,
  guardian_baihu,
  guardian_qinglong,
  guardian_xuanwu,
  guardian_zhuque,
  gui_jin_yang_young,
  gui_jin_yang,
  ji_shui_bao_young,
  ji_shui_bao,
  jiao_mu_jiao_young,
  jiao_mu_jiao,
  jing_mu_an_young,
  jing_mu_an,
  kang_jin_long_young,
  kang_jin_long,
  kui_mu_lang_young,
  kui_mu_lang,
  liu_tu_zhang_young,
  liu_tu_zhang,
  lou_jin_gou_young,
  lou_jin_gou,
  mao_ri_ji_young,
  mao_ri_ji,
  niu_jin_niu_young,
  niu_jin_niu,
  nu_tu_fu_young,
  nu_tu_fu,
  shen_shui_yuan_young,
  shen_shui_yuan,
  shi_huo_zhu_young,
  shi_huo_zhu,
  wei_huo_hu_young,
  wei_huo_hu,
  wei_tu_zhi_young,
  wei_tu_zhi,
  wei_yue_yan_young,
  wei_yue_yan,
  xin_yue_hu_young,
  xin_yue_hu,
  xing_ri_ma_young,
  xing_ri_ma,
  xu_ri_shu_young,
  xu_ri_shu,
  yi_huo_she_young,
  yi_huo_she,
  zhang_yue_lu_young,
  zhang_yue_lu,
  zhen_shui_yin_young,
  zhen_shui_yin,
  zi_huo_hou_young,
  zi_huo_hou,
];

export interface RegistryBuildResult {
  cards: BeastCard[];
  rejected: Array<{ card: BeastCard; issues: CardValidationIssue[] }>;
  issues: CardValidationIssue[];
}

/**
 * 建 registry。
 *
 * assetExists 由呼叫端注入——瀏覽器裡沒有檔案系統，只有測試與建置時才驗圖片。
 * 這樣「圖片存在」這一條在 CI 是硬的，在執行期不會白白拖慢啟動。
 */
export function buildRegistry(options?: { assetExists?: (path: string) => boolean }): RegistryBuildResult {
  const knownSkillIds = allSkillIds();
  const knownCardIds = new Set<string>();
  const cards: BeastCard[] = [];
  const rejected: RegistryBuildResult['rejected'] = [];
  const issues: CardValidationIssue[] = [];

  for (const card of REGISTERED) {
    const cardIssues = validateCard(card, { knownSkillIds, knownCardIds, assetExists: options?.assetExists });
    if (cardIssues.length > 0) {
      rejected.push({ card, issues: cardIssues });
      issues.push(...cardIssues);
      continue;
    }
    knownCardIds.add(card.id);
    cards.push(card);
  }

  return { cards, rejected, issues };
}

let cached: RegistryBuildResult | null = null;

/** 執行期用的 registry（不驗圖片存在，那是 CI 的工作）。 */
export function cardRegistry(): RegistryBuildResult {
  if (!cached) cached = buildRegistry();
  return cached;
}

export function getCard(id: string): BeastCard | undefined {
  return cardRegistry().cards.find((card) => card.id === id);
}

/** 正式牌庫。被擋下的卡不會出現在這裡。 */
export function playableCards(): BeastCard[] {
  return cardRegistry().cards;
}
