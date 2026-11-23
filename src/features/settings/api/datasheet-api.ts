import { apiClient, apiClientBlob } from '@/shared/api/client';

import type { DatasheetFile } from '../model/datasheet-types';

export function fetchDatasheets() {
  return apiClient<DatasheetFile[]>('/api/datasheets', {
    method: 'GET',
  });
}

export function getDatasheetFileUrl(fileName: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
  return `${baseUrl}/api/datasheets/${encodeURIComponent(fileName)}/file`;
}

export function fetchDatasheetFileBlob(fileName: string) {
  return apiClientBlob(
    `/api/datasheets/${encodeURIComponent(fileName)}/file`,
    { method: 'GET' },
  );
}
