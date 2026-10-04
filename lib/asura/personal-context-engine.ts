/**
 * 個人上下文融合引擎
 *
 * 職責：
 * - 接收用戶填寫的個人信息（名字、親朋好友、稱謂等）
 * - 融合到阿修羅的話術中
 * - 讓講話「到位」——不是生硬地加名字，而是自然地融入
 *
 * 用例：
 * 「我把你以前留下來的東西翻給你看。」
 * ↓ (融合名字「小王")
 * 「小王，我把你以前留下來的東西翻給你看。」
 */

export interface PersonalContext {
  userName: string; // 用戶名字
  relationshipName?: string; // 親朋好友名字（可選）
  relationshipRole?: string; // 親朋好友身份（媽媽/朋友/老闆 等）
  nickName?: string; // 小名或暱稱
  keywordList: string[]; // 用戶想強調的關鍵詞（職業、特質等）
}

export interface PersonalizedSpeech {
  original: string;
  personalized: string;
  fusionPoints: string[]; // 融合點記錄
}

/**
 * 將個人上下文融入話術
 */
export function personalizeAsuraSpeech(
  speech: string,
  context: PersonalContext
): PersonalizedSpeech {
  let personalized = speech;
  const fusionPoints: string[] = [];

  // 策略1：在開場融入名字
  if (context.userName) {
    personalized = addPersonalOpeningForPast(personalized, context.userName);
    fusionPoints.push(`開場融入名字: ${context.userName}`);
  }

  // 策略2：在核心論述中加入親朋好友
  if (context.relationshipName && context.relationshipRole) {
    personalized = addRelationshipContext(
      personalized,
      context.relationshipName,
      context.relationshipRole
    );
    fusionPoints.push(`關係融入: ${context.relationshipRole}${context.relationshipName}`);
  }

  // 策略3：融入用戶強調的關鍵詞
  if (context.keywordList.length > 0) {
    personalized = addKeywordReflection(personalized, context.keywordList);
    fusionPoints.push(`關鍵詞融入: ${context.keywordList.join('、')}`);
  }

  // 策略4：針對性的收尾
  if (context.nickName) {
    personalized = addPersonalClosing(personalized, context.nickName);
    fusionPoints.push(`暱稱融入: ${context.nickName}`);
  }

  return {
    original: speech,
    personalized,
    fusionPoints,
  };
}

// ===== 融合策略 =====

function addPersonalOpeningForPast(speech: string, userName: string): string {
  // 過去卡：「我把你以前留下來的東西翻給你看。」
  // → 「[名字]，我把你以前留下來的東西翻給你看。」

  if (speech.includes('我把你')) {
    return speech.replace('我把你', `${userName}，我把你`);
  }

  if (speech.includes('我把')) {
    return speech.replace('我把', `${userName}，我把`);
  }

  // 如果沒有找到明顯開場，在開頭加入
  return `${userName}，${speech}`;
}

function addPersonalOpeningForPresent(speech: string, userName: string): string {
  // 現在卡：「你現在在幹嘛，我直接講。」
  // → 「[名字]，你現在在幹嘛，我直接講。」

  if (speech.includes('你現在')) {
    return speech.replace('你現在', `${userName}，你現在`);
  }

  if (speech.includes('先別')) {
    return speech.replace('先別', `${userName}，先別`);
  }

  return `${userName}，${speech}`;
}

function addPersonalOpeningForFuture(speech: string, userName: string): string {
  // 未來卡：「你再這樣走，後面會遇到什麼，我先警告。」
  // → 「[名字]，你再這樣走，後面會遇到什麼，我先警告。」

  if (speech.includes('你再')) {
    return speech.replace('你再', `${userName}，你再`);
  }

  if (speech.includes('我先')) {
    return speech.replace('我先', `${userName}，我先`);
  }

  return `${userName}，${speech}`;
}

function addRelationshipContext(
  speech: string,
  relationshipName: string,
  role: string
): string {
  // 在適當位置加入親朋好友信息
  // 例如：「你現在這個習慣，不是天生的。」
  // → 「你現在這個習慣，不是天生的。像你的[媽媽/朋友]，他也……」

  const roleDescriptions: Record<string, string> = {
    媽媽: '從小陪在身邊的人',
    爸爸: '家裡的另一個聲音',
    朋友: '一起經歷過的人',
    老闆: '指導你的人',
    伴侶: '最親近的人',
    兄弟姐妹: '同一個家的人',
    親戚: '遠方的親人',
    導師: '教你東西的人',
  };

  // 只在有明顯「轉折」的地方加入
  if (speech.includes('不是')) {
    const desc = roleDescriptions[role] || role;
    const insertion = `不過，${desc}${relationshipName}，也有類似的模式。`;
    return speech.replace('不是', `不是。${insertion}`);
  }

  // 如果沒找到轉折，在結尾加入
  if (!speech.endsWith('。')) {
    return speech;
  }

  return `${speech.slice(0, -1)}——想起你身邊的${role}${relationshipName}嗎？`;
}

function addKeywordReflection(speech: string, keywords: string[]): string {
  // 在話術中融入用戶的關鍵詞
  // 例如：關鍵詞是「工程師」
  // → 在適當位置提到職業特性

  const keywordContext: Record<string, string> = {
    工程師: '習慣找根本原因',
    設計師: '在乎細節與美感',
    業務: '想搞定每個人',
    行銷: '算著每一步',
    醫生: '對精準度有執念',
    老師: '習慣講大道理',
    父母: '把責任往自己身上扛',
    創業者: '想控制全局',
  };

  let result = speech;

  for (const keyword of keywords) {
    const context = keywordContext[keyword];
    if (context && !result.includes(context)) {
      // 在適當位置融入
      if (result.includes('你') && !result.includes(context)) {
        result = result.replace('你', `作為${keyword}的你`);
        break;
      }
    }
  }

  return result;
}

function addPersonalClosing(speech: string, nickName: string): string {
  // 在結尾用暱稱
  // 例如：「……走。」
  // → 「……走。${nickName}。」

  if (speech.endsWith('。')) {
    return `${speech.slice(0, -1)}——${nickName}。`;
  }

  return `${speech}——${nickName}。`;
}

/**
 * 過去卡專用個人化
 */
export function personalizePastCard(
  speech: string,
  context: PersonalContext
): PersonalizedSpeech {
  let personalized = addPersonalOpeningForPast(speech, context.userName);

  if (context.relationshipName) {
    personalized = addRelationshipContext(
      personalized,
      context.relationshipName,
      context.relationshipRole || '身邊的人'
    );
  }

  return {
    original: speech,
    personalized,
    fusionPoints: ['過去卡個人化'],
  };
}

/**
 * 現在卡專用個人化
 */
export function personalizePresentCard(
  speech: string,
  context: PersonalContext
): PersonalizedSpeech {
  let personalized = addPersonalOpeningForPresent(speech, context.userName);

  if (context.keywordList.length > 0) {
    personalized = addKeywordReflection(personalized, context.keywordList);
  }

  return {
    original: speech,
    personalized,
    fusionPoints: ['現在卡個人化'],
  };
}

/**
 * 未來卡專用個人化
 */
export function personalizeFutureCard(
  speech: string,
  context: PersonalContext
): PersonalizedSpeech {
  let personalized = addPersonalOpeningForFuture(speech, context.userName);

  if (context.keywordList.length > 0) {
    personalized = addKeywordReflection(personalized, context.keywordList);
  }

  return {
    original: speech,
    personalized,
    fusionPoints: ['未來卡個人化'],
  };
}
