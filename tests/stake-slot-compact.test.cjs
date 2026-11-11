// 押注選卡（業主 2026-11-12）：一種神獸一列、點一下加一張、按住連加、不重複列副本；舊版 20 格大押注格已拿掉（它是卡頓元凶）。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const slot = fs.readFileSync('components/battlefield/StakeSlot.tsx', 'utf8');
const page = fs.readFileSync('app/beast-game/battlefield/page.tsx', 'utf8');
const prep = fs.readFileSync('components/battlefield/OwnedCampaignPreparation.tsx', 'utf8');
assert(!slot.includes('stakeTray') && !slot.includes('data-stake-target'), '20 格押注格已拿掉');
assert(slot.includes('const StakeRow = memo('), '每列用 memo，按一下只重畫那一列');
assert(/function useHoldRepeat/.test(slot) && /loop\(350\)/.test(slot) && /loop\(90\)/.test(slot), '按住連加：350ms 後每 90ms');
for (const ev of ['onPointerLeave: stop', 'onPointerCancel: stop', 'onBlur: stop']) assert(slot.includes(ev), '移開／取消／失焦都會停：' + ev);
assert(slot.includes('const tap = start.current !== null && !repeating.current;') && slot.includes('if (tap && live.current.canRun()) live.current.action();'), '輕點在放開時才加一張（按住連加後放開不多加）');
assert(slot.includes('Math.hypot(event.clientX - s.x, event.clientY - s.y) > 10) stop()'), '手指一滑動（捲列表）就取消，不會誤押');
assert(!slot.includes('stakeBadge'), '張數不再蓋在卡圖上，寫在名字下方的文字區');
assert(/useEffect\(\(\) => stop, \[stop\]\)/.test(slot), '卸載時一定停止計時器');
assert(slot.includes('map.set(card.cardId'), '以卡種分組，不再每張副本一格');
assert(page.includes('setStakeCardIds(current => {') && page.includes('if (current.length >= MAX_STAKE_CARDS) return current;'), '加碼用函式型更新並擋 20 張上限');
assert(page.includes('const confirmTeamStable = useCallback') && page.includes('onToggle={toggleTeamCopy}'), '出戰陣容回呼穩定，押注時不重畫整排卡');
assert(prep.includes('export default memo(OwnedCampaignPreparation)') && prep.includes('持有 {ids.length} 張'), '出戰選卡同樣一種一格');
console.log('PASS stake-slot compact');
const slot2 = fs.readFileSync('components/battlefield/StakeSlot.tsx', 'utf8');
assert(slot2.includes('describeStakeBrief') && slot2.includes('data-stake-brief') && slot2.includes('還可押'), '只顯示張數：已押／還可押／輸 −N／贏 +N 起');
assert(!slot2.includes('收藏與扣卡說明') && !slot2.includes('點卡就加一張'), '不再放說明文字（卡片本身已寫清楚）');
console.log('PASS stake-slot brief');
const css3 = fs.readFileSync('components/battlefield/StakeSlot.module.css', 'utf8');
assert(/\.stakeGrid \{[\s\S]*?repeat\(3, minmax\(0, 1fr\)\); grid-auto-rows: max-content;/.test(css3), '一排三張，列高跟著卡片（不會被高度上限壓扁而互相蓋住）');
assert(/scroll-snap-type: y mandatory/.test(css3) && /\.stakeGrid > \.stakeRow \{ scroll-snap-align: start; \}/.test(css3), '上下滑動一排一排停住，像轉輪');
assert(/height: min\(calc\(var\(--row\) \* 3 \+ 20px \+ 12px\), 78vh\)/.test(css3), '高度剛好是三排（一次看見 9 張）');
const slot3 = fs.readFileSync('components/battlefield/StakeSlot.tsx', 'utf8');
assert(slot3.includes('<CatalogBeastCard id={group.cardId} />') && !slot3.includes('stakeName') && !slot3.includes('{group.name}</'), '卡片已寫名字與介紹：不再重複寫神獸名字');
assert(slot3.includes('styles.stakeStrip') && /\.stakeStrip \{[^}]*min-height: 40px/.test(css3), '張數在卡片下方獨立一條，不蓋在卡面上');
console.log('PASS stake-slot 3-up');

const slot4 = fs.readFileSync('components/battlefield/StakeSlot.tsx', 'utf8');
assert(slot4.includes('data-empty={selectedIds.length === 0 || undefined}') && !slot4.includes('{selectedIds.length > 0 && <p className={styles.stakeOdds}'), '輸贏條常駐佔位：第一次點卡版面不跳動（連點不會點偏）');
console.log('PASS stake-slot stable layout');
const rules = fs.readFileSync('lib/beast-game/stake-rules.ts', 'utf8');
assert(rules.includes('押的 ${staked} 張全留，再得 ${staked}～${MAX_REWARD_CARDS} 張') && rules.includes('失去押的 ${staked} 張，其他卡都留著') && rules.includes('${staked} 張全部退回'), '贏／輸／平手怎麼分配：開戰前就講清楚張數');
const slot5 = fs.readFileSync('components/battlefield/StakeSlot.tsx', 'utf8');
assert(/data-win>[\s\S]*data-lose>[\s\S]*data-draw>/.test(slot5), '三行：贏、輸、平手');
console.log('PASS stake distribution');

const result = fs.readFileSync('components/BeastStakeResult.tsx', 'utf8');
assert(!result.includes('data-iching-judgment') && !result.includes('易經技術判斷') && !result.includes('ichingJudgment'), '贏的結算不再顯示易經卜卦判斷（易經判斷只屬於對手阿修羅）');
console.log('PASS result without iching judgment');
const dock = fs.readFileSync('components/battlefield/BattleDock.tsx', 'utf8');
const arena = fs.readFileSync('components/battlefield/BattleArena.tsx', 'utf8');
assert(dock.includes('const lastAlly = playingMatch && team.length > 1 && aliveCount === 1;') && dock.includes('data-last-ally={lastAlly || undefined}'), '神獸戰鬥：我方只剩最後一隻放大成大卡片');
assert(arena.includes("data-last={side === 'opponent' && match && match.opponent.team.length > 1 && match.opponent.team.filter(f => !f.defeated).length === 1"), '神獸戰鬥：對方只剩最後一隻變大魔王');
const info = fs.readFileSync('app/beast-game/battlefield/page.tsx', 'utf8');
assert(info.includes('showLog={false}') && info.includes('className={styles.infoCard}') && !info.includes('data-battle-stake>{battleStake'.replace('{battleStake','{battleStake') + 'XX'), '戰鬥場文字全部收進右上角「？」那一張卡');
console.log('PASS last-one big + info card');

const res2 = fs.readFileSync('components/BeastStakeResult.tsx', 'utf8');
assert(res2.includes('data-gained-scroll') && res2.includes('max-h-[440px]'), '新得的卡很多時限定高度自己捲動');
console.log('PASS result gained scroll');

const arenaCss = fs.readFileSync('components/battlefield/BattleArena.module.css', 'utf8');
assert(arenaCss.includes("[data-dock='true'] .arena { -webkit-mask-image: none; mask-image: none;"), '戰場不用 mask-image（避免每幀整片重新合成）');
console.log('PASS arena no mask');
