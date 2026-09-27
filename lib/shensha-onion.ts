/**
 * 《神煞易經》洋蔥心理學層（後端運算，前端只照印）
 * ============================================================================
 * 業主定案 2026-09-27：「洋蔥的心理學是質的意境。融會貫通後運算出來，要有精準的邏輯、
 * 意境、權威性的洋蔥心理學，有公信力，權威性全部列入檔案，後端運算為檔案技能。」
 *
 * 每個神煞剝三層（沿用易經洋蔥心理學「殼與禮物」）：
 *   殼＝別人看到的你 → 心＝其實的你 → 禮物＝這個神煞送你的東西
 *
 * 權威性規則（沿用易經來源治理，同一個閘門）：
 * - 只有「已登記在 docs/技能戰鬥檔案/易經/來源登記.json、A 級、而且真的對得上」的心理學概念才掛名詞，
 *   出處（作者、期刊、年份）由後端從登記表讀出，不手寫。對不上的神煞不掛名詞，不硬湊。
 * - 來源狀態由 C-SHENSHA-ONION 經閘門重算；只有 VERIFIED 才能說「已通過交叉比對」。
 * - 不診斷、不治療、不貼標籤；測試擋「症、疾患、障礙、診斷、病」等字。
 * - 刻意不用「自我耗竭／決策疲勞」（Baumeister 1998 與 Hagger 2016 重大衝突，閘門不准進核心）。
 */
import ichingRegistry from '../docs/技能戰鬥檔案/易經/來源登記.json';
import { evaluateClaim, indexSources, type GateStatus, type SourceRegistry } from './iching-source-gate';
import { STATUS_WORDING } from './credibility-phrases';

export const SHENSHA_ONION_CLAIM = 'C-SHENSHA-ONION';

interface OnionEntry { shell: string; heart: string; gift: string; term?: { name: string; sourceId: string; link: string } }

