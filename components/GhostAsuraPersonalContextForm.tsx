'use client';

import { useState } from 'react';
import type { PersonalContext } from '@/lib/asura/personal-context-engine';
import styles from './GhostAsuraPersonalContextForm.module.css';

interface FormProps {
  onContextChange: (context: PersonalContext) => void;
  initialContext?: PersonalContext;
}

export default function GhostAsuraPersonalContextForm({
  onContextChange,
  initialContext,
}: FormProps) {
  const [context, setContext] = useState<PersonalContext>(
    initialContext || {
      userName: '',
      relationshipName: '',
      relationshipRole: '',
      nickName: '',
      keywordList: [],
    }
  );

  const [keywordInput, setKeywordInput] = useState('');

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...context, userName: e.target.value };
    setContext(updated);
    onContextChange(updated);
  };

  const handleRelationshipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...context, relationshipName: e.target.value };
    setContext(updated);
    onContextChange(updated);
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updated = { ...context, relationshipRole: e.target.value };
    setContext(updated);
    onContextChange(updated);
  };

  const handleNickNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...context, nickName: e.target.value };
    setContext(updated);
    onContextChange(updated);
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      const updated = {
        ...context,
        keywordList: [...context.keywordList, keywordInput.trim()],
      };
      setContext(updated);
      onContextChange(updated);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    const updated = {
      ...context,
      keywordList: context.keywordList.filter(k => k !== keyword),
    };
    setContext(updated);
    onContextChange(updated);
  };

  return (
    <form className={styles.container}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>⚔️ 填寫信息，讓阿修羅的話語到位</legend>

        {/* 用戶名字 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>你的名字</label>
          <input
            type="text"
            className={styles.input}
            placeholder="例：小王、小李、Lisa"
            value={context.userName}
            onChange={handleUserNameChange}
          />
          <small className={styles.hint}>
            阿修羅講話時會帶上你的名字，講得更針對。
          </small>
        </div>

        {/* 親朋好友 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>身邊親朋好友（可選）</label>
          <div className={styles.relationshipRow}>
            <input
              type="text"
              className={styles.input}
              placeholder="例：媽媽、老闆、閨蜜"
              value={context.relationshipName}
              onChange={handleRelationshipChange}
            />
            <select
              className={styles.select}
              value={context.relationshipRole || ''}
              onChange={handleRoleChange}
            >
              <option value="">選擇身份</option>
              <option value="媽媽">媽媽</option>
              <option value="爸爸">爸爸</option>
              <option value="朋友">朋友</option>
              <option value="老闆">老闆</option>
              <option value="伴侶">伴侶</option>
              <option value="兄弟姐妹">兄弟姐妹</option>
              <option value="親戚">親戚</option>
              <option value="導師">導師</option>
            </select>
          </div>
          <small className={styles.hint}>
            阿修羅會把身邊人的角色也提進話裡，讓你看得更清楚。
          </small>
        </div>

        {/* 暱稱 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>暱稱或別名（可選）</label>
          <input
            type="text"
            className={styles.input}
            placeholder="例：阿王、小酥、Wonder Woman"
            value={context.nickName}
            onChange={handleNickNameChange}
          />
          <small className={styles.hint}>
            阿修羅會在最後用暱稱叫你，親切一點。
          </small>
        </div>

        {/* 關鍵詞 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>你的特徵或職業（可選）</label>
          <div className={styles.keywordInputRow}>
            <input
              type="text"
              className={styles.input}
              placeholder="例：工程師、創業者、父母"
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
            />
            <button
              type="button"
              className={styles.addButton}
              onClick={handleAddKeyword}
            >
              加入
            </button>
          </div>

          {context.keywordList.length > 0 && (
            <div className={styles.keywordTags}>
              {context.keywordList.map(keyword => (
                <span key={keyword} className={styles.tag}>
                  {keyword}
                  <button
                    type="button"
                    className={styles.tagClose}
                    onClick={() => handleRemoveKeyword(keyword)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <small className={styles.hint}>
            阿修羅會根據你的特徵調整話風，讓話語更貼身。
          </small>
        </div>
      </fieldset>

      <div className={styles.info}>
        <p className={styles.infoText}>
          ✨ 填寫越詳細，阿修羅就能把話講得越到位。
        </p>
      </div>
    </form>
  );
}
