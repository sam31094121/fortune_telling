/**
 * 《神煞易經》整盤合看：神煞組合（後端運算，前端只照印）
 * ============================================================================
 * 業主定案 2026-09-28：「解盤不要逐項各講各的，要像老師在看整張盤。」
 * 例：驛馬＋將星同柱、桃花＋紅艷＋沐浴。
 *
 * 每條組合規則是本派的讀盤邏輯：只根據「命中了哪些神煞、落在哪一柱」判斷，
 * 不重算四柱、不加任何新的神煞。凶煞組合一樣只講提醒與轉化，不嚇人、不下定論。
 */
import type { ShenShaTone } from './iching-shensha-teacher-readings';

export interface ComboHit { id: string; name: string; pillar: string; tone?: ShenShaTone }
export interface ShenShaCombo { id: string; title: string; members: string[]; pillar: string | null; text: string }

interface ComboRule {
  id: string; title: string;
  /** 同柱：成員需落在同一柱；整盤：成員分布在整張盤即可。 */
  scope: 'same-pillar' | 'chart';
  /** 至少要命中幾個成員。 */
  min: number;
  members: string[];
  /** 需同時有這一組的至少一個（例：德星＋提醒類）。 */
  withTone?: ShenShaTone;
  /** 這些成員必須在場（例：遠方的緣分一定要有驛馬）。 */
  require?: string[];
  /** companions：同柱中符合 withTone 的神煞名稱（德星化煞用來點名是哪些提醒）。 */
  text: (names: string[], pillar: string | null, companions?: string[]) => string;
  /** 同柱規則在多柱成立時合成一組（客人審查：同一段話重複三次像套版）。 */
  merged?: (parts: { pillar: string; names: string[]; companions: string[] }[]) => string;
}

/** 上鞍出征只說盤上真的有的那幾步。 */
const MOUNT_STEPS: ReadonlyArray<readonly [string, string]> = [['將星', '點兵'], ['攀鞍', '上鞍'], ['驛馬', '出發'], ['進神', '趁勢']];

const DE_STARS = ['tiande', 'yuede', 'tiandehe', 'yuedehe', 'longde', 'ride'];

