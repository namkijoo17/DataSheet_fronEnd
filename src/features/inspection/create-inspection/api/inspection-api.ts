import { apiClient } from '@/shared/api/client';

import type {
  InspectionAnswerPayload,
  InspectionDetailResponse,
  InspectionStartPayload,
  InspectionStatus,
  InspectionSummaryResponse,
} from '../model/inspection-types';

export function startInspection(body: InspectionStartPayload) {
  return apiClient<InspectionDetailResponse>('/api/inspections', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** 기본정보·모드를 교체하고 저장된 답변을 비운다 */
export function restartInspection(id: number, body: InspectionStartPayload) {
  return apiClient<InspectionDetailResponse>(`/api/inspections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function fetchInspections(status: InspectionStatus = 'IN_PROGRESS') {
  return apiClient<InspectionSummaryResponse[]>(
    `/api/inspections?status=${status}`,
    { method: 'GET' },
  );
}

export function fetchInspectionDetail(id: number) {
  return apiClient<InspectionDetailResponse>(`/api/inspections/${id}`, {
    method: 'GET',
  });
}

export function saveInspectionAnswer(
  id: number,
  itemId: number,
  body: InspectionAnswerPayload,
) {
  return apiClient<void>(`/api/inspections/${id}/answers/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function completeInspection(id: number) {
  return apiClient<InspectionDetailResponse>(`/api/inspections/${id}/complete`, {
    method: 'POST',
  });
}

export function discardInspection(id: number) {
  return apiClient<void>(`/api/inspections/${id}`, { method: 'DELETE' });
}
