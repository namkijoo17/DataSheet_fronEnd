import { useQuery } from '@tanstack/react-query';

import { fetchInspections } from '../api/inspection-api';

export const inProgressInspectionsQueryKey = ['inspections', 'in-progress'] as const;

export function useInProgressInspections() {
  return useQuery({
    queryKey: inProgressInspectionsQueryKey,
    queryFn: () => fetchInspections('IN_PROGRESS'),
    staleTime: 0,
  });
}
