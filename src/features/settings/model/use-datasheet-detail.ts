'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDatasheetDetail } from '../api/datasheet-api';

export function datasheetDetailQueryKey(id: number) {
  return ['datasheets', id] as const;
}

export function useDatasheetDetail(id: number) {
  return useQuery({
    queryKey: datasheetDetailQueryKey(id),
    queryFn: () => fetchDatasheetDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
