/**
 * 鬼魅阿修羅 - API 客戶端鉤子
 *
 * 用途：前端統一調用後端計算 API
 * 特點：
 * - 錯誤處理
 * - 載入狀態管理
 * - 類型安全（TypeScript）
 */

'use client';

import { useState, useCallback } from 'react';
import { GhostAsuraCardResponse } from '@/lib/types/ghost-asura-response';

interface UseGhostAsuraCalculateOptions {
  onSuccess?: (data: GhostAsuraCardResponse) => void;
  onError?: (error: Error) => void;
}

interface CalculatePayload {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:mm
  gender?: string;
}

export function useGhostAsuraCalculate(
  options?: UseGhostAsuraCalculateOptions
) {
  const [data, setData] = useState<GhostAsuraCardResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calculate = useCallback(
    async (payload: CalculatePayload) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ghost-asura/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `API 錯誤：${response.status}`
          );
        }

        const result = (await response.json()) as GhostAsuraCardResponse;
        setData(result);
        options?.onSuccess?.(result);

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    error,
    isLoading,
    calculate,
    reset,
  };
}
