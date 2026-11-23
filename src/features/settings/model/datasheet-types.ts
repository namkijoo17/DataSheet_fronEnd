export type DatasheetInputType =
  | 'NUMBER'
  | 'OK_NG'
  | 'TEXT'
  | 'ENGLISH'
  | 'MIXED';

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
