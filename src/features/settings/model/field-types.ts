/** PDF 페이지 기준 상대 좌표 (0~100 %) */
export type DatasheetPdfRegion = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DatasheetField = {
  id: string;
  label: string;
  /** 허용 범위/규격 표시 문자열 */
  range: string;
  unit?: string;
  pdfRegion: DatasheetPdfRegion;
};
