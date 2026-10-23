/**
 * 卡面數值（自研卡框 v1 用）：直接讀 cards/beasts/*.ts 的原始 cost / stats。
 * 不經 fighter() 或戰鬥正規化，只讀不改。
 */
import c_bi_shui_yu from '@/cards/beasts/bi-shui-yu';
import c_bi_shui_yu_young from '@/cards/beasts/bi-shui-yu-young';
import c_bi_yue_wu from '@/cards/beasts/bi-yue-wu';
import c_bi_yue_wu_young from '@/cards/beasts/bi-yue-wu-young';
import c_di_tu_he from '@/cards/beasts/di-tu-he';
import c_di_tu_he_young from '@/cards/beasts/di-tu-he-young';
import c_dou_mu_xie from '@/cards/beasts/dou-mu-xie';
import c_dou_mu_xie_young from '@/cards/beasts/dou-mu-xie-young';
import c_fang_ri_tu from '@/cards/beasts/fang-ri-tu';
import c_fang_ri_tu_young from '@/cards/beasts/fang-ri-tu-young';
import c_guardian_baihu from '@/cards/beasts/guardian-baihu';
import c_guardian_qinglong from '@/cards/beasts/guardian-qinglong';
import c_guardian_xuanwu from '@/cards/beasts/guardian-xuanwu';
import c_guardian_zhuque from '@/cards/beasts/guardian-zhuque';
import c_gui_jin_yang from '@/cards/beasts/gui-jin-yang';
import c_gui_jin_yang_young from '@/cards/beasts/gui-jin-yang-young';
import c_ji_shui_bao from '@/cards/beasts/ji-shui-bao';
import c_ji_shui_bao_young from '@/cards/beasts/ji-shui-bao-young';
import c_jiao_mu_jiao from '@/cards/beasts/jiao-mu-jiao';
import c_jiao_mu_jiao_young from '@/cards/beasts/jiao-mu-jiao-young';
import c_jing_mu_an from '@/cards/beasts/jing-mu-an';
import c_jing_mu_an_young from '@/cards/beasts/jing-mu-an-young';
import c_kang_jin_long from '@/cards/beasts/kang-jin-long';
import c_kang_jin_long_young from '@/cards/beasts/kang-jin-long-young';
import c_kui_mu_lang from '@/cards/beasts/kui-mu-lang';
import c_kui_mu_lang_young from '@/cards/beasts/kui-mu-lang-young';
import c_liu_tu_zhang from '@/cards/beasts/liu-tu-zhang';
import c_liu_tu_zhang_young from '@/cards/beasts/liu-tu-zhang-young';
import c_lou_jin_gou from '@/cards/beasts/lou-jin-gou';
import c_lou_jin_gou_young from '@/cards/beasts/lou-jin-gou-young';
import c_mao_ri_ji from '@/cards/beasts/mao-ri-ji';
import c_mao_ri_ji_young from '@/cards/beasts/mao-ri-ji-young';
import c_niu_jin_niu from '@/cards/beasts/niu-jin-niu';
import c_niu_jin_niu_young from '@/cards/beasts/niu-jin-niu-young';
import c_nu_tu_fu from '@/cards/beasts/nu-tu-fu';
import c_nu_tu_fu_young from '@/cards/beasts/nu-tu-fu-young';
import c_shen_shui_yuan from '@/cards/beasts/shen-shui-yuan';
import c_shen_shui_yuan_young from '@/cards/beasts/shen-shui-yuan-young';
import c_shi_huo_zhu from '@/cards/beasts/shi-huo-zhu';
import c_shi_huo_zhu_young from '@/cards/beasts/shi-huo-zhu-young';
import c_wei_huo_hu from '@/cards/beasts/wei-huo-hu';
import c_wei_huo_hu_young from '@/cards/beasts/wei-huo-hu-young';
import c_wei_tu_zhi from '@/cards/beasts/wei-tu-zhi';
import c_wei_tu_zhi_young from '@/cards/beasts/wei-tu-zhi-young';
import c_wei_yue_yan from '@/cards/beasts/wei-yue-yan';
import c_wei_yue_yan_young from '@/cards/beasts/wei-yue-yan-young';
import c_xin_yue_hu from '@/cards/beasts/xin-yue-hu';
import c_xin_yue_hu_young from '@/cards/beasts/xin-yue-hu-young';
import c_xing_ri_ma from '@/cards/beasts/xing-ri-ma';
import c_xing_ri_ma_young from '@/cards/beasts/xing-ri-ma-young';
import c_xu_ri_shu from '@/cards/beasts/xu-ri-shu';
import c_xu_ri_shu_young from '@/cards/beasts/xu-ri-shu-young';
import c_yi_huo_she from '@/cards/beasts/yi-huo-she';
import c_yi_huo_she_young from '@/cards/beasts/yi-huo-she-young';
import c_zhang_yue_lu from '@/cards/beasts/zhang-yue-lu';
import c_zhang_yue_lu_young from '@/cards/beasts/zhang-yue-lu-young';
import c_zhen_shui_yin from '@/cards/beasts/zhen-shui-yin';
import c_zhen_shui_yin_young from '@/cards/beasts/zhen-shui-yin-young';
import c_zi_huo_hou from '@/cards/beasts/zi-huo-hou';
import c_zi_huo_hou_young from '@/cards/beasts/zi-huo-hou-young';

const ALL = [c_bi_shui_yu, c_bi_shui_yu_young, c_bi_yue_wu, c_bi_yue_wu_young, c_di_tu_he, c_di_tu_he_young, c_dou_mu_xie, c_dou_mu_xie_young, c_fang_ri_tu, c_fang_ri_tu_young, c_guardian_baihu, c_guardian_qinglong, c_guardian_xuanwu, c_guardian_zhuque, c_gui_jin_yang, c_gui_jin_yang_young, c_ji_shui_bao, c_ji_shui_bao_young, c_jiao_mu_jiao, c_jiao_mu_jiao_young, c_jing_mu_an, c_jing_mu_an_young, c_kang_jin_long, c_kang_jin_long_young, c_kui_mu_lang, c_kui_mu_lang_young, c_liu_tu_zhang, c_liu_tu_zhang_young, c_lou_jin_gou, c_lou_jin_gou_young, c_mao_ri_ji, c_mao_ri_ji_young, c_niu_jin_niu, c_niu_jin_niu_young, c_nu_tu_fu, c_nu_tu_fu_young, c_shen_shui_yuan, c_shen_shui_yuan_young, c_shi_huo_zhu, c_shi_huo_zhu_young, c_wei_huo_hu, c_wei_huo_hu_young, c_wei_tu_zhi, c_wei_tu_zhi_young, c_wei_yue_yan, c_wei_yue_yan_young, c_xin_yue_hu, c_xin_yue_hu_young, c_xing_ri_ma, c_xing_ri_ma_young, c_xu_ri_shu, c_xu_ri_shu_young, c_yi_huo_she, c_yi_huo_she_young, c_zhang_yue_lu, c_zhang_yue_lu_young, c_zhen_shui_yin, c_zhen_shui_yin_young, c_zi_huo_hou, c_zi_huo_hou_young];

export const CARD_FACE_STATS: Record<string, { hp: number; attack: number; cost: number }> = Object.fromEntries(
  ALL.map((c) => [c.id, { hp: c.stats.hp, attack: c.stats.attack, cost: c.cost }]),
);
