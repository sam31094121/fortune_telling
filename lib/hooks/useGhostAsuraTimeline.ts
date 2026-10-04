/**
 * 鬼魅阿修羅 - 流年計算 API 客戶端鉤子
 */

'use client';

import { useState, useCallback } from 'react';
import { GhostAsuraTimelineResponse } from '@/lib/types/ghost-asura-timeline';

interface TimelineCalculatePayload {
  name: string;
  birthDate: string; // YYYY-MM-DD
  dayMasterElement?: string; // 可選
}

export function useGhostAsuraTimeline(options?: {
  onSuccess?: (data: GhostAsuraTimelineResponse) => void;
  onError?: (error: Error) => void;
}) {
  const [data, setData] = useState<GhostAsuraTimelineResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calculate = useCallback(
    async (payload: TimelineCalculatePayload) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ghost-asura/timeline', {
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

        const result = (await response.json()) as GhostAsuraTimelineResponse;
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
