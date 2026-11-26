import type { InspectionOverlay } from './build-inspection-overlays';

/** 글자 폭 추정 (em 단위): 한글·기타 1.0, 영문/숫자 0.58, 구두점 0.32 */
export function estimateTextUnits(text: string) {
  let units = 0;
  for (const char of text) {
    if (/[0-9A-Za-z]/.test(char)) units += 0.58;
    else if (/[.,:;'"|!\-–_/()\s]/.test(char)) units += 0.32;
    else units += 1;
  }
  return Math.max(units, 1);
}

/**
 * 칸 크기에 비례한 글자 크기(px).
 * 칸 높이의 72%, 칸 너비를 약간만 넘도록 제한한다. 화면/PDF 출력이 같은 규칙을 쓴다.
 */
export function computeOverlayFontPx(
  text: string,
  region: InspectionOverlay['region'],
  pageSize: { width: number; height: number },
  clamp: { min: number; max: number },
) {
  const cellHeight = (region.height / 100) * pageSize.height;
  const cellWidth = (region.width / 100) * pageSize.width;
  const byHeight = cellHeight * 0.72;
  const byWidth = (cellWidth * 1.15) / estimateTextUnits(text);
  return Math.min(Math.max(Math.min(byHeight, byWidth), clamp.min), clamp.max);
}