export const SHENSHA_ONION: Record<string, OnionEntry> = {
  tiandehe: { shell: '別人看你運氣好，總有人在關鍵時刻幫你。', heart: '其實你心裡常怕欠人情，被幫了會想加倍還。', gift: '學會坦然接受好意——收下，也是一種給予。' },
  tiande: { shell: '別人看你厚道、好說話，遇事總能圓過去。', heart: '其實你常把委屈往肚裡吞，只為了讓事情平順。', gift: '你的厚道是真的力量；只要記得，對自己也要一樣厚道。' },
  yuede: { shell: '別人看你被照顧得好，身邊總有人護著。', heart: '其實你很在意自己有沒有回報，怕成為別人的負擔。', gift: '被愛不需要先證明自己值得；你本來就值得。' },
  longde: { shell: '別人看你有氣勢、有舞台，站出來就有人跟。', heart: '其實舞台越大，你越怕讓跟著你的人失望。', gift: '德望不是完美，是願意承擔；允許自己偶爾不必撐住全場。' },
  tiangou: {
    shell: '別人看你大方、出手快，錢和心力都給得多。', heart: '其實你有時明知不划算，卻因為已經投入太多而捨不得停。', gift: '懂得停損，是守住自己最溫柔的方式。',
    term: { name: '沉沒成本效應（sunk cost effect）', sourceId: 'S-ARKES-1985', link: '天狗講「守」與損耗：已經投入的，最容易讓人捨不得停。' },
  },
  jinkui: { shell: '別人看你穩、會存、手上有底。', heart: '其實存下來的不只是錢，是你對未來不確定的安全感。', gift: '你有把資源留住的天分；用它照顧自己，也照顧你在乎的人。' },
  wugui: { shell: '別人看你警覺、不好騙，對人留一手。', heart: '其實你被背後的話傷過，所以習慣先把門關好。', gift: '你的敏銳能看穿虛假；把它用在分辨，而不是防備所有人。' },
  zaisha: {
    shell: '別人看你愛操心，凡事先想最壞的情況。', heart: '其實你用預想壞結果，來讓自己準備得更充分。', gift: '擔心是你的引擎：把它寫成清單，焦慮就變成了行動力。',
    term: { name: '防衛性悲觀（defensive pessimism）', sourceId: 'S-NOREM-1986', link: '災煞講居安思危：把焦慮當成準備的動力，而不是被它拖住。' },
  },
  liue: {
    shell: '別人看你卡關多、路走得辛苦。', heart: '其實你有時會繞開讓你不舒服的事，結果關卡反而變長。', gift: '願意面對不舒服，關卡就開始變短；每一關都在替你長本事。',
    term: { name: '經驗性迴避（experiential avoidance）', sourceId: 'S-HAYES-1996', link: '六厄講關卡：越是迴避不舒服的感受，關卡越容易拉長。' },
  },
  muyu: { shell: '別人看你愛美、有感覺、情緒寫在臉上。', heart: '其實你很需要被理解，也很容易被別人的情緒牽動。', gift: '感受力是你的天賦；定期替心洗個澡，它就不會變成負擔。' },
  yuepo: { shell: '別人看你一直在變，環境常逼你換跑道。', heart: '其實每次變動，你都得重新找一次安全感。', gift: '你比多數人更懂得重來；這份彈性，就是你最好的護身符。' },
  ripo: { shell: '別人看你直，和身邊的人容易有摩擦。', heart: '其實你在意的是被當真，不是要贏。', gift: '把「對抗」換成「一起解題」，衝突就成了突破口。' },
  jiangxing: {
    shell: '別人看你是天生的帶頭者，有主見、能服眾。', heart: '其實你很容易把自己的價值，綁在「這次帶得好不好」上。', gift: '你帶得動人，不是因為你從不失手，而是因為你肯站出來。',
    term: { name: '自我價值的條件性（contingencies of self-worth）', sourceId: 'S-CROCKER-2001', link: '將星講領導：當自我價值只綁在表現上，每次成敗都會變得很重。' },
  },
  yima: { shell: '別人看你閒不下來，總在路上。', heart: '其實停下來的時候，你反而會不安。', gift: '移動讓你看見更多機會；也記得替自己留一個可以回去的地方。' },
  gejiao: {
    shell: '別人看你有距離感，不太容易靠近。', heart: '其實你很想親近，只是怕靠太近會受傷，所以先保持距離。', gift: '牆不會自己倒，但門一直都在；先敲一次，你會發現對方也在等。',
    term: { name: '成人依附風格（adult attachment styles）', sourceId: 'S-BARTHOLOMEW-1991', link: '隔角講隔閡：親近與保護自己之間的拉扯，依附研究有完整的分類。' },
  },
  yuanchen: {
    shell: '別人看你想很多，常一個人悶著。', heart: '其實同一件事，你會在心裡反覆播放很多遍。', gift: '你的深度來自想得多；把想法寫下來、說出來，暗流就成了深度。',
    term: { name: '反芻思考（rumination）', sourceId: 'S-NOLEN-HOEKSEMA-1991', link: '元辰講心裡的暗潮：反覆咀嚼同一件事，會讓情緒停留得更久。' },
  },
  yangren: {
    shell: '別人看你衝、有魄力，說話直接。', heart: '其實情緒上來的那一刻，你自己也常被嚇到。', gift: '把情緒說成一句話（我現在很生氣），刀就回到鞘裡。',
    term: { name: '情緒命名（affect labeling）', sourceId: 'S-LIEBERMAN-2007', link: '羊刃講鋒芒：研究顯示，把感受說成字，能降低情緒反應的強度。' },
  },
  taohua: { shell: '別人看你人緣好、有魅力，走到哪都被喜歡。', heart: '其實你很在意別人怎麼看你，常常先讀空氣再說話。', gift: '魅力是真的；當你不必討每個人喜歡時，它會更自在。' },
  waiTaohua: {
    shell: '別人看你異性緣好、外面貴人多，陌生人也對你有好感。', heart: '其實你很會看場合調整自己，所以在哪裡都吃得開。', gift: '這份察言觀色是天賦；記得留一個不必表演的自己給最親的人。',
    term: { name: '自我監控（self-monitoring）', sourceId: 'S-SNYDER-1974', link: '外桃花講牆外的好人緣：會依場合調整自己表現的傾向，心理學稱為高自我監控。' },
  },
  tianyi: { shell: '別人看你總有貴人，遇難有人伸手。', heart: '其實你平常待人真誠，貴人記得的正是這一點。', gift: '貴人不是運氣，是你一路種下的善緣。' },
  wenchang: {
    shell: '別人看你會讀書、表達有條理。', heart: '其實成績越好，你越常懷疑自己是不是只是運氣好。', gift: '你的能力是真的；把肯定寫下來，比懷疑更值得相信。',
    term: { name: '冒牌者現象（impostor phenomenon）', sourceId: 'S-CLANCE-1978', link: '文昌講文思：高成就者常低估自己的能力，把成功歸給運氣。' },
  },
  kuigang: { shell: '別人看你強勢、有主見，不太容易被說服。', heart: '其實你是怕一退讓，事情就失控，所以總先站到最前面。', gift: '你的剛強能替身邊的人擋風；學會偶爾放下，剛強才不會變成孤單。' },
  kongwang: { shell: '別人看你某些事總差一點，好像抓不太住。', heart: '其實你心裡很想要，只是怕投入了又落空，所以留了一手。', gift: '空不是沒有，是還有位置；願意踏實地一步一步填，空處就成了你的餘裕。' },
  jinyu: { shell: '別人看你好命，身邊總有人願意幫你。', heart: '其實你也常擔心，自己是不是只是靠別人。', gift: '被幫助和有能力並不衝突；好好用這份助力，你就能走得更遠。' },
  xuetang: { shell: '別人看你會讀書、學什麼都快。', heart: '其實你對自己要求高，學不好會默默自責。', gift: '學習是你的天賦；允許自己慢一點、玩一點，興趣會帶你走得更深。' },
  hongyan: { shell: '別人看你有魅力、浪漫，很容易被喜歡。', heart: '其實你很在意被看見，也很在意那份喜歡是不是真的。', gift: '魅力本身就是禮物；當你先欣賞自己，別人的喜歡就不再是必需品。' },
  lushen: { shell: '別人看你穩當，好像不太需要為生活煩惱。', heart: '其實你的安全感，是一點一滴靠自己掙來的。', gift: '你相信努力會有回報，這份踏實就是最大的祿。' },
  tianyiDoctor: { shell: '別人看你溫暖、會照顧人，有事都想找你說。', heart: '其實你常把別人的需要放在自己前面，累了也不說。', gift: '照顧人的天分很珍貴；先把自己照顧好，這份溫暖才流得長。' },
  jiesha: { shell: '別人看你遇事多、常被捲進別人的事。', heart: '其實你心軟，不好意思拒絕，所以常替別人收拾。', gift: '學會說「這件事我先想想」，你的善意就不會變成負擔。' },
  guchen: {
    shell: '別人看你獨立、話不多，好像不需要人陪。', heart: '其實你很想被理解，只是不習慣開口。', gift: '獨立讓你站得穩；願意開口的那一刻，你會發現有人一直在等你。',
    term: { name: '成人依附風格（adult attachment styles）', sourceId: 'S-BARTHOLOMEW-1991', link: '孤辰講獨立與孤單：想親近又習慣自己來的拉扯，依附研究有完整的分類。' },
  },
  guasu: { shell: '別人看你安靜、有距離感，不太容易走進你心裡。', heart: '其實你對關係很認真，所以才特別謹慎。', gift: '謹慎是對感情的尊重；偶爾先打開一扇窗，好的人會自己走進來。' },
  guoyin: { shell: '別人看你可靠、守規矩，重要的事都想交給你。', heart: '其實你很怕辜負別人的信任，所以總是多檢查一遍。', gift: '你的可靠是真的；偶爾允許自己出錯，信任不會因此消失。' },
  tianchu: { shell: '別人看你懂生活、有口福，日子過得有滋味。', heart: '其實你用美好的小事，替自己撐住忙碌的日子。', gift: '懂得享受是一種能力；把這份滋味分享出去，福氣會更多。' },
  tianshe: { shell: '別人看你心寬、好說話，犯錯也常被原諒。', heart: '其實你對自己的錯，比別人記得更久。', gift: '原諒自己也是一種能力；你給別人的寬容，也值得留一份給自己。' },
  sanqi: { shell: '別人看你與眾不同，才華不只一樣。', heart: '其實你常擔心自己什麼都會一點，卻不夠專精。', gift: '多才不是分心，是你獨特的組合；找到把它們串起來的那件事。' },
  wangshen: { shell: '別人看你心思多、常為小事掛心。', heart: '其實你是想得太遠，才會把還沒發生的事也背在身上。', gift: '你的細膩能預見問題；把擔心寫成清單，它就成了你的準備。',
    term: { name: '反芻思考（rumination）', sourceId: 'S-NOLEN-HOEKSEMA-1991', link: '亡神講心裡的不安：反覆咀嚼同一件事，會讓不安停留得更久。' } },
  yinyangChacuo: { shell: '別人看你和親近的人常有小誤會。', heart: '其實你很在乎對方，只是表達的方式和對方不一樣。', gift: '在乎是真的；多說一句確認的話，默契就會慢慢長出來。' },
  guluan: { shell: '別人看你獨立，好像一個人也過得很好。', heart: '其實你很希望有人真正懂你，只是不想將就。', gift: '不將就是對自己的尊重；把需要說出口，對的人會聽得懂。' },
  shieDabai: { shell: '別人看你大方、花錢爽快。', heart: '其實你用花錢來犒賞辛苦的自己。', gift: '犒賞自己沒有錯；多一份紀律，你會發現安全感比買東西更踏實。',
    term: { name: '沉沒成本效應（sunk cost effect）', sourceId: 'S-ARKES-1985', link: '十惡大敗講理財紀律：已經投入的錢，最容易讓人捨不得停損。' } },
  liuxia: { shell: '別人看你動作快、行動派。', heart: '其實你怕慢下來就趕不上，所以總是匆匆忙忙。', gift: '你的速度是優點；慢一點點，就能讓速度更安全。' },
  sifei: { shell: '別人看你點子多，但常常沒做完。', heart: '其實你是熱情先到、耐心後到，一旦卡住就想換下一個。', gift: '開始的熱情很珍貴；陪它走完一次，你會發現收尾也有成就感。' },
  yuedehe: { shell: '別人看你人緣溫和，總有人願意幫忙。', heart: '其實你對別人的好意很敏感，也很記得別人的恩。', gift: '懂得感恩的人，福氣會一直流回來。' },
  feiren: { shell: '別人看你反應快、嘴巴也快。', heart: '其實你是怕被誤會，所以急著先把話說清楚。', gift: '你的直是真誠；慢一拍再說，別人更聽得進去。',
    term: { name: '情緒命名（affect labeling）', sourceId: 'S-LIEBERMAN-2007', link: '飛刃講向外的鋒芒：先把情緒說成字，反應就不會搶在理智前面。' } },
  jinshen: { shell: '別人看你強悍、有魄力。', heart: '其實你是習慣自己扛，不太敢示弱。', gift: '強悍保護了你；偶爾示弱，會讓你被更多人靠近。' },
  bazhuan: { shell: '別人看你專情、認定了就不回頭。', heart: '其實你很怕失去，所以投入得特別深。', gift: '專一是天賦；把一部分的專注留給自己，你會更穩。' },
  jiuchou: { shell: '別人看你不太好懂，第一印象常被誤會。', heart: '其實你很在意別人怎麼看你，只是不擅長解釋自己。', gift: '相處久了的人都懂你的好；多說一句自己的想法，誤會就會少很多。' },
  liuxiu: { shell: '別人看你聰明、有品味，氣質好。', heart: '其實你對自己要求很高，怕被看出不夠好。', gift: '你的秀氣不需要完美來證明；放鬆一點，你會更好看。' },
  sangmen: { shell: '別人看你經歷過不少轉折與離別。', heart: '其實每一次結束，你都在心裡默默消化很久。', gift: '懂得告別的人，也最懂得珍惜；你比別人更知道什麼是重要的。',
    term: { name: '經驗性迴避（experiential avoidance）', sourceId: 'S-HAYES-1996', link: '喪門講告別：願意面對難受的感受，轉換才走得過去。' } },
  baihu: { shell: '別人看你氣勢強、衝勁足。', heart: '其實你是怕慢下來就守不住想守的人。', gift: '你的力量是守護；有分寸的力量，最讓人安心。' },
  bingfu: { shell: '別人看你總是撐著，很少喊累。', heart: '其實你是怕停下來會拖累別人。', gift: '休息不是偷懶；照顧好自己，你才能長長久久地照顧別人。' },
  pima: { shell: '別人看你總在替人分擔。', heart: '其實你很難拒絕，怕別人失望。', gift: '溫柔需要界線；把不屬於你的擔子放下，你會走得更輕。' },
  huagai: {
    shell: '別人看你孤高、有才華，不太合群。', heart: '其實你感受得比別人深，人多的地方很快就耗盡。', gift: '獨處是你充電與創作的方式；深，是你的天賦。',
    term: { name: '感覺處理敏感性（sensory-processing sensitivity）', sourceId: 'S-ARON-1997', link: '華蓋講靈性與孤高：對刺激處理得更深的人，更需要獨處恢復。' },
  },
};

