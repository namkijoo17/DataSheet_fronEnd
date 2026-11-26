'use client';

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import {
  countUnresolvedNg,
  fetchInspectionDetail,
  fromAnswersResponse,
  fromBasicPayload,
  resolveUnitSlotIndex,
  useCompletedInspections,
  type InspectionSummaryResponse,
} from '@/features/inspection/create-inspection';
import {
  datasheetDetailQueryKey,
  fetchDatasheetDetail,
  normalizeDatasheetItems,
} from '@/features/settings';

/** 대시보드 요약 수치. 불러오지 못했거나 로딩 중이면 null */
export type DashboardStats = {
  /** 진행 중 검사 */
  inProgress: number | null;
  /** 오늘 완료한 검사 */
  completedToday: number | null;
  /** 처리 방법이 확정되지 않은 NG 항목 */
  pendingNg: number | null;
};

/**
 * 진행 중 검사 목록(inProgress)을 받아 대시보드 요약을 만든다.
 * - 진행 중: 목록 길이
 * - 오늘 완료: 완료 목록 중 완료 시각이 오늘인 건수
 * - 미처리 NG: 진행 중 검사 답변을 읽어 처리 방법이 없는 NG 항목 수
 */
export function useDashboardStats(
  inProgress: InspectionSummaryResponse[] | undefined,
): DashboardStats {
  const queryClient = useQueryClient();
  const completed = useCompletedInspections();

  const completedToday = useMemo(() => {
    if (!completed.data) return null;
    const today = dayjs();
    return completed.data.filter(
      (item) => item.completedAt && dayjs(item.completedAt).isSame(today, 'day'),
    ).length;
  }, [completed.data]);

  // 답변이 저장되면 updatedAt 이 바뀌므로 키에 포함해 다시 계산한다
  const pendingKey = (inProgress ?? []).map((item) => `${item.id}:${item.updatedAt}`).join(',');
  const pending = useQuery({
    queryKey: ['dashboard', 'pending-ng', pendingKey],
    enabled: inProgress !== undefined,
    staleTime: 0,
    queryFn: async () => {
      const counts = await Promise.all(
        (inProgress ?? []).map(async (summary) => {
          const detail = await queryClient.fetchQuery({
            queryKey: ['inspections', 'detail', summary.id],
            queryFn: () => fetchInspectionDetail(summary.id),
            staleTime: 0,
          });
          const datasheet = await queryClient.fetchQuery({
            queryKey: datasheetDetailQueryKey(detail.datasheetId),
            queryFn: () => fetchDatasheetDetail(detail.datasheetId),
            staleTime: 5 * 60_000,
          });
          const items = normalizeDatasheetItems(datasheet.items);
          const basic = fromBasicPayload(detail.basic);
          return countUnresolvedNg(
            items,
            fromAnswersResponse(detail.answers),
            resolveUnitSlotIndex(items, basic.unit),
          );
        }),
      );
      return counts.reduce((sum, count) => sum + count, 0);
    },
  });

  return {
    inProgress: inProgress ? inProgress.length : null,
    completedToday,
    pendingNg: pending.isError ? null : (pending.data ?? null),
  };
}
