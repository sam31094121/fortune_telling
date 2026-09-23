const fs = require('fs');
const path = 'components/TodayDirectionQuest.tsx';
let quest = fs.readFileSync(path, 'utf8');
const bak = path + '.bak-trust34';
if (!fs.existsSync(bak)) fs.writeFileSync(bak, quest);

// Soften ritual scenes
quest = quest.replace(
  "  '封印正在鬆動，風從縫隙醒來。',\n  '第一道光穿過寶珠，今天的選擇正在成形。',\n  '符紙化成灰燼，定向之風開始回應。',\n  '寶珠即將解封，下一條路正在顯現。',\n]",
  "  '縫隙裡有風醒來，今天的線索開始成形。',\n  '第一道光穿過寶珠，你剛選的方向正在對齊。',\n  '符紙化成灰燼，定向之風開始回應。',\n  '寶珠即將打開，下一條可帶走的路正在顯現。',\n]"
);

const oldReward = `        {stage === 'reward' && area && path && (
          <div className={styles.reward} aria-live="polite">
            <div
              ref={rewardRef}
              className={\`treasure-reveal-stage treasure-reveal-stage--hero \${styles.rewardOrb} \${rewardOpening ? 'treasure-reveal-stage--opening' : ''} \${rewardReleased ? 'treasure-reveal-stage--collected' : ''}\`}
              role="img"
              aria-label={rewardReleased ? '已獲得的定向之風寶珠' : '正在解封的定向之風寶珠'}
            >
              <WaterTreasureOrb
                element="風"
                released={rewardReleased || rewardOpening}
                burnSealOnRelease={rewardOpening}
                animating={rewardOpening}
                displayProfile="mobile-reward"
              />
            </div>
            <div className={styles.sealedPreview} aria-label="其餘四顆仍在封印中的元素寶珠">
              <span>{rewardReleased ? '寶珠進度 1 / 5' : '其餘元素仍封印'}</span>
              <div>
                {SEALED_COMPARISON_ORBS.map((element) => (
                  <span key={element} className={\`treasure-reveal-stage treasure-reveal-stage--sealed \${styles.sealedOrb}\`}>
                    <WaterTreasureOrb element={element} released={false} preview />
                    <small>{element}</small>
                  </span>
                ))}
              </div>
            </div>
            {rewardOpening && windRitual.stage !== null ? (
              <>
                <p className={styles.kicker}>解封中｜{windRitual.stage + 1} / 4</p>
                <h2 id="today-direction-title">風正在甦醒</h2>
                <p className={styles.rewardLead}>{WIND_RITUAL_SCENES[windRitual.stage]}</p>
                <div className={styles.ritualProgress} aria-label={\`寶珠解封進度 \${windRitual.stage + 1} / 4\`}>
                  {WIND_RITUAL_SCENES.map((_, index) => (
                    <span key={index} data-active={index <= (windRitual.stage ?? -1)} />
                  ))}
                </div>
              </>
            ) : rewardReleased ? (
              <>
                <p className={styles.kicker}>今天已前進</p>
                <h2 id="today-direction-title">風寶珠已解封</h2>
                <p className={styles.rewardLead}>今天的一步，正在改變明天。</p>
                <p className={styles.tomorrowClue}>
                  {streakDays > 1
                    ? \`已連續 \${streakDays} 天。明天回來，風寶珠會記得你。\`
                    : '明天回來，風寶珠會記得你，並帶回下一條線索。'}
                </p>
                <p className={styles.returnSoft}>先離開也沒關係；明天打開首頁就能續走。</p>
                <div className={styles.nextClue}>
                  <span>繼續探索</span>
                  <strong>{path.routeLabel}</strong>
                </div>
                <Link href={path.routeHref} className={styles.primaryButton} data-quest-action="branch">
                  <span>下一步</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <button type="button" className={styles.quietButton} onClick={chooseAnotherPath}>再選一條路</button>
              </>
            ) : (
              <>
                <p className={styles.kicker}>封印準備中</p>
                <h2 id="today-direction-title">定向之風正在聚合</h2>
              </>
            )}
          </div>
        )}`;