export const SHENSHA_COMBO_RULES: ComboRule[] = [
  { id: 'march-leader', title: '奔走中帶兵', scope: 'same-pillar', min: 2, members: ['yima', 'jiangxing'],
    text: (_n, p) => `驛馬與將星同在${p}：一邊奔走，一邊帶隊，這是「在移動中建立影響力」的格局。出差、開拓、帶新團隊，最能發揮；記得先定方向再出發。` },
  { id: 'charm-trio', title: '魅力匯聚', scope: 'chart', min: 2, members: ['taohua', 'waiTaohua', 'hongyan', 'muyu'],
    text: n => `${n.join('、')}同時出現：人緣與魅力特別旺，容易被看見、被喜歡。這是天賦，也是功課——感情裡真誠清楚、把界線說明白，魅力才會成為福氣。` },
  { id: 'noble-pair', title: '貴人相逢', scope: 'chart', min: 2, members: ['tianyi', 'tiande', 'yuede', 'tiandehe', 'yuedehe'],
    text: n => `${n.join('、')}一起出現：貴人星不只一顆，遇到困難時常有人伸手。平常多結善緣、守信用，貴人記得的是你的為人。` },
  { id: 'de-softens', title: '德星化煞', scope: 'same-pillar', min: 1, members: DE_STARS, withTone: '提醒',
    text: (n, p, c = []) => `${p}的${n.join('、')}與${c.join('、')}同柱：本派讀作「有德護身」，這一柱的關卡雖然存在，但常有轉圜的餘地。守住善念與分寸，就是最好的化解。`,
    merged: parts => `${parts.map(x => `${x.pillar}的${x.names.join('、')}護著${x.companions.join('、')}`).join('；')}：本派讀作「有德護身」，這幾柱的關卡雖然存在，但都有德星在旁，常有轉圜的餘地。守住善念與分寸，就是最好的化解。` },
  { id: 'edge-and-command', title: '鋒芒與權柄', scope: 'same-pillar', min: 2, members: ['yangren', 'jiangxing', 'kuigang', 'jinshen'],
    text: (n, p) => `${n.join('、')}同在${p}：魄力與領導力都強，是能扛大事的組合。剛上加剛時，更要學會放軟聲音，力量才會被接受。` },
  { id: 'scholar', title: '書香與文思', scope: 'chart', min: 2, members: ['wenchang', 'xuetang', 'yuekong', 'huagai', 'liuxiu', 'shiling'],
    text: n => `${n.join('、')}一起出現：學習力、理解力與表達力兼具，適合走一條需要持續精進的專業路。把想法寫下來，你的文思就是機會。` },
  { id: 'solitary-depth', title: '孤高與靈性', scope: 'chart', min: 2, members: ['huagai', 'guchen', 'guasu', 'gejiao'],
    text: n => `${n.join('、')}同時出現：你需要比別人更多的獨處，才能沉澱與充電，這是深度的來源。只是別讓獨處變成孤單——固定和信任的人保持聯繫。` },
  { id: 'livelihood', title: '衣食有底', scope: 'chart', min: 2, members: ['lushen', 'anlu', 'gonglu', 'jinyu', 'tianchu', 'jinkui', 'guoyin'],
    text: n => `${n.join('、')}一起出現：衣食與資源有根基，靠自己的本事就能站穩。你的財不是來得快，而是留得住；先存再花，底氣會越來越厚。` },
  { id: 'busy-mind', title: '心思深重', scope: 'chart', min: 2, members: ['yuanchen', 'wangshen', 'kongwang', 'jielu', 'tuishen'],
    text: n => `${n.join('、')}同時出現：心裡的事多，容易想太多或擔心還沒發生的事。把念頭寫下來、分成能做和放下兩欄，心就會定下來。` },
  { id: 'outer-waves', title: '外來的風浪', scope: 'chart', min: 2, members: ['jiesha', 'wugui', 'zaisha', 'tiangou', 'suipo'],
    text: n => `${n.join('、')}一起出現：外在的變數與人事雜音較多，不是你做錯，而是要多一道防護。重要的事寫清楚、留備案，風浪來了就只是轉個彎。` },
  { id: 'distant-romance', title: '遠方的緣分', scope: 'same-pillar', min: 2, members: ['yima', 'taohua', 'waiTaohua', 'hongyan'], require: ['yima'],
    text: (n, p) => `${n.join('、')}同在${p}：緣分常在移動中出現——出差、旅行、搬遷，都可能遇見重要的人。` },
  // 第七批融會貫通：將星（點兵）→攀鞍（上鞍）→驛馬（出發），十二神煞一路相連；一定要有攀鞍。
  { id: 'mount-and-ride', title: '上鞍出征', scope: 'chart', min: 2, members: ['jiangxing', 'panan', 'yima', 'jinshenDay'], require: ['panan'],
    text: n => `${n.join('、')}一起出現：${MOUNT_STEPS.filter(([name]) => n.includes(name)).map(([, step]) => step).join('、')}，是一路往前推進的氣勢。機會來時先把位子坐穩，再往前衝；準備好的人，出發才不會回頭。` },
  { id: 'care-and-rest', title: '照顧人也照顧自己', scope: 'chart', min: 2, members: ['tianyiDoctor', 'bingfu', 'pima'],
    text: n => `${n.join('、')}一起出現：你很會照顧別人，也容易把別人的擔子扛在自己身上。先照顧好自己，這份溫暖才流得長。` },
];

/** 依本派組合規則，從整張盤的命中神煞找出所有成立的組合。 */
export function findShenShaCombos(hits: ComboHit[]): ShenShaCombo[] {
  const pillars = [...new Set(hits.map(h => h.pillar))];
  const combos: ShenShaCombo[] = [];
  for (const rule of SHENSHA_COMBO_RULES) {
    if (rule.scope === 'chart') {
      const members = hits.filter(h => rule.members.includes(h.id));
      const names = [...new Set(members.map(m => m.name))];
      if (rule.require && !rule.require.every(id => hits.some(h => h.id === id))) continue;
      if (names.length >= rule.min) combos.push({ id: rule.id, title: rule.title, members: names, pillar: null, text: rule.text(names, null) });
      continue;
    }
    const parts: { pillar: string; names: string[]; companions: string[] }[] = [];
    for (const pillar of pillars) {
      const inPillar = hits.filter(h => h.pillar === pillar);
      const names = [...new Set(inPillar.filter(h => rule.members.includes(h.id)).map(h => h.name))];
      if (names.length < rule.min) continue;
      const companions = rule.withTone ? [...new Set(inPillar.filter(h => h.tone === rule.withTone).map(h => h.name))] : [];
      if (rule.withTone && !companions.length) continue;
      if (rule.require && !rule.require.every(id => inPillar.some(h => h.id === id))) continue;
      parts.push({ pillar, names, companions });
    }
    if (parts.length > 1 && rule.merged) {
      combos.push({ id: rule.id, title: rule.title, members: [...new Set(parts.flatMap(x => x.names))], pillar: parts.map(x => x.pillar).join('、'), text: rule.merged(parts) });
    } else {
      for (const x of parts) combos.push({ id: rule.id, title: rule.title, members: x.names, pillar: x.pillar, text: rule.text(x.names, x.pillar, x.companions) });
    }
  }
  return combos;
}
