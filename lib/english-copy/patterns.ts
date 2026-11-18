/**
 * English display-only sentence patterns for text that carries a changing number or name.
 * A fixed dictionary cannot hold "restores 51 life" and "restores 65 life" as separate entries,
 * so these few families are matched by shape and the number or name is copied across.
 * Names and element words inside a pattern are looked up in the same English dictionary.
 * Display only: never use these strings as calculation input.
 */
export type EnglishPattern = [RegExp, (m: RegExpMatchArray, t: (zh: string) => string) => string];

export const englishPatterns: EnglishPattern[] = [
  // Beast skill descriptions
  [/^恢復自身 (\d+) 生命，不超過上限。$/, m => `Restores ${m[1]} of its own life, up to its maximum.`],
  [/^以攻擊力加 (\d+) 計算傷害。$/, m => `Deals damage calculated as attack plus ${m[1]}.`],
  [/^以攻擊力加 (\d+) 計算傷害，自身速度 \+(\d+)，持續 (\d+) 次行動。$/, m => `Deals damage calculated as attack plus ${m[1]} and raises its own speed by ${m[2]} for ${m[3]} actions.`],
  [/^獲得 (\d+) 護盾（總上限 (\d+)）。$/, m => `Gains ${m[1]} shield (total cap ${m[2]}).`],
  [/^獲得 (\d+) 護盾，下一次受擊反擊 (\d+) 點傷害。$/, m => `Gains ${m[1]} shield and counters with ${m[2]} damage the next time it is hit.`],
  [/^攻擊並降低對手 (\d+) 攻擊力，持續 (\d+) 次行動。$/, m => `Attacks and lowers the opponent's attack by ${m[1]} for ${m[2]} actions.`],

  // Growth center
  [/^(\d+)\/(\d+) 關$/, m => `${m[1]}/${m[2]} gates`],
  [/^完整通過首頁八張分析，才取得第一顆寶珠。 本篇已通過 (\d+)\/(\d+) 關；八關全部完成才會解封。$/, m => `Pass all eight analyses on the home page to earn the first orb. This chapter: ${m[1]}/${m[2]} gates passed. All eight gates must be completed to unseal it.`],
  [/^目前篇章：(.+)$/, (m, t) => `Current chapter: ${m[1].split('・').map(p => t(p.trim())).join(' · ')}`],
  [/^尚有 (\d+) 項探索可完成。$/, m => `${m[1]} explorations are still available to complete.`],
  [/^再完成 (\d+) 張首頁探索卡，就能集齊第一階段 (\d+) 組羈絆。$/, m => `Finish ${m[1]} more home-page exploration cards to collect all ${m[2]} bonds of stage 1.`],
  [/^羈絆進度 (\d+) \/ (\d+)$/, m => `Bond progress ${m[1]} / ${m[2]}`],
  [/^(.+?)・幼子$/, (m, t) => `${t(m[1])} · Young`],
  [/^下一步完成：(.+)$/, (m, t) => `Next up: ${t(m[1])}`],
  [/^(.+)：下一步$/, (m, t) => `${t(m[1])}: next step`],
  [/^(.+)：待探索$/, (m, t) => `${t(m[1])}: to explore`],
  [/^(.+?) 裡面有易經寫給你的一句話。$/, (m, t) => `${t(m[1])} Inside is a line the I Ching wrote for you.`],
  [/^這一週，你有持續補強 (.+?) 嗎？$/, (m, t) => `This week, did you keep reinforcing the ${t(m[1])}?`],
  [/^本週只圍繞 (.+?)、本週任務與會員自己的補強進度。$/, (m, t) => `This week focuses only on the ${t(m[1])}, this week's task and the member's own reinforcement progress.`],
  [/^本週持續補強 (.+?)。$/, (m, t) => `This week, keep reinforcing the ${t(m[1])}.`],
  [/^本週使用 (.+?)。$/, (m, t) => `This week, use ${t(m[1])}.`],
  [/^本週能量色是 (.+?)。可用在 (.+?)——心理學叫「環境線索」：把提醒放進每天會看到的地方，大腦就會自動幫你記得補強 (.+?)，不用靠意志力。$/, (m, t) =>
    `This week's energy color is ${t(m[1])}. You can use it on ${m[2].split('、').map(x => t(x.trim())).join(', ')}. In psychology this is called an "environmental cue": put the reminder where you see it every day and your brain automatically helps you remember to reinforce the ${t(m[3])}, with no need for willpower.`],
  [/^這件任務會直接帶動 (.+?)，讓 (.+?) 開始變得更穩定。心理學上這叫「行為活化」：不等心情好才行動，而是用一個微行動先啟動，情緒會跟著行動走——易經只開一件，因為「微習慣」的完成率才是黏住改變的關鍵。$/, (m, t) =>
    `This task directly drives the ${t(m[1])} and starts to steady ${t(m[2])}. In psychology this is called "behavioral activation": don't wait until you feel good to act, but start with one tiny action and your mood follows your action. The I Ching opens only one task because the completion rate of a "micro-habit" is the key to making change stick.`],
  // Accessible labels that combine a known label with a status
  [/^太極互動，目前第 (\d+) 次，共 (\d+) 次$/, m => `Taiji interaction, currently ${m[1]} of ${m[2]}`],
  [/^(心動月份|對象類型|相遇提示)，(待填寫資料，點選開始|解鎖中|結果已備妥，點選揭符查看|目前無對應結果，點選查看說明)$/, (m, t) => {
    const status: Record<string, string> = {
      '待填寫資料，點選開始': 'waiting for your details, tap to begin', '解鎖中': 'unlocking',
      '結果已備妥，點選揭符查看': 'result ready, tap to reveal the talisman', '目前無對應結果，點選查看說明': 'no matching result, tap to see the explanation',
    };
    return `${t(m[1])}, ${status[m[2]]}`;
  }],
  [/^(.+)，寶珠(已亮起|尚未亮起)$/, (m, t) => `${t(m[1])}, orb ${m[2] === '已亮起' ? 'lit' : 'not lit yet'}`],
  [/^(.+)詳細資料$/, (m, t) => `${t(m[1])} details`],
  [/^(.+?): (.+)$/, (m, t) => { const a = t(m[1]); const b = t(m[2]); return a !== m[1] && b !== m[2] ? `${a}: ${b}` : m[0]; }],
];
