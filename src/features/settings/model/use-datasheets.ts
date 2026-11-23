'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDatasheets } from '../api/datasheet-api';

export const datasheetsQueryKey = ['datasheets'] as const;

export function useDatasheets() {
  return useQuery({
    queryKey: datasheetsQueryKey,
    queryFn: fetchDatasheets,
  });
}
