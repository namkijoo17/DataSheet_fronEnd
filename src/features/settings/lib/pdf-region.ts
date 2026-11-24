import type {
  DatasheetDetail,
  DatasheetItem,
  DatasheetItemSlot,
  DatasheetPdfPosition,
  DatasheetPdfRegion,
} from '../model/datasheet-types';

type PdfPosition = {
  pdfPage: number;
  posX: number;
  posY: number;
  posWidth: number | null;
  posHeight: number | null;
};

/**
 * PDF 좌표(좌하단 원점) → 화면 하이라이트 % 좌표(좌상단 원점)
 */
export function toPdfRegion(
  position: PdfPosition,
  pageWidth: number | null | undefined,
  pageHeight: number | null | undefined,
): DatasheetPdfRegion | null {
  const width = pageWidth && pageWidth > 0 ? pageWidth : null;
  const height = pageHeight && pageHeight > 0 ? pageHeight : null;
  if (!width || !height) return null;

  const posWidth = position.posWidth ?? 40;
  const posHeight = position.posHeight ?? 18;

  return {
    page: position.pdfPage || 1,
    x: (position.posX / width) * 100,
    y: ((height - position.posY - posHeight) / height) * 100,
    width: (posWidth / width) * 100,
    height: (posHeight / height) * 100,
  };
}

/**
 * 화면 % 좌표(좌상단 원점) → PDF 좌표(좌하단 원점)
 */
export function fromPdfRegion(
  region: DatasheetPdfRegion,
  pageWidth: number | null | undefined,
  pageHeight: number | null | undefined,
): DatasheetPdfPosition | null {
  const width = pageWidth && pageWidth > 0 ? pageWidth : null;
  const height = pageHeight && pageHeight > 0 ? pageHeight : null;
  if (!width || !height) return null;

  const posWidth = (region.width / 100) * width;
  const posHeight = (region.height / 100) * height;
  const posX = (region.x / 100) * width;
  const topFromTop = (region.y / 100) * height;
  const posY = height - topFromTop - posHeight;

  return {
    pdfPage: region.page || 1,
    posX: round2(posX),
    posY: round2(posY),
    posWidth: round2(posWidth),
    posHeight: round2(posHeight),
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function getItemPdfRegion(
  item: DatasheetItem,
  detail: Pick<DatasheetDetail, 'pageWidth' | 'pageHeight'>,
) {
  return toPdfRegion(item, detail.pageWidth, detail.pageHeight);
}

export function getSlotPdfRegion(
  slot: DatasheetItemSlot,
  detail: Pick<DatasheetDetail, 'pageWidth' | 'pageHeight'>,
) {
  return toPdfRegion(slot, detail.pageWidth, detail.pageHeight);
}
