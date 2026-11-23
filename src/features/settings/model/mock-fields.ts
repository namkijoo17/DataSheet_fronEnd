import type { DatasheetField } from './field-types';

const DEFAULT_FIELDS: DatasheetField[] = [
  {
    id: 'lotNo',
    label: 'LOT 번호',
    range: '영문/숫자 조합',
    pdfRegion: { page: 1, x: 58, y: 8, width: 28, height: 3.2 },
  },
  {
    id: 'serialNo',
    label: '시리얼 번호',
    range: '제품 고유번호',
    pdfRegion: { page: 1, x: 58, y: 12, width: 28, height: 3.2 },
  },
  {
    id: 'length',
    label: '길이',
    range: '9.8 ~ 10.2',
    unit: 'mm',
    pdfRegion: { page: 1, x: 42, y: 28, width: 18, height: 3.5 },
  },
  {
    id: 'width',
    label: '폭',
    range: '4.9 ~ 5.1',
    unit: 'mm',
    pdfRegion: { page: 1, x: 42, y: 33, width: 18, height: 3.5 },
  },
  {
    id: 'thickness',
    label: '두께',
    range: '1.0 ± 0.05',
    unit: 'mm',
    pdfRegion: { page: 1, x: 42, y: 38, width: 18, height: 3.5 },
  },
  {
    id: 'resistance',
    label: '저항값',
    range: '100 ± 5',
    unit: 'Ω',
    pdfRegion: { page: 1, x: 42, y: 48, width: 18, height: 3.5 },
  },
  {
    id: 'judgment',
    label: '종합 판정',
    range: 'OK / NG',
    pdfRegion: { page: 1, x: 62, y: 78, width: 22, height: 4 },
  },
];

const FI70_FIELDS: DatasheetField[] = [
  {
    id: 'partName',
    label: '부품명',
    range: '표준 부품명',
    pdfRegion: { page: 1, x: 55, y: 10, width: 30, height: 3.2 },
  },
  {
    id: 'shipQty',
    label: '출하 수량',
    range: '1 이상',
    unit: 'EA',
    pdfRegion: { page: 1, x: 55, y: 15, width: 18, height: 3.2 },
  },
  {
    id: 'appearance',
    label: '외관 판정',
    range: 'OK / NG',
    pdfRegion: { page: 1, x: 40, y: 32, width: 20, height: 3.5 },
  },
  {
    id: 'dimension',
    label: '치수 검사',
    range: '도면 공차 이내',
    pdfRegion: { page: 1, x: 40, y: 40, width: 22, height: 3.5 },
  },
  {
    id: 'packing',
    label: '포장 상태',
    range: '양호 / 재포장 / 불량',
    pdfRegion: { page: 1, x: 40, y: 48, width: 24, height: 3.5 },
  },
];

/** 서버 스키마 API 연동 전 목업. pdfRegion은 페이지 상대 % 좌표. */
export function getMockFields(fileName: string): DatasheetField[] {
  const lower = fileName.toLowerCase();
  if (lower.includes('fi-70') || lower.includes('414-0802')) {
    return FI70_FIELDS;
  }
  return DEFAULT_FIELDS;
}
