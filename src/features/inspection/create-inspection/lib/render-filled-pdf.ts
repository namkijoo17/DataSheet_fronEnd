import { getDocument } from 'pdfjs-dist';

import { ensurePdfjsWorker } from '@/features/settings/lib/pdfjs';

import type { InspectionOverlay } from './build-inspection-overlays';
import { computeOverlayFontPx } from './overlay-text';
import { buildPdfFromJpegs, type JpegPdfPage } from './simple-pdf';

const MARK_COLOR = '#2563eb';
const FONT_FAMILY =
  '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';

/** 결과 PDF 의 페이지 가로 픽셀 (A4 기준 약 190dpi) */
const TARGET_WIDTH_PX = 1600;
const MAX_HEIGHT_PX = 2600;
const JPEG_QUALITY = 0.9;

export type RenderProgress = (done: number, total: number) => void;

/** 원본 PDF 위에 입력값 오버레이를 그려 새 PDF 를 만든다. */
export async function renderFilledPdf(params: {
  source: Blob;
  overlays: InspectionOverlay[];
  onProgress?: RenderProgress;
}): Promise<Blob> {
  const { source, overlays, onProgress } = params;

  ensurePdfjsWorker();
  const data = await source.arrayBuffer();
  const loadingTask = getDocument({ data });
  const doc = await loadingTask.promise;

  try {
    const pages: JpegPdfPage[] = [];
    onProgress?.(0, doc.numPages);

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });

      let scale = TARGET_WIDTH_PX / base.width;
      scale = Math.min(scale, MAX_HEIGHT_PX / base.height);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('PDF 이미지를 만들 수 없습니다.');

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, viewport }).promise;

      drawOverlays(
        context,
        overlays.filter((mark) => mark.page === pageNumber),
        canvas.width,
        canvas.height,
      );

      const jpeg = await canvasToJpeg(canvas);
      pages.push({
        jpeg,
        widthPx: canvas.width,
        heightPx: canvas.height,
        widthPt: base.width,
        heightPt: base.height,
      });

      // 메모리 반환
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      onProgress?.(pageNumber, doc.numPages);
    }

    return buildPdfFromJpegs(pages);
  } finally {
    try {
      await doc.cleanup();
      await loadingTask.destroy();
    } catch {
      // ignore
    }
  }
}

async function canvasToJpeg(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new Error('PDF 이미지를 만들 수 없습니다.');
  return new Uint8Array(await blob.arrayBuffer());
}

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  marks: InspectionOverlay[],
  width: number,
  height: number,
) {
  // 화면(약 700px 폭) 대비 선 두께 비율을 유지
  const unit = width / 700;

  for (const mark of marks) {
    const { region, kind } = mark;
    const boxW = (Math.max(region.width, 1.2) / 100) * width;
    const boxH = (Math.max(region.height, 1) / 100) * height;
    const left = (region.x / 100) * width;
    const top = (region.y / 100) * height;

    ctx.save();
    ctx.strokeStyle = MARK_COLOR;
    ctx.fillStyle = MARK_COLOR;

    if (kind === 'circle') {
      const diameter = Math.min(boxW, boxH, 38 * unit * 1.2);
      ctx.lineWidth = Math.max(2.5 * unit * 1.2, 2);
      ctx.beginPath();
      ctx.arc(
        left + boxW / 2,
        top + boxH / 2,
        Math.max(diameter / 2 - ctx.lineWidth / 2, 1),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else if (kind === 'check') {
      const size = Math.min(boxW, boxH) * 0.85;
      const originX = left + (boxW - size) / 2;
      const originY = top + (boxH - size) / 2;
      const k = size / 24;
      ctx.lineWidth = 3.2 * k;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(originX + 5 * k, originY + 12.5 * k);
      ctx.lineTo(originX + 10 * k, originY + 17.5 * k);
      ctx.lineTo(originX + 19 * k, originY + 6.5 * k);
      ctx.stroke();
    } else {
      const text = mark.text ?? '';
      if (text) {
        const fontPx = computeOverlayFontPx(
          text,
          region,
          { width, height },
          { min: 8 * unit, max: 48 * unit * 1.5 },
        );
        ctx.font = `bold ${fontPx.toFixed(1)}px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, left, top + boxH / 2);
      }
    }

    ctx.restore();
  }
}
