import { apiClient, apiClientBlob, apiClientFormData } from '@/shared/api/client';

import type {
  DatasheetDetail,
  DatasheetItem,
  DatasheetItemUpsert,
  DatasheetPdfPosition,
  DatasheetSummary,
} from '../model/datasheet-types';

export type CreateDatasheetInput = {
  name: string;
  pageWidth?: number | null;
  pageHeight?: number | null;
  file: File;
};

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

export function createDatasheet(input: CreateDatasheetInput) {
  const formData = new FormData();
  formData.append('name', input.name);
  if (input.pageWidth != null) {
    formData.append('pageWidth', String(input.pageWidth));
  }
  if (input.pageHeight != null) {
    formData.append('pageHeight', String(input.pageHeight));
  }
  formData.append('file', input.file);

  return apiClientFormData<DatasheetDetail>('/api/datasheets', formData);
}

export function deleteDatasheet(id: number) {
  return apiClient<void>(`/api/datasheets/${id}`, {
    method: 'DELETE',
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
