/* 神獸戰隊 v0.7 五元素三消引擎（重建版 2026-10-29；2026-10-30 移植 B 規則）— 純邏輯，無 DOM。
 * 拖曳連珠／普通威力上限 10／魔法珠／五珠技／屬性能量／技能傷害，逐條移植自 C:\tmp\beast-preview（唯讀）
 * lib/beast-game/match3/{config.ts,drag.ts,energy.ts,damage.ts}；A 自有：多敵目標、各敵倒數、連線攻擊、勝敗重玩。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BeastEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // 主專案 lib/beast-game/elements.ts 的鍵值
  var ELEMENTS = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'];
  var LABEL = { AIR: '風', SPACE: '空', WATER: '水', FIRE: '火', EARTH: '地' };
  var GEM_CLASS = { AIR: 'wind', SPACE: 'space', WATER: 'water', FIRE: 'fire', EARTH: 'earth' };
  var COLOR = { AIR: '#54d9ad', SPACE: '#bd97ff', WATER: '#68b9ff', FIRE: '#ff747a', EARTH: '#efca77' };

  // TODO-balance：以下倍率皆為範例參數，非最終規格
  var CONFIG = {
    cols: 7, rows: 5, minMatch: 3,
    baseDamagePerGem: 10,
    lengthBonusPerExtraGem: 0.25,  // 【待平衡】rules.json LENGTH_STEP（match3/config.ts）：1 + (最長直線-3)×0.25
    chainBonusPerStep: 0.2,        // 【待平衡】rules.json CHAIN_STEP：1 + (連鎖-1)×0.2
    energyPerGem: 10, energyMax: 100,
    SKILL_RATIO: 2,                // 【待平衡】config.ts SKILL_RATIO：技能 = 卡面攻擊 × 2 × 克制倍率（damage.ts skillAmount）
    NORMAL_POWER_CAP: 10,          // config.ts NORMAL_POWER_CAP：普通消除威力最多算 10 顆；魔法珠威力不設上限
    SKILL5_LENGTH: 5,              // config.ts SKILL5_LENGTH：一次拖曳「剛好」5 顆 → 該屬性卡能量集滿
    magicOrbMinLength: 4,          // config.ts MAGIC_ORB_MIN_LENGTH
    magicOrbSpawnEnabled: true,    // config.ts MAGIC_ORB_SPAWN_ENABLED = true（已核准）
    maxCascade: 50,
    // 屬性相剋：來源 命理\lib\beast-game\elements.ts（ELEMENT_COUNTER／ELEMENT_ADVANTAGE_MULTIPLIER 1.2／ELEMENT_DISADVANTAGE_MULTIPLIER 0.9），唯讀複製
    // 風剋地、地剋水、水剋火、火剋空、空剋風
    ADVANTAGE: { source: 'lib/beast-game/elements.ts', enabled: true, strong: 1.2, weak: 0.9, beats: { AIR: 'EARTH', EARTH: 'WATER', WATER: 'FIRE', FIRE: 'SPACE', SPACE: 'AIR' } },
    // 【待平衡】傷害 = Math.round(atk × BASE_RATIO × 長度倍率 × 連鎖倍率 × 相剋倍率)；來源 contrib/mingli/rules.json（damage.ts / config.ts）
    BASE_RATIO: 0.5,  // 【待平衡】rules.json BASE_RATIO（damage.ts hitAmount）
    // 敵方反擊：每 enemyAttackEvery 步（成功拖曳）全體存活敵人各攻擊一次；初始計數一律 = enemyAttackEvery
    enemyAttackEvery: 3, enemyAtkMultiplier: 1,
    // 連線攻擊（假設，TODO-balance）：每張連線卡需且消耗 linkEnergyCost 能量；傷害 = round(Σatk × linkBaseMultiplier × (1 + (張數-2) × linkBonusPerExtraCard))
    // 10/30 鈺勝親口確認：同屬性點哪張哪張出手（主攻），其餘同屬性為輔助、只拿一半能量；主攻倒下＝往後下一張存活同屬性（繞回）
    sameElementRule: 'tap-lead', supportEnergyRatio: 0.5, teamSize: 5,
    // 中等模式接入旗標：預設關閉，鈺勝本人核准前不改任何現有模式
    ORB_MEDIUM_ENABLED: false,
    linkMinCards: 2, linkEnergyCost: 50, linkBaseMultiplier: 3, linkBonusPerExtraCard: 0.5
  };

  function mulberry32(seed, stateIn) {
    var a = (stateIn == null ? seed : stateIn) >>> 0;
    var f = function () {
      a = (a + 0x6D2B79F5) >>> 0; f.state = a;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.state = a;
    return f;
  }
  function pick(rng) { return ELEMENTS[Math.floor(rng() * ELEMENTS.length)]; }
  function cloneBoard(b) { return b.map(function (r) { return r.slice(); }); }

  function wouldMatchAt(b, r, c, e) {
    return (c >= 2 && b[r][c - 1] === e && b[r][c - 2] === e) ||
           (r >= 2 && b[r - 1][c] === e && b[r - 2][c] === e);
  }
  function createBoard(rng, cols, rows) {
    cols = cols || CONFIG.cols; rows = rows || CONFIG.rows;
    for (var attempt = 0; attempt < 100; attempt++) {
      var b = [];
      for (var r = 0; r < rows; r++) {
        b.push([]);
        for (var c = 0; c < cols; c++) {
          var e, guard = 0;
          do { e = pick(rng); } while (wouldMatchAt(b, r, c, e) && ++guard < 50);
          b[r].push(e);
        }
      }
      if (findRuns(b).length === 0 && hasMoves(b)) return b;
    }
    throw new Error('createBoard failed');
  }

  // 回傳每條直線連線（長度不設上限）
  function findRuns(b, minLen) {
    minLen = minLen || CONFIG.minMatch;
    var rows = b.length, cols = b[0].length, runs = [], r, c, s;
    for (r = 0; r < rows; r++) {
      c = 0;
      while (c < cols) {
        s = c; while (c + 1 < cols && b[r][c + 1] != null && b[r][c + 1] === b[r][s]) c++;
        if (b[r][s] != null && c - s + 1 >= minLen) {
          var cells = []; for (var k = s; k <= c; k++) cells.push([r, k]);
          runs.push({ element: b[r][s], dir: 'h', length: cells.length, cells: cells });
        }
        c++;
      }
    }
    for (c = 0; c < cols; c++) {
      r = 0;
      while (r < rows) {
        s = r; while (r + 1 < rows && b[r + 1][c] != null && b[r + 1][c] === b[s][c]) r++;
        if (b[s][c] != null && r - s + 1 >= minLen) {
          var cells2 = []; for (var k2 = s; k2 <= r; k2++) cells2.push([k2, c]);
          runs.push({ element: b[s][c], dir: 'v', length: cells2.length, cells: cells2 });
        }
        r++;
      }
    }
    return runs;
  }
  function isAdjacent(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1; }
  function swapCells(b, a, c) {
    var n = cloneBoard(b), t = n[a[0]][a[1]];
    n[a[0]][a[1]] = n[c[0]][c[1]]; n[c[0]][c[1]] = t; return n;
  }
  function hasMoves(b) {
    var rows = b.length, cols = b[0].length;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      if (c + 1 < cols && findRuns(swapCells(b, [r, c], [r, c + 1])).length) return true;
      if (r + 1 < rows && findRuns(swapCells(b, [r, c], [r + 1, c])).length) return true;
    }
    return false;
  }
  function applyGravity(b, rng) {
    var rows = b.length, cols = b[0].length, n = cloneBoard(b);
    for (var c = 0; c < cols; c++) {
      var col = [];
      for (var r = rows - 1; r >= 0; r--) if (n[r][c] != null) col.push(n[r][c]);
      for (var r2 = rows - 1, i = 0; r2 >= 0; r2--, i++) n[r2][c] = i < col.length ? col[i] : pick(rng);
    }
    return n;
  }
  function reshuffle(rng, b) {
    return createBoard(rng, b[0].length, b.length);
  }

  // 卡片適配器：attackElements 預設只有主屬性
  function adaptCard(raw) {
    // art：正面 .v2 卡圖（assets/cards/），thumb：.v2 縮圖
    if (ELEMENTS.indexOf(raw.element) < 0) throw new Error('bad element ' + raw.element);
    return {
      id: raw.id, name: raw.name, element: raw.element,
      attackElements: Array.isArray(raw.attackElements) && raw.attackElements.length ? raw.attackElements.slice() : [raw.element],
      atk: raw.atk, maxHp: raw.hp, hp: raw.hp, energy: 0, demo: !!raw.demo, thumb: raw.thumb || null, art: raw.art || null
    };
  }
  var DEMO_TEAM = [
    { id: 'demo-m-air', name: '示範・青嵐', element: 'AIR', atk: 12, hp: 120, demo: true },
    { id: 'demo-m-space', name: '示範・玄虛', element: 'SPACE', atk: 11, hp: 120, demo: true },
    { id: 'demo-m-water', name: '示範・滄瀾', element: 'WATER', atk: 12, hp: 120, demo: true },
    { id: 'demo-m-fire', name: '示範・赤焰', element: 'FIRE', atk: 13, hp: 110, demo: true },
    { id: 'demo-m-earth', name: '示範・岳磐', element: 'EARTH', atk: 10, hp: 140, demo: true }
  ];
  // 正式五張（唯讀複製自 contrib/mingli/cards.json，來源 card-face-stats.ts；數值不得改動）
  var OFFICIAL_TEAM = [
    { id: 'beast_a01', name: '角木蛟', element: 'AIR', atk: 56, hp: 98, rarity: 'SSR', thumb: 'assets/thumb/adult-01.v2.webp', art: 'assets/cards/adult-01.v2.webp' },
    { id: 'beast_a02', name: '亢金龍', element: 'SPACE', atk: 62, hp: 129, rarity: 'SR', thumb: 'assets/thumb/adult-02.v2.webp', art: 'assets/cards/adult-02.v2.webp' },
    { id: 'beast_a05', name: '心月狐', element: 'WATER', atk: 62, hp: 143, rarity: 'R', thumb: 'assets/thumb/adult-05.v2.webp', art: 'assets/cards/adult-05.v2.webp' },
    { id: 'beast_a04', name: '房日兔', element: 'FIRE', atk: 67, hp: 104, rarity: 'SR', thumb: 'assets/thumb/adult-04.v2.webp', art: 'assets/cards/adult-04.v2.webp' },
    { id: 'beast_a03', name: '氐土貉', element: 'EARTH', atk: 44, hp: 109, rarity: 'R', thumb: 'assets/thumb/adult-03.v2.webp', art: 'assets/cards/adult-03.v2.webp' }
  ];
  // 正式敵方五張（contrib/mingli/enemies.json：beast_a22/a16/a07/a25/a10，排除我方五張）
  // 身分／屬性／圖取自 enemies.json；HP 300、反擊 atk 8 沿用原 CONFIG 數值【待平衡】（未套用 balance-proposal.md）
  var OFFICIAL_ENEMIES = [
    { id: 'beast_a22', name: '井木犴', element: 'AIR', atk: 8, hp: 300, art: 'assets/cards/adult-22.v2.webp' },
    { id: 'beast_a16', name: '婁金狗', element: 'SPACE', atk: 8, hp: 300, art: 'assets/cards/adult-16.v2.webp' },
    { id: 'beast_a07', name: '箕水豹', element: 'WATER', atk: 8, hp: 300, art: 'assets/cards/adult-07.v2.webp' },
    { id: 'beast_a25', name: '星日馬', element: 'FIRE', atk: 8, hp: 300, art: 'assets/cards/adult-25.v2.webp' },
    { id: 'beast_a10', name: '女土蝠', element: 'EARTH', atk: 8, hp: 300, art: 'assets/cards/adult-10.v2.webp' }
  ];
  var DEMO_ENEMIES = [
    { id: 'demo-e-air', name: '示範敵・颶', element: 'AIR', atk: 8, hp: 300, demo: true },
    { id: 'demo-e-space', name: '示範敵・冥', element: 'SPACE', atk: 8, hp: 300, demo: true },
    { id: 'demo-e-water', name: '示範敵・潮', element: 'WATER', atk: 8, hp: 300, demo: true },
    { id: 'demo-e-fire', name: '示範敵・燼', element: 'FIRE', atk: 8, hp: 300, demo: true },
    { id: 'demo-e-earth', name: '示範敵・礫', element: 'EARTH', atk: 8, hp: 300, demo: true }
  ];

  function lengthMultiplier(len, cfg) { cfg = cfg || CONFIG; return 1 + Math.max(0, len - cfg.minMatch) * cfg.lengthBonusPerExtraGem; }
  function chainMultiplier(chain, cfg) { cfg = cfg || CONFIG; return 1 + Math.max(0, chain - 1) * cfg.chainBonusPerStep; }
  function calcDamage(card, len, chain, cfg) {
    cfg = cfg || CONFIG;
    return Math.round(card.atk * lengthMultiplier(len, cfg) * chainMultiplier(chain, cfg) * cfg.BASE_RATIO);
  }

  function createGame(opts) {
    opts = opts || {};
    var cfg = Object.assign({}, CONFIG, opts.config || {});
    var seed = opts.seed == null ? 1 : opts.seed;
    var rng = mulberry32(seed);
    var s = {
      seed: seed, cfg: cfg, rng: rng,
      board: opts.board ? cloneBoard(opts.board) : generateDragBoard(rng, cfg.cols, cfg.rows),
      team: (opts.team || OFFICIAL_TEAM).map(adaptCard),
      enemies: (opts.enemies || OFFICIAL_ENEMIES).map(adaptCard),
      selected: 0, target: 0, maxChain: 0, turn: 0, totalDamage: 0, status: 'playing', events: [],
      leads: {}, mode: opts.mode === 'medium' && cfg.ORB_MEDIUM_ENABLED ? 'medium' : 'preview'
    };
    s.magic = opts.magic ? opts.magic.map(function (r) { return r.slice(); }) : emptyMagic(s.board);
    // 每個敵人每 enemyAttackEvery（=3，React ENEMY_COUNTER_EVERY）步反擊一次，不錯開
    s.enemies.forEach(function (e) { e.cd = cfg.enemyAttackEvery; });
    return s;
  }
  function emit(s, ev) { s.events.push(ev); return ev; }
  function aliveEnemyIndex(s) {
    if (s.enemies[s.target] && s.enemies[s.target].hp > 0) return s.target;
    for (var i = 0; i < s.enemies.length; i++) if (s.enemies[i].hp > 0) return i;
    return -1;
  }
  function pickAttacker(s, element) {
    var sel = s.team[s.selected];
    if (sel && sel.hp > 0 && sel.attackElements.indexOf(element) >= 0) return s.selected;
    for (var i = 0; i < s.team.length; i++) if (s.team[i].hp > 0 && s.team[i].attackElements.indexOf(element) >= 0) return i;
    return -1;
  }
  function selectCard(s, i) { var c = s.team[i]; if (c && c.hp > 0) { s.selected = i; s.leads[c.element] = i; } return s; }
  // 該屬性主攻：點過且存活＝點的那張；點的倒下＝往後下一張存活同屬性（繞回）；沒點過＝第一張存活
  function leadFor(s, element) {
    var same = []; s.team.forEach(function (c, i) { if (c.element === element) same.push(i); });
    if (!same.length) return -1;
    var k0 = Math.max(0, same.indexOf(s.leads[element] == null ? same[0] : s.leads[element]));
    for (var k = 0; k < same.length; k++) { var i = same[(k0 + k) % same.length]; if (s.team[i].hp > 0) return i; }
    return -1;
  }
  // 自選 5 張（同屬性可重複）：只檢查張數、id 存在於卡池、不重複同一張
  function validTeamIds(ids, pool, size) {
    size = size || CONFIG.teamSize;
    if (!Array.isArray(ids) || ids.length !== size) return false;
    var seen = {}; return ids.every(function (id) { if (seen[id] || pool.indexOf(id) < 0) return false; seen[id] = 1; return true; });
  }
  function selectTarget(s, i) { if (s.enemies[i] && s.enemies[i].hp > 0) s.target = i; return s; }
  function checkEnd(s) { if (s.enemies.every(function (e) { return e.hp <= 0; })) { s.status = 'won'; emit(s, { type: 'battleWon' }); } }

  // 屬性克制：真表，來源 lib/beast-game/elements.ts（ELEMENT_COUNTER，×1.2／×0.9），見 CONFIG.ADVANTAGE
  function advantage(atkEl, defEl, cfg) {
    cfg = cfg || CONFIG; var a = cfg.ADVANTAGE;
    if (!a || !a.enabled) return 1;
    if (a.beats[atkEl] === defEl) return a.strong;
    if (a.beats[defEl] === atkEl) return a.weak;
    return 1;
  }
  function attackersFor(s, element) {
    if (s.cfg.sameElementRule === 'tap-lead') { var L = leadFor(s, element); return L < 0 ? [] : [L]; }
    var list = [], i;
    var sel = s.team[s.selected];
    if (sel && sel.hp > 0 && sel.element === element) list.push(s.selected);
    for (i = 0; i < s.team.length; i++) if (i !== s.selected && s.team[i].hp > 0 && s.team[i].element === element) list.push(i);
    return list;
  }
  // 敵方回合計數：每次成功交換後 -1，歸零攻擊我方 HP 最低的存活卡（同 HP 取前者），再重置
  function enemyPhase(s) {
    if (s.status !== 'playing') return;
    s.enemies.forEach(function (e, ei) {
      if (e.hp <= 0 || s.status !== 'playing') return;
      e.cd -= 1;
      if (e.cd > 0) return;
      e.cd = s.cfg.enemyAttackEvery;
      var t = -1;
      s.team.forEach(function (c, i) { if (c.hp > 0 && (t < 0 || c.hp < s.team[t].hp)) t = i; });
      if (t < 0) return;
      var adv = advantage(e.element, s.team[t].element, s.cfg);
      var dmg = Math.round(e.atk * s.cfg.enemyAtkMultiplier * adv);
      s.team[t].hp = Math.max(0, s.team[t].hp - dmg);
      emit(s, { type: 'enemyAttack', enemy: ei, target: t, damage: dmg, advantage: adv });
      if (s.team[t].hp <= 0) { s.team[t].energy = 0; emit(s, { type: 'knockedOut', target: t }); }
      if (s.team.every(function (c) { return c.hp <= 0; })) { s.status = 'lost'; emit(s, { type: 'battleLost' }); }
    });
  }

  function resolve(s) {
    var chain = 0, out = [];
    while (chain < s.cfg.maxCascade) {
      var runs = findRuns(s.board, s.cfg.minMatch);
      if (!runs.length) break;
      chain++;
      emit(s, { type: 'chain', chain: chain, runs: runs.length });
      var clear = {};
      runs.forEach(function (run) {
        run.cells.forEach(function (p) { clear[p[0] + ',' + p[1]] = p; });
        if (run.length >= s.cfg.magicOrbMinLength) {
          emit(s, { type: 'magicOrbCandidate', element: run.element, length: run.length, cells: run.cells, spawned: false });
        }
        var res = { element: run.element, length: run.length, chain: chain, attacker: -1, target: -1, damage: 0, attackers: [] };
        var ti = aliveEnemyIndex(s), atks = attackersFor(s, run.element);
        // 該色所有存活卡充能（每顆珠 energyPerGem）
        s.team.forEach(function (c) { if (c.hp > 0 && c.element === run.element) c.energy = Math.min(s.cfg.energyMax, c.energy + run.length * s.cfg.energyPerGem); });
        if (atks.length && ti >= 0 && s.status === 'playing') {
          atks.forEach(function (ai) {
            ti = aliveEnemyIndex(s); if (ti < 0 || s.status !== 'playing') return;
            var card = s.team[ai], adv = advantage(run.element, s.enemies[ti].element, s.cfg);
            var dmg = Math.round(card.atk * lengthMultiplier(run.length, s.cfg) * chainMultiplier(chain, s.cfg) * adv * s.cfg.BASE_RATIO);
            s.enemies[ti].hp = Math.max(0, s.enemies[ti].hp - dmg);
            s.totalDamage += dmg;
            if (res.attacker < 0) { res.attacker = ai; res.target = ti; }
            res.damage += dmg; res.attackers.push(ai);
            emit(s, { type: 'attack', attacker: ai, target: ti, element: run.element, length: run.length, chain: chain, damage: dmg, advantage: adv, cells: run.cells });
            checkEnd(s);
          });
        } else {
          emit(s, { type: 'clearNoAttack', element: run.element, length: run.length, chain: chain, outcome: attackOutcome(s.team, run.element) });
        }
        out.push(res);
      });
      Object.keys(clear).forEach(function (k) { var p = clear[k]; s.board[p[0]][p[1]] = null; });
      s.board = applyGravity(s.board, s.rng);
    }
    if (!hasMoves(s.board)) { s.board = reshuffle(s.rng, s.board); emit(s, { type: 'reshuffle' }); }
    return { chains: chain, results: out };
  }

  // 舊版交換輸入（legacy，UI 已改用 tryDrag；保留供舊測試）
  function trySwap(s, a, b) {
    if (s.status !== 'playing') return { ok: false, reason: 'ended' };
    var rows = s.board.length, cols = s.board[0].length;
    function inB(p) { return p[0] >= 0 && p[0] < rows && p[1] >= 0 && p[1] < cols; }
    if (!inB(a) || !inB(b) || !isAdjacent(a, b)) return { ok: false, reason: 'notAdjacent' };
    var nb = swapCells(s.board, a, b);
    if (!findRuns(nb, s.cfg.minMatch).length) { emit(s, { type: 'swapReverted', a: a, b: b }); return { ok: false, reason: 'noMatch' }; }
    s.board = nb; s.turn++;
    var r = resolve(s);
    if (r.chains > s.maxChain) s.maxChain = r.chains;
    enemyPhase(s);
    return { ok: true, chains: r.chains, results: r.results };
  }

  function useSkill(s, i) {
    var card = s.team[i];
    if (!card || card.hp <= 0 || s.status !== 'playing') return { ok: false, reason: 'invalid' };
    if (card.energy < s.cfg.energyMax) return { ok: false, reason: 'energyNotFull' };
    var ti = aliveEnemyIndex(s); if (ti < 0) return { ok: false, reason: 'noTarget' };
    var adv = advantage(card.element, s.enemies[ti].element, s.cfg);
    var dmg = skillAmount(card.atk, adv, s.cfg);
    s.enemies[ti].hp = Math.max(0, s.enemies[ti].hp - dmg);
    s.totalDamage += dmg; card.energy = 0;
    emit(s, { type: 'skill', attacker: i, target: ti, damage: dmg, advantage: adv });
    checkEnd(s);
    return { ok: true, damage: dmg, target: ti };
  }

  // ---- 連線攻擊（2026-10-29 新增；規則為假設，待鈺勝核准）TODO-balance ----
  function linkMultiplier(n, cfg) { cfg = cfg || CONFIG; return 1 + Math.max(0, n - cfg.linkMinCards) * cfg.linkBonusPerExtraCard; }
  function calcLinkDamage(cards, cfg) {
    cfg = cfg || CONFIG;
    var sum = cards.reduce(function (a, c) { return a + c.atk; }, 0);
    return Math.round(sum * cfg.linkBaseMultiplier * linkMultiplier(cards.length, cfg));
  }
  function checkLink(s, idx, ti) {
    if (s.status !== 'playing') return 'ended';
    if (!Array.isArray(idx) || idx.length < s.cfg.linkMinCards) return 'tooFew';
    var seen = {};
    for (var k = 0; k < idx.length; k++) {
      var i = idx[k];
      if (typeof i !== 'number' || !s.team[i]) return 'badIndex';
      if (seen[i]) return 'duplicate'; seen[i] = 1;
      if (s.team[i].hp <= 0) return 'deadAttacker';
      if (s.team[i].energy < s.cfg.linkEnergyCost) return 'energyLow';
    }
    if (typeof ti !== 'number' || !Number.isInteger(ti) || !s.enemies[ti]) return 'badTarget';
    if (s.enemies[ti].hp <= 0) return 'deadTarget';
    return null;
  }
  function linkAttack(s, idx, ti) {
    var bad = checkLink(s, idx, ti);
    if (bad) return { ok: false, reason: bad };
    var cards = idx.map(function (i) { return s.team[i]; });
    var dmg = calcLinkDamage(cards, s.cfg);
    var before = s.enemies[ti].hp;
    s.enemies[ti].hp = Math.max(0, before - dmg);
    s.totalDamage += dmg;
    cards.forEach(function (c) { c.energy -= s.cfg.linkEnergyCost; });
    var ev = emit(s, { type: 'linkAttack', attackers: idx.slice(), target: ti, damage: dmg, linkLength: idx.length,
      multiplier: linkMultiplier(idx.length, s.cfg), energyCost: s.cfg.linkEnergyCost, targetHpBefore: before, targetHpAfter: s.enemies[ti].hp });
    checkEnd(s);
    return { ok: true, damage: dmg, target: ti, event: ev };
  }

  // ---- 拖曳連珠（移植 beast-preview lib/beast-game/match3/drag.ts、energy.ts、damage.ts；格子用 [r,c]）----
  function normalPower(n, cfg) { cfg = cfg || CONFIG; return Math.min(Math.max(0, n), cfg.NORMAL_POWER_CAP); }
  function skillAmount(atk, adv, cfg) { cfg = cfg || CONFIG; return Math.round(atk * cfg.SKILL_RATIO * (adv == null ? 1 : adv)); }
  function emptyMagic(b) { return b.map(function (row) { return row.map(function () { return 0; }); }); }
  function inBoundsP(b, p) { return Array.isArray(p) && p[0] >= 0 && p[0] < b.length && p[1] >= 0 && p[1] < b[0].length; }
  function key(p) { return p[0] * 1000 + p[1]; }
  // 這格能不能接在路徑後面：上下左右相鄰、與 path[0] 同色、沒走過
  function canExtend(b, path, p) {
    if (!inBoundsP(b, p)) return false;
    if (!path.length) return true;
    if (!isAdjacent(path[path.length - 1], p)) return false;
    if (b[p[0]][p[1]] !== b[path[0][0]][path[0][1]]) return false;
    return !path.some(function (q) { return q[0] === p[0] && q[1] === p[1]; });
  }
  function isValidPath(b, path) {
    if (!Array.isArray(path) || !path.length) return false;
    for (var i = 0; i < path.length; i++) if (!canExtend(b, path.slice(0, i), path[i])) return false;
    return true;
  }
  function largestDragChain(b) {
    var seen = {}, best = 0, rows = b.length, cols = b[0].length;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      if (seen[r * 1000 + c]) continue;
      var n = 0, st = [[r, c]]; seen[r * 1000 + c] = 1;
      while (st.length) {
        var p = st.pop(); n++;
        [[p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]].forEach(function (q) {
          if (inBoundsP(b, q) && !seen[key(q)] && b[q[0]][q[1]] === b[r][c]) { seen[key(q)] = 1; st.push(q); }
        });
      }
      if (n > best) best = n;
    }
    return best;
  }
  function hasDragMove(b, cfg) { cfg = cfg || CONFIG; return largestDragChain(b) >= cfg.minMatch; }
  function generateDragBoard(rng, cols, rows) {
    for (var i = 0; i < 100; i++) { var b = createBoard(rng, cols, rows); if (hasDragMove(b)) return b; }
    throw new Error('match3: 無法生成可拖曳盤面');
  }
  // 無步可走洗盤：魔法珠原地保留（位置、顏色、威力），只重洗普通珠
  function reshuffleKeepMagic(board, magic, rng) {
    var rows = board.length, cols = board[0].length, keep = magic.map(function (r) { return r.slice(); }), last = board;
    for (var i = 0; i < 300; i++) {
      var b = createBoard(rng, cols, rows);
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) if (keep[r][c] > 0) b[r][c] = board[r][c];
      last = b;
      if (findRuns(b).length === 0 && hasDragMove(b)) return { board: b, magic: keep };
    }
    return { board: last, magic: keep };
  }
  // 直線合併成組（L／T／十字共用格只算一次），移植 match.ts findGroups
  function findGroups(b, minLen) {
    var runs = findRuns(b, minLen), parent = runs.map(function (_, i) { return i; });
    function find(i) { return parent[i] === i ? i : (parent[i] = find(parent[i])); }
    for (var i = 0; i < runs.length; i++) for (var j = i + 1; j < runs.length; j++) {
      if (runs[i].element !== runs[j].element) continue;
      var set = {}; runs[i].cells.forEach(function (p) { set[key(p)] = 1; });
      if (runs[j].cells.some(function (p) { return set[key(p)]; })) parent[find(j)] = find(i);
    }
    var buckets = {}, order = [];
    runs.forEach(function (run, i) { var k = find(i); if (!buckets[k]) { buckets[k] = []; order.push(k); } buckets[k].push(run); });
    return order.map(function (k) {
      var rs = buckets[k], seen = {}, cells = [];
      rs.forEach(function (run) { run.cells.forEach(function (p) { if (!seen[key(p)]) { seen[key(p)] = 1; cells.push([p[0], p[1]]); } }); });
      var lens = rs.map(function (run) { return run.cells.length; });
      return { element: rs[0].element, cells: cells, size: cells.length, longest: Math.max.apply(null, lens), runs: lens };
    });
  }
  function collapseBoth(b, m, cleared, rng) {
    var rows = b.length, cols = b[0].length, nb = cloneBoard(b), nm = m.map(function (x) { return x.slice(); });
    for (var c = 0; c < cols; c++) {
      var keep = [];
      for (var r = rows - 1; r >= 0; r--) if (!cleared[r * 1000 + c]) keep.push([b[r][c], m[r][c]]);
      for (var r2 = rows - 1, i = 0; r2 >= 0; r2--, i++) {
        if (i < keep.length) { nb[r2][c] = keep[i][0]; nm[r2][c] = keep[i][1]; } else { nb[r2][c] = pick(rng); nm[r2][c] = 0; }
      }
    }
    return { board: nb, magic: nm };
  }
  // power＝普通顆數（上限 10）＋組內魔法珠威力（不設上限）
  function scoreGroup(g, m, chain, triggers, cfg) {
    var mp = 0, mc = 0;
    g.cells.forEach(function (p) { var v = m[p[0]] && m[p[0]][p[1]]; if (v > 0) { mp += v; mc++; triggers.push({ r: p[0], c: p[1], element: g.element, power: v, chain: chain }); } });
    var out = Object.assign({}, g, { power: normalPower(g.size - mc, cfg) + mp });
    if (mc) { out.magic = true; out.magicPower = mp; }
    return out;
  }
  // 純函式：resolveDrag（drag.ts）。不合法回 valid:false、盤面不變
  function resolveDragBoard(board, path, rng, magicIn, cfg) {
    cfg = cfg || CONFIG;
    var magic0 = magicIn || emptyMagic(board);
    function fail(reason) { return { valid: false, reason: reason, board: board, magic: magic0, steps: [], chainLength: Array.isArray(path) ? path.length : 0, element: null, magicSpawn: null, skill5: false, magicTriggered: [], reshuffled: false }; }
    if (!isValidPath(board, path)) return fail('path');
    if (path.length < cfg.minMatch) return fail('short');
    var element = board[path[0][0]][path[0][1]], n = path.length, triggers = [], skill5 = n === cfg.SKILL5_LENGTH;
    var g1 = scoreGroup({ element: element, cells: path.map(function (p) { return [p[0], p[1]]; }), size: n, longest: n, runs: [n] }, magic0, 1, triggers, cfg);
    if (skill5) g1.skill5 = true;
    var cleared = {}; path.forEach(function (p) { cleared[key(p)] = 1; });
    var spawn = null, m1 = magic0.map(function (x) { return x.slice(); });
    path.forEach(function (p) { m1[p[0]][p[1]] = 0; });
    if (cfg.magicOrbSpawnEnabled && n >= cfg.magicOrbMinLength) {
      var end = path[n - 1]; delete cleared[key(end)]; m1[end[0]][end[1]] = n;
      spawn = { r: end[0], c: end[1], element: element, power: n };
    }
    var cb = collapseBoth(board, m1, cleared, rng), b = cb.board, m = cb.magic;
    if (spawn) for (var r = b.length - 1; r >= 0; r--) if (m[r][spawn.c] === n && b[r][spawn.c] === element) { spawn = Object.assign({}, spawn, { r: r }); break; }
    var steps = [{ chain: 1, groups: [g1], boardAfter: cloneBoard(b), magicAfter: m.map(function (x) { return x.slice(); }) }];
    for (var chain = 2; chain <= cfg.maxCascade; chain++) {
      var groups = findGroups(b, cfg.minMatch); if (!groups.length) break;
      var scored = groups.map(function (g) { return scoreGroup(g, m, chain, triggers, cfg); });
      var cl = {}; groups.forEach(function (g) { g.cells.forEach(function (p) { cl[key(p)] = 1; }); });
      var mm = m.map(function (x) { return x.slice(); }); Object.keys(cl).forEach(function (k) { mm[Math.floor(k / 1000)][k % 1000] = 0; });
      cb = collapseBoth(b, mm, cl, rng); b = cb.board; m = cb.magic;
      steps.push({ chain: chain, groups: scored, boardAfter: cloneBoard(b), magicAfter: m.map(function (x) { return x.slice(); }) });
    }
    var reshuffled = false;
    if (!hasDragMove(b, cfg)) { var rs = reshuffleKeepMagic(b, m, rng); b = rs.board; m = rs.magic; reshuffled = true; }
    return { valid: true, board: b, magic: m, steps: steps, chainLength: n, element: element, magicSpawn: spawn, skill5: skill5, magicTriggered: triggers, reshuffled: reshuffled };
  }
  // energy.ts：消哪色充哪色（每顆 energyPerGem）；魔法珠被消／五珠技＝該屬性集滿
  function energyGains(res, cfg) {
    cfg = cfg || CONFIG; var map = {}, list = [];
    function at(el) { if (!map[el]) { map[el] = { element: el, gain: 0, fill: false }; list.push(map[el]); } return map[el]; }
    res.steps.forEach(function (s) { s.groups.forEach(function (g) { at(g.element).gain += g.size * cfg.energyPerGem; }); });
    res.magicTriggered.forEach(function (t) { at(t.element).fill = true; });
    if (res.skill5 && res.element) at(res.element).fill = true;
    return list;
  }
  function applyEnergy(cur, g, cfg) { cfg = cfg || CONFIG; if (!g) return cur; return g.fill ? cfg.energyMax : Math.min(cfg.energyMax, cur + g.gain); }
  // 遊戲狀態版：拖曳發動 → 傷害（只主屬性、每張該色存活卡各打一次、選取卡優先）→ 能量 → 敵方回合
  // 出手結果分類（移植 beast-preview outcome.ts）：分開「已倒下（ko）」與「隊伍沒有（absent）」
  function attackOutcome(team, element) {
    var same = team.filter(function (u) { return u.element === element; });
    if (!same.length) return { kind: 'absent' };
    if (same.every(function (u) { return u.hp <= 0; })) return { kind: 'ko', names: same.map(function (u) { return u.name || u.id || ''; }) };
    return { kind: 'hit', amount: 0 };
  }
  function attackOutcomeText(o, label) {
    if (!o || o.kind === 'hit') return '未造成傷害';
    if (o.kind === 'ko') return '我方' + label + '屬性卡已倒下（' + o.names.join('、') + '），無法出手';
    return '隊伍裡沒有' + label + '屬性主卡可出手';
  }
  function tryDrag(s, path) {
    if (s.status !== 'playing') return { ok: false, reason: 'ended' };
    var res = resolveDragBoard(s.board, path, s.rng, s.magic, s.cfg);
    if (!res.valid) { emit(s, { type: 'dragCancel', reason: res.reason, length: res.chainLength }); return { ok: false, reason: res.reason }; }
    s.turn++;
    emit(s, { type: 'drag', element: res.element, length: res.chainLength, path: path.map(function (p) { return [p[0], p[1]]; }), skill5: res.skill5 });
    if (res.magicSpawn) emit(s, Object.assign({ type: 'magicOrbSpawn' }, res.magicSpawn));
    if (res.skill5) emit(s, { type: 'skill5', element: res.element });
    res.steps.forEach(function (step) {
      emit(s, { type: 'chain', chain: step.chain, runs: step.groups.length });
      step.groups.forEach(function (g) {
        var atks = attackersFor(s, g.element);
        if (!atks.length || s.status !== 'playing') { emit(s, { type: 'clearNoAttack', element: g.element, length: g.power, orbs: g.size, chain: step.chain, cells: g.cells, outcome: attackOutcome(s.team, g.element) }); return; }
        atks.forEach(function (ai) {
          var ti = aliveEnemyIndex(s); if (ti < 0 || s.status !== 'playing') return;
          var card = s.team[ai], adv = advantage(g.element, s.enemies[ti].element, s.cfg);
          var dmg = Math.round(card.atk * s.cfg.BASE_RATIO * lengthMultiplier(g.power, s.cfg) * chainMultiplier(step.chain, s.cfg) * adv);
          s.enemies[ti].hp = Math.max(0, s.enemies[ti].hp - dmg); s.totalDamage += dmg;
          emit(s, { type: 'attack', attacker: ai, target: ti, element: g.element, length: g.power, power: g.power, orbs: g.size, magic: !!g.magic, skill5: !!g.skill5, chain: step.chain, damage: dmg, advantage: adv, cells: g.cells });
          checkEnd(s);
        });
      });
    });
    res.magicTriggered.forEach(function (t) { emit(s, Object.assign({ type: 'magicOrbTrigger' }, t)); });
    energyGains(res, s.cfg).forEach(function (eg) {
      var lead = s.cfg.sameElementRule === 'tap-lead' ? leadFor(s, eg.element) : -2;
      s.team.forEach(function (c, i) { if (c.hp > 0 && c.element === eg.element) { var before = c.energy; var g2 = (lead === -2 || i === lead) ? eg : { element: eg.element, gain: Math.floor(eg.gain * s.cfg.supportEnergyRatio), fill: false }; c.energy = applyEnergy(c.energy, g2, s.cfg); emit(s, { type: 'energy', card: i, element: eg.element, before: before, after: c.energy, fill: eg.fill }); } });
    });
    s.board = res.board; s.magic = res.magic;
    if (res.reshuffled) emit(s, { type: 'reshuffle', keepMagic: true });
    if (res.steps.length > s.maxChain) s.maxChain = res.steps.length;
    enemyPhase(s);
    return { ok: true, chains: res.steps.length, result: res };
  }
  // ===== 存檔／讀檔 v1：獨立鍵，永不覆寫舊進度（tdh_beast_collection_v1 等） =====
  var SAVE_KEY = 'tdh_beast_orb_battle_save_v1', SAVE_VERSION = 1;
  function serializeGame(s) {
    return {
      v: SAVE_VERSION, kind: 'orb-battle', mode: s.mode, savedAt: Date.now(),
      seed: s.seed, rngState: s.rng.state >>> 0,
      board: cloneBoard(s.board), magic: s.magic.map(function (r) { return r.slice(); }),
      team: s.team.map(function (c) { return { id: c.id, hp: c.hp, energy: c.energy }; }),
      enemies: s.enemies.map(function (e) { return { id: e.id, hp: e.hp, cd: e.cd }; }),
      leads: Object.assign({}, s.leads), selected: s.selected, target: s.target,
      turn: s.turn, movesToCounter: s.cfg.enemyAttackEvery - (s.turn % s.cfg.enemyAttackEvery),
      maxChain: s.maxChain, totalDamage: s.totalDamage, status: s.status
    };
  }
  // pool：卡面數值唯一來源（正式卡資料），存檔只存 id／hp／能量，不存攻防數值
  function deserializeGame(data, opts) {
    opts = opts || {};
    if (!data || data.v !== SAVE_VERSION || data.kind !== 'orb-battle') return null;
    var cfg = Object.assign({}, CONFIG, opts.config || {});
    var b = data.board, m = data.magic;
    if (!Array.isArray(b) || b.length !== cfg.rows || !b.every(function (r) { return Array.isArray(r) && r.length === cfg.cols && r.every(function (e) { return ELEMENTS.indexOf(e) >= 0; }); })) return null;
    if (!Array.isArray(m) || m.length !== cfg.rows || !m.every(function (r) { return Array.isArray(r) && r.length === cfg.cols && r.every(function (x) { return Number.isInteger(x) && x >= 0; }); })) return null;
    var teamPool = opts.teamPool || OFFICIAL_TEAM, enemyPool = opts.enemyPool || OFFICIAL_ENEMIES;
    function byId(pool, id) { for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i]; return null; }
    var teamRaw = (data.team || []).map(function (t) { return byId(teamPool, t.id); });
    var enRaw = (data.enemies || []).map(function (t) { return byId(enemyPool, t.id); });
    if (!teamRaw.length || teamRaw.some(function (x) { return !x; }) || !enRaw.length || enRaw.some(function (x) { return !x; })) return null;
    var s = createGame({ seed: data.seed, board: b, magic: m, team: teamRaw, enemies: enRaw, config: opts.config, mode: data.mode });
    s.rng = mulberry32(data.seed, data.rngState);
    s.team.forEach(function (c, i) { var t = data.team[i]; c.hp = Math.max(0, Math.min(c.maxHp, t.hp | 0)); c.energy = Math.max(0, Math.min(cfg.energyMax, t.energy | 0)); });
    s.enemies.forEach(function (e, i) { var t = data.enemies[i]; e.hp = Math.max(0, Math.min(e.maxHp, t.hp | 0)); e.cd = Math.max(1, Math.min(cfg.enemyAttackEvery, t.cd | 0)); });
    s.leads = {}; Object.keys(data.leads || {}).forEach(function (el) { var i = data.leads[el]; if (s.team[i] && s.team[i].element === el) s.leads[el] = i; });
    s.selected = s.team[data.selected] ? data.selected : 0; s.target = s.enemies[data.target] ? data.target : 0;
    s.turn = data.turn | 0; s.maxChain = data.maxChain | 0; s.totalDamage = data.totalDamage | 0;
    s.status = ['playing', 'won', 'lost'].indexOf(data.status) >= 0 ? data.status : 'playing';
    return s;
  }
  function saveGame(storage, s) { try { storage.setItem(SAVE_KEY, JSON.stringify(serializeGame(s))); return true; } catch (e) { return false; } }
  function loadGame(storage, opts) { try { var raw = storage.getItem(SAVE_KEY); return raw ? deserializeGame(JSON.parse(raw), opts) : null; } catch (e) { return null; } }
  function clearSave(storage) { try { storage.removeItem(SAVE_KEY); } catch (e) { /* 無 storage 時照樣可玩 */ } }

  // 找一條可拖路徑（DFS，長度 3）供提示／測試
  function findDragHint(b, len) {
    len = len || 3;
    function dfs(p) { if (p.length === len) return p; var l = p[p.length - 1], n = [[l[0] + 1, l[1]], [l[0] - 1, l[1]], [l[0], l[1] + 1], [l[0], l[1] - 1]];
      for (var i = 0; i < 4; i++) if (canExtend(b, p, n[i])) { var x = dfs(p.concat([n[i]])); if (x) return x; } return null; }
    for (var r = 0; r < b.length; r++) for (var c = 0; c < b[0].length; c++) { var x = dfs([[r, c]]); if (x) return x; }
    return null;
  }
  function findHint(b) {
    var rows = b.length, cols = b[0].length;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      if (c + 1 < cols && findRuns(swapCells(b, [r, c], [r, c + 1])).length) return [[r, c], [r, c + 1]];
      if (r + 1 < rows && findRuns(swapCells(b, [r, c], [r + 1, c])).length) return [[r, c], [r + 1, c]];
    }
    return null;
  }

  return {
    VERSION: 'v0.7-rebuild', ELEMENTS: ELEMENTS, LABEL: LABEL, GEM_CLASS: GEM_CLASS, COLOR: COLOR, CONFIG: CONFIG,
    DEMO_TEAM: DEMO_TEAM, OFFICIAL_TEAM: OFFICIAL_TEAM, DEMO_ENEMIES: DEMO_ENEMIES, OFFICIAL_ENEMIES: OFFICIAL_ENEMIES, attackOutcome: attackOutcome, attackOutcomeText: attackOutcomeText,
    mulberry32: mulberry32, createBoard: createBoard, findRuns: findRuns, isAdjacent: isAdjacent,
    swapCells: swapCells, hasMoves: hasMoves, applyGravity: applyGravity, reshuffle: reshuffle,
    adaptCard: adaptCard, lengthMultiplier: lengthMultiplier, chainMultiplier: chainMultiplier, calcDamage: calcDamage,
    createGame: createGame, trySwap: trySwap, resolve: resolve, useSkill: useSkill,
    selectCard: selectCard, selectTarget: selectTarget, pickAttacker: pickAttacker, findHint: findHint,
    linkAttack: linkAttack, checkLink: checkLink, calcLinkDamage: calcLinkDamage, linkMultiplier: linkMultiplier,
    advantage: advantage, attackersFor: attackersFor, enemyPhase: enemyPhase,
    normalPower: normalPower, emptyMagic: emptyMagic, canExtend: canExtend, isValidPath: isValidPath, findGroups: findGroups,
    largestDragChain: largestDragChain, hasDragMove: hasDragMove, generateDragBoard: generateDragBoard,
    reshuffleKeepMagic: reshuffleKeepMagic, resolveDragBoard: resolveDragBoard, energyGains: energyGains, applyEnergy: applyEnergy,
    skillAmount: skillAmount, tryDrag: tryDrag, findDragHint: findDragHint,
    leadFor: leadFor, validTeamIds: validTeamIds,
    SAVE_KEY: SAVE_KEY, SAVE_VERSION: SAVE_VERSION, serializeGame: serializeGame, deserializeGame: deserializeGame,
    saveGame: saveGame, loadGame: loadGame, clearSave: clearSave
  };
});
