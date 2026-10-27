/** Server-owned calculations. Client components import the result type only. */
import skill from '../../docs/技能戰鬥檔案/西方生命密碼/西方生命密碼.json';
import registry from '../../docs/技能戰鬥檔案/西方生命密碼/來源登記.json';
import meanings from '../../docs/技能戰鬥檔案/西方生命密碼/主數解說.json';
import { createHash } from 'node:crypto';

type RuleKey = keyof typeof skill.rules;
type Status = 'PASSED' | 'FAILED' | 'UNVERIFIED' | 'CONFLICT';
type Trace = { input: number; sequence: number[]; final: number; preserveMasters: boolean };
type Source = (typeof registry.sources)[number];
export type LifeCodeFrame = { title: string; kind: 'sum' | 'difference' | 'keep' | 'record' | 'finish'; tokens: string[]; result: string; equation: string; explanation: string; label: string; pace?: { take: number; result: number }; progress?: { before: { label: string; value: string }[]; after: { label: string; value: string }[] }; origin?: { birthday: string[]; values: string[]; slots: number[][]; fromBirthday: boolean; fromResults?: boolean } };
export type LifeCodeCard = {
  id: string; title: string; category: string; display: string; status: Status;
  statusText: string; steps: string[]; final_value: number | number[] | null;
  intermediate_values: Trace[]; calculation_method: string; source: Source | null;
  source_location: string; rule_version: string; note: string;
  interpretation: { text: string; review_status: 'UNVERIFIED' | 'SOURCE_CHECKED'; copyright_status: string };
  walkthrough?: LifeCodeFrame[];
};
const digits = (n: number) => String(n).split('').map(Number);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const root = (n: number) => n === 0 ? 0 : 1 + ((n - 1) % 9);