export interface ShenShaOnionTerm { name: string; link: string; citation: string }
export interface ShenShaOnionView { layers: { layer: '殼' | '心' | '禮物'; label: string; text: string }[]; term: ShenShaOnionTerm | null }

const registry = ichingRegistry as unknown as SourceRegistry;
type RegistrySource = { source_id: string; author: string; locator: string; trust: string };
const sourceById = new Map((registry.sources as unknown as RegistrySource[]).map(s => [s.source_id, s]));

/** 出處從登記表讀出（作者＋文獻），不手寫。 */
function citationOf(sourceId: string): string | null {
  const source = sourceById.get(sourceId);
  return source ? `${source.author}，${source.locator}` : null;
}

export function shenShaOnion(id: string): ShenShaOnionView | null {
  const entry = SHENSHA_ONION[id];
  if (!entry) return null;
  const citation = entry.term ? citationOf(entry.term.sourceId) : null;
  return {
    layers: [
      { layer: '殼', label: '別人看到的你', text: entry.shell },
      { layer: '心', label: '其實的你', text: entry.heart },
      { layer: '禮物', label: '這個神煞送你的', text: entry.gift },
    ],
    term: entry.term && citation ? { name: entry.term.name, link: entry.term.link, citation } : null,
  };
}

/** 洋蔥心理學層的公信力：閘門重算 C-SHENSHA-ONION。 */
export function shenShaOnionCredibility(): { status: GateStatus; line: string } {
  const claim = registry.claims.find(c => c.claim_id === SHENSHA_ONION_CLAIM);
  const status: GateStatus = claim ? evaluateClaim(claim, indexSources(registry)).status : 'PENDING_POOL';
  return { status, line: `神煞洋蔥心理學：${STATUS_WORDING[status]}；心理學名詞皆附原始文獻，不作診斷。` };
}
