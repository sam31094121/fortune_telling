/**
 * Fixed engine sentences (no variables) → English, keyed by the exact Chinese text the engine returns.
 * Sources: lib/match-stability.ts, lib/compatibility-engine.ts (zones), app/api/match-generate/route.ts,
 * lib/red-luan-heartbeat-engine.ts, lib/match-story-engine.ts, lib/three-in-one.ts, lib/credibility-wording.ts.
 * A missing key means "keep the original text", never blank.
 */
export const FIXED_SENTENCE_EN: Record<string, string> = {
  // match-stability.ts buildStableSummary (8 variants)
  '整體指標偏高，共鳴與相處節奏是這組配對的優勢；持續把話說清楚，是讓這份默契維持下去的關鍵。': 'Overall scores are high: resonance and a shared rhythm are this pair’s strengths. Keep saying things clearly; that is what keeps this understanding going.',
  '整體配對基礎不錯，但溝通節奏仍需要磨合。放慢情緒反應、把話說清楚，比較能維持穩定並慢慢加深。': 'The overall foundation is good, but your communication rhythm still needs work. Slowing down emotional reactions and saying things clearly helps you stay steady and grow closer over time.',
  '雙方有一定吸引力與互補性，但安全感與生活節奏仍需協調。先把日常規則談清楚，會比只靠感覺更穩。': 'There is real attraction and complementarity, but security and daily rhythm still need coordinating. Agreeing on everyday ground rules first is steadier than relying on feelings alone.',
  '這組配對有不錯的共鳴基礎，互補性也足夠。持續照顧彼此的感受與節奏，比較容易往穩定的方向走。': 'This pair has a good base of resonance and enough complementarity. Keep looking after each other’s feelings and pace, and things are more likely to settle into stability.',
  '這段關係不是沒有可能，而是特別需要耐心。吸引力存在，但衝突點也明顯，越早建立界線與溝通方式，越能減少摩擦。': 'This relationship is possible, but it needs extra patience. The attraction is there, and so are clear points of conflict; the sooner you set boundaries and a way of talking, the less friction you will have.',
  '整體屬於中段配對，彼此之間有可發展空間，但需要更多理解與調整。若願意慢慢磨合，仍有機會走向穩定。': 'Overall this is a mid-range match: there is room to grow, but it needs more understanding and adjustment. If you are willing to work things out gradually, stability is still possible.',
  '目前這組配對的衝突敏感度偏高，互動時容易因節奏不同而累積壓力。想走得長久，最好先建立清楚的溝通規則。': 'This pair is currently sensitive to conflict, and different rhythms can build up pressure. To last, it is best to set clear communication rules first.',
  '這組配對目前的磨合壓力較大，彼此看待事情的方式差異明顯。若想繼續靠近，建議先從理解與尊重彼此節奏開始。': 'This pair is under significant adjustment pressure right now, and you see things quite differently. If you want to grow closer, start by understanding and respecting each other’s pace.',

  // compatibility-engine.ts zones
  '情感表達的節奏相近，比較容易有共鳴': 'You express feelings at a similar pace, so resonance comes more easily',
  '社交節奏一致，相處自在舒適': 'Your social rhythms match, so time together feels relaxed',
  '對親密與陪伴的需求相近，比較不容易因此不安': 'You need similar amounts of closeness and company, so this is less likely to cause insecurity',
  '思考邏輯相近，對話不費力': 'You think in similar ways, so conversation is effortless',
  '安全感標準一致，不易因此起摩擦': 'You share the same sense of what feels secure, so this rarely causes friction',
  '一人引路、一人穩固，主導與支持自然分工': 'One leads and one steadies: leading and supporting divide naturally',
  '創意與執行力的搭配，一個想點子一個落地': 'Ideas meet execution: one comes up with ideas, the other makes them real',
  '理性與感性互補，決策時能平衡對方盲點': 'Reason and feeling complement each other and balance each other’s blind spots in decisions',
  '謹慎與勇敢的平衡，互相制衡也互相鼓勵': 'Caution balances courage: you check and encourage each other',
  '兩人個性差異明顯，但差異也是成長的起點': 'Your personalities differ clearly, but difference is also where growth starts',
  '這組規則沒有找到明顯的分工互補；兩人各自要補的方向，看下方五元素補強': 'These rules found no clear complementary roles; see the Five Phases reinforcement below for what each person needs',
  '情感表達深淺不同，多說「我現在的感受是…」能減少誤會': 'You express feelings at different depths; saying “what I’m feeling right now is…” more often reduces misunderstandings',
  '社交需求有落差，需協商獨處與共處的比例': 'Your social needs differ; agree on the balance of time alone and time together',
  '說話邏輯比例不同，「先聽感受還是先給建議」容易摩擦': 'You weigh logic differently when talking; “listen to feelings first or give advice first” can cause friction',
  '對風險的接受度不同，重大決定前多留緩衝時間': 'You tolerate risk differently; leave extra time before big decisions',
  '這組規則沒有找到明顯的磨合點；日常仍要把話說清楚': 'These rules found no clear points of adjustment; still say things clearly day to day',
  '主要的磨合點就是下方「注意衝突」那一項；其他面向這組規則沒有找到明顯落差': 'The main point to work on is the item under “Potential conflicts” below; these rules found no other clear gaps',
  '情感表達方式差異極大，需刻意學習對方的溝通語言': 'You express feelings in very different ways and need to deliberately learn each other’s language',
  '安全感需求差距大，一方覺得被束縛，一方覺得不被在乎': 'Your need for security differs greatly: one feels tied down, the other feels uncared for',
  '親密需求強弱相差太多，容易形成「追逃模式」': 'Your need for intimacy differs a lot, which can create a “pursue and withdraw” pattern',
  '雙方主導欲都強，決策時易出現「誰說了算」的對峙': 'You both want to lead, so decisions can turn into a standoff over who gets the final say',
  '風險容忍度差距極大，對未來方向可能產生根本分歧': 'Your risk tolerance differs greatly, which may cause basic disagreements about the future',
  '這組規則沒有找到高衝突提醒，維持日常溝通即可': 'These rules found no high-conflict warnings; ordinary day-to-day communication is enough',

  // route.ts
  '相處共鳴指數與四項指標，依兩人的星座、生日、出生季節、血型（不知道就用預設值）與姓名首字，套用固定規則計算；同樣資料每次結果都一樣。這不是八字合盤，也不是準確率。': 'The relationship resonance index and the four indicators use fixed rules based on both people’s star signs, birthdays, birth seasons, blood types (a default is used if unknown) and the first character of each name. The same data always gives the same result. This is not a BaZi compatibility reading and not an accuracy rate.',
  '雙方皆已提供出生時辰，使用完整四柱八字合盤。': 'Both people gave a birth time, so the full four-pillar BaZi chart is used.',
  '至少一方未填出生時辰，因此以可用的完整四柱與三柱資料合盤；未知時柱不作推定。': 'At least one person did not give a birth time, so the available four-pillar and three-pillar data are combined; the unknown hour pillar is not guessed.',
  '雙方未填出生時辰，因此以年、月、日三柱建立基礎合盤；時柱不作推定。': 'Neither person gave a birth time, so a basic chart is built from the year, month and day pillars; the hour pillar is not guessed.',
  '八字年度訊號與紫微本命夫妻宮資料皆已各自核對；請分開閱讀證據，不合併成感情結果。': 'The annual BaZi signals and the natal Zi Wei Spouse Palace data have each been checked. Read the evidence separately; it is not combined into a relationship verdict.',
  '八字年度訊號已核對；紫微本命資料仍待補出生時辰，暫不進行跨系統推論。': 'The annual BaZi signals have been checked. The natal Zi Wei data still needs a birth time, so no cross-system inference is made yet.',
  '交叉摘要只說明資料是否可並列閱讀，不新增分數、不以 AI 補足缺項，也不保證關係事件。': 'The cross-check summary only says whether the data can be read side by side. It adds no score, does not fill gaps with AI and does not guarantee any relationship event.',
  '雙人合卦目前還沒有能查證出處的起卦規則，所以這裡不產生卦，也不借別的卦來湊。': 'There is not yet a verifiable rule for casting a joint hexagram for two people, so no hexagram is produced here and none is borrowed to fill the gap.',

  // red-luan-heartbeat-engine.ts
  '完整四柱': 'All four pillars',
  '三柱基礎（時辰未知）': 'Three pillars (birth time unknown)',
  '完整出生時辰': 'Full birth time',
  '時辰未知': 'Birth time unknown',
  '《星學大成》〈論紅鸞天喜〉': 'Xingxue Dacheng, “On Hong Luan and Tian Xi”',
  '紅鸞子年加卯逆數；天喜子年加酉逆數。': 'Hong Luan: start at Mao for a Zi year and count backwards; Tian Xi: start at You for a Zi year and count backwards.',
  '本站八字神煞規則・第 1 版': 'Site BaZi symbolic-star rules, version 1',
  '桃花位由出生年、出生日的地支推出，傳統稱「咸池」，取三合局的沐浴位。': 'The Peach Blossom position comes from the earthly branch of the birth year and birth day; traditionally called Xian Chi, it is the “bathing” position of the three-harmony group.',
  '此為傳統文化的關係主題訊號，不保證戀愛、婚嫁、真愛或任何事件。': 'This is a traditional cultural relationship signal. It does not guarantee romance, marriage, true love or any event.',
  '出生時辰未知：時柱不納入命盤現位核對。': 'Birth time unknown: the hour pillar is not included in the natal check.',
  '流年以所選年份的干支年標示；節氣交界的實際起訖仍以八字排盤引擎為準。': 'The annual year is labelled by its stem-branch year; exact start and end dates around solar-term boundaries follow the BaZi chart engine.',
  '本層只列出本命夫妻宮及其三方四正的可核對星曜，不將星曜直接判為關係結果。': 'This layer only lists verifiable stars in the natal Spouse Palace and its three-directions-four-positions; stars are not read directly as relationship outcomes.',
  '紫微流年夫妻宮需要另行指定流派、安星與四化規則；目前刻意不推算。': 'An annual Zi Wei Spouse Palace needs a chosen school, star-placement and transformation rules; it is deliberately not calculated for now.',

  '紫微本命夫妻宮需完整出生時辰才可排盤；目前不以預設時辰代替。': 'The natal Zi Wei Spouse Palace needs a full birth time to be charted; no default time is substituted.',
  '紫微流年夫妻宮規則尚未指定流派與版本，因此本功能不推算流年紫微。': 'No school or version has been chosen for annual Zi Wei Spouse Palace rules, so annual Zi Wei is not calculated here.',

  // match-story-engine.ts
  '鬼魅的低語：沉默正在替你們把門鎖上。先有人伸手，封印才會開始鬆動。': 'The ghost whispers: silence is locking the door for you. Only when someone reaches out will the seal begin to loosen.',
  '鬼魅的低語：你們已經聽見彼此的回音；別讓它停在門後，留下可以一起解開的封印。': 'The ghost whispers: you have already heard each other’s echo. Don’t let it stop behind the door; leave a seal you can break together.',
  '依八字合盤選場景': 'Scene chosen from the BaZi pairing',
  '虛構遊戲情境': 'Fictional game scenario',
  '這週可以一起做的一件事': 'One thing to do together this week',
  '回音明顯': 'Strong echo', '回音存在': 'Echo present', '回音微弱': 'Faint echo',
  '目前這組分數的回音較淡，不能從分數推定誰一定在想誰。先用一次真誠、無壓力的聯絡，讓關係有重新被聽見的機會。': 'The echo in these scores is faint, and the scores cannot tell who is thinking of whom. Start with one sincere, no-pressure message to give the relationship a chance to be heard again.',
  '第一幕・靈異磁場啟動': 'Act I · The haunted field awakens',
  '第二幕・情感壓力逼近': 'Act II · Emotional pressure closes in',
  '第三幕・鬼魅低語回應': 'Act III · The ghost whispers back',
  '第四幕・神祕封印出口': 'Act IV · The exit from the mysterious seal',
  '相生共建格局': 'Build-together pattern (generating)', '輪流補強格局': 'Take-turns pattern (controlling)', '同頻補強格局': 'Same-wavelength pattern',

  // match-three-core-view.ts
  '依《易經》口令的順序：① 八字命盤 → ② 紫微斗數命盤 → ③ 易經卦象。四柱逐字一致才往下起卦。': 'In the order of the I Ching sequence: ① BaZi chart → ② Zi Wei Dou Shu chart → ③ I Ching hexagram. A hexagram is cast only after the four pillars match character for character.',
  '八字命盤': 'BaZi chart', '紫微斗數命盤': 'Zi Wei Dou Shu chart', '易經卦象': 'I Ching hexagram',
  '年、月、日、時四柱，和紫微命盤逐字核對一致。': 'Year, month, day and hour pillars, checked character for character against the Zi Wei chart.',
  '三方四正沒有形成傳統上有名稱的格局。': 'The three directions and four positions do not form a traditionally named pattern.',
  '沒有出生時辰：年、月、日三柱照算，時柱留空，不拿預設時辰補。': 'No birth time: the year, month and day pillars are calculated as usual and the hour pillar is left empty rather than filled with a default time.',
  '這次不排盤': 'No chart this time', '這次不起卦': 'No hexagram this time',
  '命宮要用時辰定位，沒有時辰就不排。': 'The Life Palace is located by birth time, so without it no chart is drawn.',
  '命宮由月支與時支共同定位，缺時支就定不了命宮；命宮一動，十二宮全部跟著移。用預設時辰硬排，等於整張盤都是猜的，錯得無聲無息。所以寧可不排。': 'The Life Palace is located by the month and hour branches together; without the hour branch it cannot be fixed, and if it moves all twelve palaces move with it. Forcing a default time would make the whole chart a silent guess, so no chart is drawn.',
  '梅花易數生辰起卦的下卦與動爻都要用到時辰數；補上出生時辰，才會出現依生辰起的卦。': 'Plum Blossom birth-time casting needs the hour number for the lower trigram and the moving line; add a birth time to see a hexagram cast from your birth data.',
  '兩個卦是各自依自己的生辰起的。': 'Each hexagram was cast from that person’s own birth data.',
  '兩人這次都沒有起卦；補上出生時辰後，才會各自依生辰起卦。': 'Neither of you has a hexagram this time; add birth times to cast one for each person.',
  '雙人合卦目前沒有能查證出處的起卦規則，所以不把兩個卦硬合成一個結論；卦是給自己看的一面鏡子，不是對這段關係的預測。': 'There is no verifiable rule yet for a joint hexagram, so the two hexagrams are not forced into one conclusion. A hexagram is a mirror for yourself, not a prediction about this relationship.',

  // credibility-wording.ts customer lines used in threeCore.sourceChecks
  '八字四柱排盤正確性（立春年界、節氣月界、晚子時、日主十神大運）：已通過交叉比對': 'BaZi four-pillar chart accuracy (Lichun year boundary, solar-term month boundaries, late Zi hour, Day Master, Ten Gods, luck cycles): passed cross-checking',
  '紫微斗數排盤正確性（命宮、十二宮、十四主星、三方四正、真太陽時）：各家來源說法不一，僅作傳統參考': 'Zi Wei Dou Shu chart accuracy (Life Palace, twelve palaces, fourteen major stars, three directions and four positions, true solar time): sources differ; traditional reference only',
  '六十四卦卦名、王家序與卦義：仍在查證中，僅作自我反思參考': 'Names, King Wen order and meanings of the 64 hexagrams: still being verified; for self-reflection only',
  '起卦法（梅花易數生辰／報數起卦）與先天卦數對照：各家來源說法不一，僅作傳統參考': 'Casting method (Plum Blossom birth-time / number casting) and Early Heaven trigram numbers: sources differ; traditional reference only',
  '易經卜卦的心理學定位（自我反思的文化工具，不是已驗證的診斷或預測）：仍在查證中，僅作自我反思參考': 'Psychological framing of I Ching divination (a cultural tool for self-reflection, not a validated diagnosis or prediction): still being verified; for self-reflection only',

  // match-professional-layer.ts fixed parts
  '溝通需要先回到「確認」而不是「說服」。當雙方能先確認感受與事實，關係比較容易回到可以修復的狀態。': 'Communication needs to return to “confirming” rather than “convincing”. When you both confirm feelings and facts first, the relationship finds its way back to a place where repair is possible.',
};

export const PATTERN_TYPE_EN: Record<string, string> = { 情感共鳴型: 'emotional-resonance type', 理解分析型: 'understanding-and-analysis type', 行動推進型: 'action-driven type', 穩定承諾型: 'steady-commitment type' };

/** Exact lookup; returns the original text when no English entry exists. */
export function fixedEn(text: string | undefined | null): string {
  if (typeof text !== 'string') return text as unknown as string;
  return FIXED_SENTENCE_EN[text] ?? text;
}
