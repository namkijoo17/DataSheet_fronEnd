import type { InspectionModeId } from './inspection-modes';

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
};

export type InspectionSummaryResponse = {
  id: number;
  datasheetId: number;
  datasheetName: string;
  serialNo: string | null;
  mode: InspectionModeId;
  status: InspectionStatus;
  answeredCount: number;
  totalCount: number;
  updatedAt: string;
};
