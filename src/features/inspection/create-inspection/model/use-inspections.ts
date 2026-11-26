import { useQuery } from '@tanstack/react-query';

import { fetchInspections } from '../api/inspection-api';

export const inProgressInspectionsQueryKey = ['inspections', 'in-progress'] as const;
export const completedInspectionsQueryKey = ['inspections', 'completed'] as const;

export function useInProgressInspections() {
  return useQuery({
    queryKey: inProgressInspectionsQueryKey,
    queryFn: () => fetchInspections('IN_PROGRESS'),
    staleTime: 0,
  });
}

/** 파일 보관함: 완료되어 결과 PDF 가 저장된 검사 */
export function useCompletedInspections() {
  return useQuery({
    queryKey: completedInspectionsQueryKey,
    queryFn: () => fetchInspections('COMPLETED'),
    staleTime: 0,
  });
}
