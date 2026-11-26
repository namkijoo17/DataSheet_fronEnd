import type { BasicInfoFormValues } from './basic-info-fields';

/** 결과 PDF 표시 파일명: 호기_기번_yyyyMMdd.pdf */
export function buildResultFileName(
  basic: Pick<BasicInfoFormValues, 'unit' | 'serialNo' | 'inspectDate'>,
) {
  const date = (basic.inspectDate || '').replaceAll('-', '') || 'DATE';
  const raw = `${basic.unit || 'UNIT'}_${basic.serialNo || 'SERIAL'}_${date}`;
  return `${raw.replace(/[\\/:*?"<>|\s]+/g, '_')}.pdf`;
}
