# 困難寶珠技能能力盤點（2026-10-31）

本次僅盤點、提供能力查詢，不接戰鬥，不修改技能或數值。當前角色、永久強化、第五關解鎖、第八勝換角、守護獸漸進陣容均維持。

## 已生效與缺口

- 正式 registry 60 卡，80 個主動技能引用及15個被動引用，共95次引用、25個不同技能。20張卡有第二技能，15張卡有被動技能。
- 寶珠實際生效的是連珠傷害、屬性克制、通用滿能量攻擊（SKILL_RATIO=2）、既有連線攻擊及盾牌規則；這些不能冒充卡檔獨有技能。
- Match3Board.tsx 的 pickLineup 只帶 skills[0] 的名稱與描述；unleash 呼叫 skillAmount。未接 triggerSkills、resolveEffects、tickDurations，因此以下每個獨有技能都標「尚未接線」。有名稱不等於已生效。
- DRAW沒有手牌/牌庫對應；BUFF_SPEED沒有速度先手規則。防禦增減雖有既有Effect Engine，但寶珠基礎傷害不含防禦，直接套用會改原傷害，必須先決定轉換規則。以上均不能偷換成能量或動畫速度。
- 本60卡未引用REVIVE或DISCARD；不為了完整名目虛構玩法。

來源：[正式牌庫](../../lib/beast-game/registry.ts)、[技能資料](../../cards/skills/index.ts)、[當前寶珠傷害](../../lib/beast-game/match3/damage.ts)、[寶珠反擊](../../lib/beast-game/match3/enemies.ts)、[前端現有接線](../../components/battlefield/Match3Board.tsx)。

## 最小 adapter 設計（未實作）

1. lib/match3 建立獨立 runtime：由既有 instantiate 建立角色狀態，保存 SkillUsage、護盾、modifier、期限與已處理 actionId；clone後結算，不直接修改registry。主角永久加攻只在初始attack套一次。
2. 對接已存在的 triggerSkills / resolveEffects；提供明確 trigger、actor/target、side channel、actionId、合法已結算行動。輸出 nextRuntime 與真實effect logs，前端僅顯示。
3. 第一批可用既有數值做測試的單步 adapter：ON_SUMMON 的護盾/攻擊buff、HEAL上限、ON_ATTACK原effects與usesPerBattle；但投入實戰前仍要指定回合邊界、普通攻擊/滿能量鍵觸發關係與護盾扣除接點。不得同時 performAttack 與 computeHits 把普攻算兩遍。
4. 防禦轉換、速度先手、抽牌映射列待決；不能宣稱全部技能接通。青龍含速度、玄武含防禦，因此僅接其中一半時仍須報部分未適用。
5. 下一批才接 ON_DAMAGED、回合起訖、STUN與ELEMENT_BOOST；清除但未達攻擊門檻不算攻擊、同actionId重播不重套、死亡不觸發、連鎖與每場限次須逐條驗證。

驗證：四象原技能值/期限/限次、護盾先吸收、治療不超maxHP、攻擊不雙算、暈眩正確略過一次、buff到期復原、敵我對稱、重播去重、輸入及原卡資料不可變。保持既有campaign/強化/門檻/陣容回歸。此階段未做新增效果實戰驗收。

## 逐卡真實來源表

下列數值逐筆由 getSkill 載入；「不限」只代表原資料未設 usesPerBattle，並不代表寶珠目前已可使用。

