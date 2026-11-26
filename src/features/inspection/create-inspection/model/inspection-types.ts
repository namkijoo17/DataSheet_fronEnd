import type { InspectionModeId } from './inspection-modes';
import type { NgAction } from './ng-actions';

export type InspectionStatus = 'IN_PROGRESS' | 'COMPLETED';

export type InspectionBasicPayload = {
  serialNo: string | null;
  unit: string | null;
  line: string | null;
  /** yyyy-MM-dd */
  inspectDate: string | null;
  inspector: string | null;
  inspectorChangeReason: string | null;
  temperature: string | null;
  humidity: string | null;
  parts: Record<string, string>;
};

export type InspectionStartPayload = {
  datasheetId?: number;
  mode: InspectionModeId;
  basic: InspectionBasicPayload;
};

export type InspectionAnswerPayload = {
  skipped: boolean;
  value: string | null;
  slotIndex: number | null;
  judgment: 'OK' | 'NG' | null;
  slotValues: Record<number, string>;
  ngAction: NgAction | null;
  /** yyyy-MM-ddTHH:mm:ss */
  ngOccurredAt: string | null;
};

export type InspectionAnswerResponse = InspectionAnswerPayload & {
  itemId: number;
};

export type InspectionDetailResponse = {
  id: number;
  datasheetId: number;
  mode: InspectionModeId;
  status: InspectionStatus;
  basic: InspectionBasicPayload;
  answers: Record<number, InspectionAnswerResponse>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  result: InspectionResult | null;
  okCount: number | null;
  ngCount: number | null;
  skipCount: number | null;
  fileName: string | null;
};

export type InspectionResult = 'OK' | 'NG';

export type InspectionCompletePayload = {
  /** 입력값이 채워진 결과 PDF */
  file: Blob;
  fileName: string;
  okCount: number;
  ngCount: number;
  skipCount: number;
};

export type InspectionSummaryResponse = {
  id: number;
  datasheetId: number;
  datasheetName: string;
  serialNo: string | null;
  unit: string | null;
  inspector: string | null;
  mode: InspectionModeId;
  status: InspectionStatus;
  answeredCount: number;
  totalCount: number;
  result: InspectionResult | null;
  okCount: number | null;
  ngCount: number | null;
  skipCount: number | null;
  /** 저장된 결과 PDF 파일명 (없으면 null) */
  fileName: string | null;
  updatedAt: string;
  completedAt: string | null;
};