const newReward = `        {stage === 'reward' && area && path && (
          <div className={styles.reward} aria-live="polite" data-quest-reward="takeaway">
            <div
              ref={rewardRef}
              className={\`treasure-reveal-stage treasure-reveal-stage--hero \${styles.rewardOrb} \${rewardOpening ? 'treasure-reveal-stage--opening' : ''} \${rewardReleased ? 'treasure-reveal-stage--collected' : ''}\`}
              role="img"
              aria-label={rewardReleased ? '已獲得的定向之風寶珠' : '正在打開的定向之風寶珠'}
            >
              <WaterTreasureOrb
                element="風"
                released={rewardReleased || rewardOpening}
                burnSealOnRelease={rewardOpening}
                animating={rewardOpening}
                displayProfile="mobile-reward"
              />
            </div>
            <div className={styles.sealedPreview} aria-label="其餘四顆尚未解鎖的元素寶珠">
              <span>{rewardReleased ? '寶珠進度 1 / 5' : '其餘元素尚未解鎖'}</span>
              <div>
                {SEALED_COMPARISON_ORBS.map((element) => (
                  <span key={element} className={\`treasure-reveal-stage treasure-reveal-stage--sealed \${styles.sealedOrb}\`}>
                    <WaterTreasureOrb element={element} released={false} preview />
                    <small>{element}</small>
                  </span>
                ))}
              </div>
            </div>
            {rewardOpening && windRitual.stage !== null ? (
              <>
                <p className={styles.kicker}>打開中｜{windRitual.stage + 1} / 4</p>
                <h2 id="today-direction-title">風正在甦醒</h2>
                <p className={styles.rewardLead}>{WIND_RITUAL_SCENES[windRitual.stage]}</p>
                <div className={styles.ritualProgress} aria-label={\`寶珠進度 \${windRitual.stage + 1} / 4\`}>
                  {WIND_RITUAL_SCENES.map((_, index) => (
                    <span key={index} data-active={index <= (windRitual.stage ?? -1)} />
                  ))}
                </div>
              </>
            ) : rewardReleased ? (
              <>
                <p className={styles.kicker}>今天已前進｜可帶回看</p>
                <h2 id="today-direction-title">你今天帶走的內容</h2>
                <article className={styles.takeawayCard} data-quest-takeaway="card">
                  <p className={styles.takeawayMeta}>
                    <span>{area.label}</span>
                    <span aria-hidden="true">·</span>
                    <span>本機可回看</span>
                  </p>
                  <h3 className={styles.takeawayTitle}>{path.label}</h3>
                  <p className={styles.takeawayReflection}>{path.reflection}</p>
                  <div className={styles.takeawayAction}>
                    <span>今天可做的一步</span>
                    <strong>{actionMode === 'smaller' ? path.smallerAction : path.action}</strong>
                  </div>
                </article>
                <p className={styles.tomorrowClue}>
                  {streakDays > 1
                    ? \`已連續 \${streakDays} 天。明天回來，進度還在這台裝置。\`
                    : '明天打開首頁就能續走；進度記在這台裝置。'}
                </p>
                <p className={styles.returnSoft}>先離開也沒關係。這裡不要求加 LINE 或開 VIP 才算完成。</p>
                <div className={styles.nextClue}>
                  <span>想延伸再點</span>
                  <strong>{path.routeLabel}</strong>
                </div>
                <Link href={path.routeHref} className={styles.primaryButton} data-quest-action="branch">
                  <span>延伸探索</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link href="/trust" className={styles.quietButton} data-quest-action="honesty">
                  誠信說明：算什麼／不算什麼
                </Link>
                <button type="button" className={styles.quietButton} onClick={chooseAnotherPath}>再選一條路</button>
              </>
            ) : (
              <>
                <p className={styles.kicker}>準備中</p>
                <h2 id="today-direction-title">定向之風正在聚合</h2>
              </>
            )}
          </div>
        )}`;

if (!quest.includes(oldReward)) {
  // try CRLF version
  const oldCrlf = oldReward.replace(/\n/g, '\r\n');
  if (quest.includes(oldCrlf)) {
    quest = quest.replace(oldCrlf, newReward.replace(/\n/g, '\r\n'));
  } else {
    console.log('OLD_REWARD_NOT_FOUND');
    // dump nearby marker
    const m = quest.indexOf("stage === 'reward' && area && path");
    console.log('marker', m);
    console.log(JSON.stringify(quest.slice(m, m + 200)));
    process.exit(1);
  }
} else {
  quest = quest.replace(oldReward, newReward);
}

fs.writeFileSync(path, quest);
console.log('QUEST_PATCHED', {
  takeaway: quest.includes('takeawayCard'),
  honesty: quest.includes('data-quest-action="honesty"'),
  softSeal: quest.includes('其餘元素尚未解鎖'),
  noVipLineHard: !/VIP|line\.me/i.test(quest),
});
