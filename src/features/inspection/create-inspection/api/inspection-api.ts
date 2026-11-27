import { apiClient, apiClientBlob, apiClientFormData } from '@/shared/api/client';

import type {
  InspectionAnswerPayload,
  InspectionCompletePayload,
  InspectionDetailResponse,
  InspectionRecheckPayload,
  InspectionRecheckResponse,
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

/** 항목 재검사 사유를 기록한다 (서버에 저장된 해당 항목 답변도 함께 지워진다) */
export function recordInspectionRecheck(
  id: number,
  itemId: number,
  body: InspectionRecheckPayload,
) {
  return apiClient<InspectionRecheckResponse>(
    `/api/inspections/${id}/rechecks/${itemId}`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

/** 검사를 완료하고 결과 PDF 를 파일 보관함에 저장 */
export function completeInspection(id: number, payload: InspectionCompletePayload) {
  const formData = new FormData();
  formData.append('file', payload.file, payload.fileName);
  formData.append('fileName', payload.fileName);
  formData.append('okCount', String(payload.okCount));
  formData.append('ngCount', String(payload.ngCount));
  formData.append('skipCount', String(payload.skipCount));
  return apiClientFormData<InspectionDetailResponse>(
    `/api/inspections/${id}/complete`,
    formData,
  );
}

/** 저장된 결과 PDF */
export function fetchInspectionFileBlob(id: number, download = false) {
  return apiClientBlob(`/api/inspections/${id}/file?download=${download}`, {
    method: 'GET',
  });
}

export function discardInspection(id: number) {
  return apiClient<void>(`/api/inspections/${id}`, { method: 'DELETE' });
}