export function reduceNumber(input: number, preserveMasters: boolean): Trace {
  if (!Number.isSafeInteger(input) || input < 0) throw new Error('數字必須為非負安全整數');
  const sequence = [input];
  let current = input;
  while (current > 9 && !(preserveMasters && skill.masters.includes(current))) {
    current = sum(digits(current)); sequence.push(current);
  }
  return { input, sequence, final: current, preserveMasters };
}
function verifyTrace(trace: Trace) {
  return trace.sequence[0] === trace.input && trace.sequence.at(-1) === trace.final
    && root(trace.input) === root(trace.final)
    && trace.sequence.every((n, i) => i === 0 || n === sum(digits(trace.sequence[i - 1])))
    && (trace.final <= 9 || (trace.preserveMasters && skill.masters.includes(trace.final)));
}
function show(trace: Trace) { return trace.sequence.join(' → '); }
function dateParts(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}請使用西元公曆年、月、日`);
  const [y, m, d] = value.split('-').map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1]) throw new Error(`${label}不存在，請確認年月日`);
  return { y, m, d, text: value };
}
export function todayInTaipei() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function lifeCodeGuidance() {
  return { title: skill.name, ...skill.copy, defaultTargetDate: todayInTaipei(), ruleVersion: skill.version };
}
function interpretation() {
  return { text: skill.copy.interpretation, review_status: 'UNVERIFIED' as const, copyright_status: '未匯入或生成個性命運解讀' };
}
function unavailable(id: string, title: string, category: string, note: string, sourceId?: string): LifeCodeCard {
  return { id, title, category, display: skill.copy.unavailable, status: 'UNVERIFIED', statusText: '尚未完成', steps: [], final_value: null,
    intermediate_values: [], calculation_method: '', source: registry.sources.find(s => s.id === sourceId) ?? null,
    source_location: '', rule_version: skill.version, note, interpretation: interpretation() };
}
function card(id: RuleKey, value: number | number[], traces: Trace[], steps: string[], note = ''): LifeCodeCard {
  const rule = skill.rules[id];
  const source = registry.sources.find(s => s.id === rule.source) ?? null;
  const status: Status = source?.status === 'CONFLICT' ? 'CONFLICT' : source?.status !== 'LOCATED' ? 'UNVERIFIED'
    : traces.every(verifyTrace) ? 'PASSED' : 'FAILED';
  const valid = status === 'PASSED';
  return { id, title: rule.title, category: rule.category, display: valid ? (Array.isArray(value) ? value.join(' · ') || '無' : String(value)) : skill.copy.unavailable,
    status, statusText: valid ? skill.copy.verification : skill.copy.unavailable, steps: valid ? steps : [],
    final_value: valid ? value : null, intermediate_values: valid ? traces : [], calculation_method: rule.method,
    source, source_location: rule.location, rule_version: skill.version, note, interpretation: interpretation() };
}

function walkFrames(item: LifeCodeCard, birth: ReturnType<typeof dateParts>, target: ReturnType<typeof dateParts>, cards: LifeCodeCard[]): LifeCodeFrame[] {
  if (item.status !== 'PASSED') return [];
  const frames: Omit<LifeCodeFrame, 'label'>[] = [];
  const copy = skill.walk;
  const add = (title: string, values: number[], result: number) => frames.push({ title, kind: 'sum', tokens: values.map(String), result: String(result), equation: `${values.join(' ＋ ')} ＝ ${result}`, explanation: copy.add });
  const reduce = (title: string, trace: Trace) => {
    if (trace.sequence.length === 1) frames.push({ title, kind: 'keep', tokens: [String(trace.input)], result: String(trace.final), equation: String(trace.final), explanation: trace.final > 9 ? copy.master : copy.single });
    for (let i = 1; i < trace.sequence.length; i++) {
      const operands = digits(trace.sequence[i - 1]);
      frames.push({ title: `${title}：拆開 ${trace.sequence[i - 1]}`, kind: 'sum', tokens: operands.map(String), result: String(trace.sequence[i]), equation: `${operands.join(' ＋ ')} ＝ ${trace.sequence[i]}`, explanation: copy.split });
    }
    if (trace.sequence.length > 1 && trace.final > 9) frames.push({ title: `${title}：保留 ${trace.final}`, kind: 'keep', tokens: [String(trace.final)], result: String(trace.final), equation: String(trace.final), explanation: copy.master });
  };
  const traces = item.intermediate_values;
  const componentNames = ['出生月', '出生日', '出生年'];
  const earned: { label: string; value: string }[] = [];
  const components = () => [2, 0, 1].forEach(i => {
    const trace = traces[i];
    const start = frames.length;
    reduce(componentNames[i], trace);
    const birthSlots = [[5, 6], [8, 9], [0, 1, 2, 3]][i];
    const significantSlots = birthSlots.slice(String(trace.input).length * -1);
    frames.slice(start).forEach((frame, index) => {
      const fromBirthday = index === 0;
      frame.origin = { birthday: [...birth.text], values: fromBirthday ? [...birth.text] : frame.tokens, slots: fromBirthday ? (frame.tokens.length === 1 ? [significantSlots] : significantSlots.map(slot => [slot])) : frame.tokens.map((_, slot) => [slot]), fromBirthday };
      frame.progress = { before: [...earned], after: index === frames.length - start - 1 ? [...earned, { label: ['月', '日', '年'][i], value: String(trace.final) }] : [...earned] };
    });
    earned.push({ label: ['月', '日', '年'][i], value: String(trace.final) });
  });
  if (item.id === 'lifePath') {
    components(); add('年、月、日合計', [2, 0, 1].map(i => traces[i].final), traces[3].input);
    const sumFrame = frames.at(-1)!;
    sumFrame.origin = { birthday: [...birth.text], values: sumFrame.tokens, slots: [[0], [1], [2]], fromBirthday: false, fromResults: true };
    reduce('合計數字', traces[3]);
  } else if (item.id === 'birthday') {
    frames.push({ title: '取出出生日', kind: 'keep', tokens: [String(birth.d)], result: String(birth.d), equation: String(birth.d), explanation: copy.birthday });
    frames[0].origin = { birthday: [...birth.text], values: [...birth.text], slots: [birth.d < 10 ? [9] : [8, 9]], fromBirthday: true };
    reduce('個位數參考', traces[0]);
  } else if (item.id === 'attitude') {
    add('出生月加出生日', [birth.m, birth.d], traces[0].input); reduce('月日合計', traces[0]);
    frames[0].origin = { birthday: [...birth.text], values: [...birth.text], slots: [birth.m < 10 ? [6] : [5, 6], birth.d < 10 ? [9] : [8, 9]], fromBirthday: true };
  } else if (item.id === 'challenges') {
    components();
    const [m, d, y] = traces.map(t => t.final);
    const values = item.final_value as number[];
    [[m, d], [d, y], [values[0], values[1]], [m, y]].forEach((pair, i) => {
      const big = Math.max(...pair), small = Math.min(...pair);
      frames.push({ title: `第${i + 1}挑戰：看差距`, kind: 'difference', tokens: [String(big), String(small)], result: String(values[i]), equation: `${big} − ${small} ＝ ${values[i]}`, explanation: copy.difference });
    });
  } else if (item.id === 'pinnacles') {
    components(); const [m, d, y, p1, p2] = traces.map(t => t.final);
    [[m, d], [d, y], [p1, p2], [m, y]].forEach((pair, i) => { add(`第${i + 1}高峰：合起來`, pair, traces[i + 3].input); reduce(`第${i + 1}高峰`, traces[i + 3]); });
  } else if (item.id === 'periods') { components();
  } else if (['year', 'month', 'day'].includes(item.id)) {
    const values = [birth.m, birth.d, target.y, ...(item.id !== 'year' ? [target.m] : []), ...(item.id === 'day' ? [target.d] : [])];
    add('出生月日與查詢日期合計', values, traces[0].input); reduce('日期合計', traces[0]);
  } else if (item.id === 'maturity') {
    add('生命主數與姓名表達數合計', ['lifePath', 'expression'].map(id => cards.find(c => c.id === id)!.final_value as number), traces[0].input); reduce('合計數字', traces[0]);
  } else if (['expression', 'soul', 'personality'].includes(item.id)) {
    traces.slice(0, -1).forEach((trace, i) => {
      frames.push({ title: `姓名第${i + 1}部分：字母對照`, kind: 'record', tokens: [item.steps[i]], result: String(trace.input), equation: item.steps[i], explanation: copy.count }); reduce(`姓名第${i + 1}部分`, trace);
    });
    add('各部分結果合計', traces.slice(0, -1).map(t => t.final), traces.at(-1)!.input); reduce('姓名合計', traces.at(-1)!);
  } else if (item.id === 'balance') {
    frames.push({ title: '姓名首字母對照', kind: 'record', tokens: [item.steps[0]], result: String(traces[0].input), equation: item.steps[0], explanation: copy.count }); reduce('首字母合計', traces[0]);
  } else {
    item.steps.forEach((step, i) => frames.push({ title: `對照紀錄 ${i + 1}`, kind: 'record', tokens: [step], result: step, equation: step, explanation: ['lessons', 'passion', 'subconscious'].includes(item.id) ? copy.count : copy.record }));
  }
  frames.push({ title: item.title, kind: 'finish', tokens: [item.title], result: item.display, equation: `${item.title}：${item.display}`, explanation: item.id === 'birthday' ? copy.birthday : copy.finish });
  return frames.map((frame, i) => ({ ...frame,
    progress: frame.progress ?? { before: [...earned], after: [...earned] },
    pace: { take: frame.kind === 'keep' ? 1700 : frame.kind === 'finish' ? 1000 : frame.tokens.length >= 4 ? 2900 : 2300, result: frame.kind === 'keep' ? 1000 : frame.kind === 'finish' ? 1000 : 1800 },
    ...(!frame.origin && ['lifePath', 'birthday', 'attitude', 'challenges', 'pinnacles', 'periods'].includes(item.id) && frame.kind !== 'finish' ? { origin: { birthday: [...birth.text], values: frame.tokens, slots: frame.tokens.map((_, slot) => [slot]), fromBirthday: false } } : {}),
    label: `第 ${i + 1} 步 / 共 ${frames.length} 步` }));
}

export function calculateLifeCode(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('請提供生日資料');
  const input = body as Record<string, unknown>;
  if (input.calendarType !== undefined && input.calendarType !== 'solar') throw new Error('請先將生日轉換為西元公曆');
  if (input.school !== undefined && input.school !== 'DECOZ') throw new Error('本模組只採Hans Decoz公式，不混合其他流派');
  const birth = dateParts(input.birthDate, '出生日期');
  const target = dateParts(input.targetDate === undefined ? todayInTaipei() : input.targetDate, '查詢日期');
  if (birth.text > todayInTaipei()) throw new Error('出生日期不能晚於今天');
  if (input.name !== undefined && typeof input.name !== 'string') throw new Error('出生英文全名格式不正確');
  const originalName = (input.name as string | undefined) ?? '';
  if (originalName.length > 160) throw new Error('出生英文全名請勿超過160個字元');
  const name = originalName.trim();
  const parts = [birth.m, birth.d, birth.y].map(n => reduceNumber(n, true));
  const [m, d, y] = parts.map(p => p.final);
  const total = reduceNumber(m + d + y, true);
  const partSteps = parts.map((t, i) => `${['出生月', '出生日', '出生年'][i]}：${show(t)}`);
  const cards: LifeCodeCard[] = [];
  cards.push(card('lifePath', total.final, [...parts, total], [...partSteps, `${m} ＋ ${d} ＋ ${y} ＝ ${show(total)}`]));
  const birthday = reduceNumber(birth.d, false);
  cards.push(card('birthday', birth.d, [birthday], [`出生日原數：${birth.d}`, `個位數：${show(birthday)}`]));
  const attitude = reduceNumber(birth.m + birth.d, false);
  cards.push(card('attitude', attitude.final, [attitude], [`${birth.m} ＋ ${birth.d} ＝ ${show(attitude)}`]));
  const singles = [birth.m, birth.d, birth.y].map(n => reduceNumber(n, false));
  const [sm, sd, sy] = singles.map(t => t.final);
  const c1 = Math.abs(sm - sd), c2 = Math.abs(sd - sy);
  const challenges = [c1, c2, Math.abs(c1 - c2), Math.abs(sm - sy)];
  cards.push(card('challenges', challenges, singles, [...singles.map((t, i) => `${['月', '日', '年'][i]}：${show(t)}`),
    `|${sm} − ${sd}| ＝ ${c1}`, `|${sd} − ${sy}| ＝ ${c2}`, `|${c1} − ${c2}| ＝ ${challenges[2]}`, `|${sm} − ${sy}| ＝ ${challenges[3]}`], '挑戰數不套用高峰週期的固定年齡。'));
  const p1 = reduceNumber(m + d, true), p2 = reduceNumber(d + y, true);
  const peaks = [p1, p2, reduceNumber(p1.final + p2.final, true), reduceNumber(m + y, true)];
  cards.push(card('pinnacles', peaks.map(t => t.final), [...parts, ...peaks], [...partSteps, ...peaks.map((t, i) => `第${i + 1}高峰：${show(t)}`)], skill.copy.agePending));
  cards.push(card('periods', [m, d, y], parts, partSteps, skill.copy.agePending));

  const nameKeys: RuleKey[] = ['expression', 'soul', 'personality', 'maturity', 'balance', 'lessons', 'passion', 'subconscious'];
  let nameLetters: { part: string; letters: { letter: string; value: number; kind: string }[] }[] = [];
  if (!name || !/^[A-Za-z]+(?: +[A-Za-z]+)*$/.test(name)) {
    for (const key of nameKeys) cards.push(unavailable(key, skill.rules[key].title, '姓名密碼', name ? skill.copy.nameUnsupported : skill.copy.nameEmpty, 'DECOZ-HOW'));
  } else {
    nameLetters = name.toUpperCase().split(/ +/).map(part => ({ part, letters: [...part].map(letter => ({
      letter, value: skill.letterValues[skill.alphabet.indexOf(letter)], kind: letter === 'Y' ? '待核發音' : skill.vowels.includes(letter) ? '母音' : '子音',
    })) }));
    const computeName = (key: 'expression' | 'soul' | 'personality', kind?: string) => {
      const traces = nameLetters.map(part => reduceNumber(sum(part.letters.filter(l => !kind || l.kind === kind).map(l => l.value)), true));
      const end = reduceNumber(sum(traces.map(t => t.final)), true);
      if (kind && end.final === 0) {
        cards.push(unavailable(key, skill.rules[key].title, '姓名密碼', '此姓名未找到可計算的對應字母，暫時無法取得；請核對完整出生英文姓名。', 'DECOZ-HOW'));
        return end;
      }
      cards.push(card(key, end.final, [...traces, end], [...nameLetters.map((p, i) => `${p.part}：${p.letters.filter(l => !kind || l.kind === kind).map(l => `${l.letter}=${l.value}`).join('，') || '無此類字母'}；${show(traces[i])}`), `各部分合計：${show(end)}`]));
      return end;
    };
    const expression = computeName('expression');
    if (name.toUpperCase().includes('Y')) {
      for (const key of ['soul', 'personality'] as const) cards.push(unavailable(key, skill.rules[key].title, '姓名密碼', skill.copy.nameY, 'DECOZ-Y'));
    } else { computeName('soul', '母音'); computeName('personality', '子音'); }
    const mature = reduceNumber(total.final + expression.final, true);
    cards.push(card('maturity', mature.final, [mature], [`${total.final} ＋ ${expression.final} ＝ ${show(mature)}`]));
    const initials = nameLetters.map(p => p.letters[0]);
    const balance = reduceNumber(sum(initials.map(l => l.value)), false);
    cards.push(card('balance', balance.final, [balance], [initials.map(l => `${l.letter}=${l.value}`).join('，'), show(balance)]));
    const counts = Array.from({ length: 9 }, (_, i) => ({ value: i + 1, count: nameLetters.flatMap(p => p.letters).filter(l => l.value === i + 1).length }));
    const missing = counts.filter(c => !c.count).map(c => c.value);
    const most = Math.max(...counts.map(c => c.count));
    const countSteps = counts.map(c => `${c.value}：${c.count}次`);
    cards.push(card('lessons', missing, [], countSteps));
    cards.push(card('passion', counts.filter(c => c.count === most).map(c => c.value), [], countSteps));
    cards.push(card('subconscious', 9 - missing.length, [], [`9 − ${missing.length} ＝ ${9 - missing.length}`]));
  }
  for (const [key, values] of [['year', [birth.m, birth.d, target.y]], ['month', [birth.m, birth.d, target.y, target.m]], ['day', [birth.m, birth.d, target.y, target.m, target.d]]] as [RuleKey, number[]][]) {
    const trace = reduceNumber(sum(values), false);
    cards.push(card(key, trace.final, [trace], [`${values.join(' ＋ ')} ＝ ${show(trace)}`], `查詢日期：${target.text}；使用公曆，不以生日當天切換流年。`));
  }
  // Special numbers are scoped to recorded stages, never inferred from final digit alone.
  const masterStages = [...parts, total].flatMap((t, i) => t.sequence.filter(n => skill.masters.includes(n)).map(n => `${['出生月', '出生日', '出生年', '生命主數合計'][i]}：${n}`));
  const debts = total.sequence.filter(n => skill.debts.includes(n));
  const special = (id: string, title: string, values: number[], steps: string[], note: string) => {
    const base = card('lifePath', values, [...parts, total], steps, note);
    cards.push({ ...base, id, title, category: '特殊數字', calculation_method: '只檢查本卡明列的計算階段，不由最後個位數反推。' });
  };
  special('masters', '大師數紀錄', [...new Set([...parts, total].flatMap(t => t.sequence.filter(n => skill.masters.includes(n))))], masterStages.length ? masterStages : ['本次生命主數計算未遇到11、22或33。'], '範圍：生命主數的月、日、年與合計；不是所有模組的通用縮減規則。');
  special('debt', '生命主數業力債數', debts, [`生命主數合計路徑：${show(total)}`], '只檢查生命主數合計路徑的13、14、16、19；不推定前世或必然事件。其他模組尚未作業力債判定。');
  cards.push(unavailable('phillipsGrid', '出生日期九宮格', '來源待核', skill.copy.gridPending, 'PHILLIPS-2005'));
  cards.push(unavailable('extensions', '其他延伸模組', '來源待核', skill.copy.extraPending, 'DECOZ-HOW'));
  const ready = cards.filter(c => c.status === 'PASSED').length;
  const inputValues = { birthDate: birth.text, targetDate: target.text, originalName, normalizedName: name.toUpperCase(), calendarType: 'solar' as const };
  const fingerprint = createHash('sha256').update(JSON.stringify([inputValues, skill.version])).digest('hex');
  const evidenceCards = cards.map(c => ({ ...c, result_id: `${fingerprint}:${c.id}`, module_name: c.title, school_name: c.id === 'phillipsGrid' ? 'David A. Phillips（待核）' : skill.school,
    source_id: c.source?.id ?? null, source_title: c.source?.title ?? null, author: c.source?.author ?? null,
    edition: c.source?.edition ?? null, publication_year: c.source?.publication_year ?? null, chapter_or_page: c.source_location,
    formula_version: c.rule_version, input_values: inputValues, calculation_steps: c.steps, result_value: c.final_value, verification_status: c.status,
    walkthrough: walkFrames(c, birth, target, cards),
  }));
  // Literal input evidence, separate from Decoz name counts and the unverified Phillips grid.
  const birthCharacters = birth.text.replaceAll('-', '');
  const birthCounts = Array.from({ length: 9 }, (_, i) => ({ digit: i + 1, count: [...birthCharacters].filter(n => n === String(i + 1)).length }));
  const absent = birthCounts.filter(n => n.count === 0).map(n => n.digit);
  const maximum = Math.max(...birthCounts.map(n => n.count));
  const abundant = birthCounts.filter(n => n.count === maximum).map(n => n.digit);
  const mainCard = evidenceCards.find(c => c.id === 'lifePath')!;
  const lessonsCard = evidenceCards.find(c => c.id === 'lessons')!;
  const passionCard = evidenceCards.find(c => c.id === 'passion')!;
  // Keep meaning selection and its independent source gate on the backend.
  // Master numbers must not borrow the single-digit interpretation.
  const meaning = meanings.entries.find(entry => entry.number === mainCard.final_value);
  const meaningSource = registry.sources.find(source => source.id === meaning?.sourceId);
  const meaningAvailable = mainCard.status === 'PASSED' && meaning?.reviewStatus === 'SOURCE_CHECKED' && meaningSource?.status === 'LOCATED';
  const primaryReading = {
    version: meanings.version,
    status: meaningAvailable ? 'AVAILABLE' as const : 'UNAVAILABLE' as const,
    prompt: mainCard.status === 'PASSED' ? `點「${mainCard.display}」，看這個數字的意義 →` : '查看本次資料狀態 →',
    statusMessage: mainCard.status !== 'PASSED' ? '主數尚未完成核對，解說暫時無法取得。'
      : skill.masters.includes(total.final) ? `你的主數保留為${total.final}；大師數解說暫時無法取得，不套用個位數的含義。`
      : '這個主數的解說來源尚未完成核對，暫時無法取得。',
    content: meaningAvailable && meaning ? {
      title: `${meaning.number} · ${meaning.title}`, declaration: meaning.declaration, meaning: meaning.meaning,
      sections: [
        { id: 'strength', title: meanings.labels.strength, text: meaning.strength, next: meanings.labels.nextChallenge },
        { id: 'challenge', title: meanings.labels.challenge, text: meaning.challenge, next: meanings.labels.nextAction },
        { id: 'action', title: meanings.labels.action, text: meaning.action, next: null },
      ],
      source: meaningSource!, sourceLocation: meaning.sourceLocation,
      evidence: `你的生日是 ${birth.text}。${[partSteps[2], partSteps[0], partSteps[1]].join('；')}。合計 ${y} ＋ ${m} ＋ ${d} ＝ ${show(total)}，因此對應主數 ${mainCard.display} 的解說。`,
    } : null,
    labels: meanings.labels, boundary: meanings.boundary,
  };
  if (primaryReading.content) mainCard.interpretation = {
    text: primaryReading.content.meaning, review_status: 'SOURCE_CHECKED',
    copyright_status: '僅來源主題摘要；行動提醒為本站反思練習，非原文轉載或人格診斷',
  };
  const customerSummary = { ...skill.customerSummary, counts: birthCounts,
    zeroCount: [...birthCharacters].filter(n => n === '0').length,
    inputDigits: [...birthCharacters].join('、'),
    answer: mainCard.status === 'PASSED' ? `你的生命主數是 ${mainCard.display}。` : '生命主數暫時無法取得。',
    reason: mainCard.status === 'PASSED' ? [partSteps[2], partSteps[0], partSteps[1], `${y} ＋ ${m} ＋ ${d} ＝ ${show(total)}`].join('；') : mainCard.statusText,
    shortReason: mainCard.status === 'PASSED' ? `${y} ＋ ${m} ＋ ${d} ＝ ${show(total)}` : mainCard.statusText,
    conclusion: mainCard.status !== 'PASSED' ? '本次資料尚未通過核對，暫不下結論。' : skill.masters.includes(total.final)
      ? `本次停在${total.final}。這套公式保留11、22、33，所以不再把它拆成個位數。`
      : total.input === total.final ? `月、日、年的結果合計就是${total.final}，已是一位數，不必再拆。`
      : `合計原數是${total.input}，沿著${show(total)}走到${total.final}。主數取最後結果，不取某個數字出現最多。`,
    source: mainCard.source, sourceLocation: mainCard.source_location,
    absent, abundant, maximum,
    absenceLine: absent.length ? `生日原始數字裡沒有 ${absent.join('、')}：因為它們各出現0次。` : '生日原始數字裡，1至9都有出現。',
    absenceBrief: absent.length ? `未出現：${absent.join('、')}。` : '1至9都有出現。',
    abundanceBrief: maximum === 1 ? '1至9沒有重複數字。' : `${abundant.join('、')}出現最多，各${maximum}次。`,
    abundanceLine: maximum === 1 ? `沒有重複的1至9數字；${abundant.join('、')}各出現1次。` : `${abundant.join('、')}出現最多，各${maximum}次；多，是按出現次數計，不是由主數反推。`,
    nameLine: lessonsCard.status === 'PASSED' && passionCard.status === 'PASSED' ? `另看姓名：字母值未出現的是${lessonsCard.display}；出現最多的是${passionCard.display}。` : `${lessonsCard.note || lessonsCard.statusText}`,
    nameSteps: lessonsCard.status === 'PASSED' ? lessonsCard.steps : [],
    nameSource: lessonsCard.source, nameSourceLocation: lessonsCard.source_location,
  };
  return { title: skill.name, subtitle: skill.copy.subtitle, intro: skill.copy.intro, boundary: skill.copy.boundary,
    input: inputValues,
    school: skill.school, rule_version: skill.version, nameLetters, cards: evidenceCards,
    exploration: { ...skill.exploration, walk: skill.walk,
      answer: { birthDate: birth.text, targetDate: target.text, primary: mainCard, customerSummary, primaryReading, summary: `${ready}項公式計算可查看；${cards.length - ready}項暫時無法取得。`,
        groups: [...new Set(evidenceCards.map(c => c.category))].map(title => ({ title, cards: evidenceCards.filter(c => c.category === title).map(c => ({ id: c.id, title: c.title, display: c.display, status: c.status, statusText: c.statusText, note: c.note, source_id: c.source_id, result_id: c.result_id })) })),
        interpretation: skill.copy.interpretation },
      chapters: skill.exploration.chapters.map(chapter => ({
      ...chapter, cards: chapter.cards.map((id, index) => {
        const item = evidenceCards.find(c => c.id === id)!;
        return { ...item, station: `第 ${index + 1} 站 / 共 ${chapter.cards.length} 站`,
          guide: item.status === 'PASSED' ? `先看「${item.title}」。點亮後，把每一步看清。` : `「${item.title}」暫時無法取得。先查看原因。`,
          explanation: item.status === 'PASSED' ? `本次${item.title}：${item.display}。` : item.statusText,
        };
      }),
    })) },
    summary: `${ready}項公式計算可查看；${cards.length - ready}項暫時無法取得。`,
    groups: [...new Set(evidenceCards.map(c => c.category))].map(title => ({ title, cards: evidenceCards.filter(c => c.category === title) })),
    sources: registry.sources, interpretation: skill.copy.interpretation,
  };
}
export type LifeCodeResult = ReturnType<typeof calculateLifeCode>;
