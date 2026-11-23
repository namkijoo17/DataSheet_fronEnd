import { apiClient, apiClientBlob } from '@/shared/api/client';

import type {
  DatasheetDetail,
  DatasheetSummary,
} from '../model/datasheet-types';

export function fetchDatasheets() {
  return apiClient<DatasheetSummary[]>('/api/datasheets', {
    method: 'GET',
  });
}

export function fetchDatasheetDetail(id: number) {
  return apiClient<DatasheetDetail>(`/api/datasheets/${id}`, {
    method: 'GET',
  });
}

export function fetchDatasheetFileBlob(id: number) {
  return apiClientBlob(`/api/datasheets/${id}/file`, {
    method: 'GET',
  });
}
