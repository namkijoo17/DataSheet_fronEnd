'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { saveInspectionAnswer } from '../api/inspection-api';
import {
  InspectionSaveQueue,
  type SaveStatus,
} from '../lib/inspection-save-queue';

/** inspectionId 가 정해지면 항목별 저장 큐를 만든다 */
export function useInspectionAutosave(inspectionId: number | null) {
  const queue = useMemo(
    () =>
      inspectionId == null
        ? null
        : new InspectionSaveQueue((itemId, payload) =>
            saveInspectionAnswer(inspectionId, itemId, payload),
          ),
    [inspectionId],
  );

  const status = useSyncExternalStore<SaveStatus>(
    (listener) => (queue ? queue.subscribe(listener) : () => {}),
    () => (queue ? queue.getStatus() : 'idle'),
    () => 'idle',
  );

  // 저장 대기 중 새로고침/탭 닫기 방지
  useEffect(() => {
    if (!queue) return;
    const handler = (event: BeforeUnloadEvent) => {
      if (queue.hasPending()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [queue]);

  return { queue, status };
}
