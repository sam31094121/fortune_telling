/**
 * 首頁信任統計 — 回饋邀請對話
 *
 * 功能：
 * - 在用戶點擊認同或不認同後顯示
 * - 溫暖的文案，感謝意見
 * - 引導用戶選擇：繼續 or 留言
 */

'use client';

import React from 'react';
import { FEEDBACK_MESSAGES } from '@/lib/home-trust/feedback/feedback.types';

interface FeedbackPromptProps {
  vote: 'agree' | 'disagree' | null;
  onOpenForm: () => void;
  onClose: () => void;
}

export default function FeedbackPrompt({
  vote,
  onOpenForm,
  onClose,
}: FeedbackPromptProps) {
  if (!vote) return null;

  const isAgree = vote === 'agree';
  const message = isAgree
    ? FEEDBACK_MESSAGES.AGREE_PROMPT
    : FEEDBACK_MESSAGES.DISAGREE_PROMPT;

  return (
    <div className="feedback-prompt-overlay" onClick={onClose}>
      <div
        className="feedback-prompt-dialog"
        onClick={e => e.stopPropagation()}
      >
        <style jsx>{`
          .feedback-prompt-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 16px;
          }

          .feedback-prompt-dialog {
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            animation: slideUp 0.3s ease-out;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .prompt-message {
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            margin-bottom: 24px;
            white-space: pre-line;
          }

          .prompt-actions {
            display: flex;
            gap: 12px;
            flex-direction: column;
          }

          .action-button {
            padding: 12px 16px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }

          .action-button:hover {
            border-color: #999;
            background: #f9f9f9;
          }

          .action-button.primary {
            background: #4a9eff;
            color: white;
            border: none;
          }

          .action-button.primary:hover {
            background: #2e7fd9;
          }

          @media (max-width: 480px) {
            .feedback-prompt-dialog {
              padding: 16px;
            }

            .prompt-message {
              font-size: 13px;
            }
          }
        `}</style>

        <div className="prompt-message">{message}</div>

        <div className="prompt-actions">
          <button className="action-button primary" onClick={onOpenForm}>
            📝 留言告訴我們更多
          </button>
          <button className="action-button" onClick={onClose}>
            謝謝，繼續瀏覽
          </button>
        </div>
      </div>
    </div>
  );
}
