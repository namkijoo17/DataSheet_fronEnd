import type {
  DatasheetDetail,
  DatasheetItem,
  DatasheetPdfRegion,
} from '../model/datasheet-types';

/**
 * PDF 좌표(좌하단 원점) → 화면 하이라이트 % 좌표(좌상단 원점)
 */
export function toPdfRegion(
  item: DatasheetItem,
  pageWidth: number | null | undefined,
  pageHeight: number | null | undefined,
): DatasheetPdfRegion | null {
  const width = pageWidth && pageWidth > 0 ? pageWidth : null;
  const height = pageHeight && pageHeight > 0 ? pageHeight : null;
  if (!width || !height) return null;

  const posWidth = item.posWidth ?? 40;
  const posHeight = item.posHeight ?? 18;

  return {
    page: item.pdfPage || 1,
    x: (item.posX / width) * 100,
    // PDF y는 하단 기준 → CSS는 상단 기준
    y: ((height - item.posY - posHeight) / height) * 100,
    width: (posWidth / width) * 100,
    height: (posHeight / height) * 100,
  };
}

export function getItemPdfRegion(
  item: DatasheetItem,
  detail: Pick<DatasheetDetail, 'pageWidth' | 'pageHeight'>,
) {
  return toPdfRegion(item, detail.pageWidth, detail.pageHeight);
}