|卡片|槽位|技能／版本|觸發|每場上限|原始效果|寶珠能力狀態|
|---|---|---|---|---|---|---|
|壁水貐・幼子 (beast_y14)|第一技能|初鳴 (skill_201 / 1.0.0)|ON_SUMMON|不限|{"type":"SHIELD","value":8}|尚未接線|
|壁水貐 (beast_a14)|第一技能|潮湧 (skill_103 / 1.0.0)|ON_ATTACK|4|{"type":"DAMAGE","value":12}|尚未接線|
|壁水貐 (beast_a14)|第2技能|澤潤 (skill_108 / 1.0.0)|ON_TURN_END|不限|{"type":"HEAL","value":10}|尚未接線|
|畢月烏・幼子 (beast_y19)|第一技能|學步 (skill_208 / 1.0.0)|ON_TURN_START|3|{"type":"BUFF_ATTACK","value":5,"duration":2}|尚未接線|
|畢月烏 (beast_a19)|第一技能|潮湧 (skill_103 / 1.0.0)|ON_ATTACK|4|{"type":"DAMAGE","value":12}|尚未接線|
|氐土貉・幼子 (beast_y03)|第一技能|藏匿 (skill_205 / 1.0.0)|ON_DAMAGED|2|{"type":"BUFF_DEFENSE","value":10,"duration":1}|尚未接線；待決 defense_damage_conversion|
|氐土貉 (beast_a03)|第一技能|地裂 (skill_105 / 1.0.0)|ON_ATTACK|3|{"type":"DAMAGE","value":8}；{"type":"DEBUFF_DEFENSE","value":12,"duration":2}|尚未接線；待決 defense_damage_conversion|
|斗木獬・幼子 (beast_y08)|第一技能|嗷嗷待哺 (skill_202 / 1.0.0)|ON_TURN_END|不限|{"type":"HEAL","value":6}|尚未接線|
|斗木獬・幼子 (beast_y08)|被動1|蹦跳 (skill_206 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":6,"duration":99}|尚未接線；待決 speed_without_initiative|
|斗木獬 (beast_a08)|第一技能|風刃 (skill_101 / 1.0.0)|ON_ATTACK|不限|{"type":"DAMAGE","value":14}|尚未接線|
|斗木獬 (beast_a08)|第2技能|御風 (skill_106 / 1.0.0)|ON_SUMMON|不限|{"type":"BUFF_SPEED","value":14,"duration":3}|尚未接線；待決 speed_without_initiative|
|斗木獬 (beast_a08)|被動1|疾行 (skill_111 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":10,"duration":99}|尚未接線；待決 speed_without_initiative|
|房日兔・幼子 (beast_y04)|第一技能|依偎 (skill_207 / 1.0.0)|ON_SUMMON|不限|{"type":"HEAL","value":8}|尚未接線|
|房日兔・幼子 (beast_y04)|被動1|蹦跳 (skill_206 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":6,"duration":99}|尚未接線；待決 speed_without_initiative|
|房日兔 (beast_a04)|第一技能|焚天 (skill_104 / 1.0.0)|ON_ATTACK|2|{"type":"DAMAGE","value":22}|尚未接線|
|房日兔 (beast_a04)|第2技能|烈燄纏身 (skill_109 / 1.0.0)|ON_DAMAGED|3|{"type":"BUFF_ATTACK","value":12,"duration":2}|尚未接線|
|白虎 (beast_g_baihu)|第一技能|白虎嘯陣 (skill_303 / 1.0.0)|ON_ATTACK|1|{"type":"DAMAGE","value":18}；{"type":"STUN","value":1,"duration":1}|尚未接線|
|白虎 (beast_g_baihu)|第2技能|空斷 (skill_102 / 1.0.0)|ON_ATTACK|3|{"type":"DAMAGE","value":10}；{"type":"DEBUFF_ATTACK","value":8,"duration":2}|尚未接線|
|白虎 (beast_g_baihu)|被動1|銳爪 (skill_113 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_ATTACK","value":7,"duration":99}|尚未接線|
|青龍 (beast_g_qinglong)|第一技能|蒼龍騰霄 (skill_301 / 1.0.0)|ON_SUMMON|不限|{"type":"BUFF_ATTACK","value":15,"duration":4}；{"type":"BUFF_SPEED","value":15,"duration":4}|尚未接線；待決 speed_without_initiative|
|青龍 (beast_g_qinglong)|第2技能|風刃 (skill_101 / 1.0.0)|ON_ATTACK|不限|{"type":"DAMAGE","value":14}|尚未接線|
|青龍 (beast_g_qinglong)|被動1|疾行 (skill_111 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":10,"duration":99}|尚未接線；待決 speed_without_initiative|
|玄武 (beast_g_xuanwu)|第一技能|玄武承淵 (skill_304 / 1.0.0)|ON_SUMMON|不限|{"type":"SHIELD","value":40}；{"type":"BUFF_DEFENSE","value":15,"duration":4}|尚未接線；待決 defense_damage_conversion|
|玄武 (beast_g_xuanwu)|第2技能|潮湧 (skill_103 / 1.0.0)|ON_ATTACK|4|{"type":"DAMAGE","value":12}|尚未接線|
|玄武 (beast_g_xuanwu)|被動1|鐵背 (skill_112 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_DEFENSE","value":8,"duration":99}|尚未接線；待決 defense_damage_conversion|
|朱雀 (beast_g_zhuque)|第一技能|朱雀焚野 (skill_302 / 1.0.1)|ON_ATTACK|2|{"type":"DAMAGE","value":28}；{"type":"ELEMENT_BOOST","value":20,"duration":2,"element":"FIRE","target":"SELF"}|尚未接線|
|朱雀 (beast_g_zhuque)|第2技能|焚天 (skill_104 / 1.0.0)|ON_ATTACK|2|{"type":"DAMAGE","value":22}|尚未接線|
|朱雀 (beast_g_zhuque)|被動1|銳爪 (skill_113 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_ATTACK","value":7,"duration":99}|尚未接線|
|鬼金羊・幼子 (beast_y23)|第一技能|幼獠 (skill_204 / 1.0.0)|ON_ATTACK|不限|{"type":"DAMAGE","value":6}|尚未接線|
|鬼金羊 (beast_a23)|第一技能|空斷 (skill_102 / 1.0.0)|ON_ATTACK|3|{"type":"DAMAGE","value":10}；{"type":"DEBUFF_ATTACK","value":8,"duration":2}|尚未接線|
|箕水豹・幼子 (beast_y07)|第一技能|初鳴 (skill_201 / 1.0.0)|ON_SUMMON|不限|{"type":"SHIELD","value":8}|尚未接線|
|箕水豹 (beast_a07)|第一技能|潮湧 (skill_103 / 1.0.0)|ON_ATTACK|4|{"type":"DAMAGE","value":12}|尚未接線|
|角木蛟・幼子 (beast_y01)|第一技能|嗷嗷待哺 (skill_202 / 1.0.0)|ON_TURN_END|不限|{"type":"HEAL","value":6}|尚未接線|
|角木蛟 (beast_a01)|第一技能|風刃 (skill_101 / 1.0.0)|ON_ATTACK|不限|{"type":"DAMAGE","value":14}|尚未接線|
|角木蛟 (beast_a01)|第2技能|御風 (skill_106 / 1.0.0)|ON_SUMMON|不限|{"type":"BUFF_SPEED","value":14,"duration":3}|尚未接線；待決 speed_without_initiative|
|角木蛟 (beast_a01)|被動1|疾行 (skill_111 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":10,"duration":99}|尚未接線；待決 speed_without_initiative|
|井木犴・幼子 (beast_y22)|第一技能|嗷嗷待哺 (skill_202 / 1.0.0)|ON_TURN_END|不限|{"type":"HEAL","value":6}|尚未接線|
|井木犴 (beast_a22)|第一技能|風刃 (skill_101 / 1.0.0)|ON_ATTACK|不限|{"type":"DAMAGE","value":14}|尚未接線|
|井木犴 (beast_a22)|第2技能|御風 (skill_106 / 1.0.0)|ON_SUMMON|不限|{"type":"BUFF_SPEED","value":14,"duration":3}|尚未接線；待決 speed_without_initiative|
|井木犴 (beast_a22)|被動1|疾行 (skill_111 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":10,"duration":99}|尚未接線；待決 speed_without_initiative|
|亢金龍・幼子 (beast_y02)|第一技能|幼獠 (skill_204 / 1.0.0)|ON_ATTACK|不限|{"type":"DAMAGE","value":6}|尚未接線|
|亢金龍 (beast_a02)|第一技能|空斷 (skill_102 / 1.0.0)|ON_ATTACK|3|{"type":"DAMAGE","value":10}；{"type":"DEBUFF_ATTACK","value":8,"duration":2}|尚未接線|
|亢金龍 (beast_a02)|第2技能|空明 (skill_107 / 1.0.0)|ON_SUMMON|不限|{"type":"SHIELD","value":20}|尚未接線|
|奎木狼・幼子 (beast_y15)|第一技能|嗷嗷待哺 (skill_202 / 1.0.0)|ON_TURN_END|不限|{"type":"HEAL","value":6}|尚未接線|
|奎木狼 (beast_a15)|第一技能|風刃 (skill_101 / 1.0.0)|ON_ATTACK|不限|{"type":"DAMAGE","value":14}|尚未接線|
|奎木狼 (beast_a15)|第2技能|御風 (skill_106 / 1.0.0)|ON_SUMMON|不限|{"type":"BUFF_SPEED","value":14,"duration":3}|尚未接線；待決 speed_without_initiative|
|奎木狼 (beast_a15)|被動1|疾行 (skill_111 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":10,"duration":99}|尚未接線；待決 speed_without_initiative|
|柳土獐・幼子 (beast_y24)|第一技能|藏匿 (skill_205 / 1.0.0)|ON_DAMAGED|2|{"type":"BUFF_DEFENSE","value":10,"duration":1}|尚未接線；待決 defense_damage_conversion|
|柳土獐・幼子 (beast_y24)|被動1|蹦跳 (skill_206 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":6,"duration":99}|尚未接線；待決 speed_without_initiative|
|柳土獐 (beast_a24)|第一技能|地裂 (skill_105 / 1.0.0)|ON_ATTACK|3|{"type":"DAMAGE","value":8}；{"type":"DEBUFF_DEFENSE","value":12,"duration":2}|尚未接線；待決 defense_damage_conversion|
|柳土獐 (beast_a24)|第2技能|厚土 (skill_110 / 1.0.0)|ON_DAMAGED|3|{"type":"BUFF_DEFENSE","value":14,"duration":2}|尚未接線；待決 defense_damage_conversion|
|婁金狗・幼子 (beast_y16)|第一技能|幼獠 (skill_204 / 1.0.0)|ON_ATTACK|不限|{"type":"DAMAGE","value":6}|尚未接線|
|婁金狗・幼子 (beast_y16)|被動1|蹦跳 (skill_206 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":6,"duration":99}|尚未接線；待決 speed_without_initiative|
|婁金狗 (beast_a16)|第一技能|空斷 (skill_102 / 1.0.0)|ON_ATTACK|3|{"type":"DAMAGE","value":10}；{"type":"DEBUFF_ATTACK","value":8,"duration":2}|尚未接線|
|婁金狗 (beast_a16)|第2技能|空明 (skill_107 / 1.0.0)|ON_SUMMON|不限|{"type":"SHIELD","value":20}|尚未接線|
|昴日雞・幼子 (beast_y18)|第一技能|依偎 (skill_207 / 1.0.0)|ON_SUMMON|不限|{"type":"HEAL","value":8}|尚未接線|
|昴日雞 (beast_a18)|第一技能|焚天 (skill_104 / 1.0.0)|ON_ATTACK|2|{"type":"DAMAGE","value":22}|尚未接線|
|昴日雞 (beast_a18)|第2技能|烈燄纏身 (skill_109 / 1.0.0)|ON_DAMAGED|3|{"type":"BUFF_ATTACK","value":12,"duration":2}|尚未接線|
|牛金牛・幼子 (beast_y09)|第一技能|幼獠 (skill_204 / 1.0.0)|ON_ATTACK|不限|{"type":"DAMAGE","value":6}|尚未接線|
|牛金牛 (beast_a09)|第一技能|空斷 (skill_102 / 1.0.0)|ON_ATTACK|3|{"type":"DAMAGE","value":10}；{"type":"DEBUFF_ATTACK","value":8,"duration":2}|尚未接線|
|女土蝠・幼子 (beast_y10)|第一技能|藏匿 (skill_205 / 1.0.0)|ON_DAMAGED|2|{"type":"BUFF_DEFENSE","value":10,"duration":1}|尚未接線；待決 defense_damage_conversion|
|女土蝠 (beast_a10)|第一技能|地裂 (skill_105 / 1.0.0)|ON_ATTACK|3|{"type":"DAMAGE","value":8}；{"type":"DEBUFF_DEFENSE","value":12,"duration":2}|尚未接線；待決 defense_damage_conversion|
|女土蝠 (beast_a10)|第2技能|厚土 (skill_110 / 1.0.0)|ON_DAMAGED|3|{"type":"BUFF_DEFENSE","value":14,"duration":2}|尚未接線；待決 defense_damage_conversion|
|參水猿・幼子 (beast_y21)|第一技能|初鳴 (skill_201 / 1.0.0)|ON_SUMMON|不限|{"type":"SHIELD","value":8}|尚未接線|
|參水猿 (beast_a21)|第一技能|潮湧 (skill_103 / 1.0.0)|ON_ATTACK|4|{"type":"DAMAGE","value":12}|尚未接線|
|室火豬・幼子 (beast_y13)|第一技能|好奇 (skill_203 / 1.0.0)|ON_TURN_START|1|{"type":"DRAW","value":1}|尚未接線；待決 draw_without_deck|
|室火豬 (beast_a13)|第一技能|焚天 (skill_104 / 1.0.0)|ON_ATTACK|2|{"type":"DAMAGE","value":22}|尚未接線|
|尾火虎・幼子 (beast_y06)|第一技能|好奇 (skill_203 / 1.0.0)|ON_TURN_START|1|{"type":"DRAW","value":1}|尚未接線；待決 draw_without_deck|
|尾火虎 (beast_a06)|第一技能|焚天 (skill_104 / 1.0.0)|ON_ATTACK|2|{"type":"DAMAGE","value":22}|尚未接線|
|尾火虎 (beast_a06)|第2技能|烈燄纏身 (skill_109 / 1.0.0)|ON_DAMAGED|3|{"type":"BUFF_ATTACK","value":12,"duration":2}|尚未接線|
|胃土雉・幼子 (beast_y17)|第一技能|藏匿 (skill_205 / 1.0.0)|ON_DAMAGED|2|{"type":"BUFF_DEFENSE","value":10,"duration":1}|尚未接線；待決 defense_damage_conversion|
|胃土雉 (beast_a17)|第一技能|地裂 (skill_105 / 1.0.0)|ON_ATTACK|3|{"type":"DAMAGE","value":8}；{"type":"DEBUFF_DEFENSE","value":12,"duration":2}|尚未接線；待決 defense_damage_conversion|
|危月燕・幼子 (beast_y12)|第一技能|學步 (skill_208 / 1.0.0)|ON_TURN_START|3|{"type":"BUFF_ATTACK","value":5,"duration":2}|尚未接線|
|危月燕・幼子 (beast_y12)|被動1|蹦跳 (skill_206 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":6,"duration":99}|尚未接線；待決 speed_without_initiative|
|危月燕 (beast_a12)|第一技能|潮湧 (skill_103 / 1.0.0)|ON_ATTACK|4|{"type":"DAMAGE","value":12}|尚未接線|
|危月燕 (beast_a12)|第2技能|澤潤 (skill_108 / 1.0.0)|ON_TURN_END|不限|{"type":"HEAL","value":10}|尚未接線|
|心月狐・幼子 (beast_y05)|第一技能|學步 (skill_208 / 1.0.0)|ON_TURN_START|3|{"type":"BUFF_ATTACK","value":5,"duration":2}|尚未接線|
|心月狐 (beast_a05)|第一技能|潮湧 (skill_103 / 1.0.0)|ON_ATTACK|4|{"type":"DAMAGE","value":12}|尚未接線|
|星日馬・幼子 (beast_y25)|第一技能|依偎 (skill_207 / 1.0.0)|ON_SUMMON|不限|{"type":"HEAL","value":8}|尚未接線|
|星日馬 (beast_a25)|第一技能|焚天 (skill_104 / 1.0.0)|ON_ATTACK|2|{"type":"DAMAGE","value":22}|尚未接線|
|虛日鼠・幼子 (beast_y11)|第一技能|依偎 (skill_207 / 1.0.0)|ON_SUMMON|不限|{"type":"HEAL","value":8}|尚未接線|
|虛日鼠 (beast_a11)|第一技能|焚天 (skill_104 / 1.0.0)|ON_ATTACK|2|{"type":"DAMAGE","value":22}|尚未接線|
|翼火蛇・幼子 (beast_y27)|第一技能|好奇 (skill_203 / 1.0.0)|ON_TURN_START|1|{"type":"DRAW","value":1}|尚未接線；待決 draw_without_deck|
|翼火蛇 (beast_a27)|第一技能|焚天 (skill_104 / 1.0.0)|ON_ATTACK|2|{"type":"DAMAGE","value":22}|尚未接線|
|張月鹿・幼子 (beast_y26)|第一技能|學步 (skill_208 / 1.0.0)|ON_TURN_START|3|{"type":"BUFF_ATTACK","value":5,"duration":2}|尚未接線|
|張月鹿 (beast_a26)|第一技能|潮湧 (skill_103 / 1.0.0)|ON_ATTACK|4|{"type":"DAMAGE","value":12}|尚未接線|
|張月鹿 (beast_a26)|第2技能|澤潤 (skill_108 / 1.0.0)|ON_TURN_END|不限|{"type":"HEAL","value":10}|尚未接線|
|軫水蚓・幼子 (beast_y28)|第一技能|初鳴 (skill_201 / 1.0.0)|ON_SUMMON|不限|{"type":"SHIELD","value":8}|尚未接線|
|軫水蚓・幼子 (beast_y28)|被動1|蹦跳 (skill_206 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":6,"duration":99}|尚未接線；待決 speed_without_initiative|
|軫水蚓 (beast_a28)|第一技能|潮湧 (skill_103 / 1.0.0)|ON_ATTACK|4|{"type":"DAMAGE","value":12}|尚未接線|
|軫水蚓 (beast_a28)|第2技能|澤潤 (skill_108 / 1.0.0)|ON_TURN_END|不限|{"type":"HEAL","value":10}|尚未接線|
|觜火猴・幼子 (beast_y20)|第一技能|好奇 (skill_203 / 1.0.0)|ON_TURN_START|1|{"type":"DRAW","value":1}|尚未接線；待決 draw_without_deck|
|觜火猴・幼子 (beast_y20)|被動1|蹦跳 (skill_206 / 1.0.0)|PASSIVE|不限|{"type":"BUFF_SPEED","value":6,"duration":99}|尚未接線；待決 speed_without_initiative|
|觜火猴 (beast_a20)|第一技能|焚天 (skill_104 / 1.0.0)|ON_ATTACK|2|{"type":"DAMAGE","value":22}|尚未接線|
|觜火猴 (beast_a20)|第2技能|烈燄纏身 (skill_109 / 1.0.0)|ON_DAMAGED|3|{"type":"BUFF_ATTACK","value":12,"duration":2}|尚未接線|

能力helper：`lib/beast-game/match3/skill-capabilities.ts`。單元測試核對60卡所有槽位、描述、原效果、版本、限次、缺來源狀態及不可變性；未執行戰鬥，也不代表技能已生效。
