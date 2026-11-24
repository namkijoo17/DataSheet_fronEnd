export type DatasheetInputType =
  | 'NUMBER'
  | 'OK_NG'
  | 'TEXT'
  | 'ENGLISH'
  | 'MIXED'
  | 'CHECK';

export type DatasheetSummary = {
  id: number;
  code: string;
  name: string;
  revision: number;
  fileName: string;
  pageWidth: number | null;
  pageHeight: number | null;
  active: boolean;
};

export type DatasheetItemSlot = {
  id: number;
  label: string;
  slotIndex: number;
  pdfPage: number;
  posX: number;
  posY: number;
  posWidth: number | null;
  posHeight: number | null;
};

export type DatasheetItem = {
  id: number;
  itemNo: number;
  groupName: string | null;
  label: string;
  inspectionItem: boolean;
  inputType: DatasheetInputType;
  unit: string | null;
  decimalPlaces: number | null;
  minValue: number | null;
  maxValue: number | null;
  allowNegative: boolean;
  required: boolean;
  skippable: boolean;
  formula: string | null;
  pdfPage: number;
  posX: number;
  posY: number;
  posWidth: number | null;
  posHeight: number | null;
  sortOrder: number;
  array?: boolean;
  arraySize?: number | null;
  slots?: DatasheetItemSlot[];
};

export type DatasheetDetail = {
  id: number;
  code: string;
  name: string;
  revision: number;
  fileName: string;
  pageWidth: number | null;
  pageHeight: number | null;
  active: boolean;
  items: DatasheetItem[];
};

/** PDF 하이라이트용 상대 좌표 (페이지 기준 0~100 %) */
export type DatasheetPdfRegion = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 항목 또는 슬롯 단위 선택 */
export type DatasheetFieldSelection =
  | { kind: 'item'; itemId: number }
  | { kind: 'slot'; itemId: number; slotId: number };

/** PDF 절대 좌표 (좌하단 원점) */
export type DatasheetPdfPosition = {
  pdfPage: number;
  posX: number;
  posY: number;
  posWidth: number;
  posHeight: number;
};

export type DatasheetItemSlotUpsert = {
  id?: number | null;
  slotIndex: number;
  label: string;
  pdfPage: number;
  posX: number;
  posY: number;
  posWidth: number | null;
  posHeight: number | null;
};

export type DatasheetItemUpsert = {
  groupName?: string | null;
  label: string;
  inspectionItem: boolean;
  array: boolean;
  arraySize?: number | null;
  inputType: DatasheetInputType;
  unit?: string | null;
  decimalPlaces?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  allowNegative: boolean;
  required: boolean;
  skippable: boolean;
  formula?: string | null;
  sortOrder?: number | null;
  pdfPage: number;
  posX: number;
  posY: number;
  posWidth: number | null;
  posHeight: number | null;
  slots?: DatasheetItemSlotUpsert[];
};
