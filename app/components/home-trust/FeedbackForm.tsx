/**
 * 首頁信任統計 — 回饋表單組件
 *
 * 功能：
 * - 可選留言框
 * - 快速分類選項（不認同時）
 * - 自動分類
 * - 送出 + 成功訊息
 */

'use client';

import React, { useState } from 'react';
import { FEEDBACK_MESSAGES } from '@/lib/home-trust/feedback/feedback.types';
import type { FeedbackVote } from '@/lib/home-trust/feedback/feedback.types';

interface FeedbackFormProps {
  vote: FeedbackVote;
  onSubmit: () => void;
  onClose: () => void;
}

export default function FeedbackForm({
  vote,
  onSubmit,
  onClose,
}: FeedbackFormProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const isDisagree = vote === 'DISAGREE';
  const quickOptions = isDisagree
    ? FEEDBACK_MESSAGES.QUICK_OPTIONS_DISAGREE
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!message.trim()) {
      alert('請寫下你的想法');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/home-trust/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote,
          message: message.trim(),
          category: selectedOption,
          deviceType: getDeviceType(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        setTimeout(() => {
          onSubmit();
          onClose();
        }, 2000);
      } else {
        alert('送出失敗，請重試');
      }
    } catch (error) {
      console.error('Feedback submission failed:', error);
      alert('暫時無法送出，請檢查網路連線');
    } finally {
      setLoading(false);
    }
  }

  function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  if (submitted) {
    return (
      <div className="feedback-overlay" onClick={onClose}>
        <div className="feedback-dialog" onClick={e => e.stopPropagation()}>
          <style jsx>{`
            .feedback-overlay {
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
            }

            .feedback-dialog {
              background: white;
              border-radius: 12px;
              padding: 40px 24px;
              max-width: 400px;
              width: 100%;
              text-align: center;
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
              animation: slideUp 0.3s ease-out;
            }

            .success-icon {
              font-size: 48px;
              margin-bottom: 16px;
            }

            .success-message {
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              white-space: pre-line;
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
          `}</style>

          <div className="success-icon">✅</div>
          <div className="success-message">
            {FEEDBACK_MESSAGES.SUCCESS}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-overlay" onClick={onClose}>
      <div className="feedback-dialog" onClick={e => e.stopPropagation()}>
        <style jsx>{`
          .feedback-overlay {
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

          .feedback-dialog {
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            animation: slideUp 0.3s ease-out;
            max-height: 90vh;
            overflow-y: auto;
          }

          .form-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 16px;
            color: #333;
          }

          .quick-options {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 16px;
          }

          .quick-option {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          }

          .quick-option:hover {
            border-color: #999;
          }

          .quick-option.selected {
            background: #4a9eff;
            color: white;
            border-color: #2e7fd9;
          }

          .form-group {
            margin-bottom: 16px;
          }

          .form-label {
            display: block;
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
          }

          textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-family: inherit;
            font-size: 14px;
            resize: vertical;
            min-height: 100px;
          }

          textarea:focus {
            outline: none;
            border-color: #4a9eff;
            box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.1);
          }

          .form-actions {
            display: flex;
            gap: 12px;
          }

          button {
            flex: 1;
            padding: 12px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }

          .submit-button {
            background: #4a9eff;
            color: white;
          }

          .submit-button:hover {
            background: #2e7fd9;
          }

          .submit-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .cancel-button {
            background: #f5f5f5;
            color: #333;
            border: 1px solid #ddd;
          }

          .cancel-button:hover {
            background: #eee;
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

          @media (max-width: 480px) {
            .feedback-dialog {
              padding: 16px;
            }

            .form-title {
              font-size: 14px;
            }
          }
        `}</style>

        <div className="form-title">
          {isDisagree ? '你覺得哪裡可以更好？' : '謝謝你的認同'}
        </div>

        {isDisagree && (
          <div className="quick-options">
            {quickOptions.map(option => (
              <button
                key={option}
                className={`quick-option ${
                  selectedOption === option ? 'selected' : ''
                }`}
                onClick={() => setSelectedOption(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              {FEEDBACK_MESSAGES.MESSAGE_PLACEHOLDER}
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={FEEDBACK_MESSAGES.MESSAGE_PLACEHOLDER}
              maxLength={500}
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={loading || !message.trim()}
            >
              {loading ? '送出中...' : '送出'}
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
