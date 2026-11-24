import { apiClient, apiClientBlob } from '@/shared/api/client';

import type {
  DatasheetDetail,
  DatasheetItem,
  DatasheetItemUpsert,
  DatasheetPdfPosition,
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

export function createDatasheetItem(datasheetId: number, body: DatasheetItemUpsert) {
  return apiClient<DatasheetItem>(`/api/datasheets/${datasheetId}/items`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateDatasheetItem(
  datasheetId: number,
  itemId: number,
  body: DatasheetItemUpsert,
) {
  return apiClient<DatasheetItem>(
    `/api/datasheets/${datasheetId}/items/${itemId}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
}

export function deleteDatasheetItem(datasheetId: number, itemId: number) {
  return apiClient<void>(`/api/datasheets/${datasheetId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

export function updateDatasheetItemPosition(
  datasheetId: number,
  itemId: number,
  body: DatasheetPdfPosition,
) {
  return apiClient<DatasheetItem>(
    `/api/datasheets/${datasheetId}/items/${itemId}/position`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
}

export function updateDatasheetSlotPosition(
  datasheetId: number,
  itemId: number,
  slotId: number,
  body: DatasheetPdfPosition,
) {
  return apiClient<DatasheetItem>(
    `/api/datasheets/${datasheetId}/items/${itemId}/slots/${slotId}/position`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
}
