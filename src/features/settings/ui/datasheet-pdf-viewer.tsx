'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist';

import { fetchDatasheetFileBlob } from '../api/datasheet-api';
import { ensurePdfjsWorker } from '../lib/pdfjs';
import type { DatasheetPdfRegion } from '../model/datasheet-types';

type DatasheetPdfViewerProps = {
  datasheetId: number;
  selectedLabel?: string | null;
  selectedRegion?: DatasheetPdfRegion | null;
  editMode?: boolean;
  canDraw?: boolean;
  onRegionDrawn?: (region: DatasheetPdfRegion) => void;
  onDrawBlocked?: () => void;
};

type ViewerSize = {
  width: number;
  height: number;
};

type DragState = {
  page: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

export function DatasheetPdfViewer({
  datasheetId,
  selectedLabel,
  selectedRegion,
  editMode = false,
  canDraw = false,
  onRegionDrawn,
  onDrawBlocked,
}: DatasheetPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pageCount, setPageCount] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [viewerSize, setViewerSize] = useState<ViewerSize>({
    width: 0,
    height: 0,
  });
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      setViewerSize({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;
    let doc: PDFDocumentProxy | null = null;

    ensurePdfjsWorker();

    fetchDatasheetFileBlob(datasheetId)
      .then(async (blob) => {
        const data = await blob.arrayBuffer();
        loadingTask = getDocument({ data });
        doc = await loadingTask.promise;
        if (cancelled) {
          await doc.cleanup();
          await loadingTask.destroy();
          return;
        }
        setPdfDoc(doc);
        setPageCount(doc.numPages);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      void (async () => {
        try {
          await doc?.cleanup();
        } catch {
          // ignore
        }
        try {
          await loadingTask?.destroy();
        } catch {
          // ignore
        }
      })();
    };
  }, [datasheetId]);

  useEffect(() => {
    if (!selectedRegion) return;
    const pageNode = pageRefs.current.get(selectedRegion.page);
    pageNode?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedRegion]);

  const draftRegion =
    drag == null
      ? null
      : normalizeDraftRegion(
          drag.page,
          drag.startX,
          drag.startY,
          drag.currentX,
          drag.currentY,
        );

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#e8eaed] bg-[#eceef1]"
    >
      {status === 'loading' && <ViewerFallback label="문서를 불러오는 중..." />}
      {status === 'error' && (
        <ViewerFallback label="문서를 불러오지 못했습니다." />
      )}

      {status === 'ready' && pdfDoc && viewerSize.width > 0 && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-2">
          {editMode && (
            <p className="mb-2 shrink-0 text-center text-xs text-[#5f6368]">
              {canDraw
                ? 'PDF에서 드래그해 좌표 박스를 지정하세요.'
                : '항목(또는 슬롯)을 선택한 뒤 드래그하세요.'}
            </p>
          )}
          <div className="flex w-full flex-col items-center gap-2">
          {Array.from({ length: pageCount }, (_, index) => {
            const pageNumber = index + 1;
            return (
              <PdfPage
                key={`${datasheetId}-${pageNumber}-${viewerSize.width}x${viewerSize.height}`}
                pdfDoc={pdfDoc}
                pageNumber={pageNumber}
                pageCount={pageCount}
                viewerSize={viewerSize}
                selectedLabel={
                  selectedRegion?.page === pageNumber ? selectedLabel : null
                }
                selectedRegion={
                  selectedRegion?.page === pageNumber ? selectedRegion : null
                }
                draftRegion={
                  draftRegion?.page === pageNumber ? draftRegion : null
                }
                editMode={editMode}
                onPointerDown={(event, pageNode) => {
                  if (!editMode) return;
                  if (!canDraw) {
                    onDrawBlocked?.();
                    return;
                  }
                  const point = percentPoint(event, pageNode);
                  setDrag({
                    page: pageNumber,
                    startX: point.x,
                    startY: point.y,
                    currentX: point.x,
                    currentY: point.y,
                  });
                }}
                onPointerMove={(event, pageNode) => {
                  if (!drag || drag.page !== pageNumber) return;
                  const point = percentPoint(event, pageNode);
                  setDrag((prev) =>
                    prev
                      ? {
                          ...prev,
                          currentX: point.x,
                          currentY: point.y,
                        }
                      : prev,
                  );
                }}
                onPointerUp={() => {
                  if (!drag || drag.page !== pageNumber) return;
                  const region = normalizeDraftRegion(
                    drag.page,
                    drag.startX,
                    drag.startY,
                    drag.currentX,
                    drag.currentY,
                  );
                  setDrag(null);
                  if (region.width < 0.3 || region.height < 0.3) return;
                  onRegionDrawn?.(region);
                }}
                pageRef={(node) => {
                  if (node) pageRefs.current.set(pageNumber, node);
                  else pageRefs.current.delete(pageNumber);
                }}
              />
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}

function percentPoint(
  event: React.PointerEvent<HTMLDivElement>,
  pageNode: HTMLDivElement,
) {
  const rect = pageNode.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
  };
}

function normalizeDraftRegion(
  page: number,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
): DatasheetPdfRegion {
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  return { page, x, y, width, height };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function PdfPage({
  pdfDoc,
  pageNumber,
  pageCount,
  viewerSize,
  selectedLabel,
  selectedRegion,
  draftRegion,
  editMode,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  pageRef,
}: {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  pageCount: number;
  viewerSize: ViewerSize;
  selectedLabel?: string | null;
  selectedRegion: DatasheetPdfRegion | null;
  draftRegion: DatasheetPdfRegion | null;
  editMode: boolean;
  onPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNode: HTMLDivElement,
  ) => void;
  onPointerMove: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNode: HTMLDivElement,
  ) => void;
  onPointerUp: () => void;
  pageRef: (node: HTMLDivElement | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localRef = useRef<HTMLDivElement | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const padding = 16;
      const gap = pageCount > 1 ? 8 * (pageCount - 1) : 0;
      const availableWidth = Math.max(viewerSize.width - padding, 1);
      const availableHeight = Math.max(
        (viewerSize.height - padding - gap) / pageCount,
        1,
      );

      const baseViewport = page.getViewport({ scale: 1 });
      const fitScale = Math.min(
        availableWidth / baseViewport.width,
        availableHeight / baseViewport.height,
      );

      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const viewport = page.getViewport({ scale: fitScale * dpr });
      const displayWidth = viewport.width / dpr;
      const displayHeight = viewport.height / dpr;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      context.clearRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvas,
        viewport,
      }).promise;

      if (!cancelled) setRendered(true);
    }

    void renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, pageCount, viewerSize.height, viewerSize.width]);

  return (
    <div
      ref={(node) => {
        localRef.current = node;
        pageRef(node);
      }}
      className={`relative shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ${
        editMode ? 'cursor-crosshair touch-none' : ''
      }`}
      onPointerDown={(event) => {
        if (!localRef.current) return;
        localRef.current.setPointerCapture(event.pointerId);
        onPointerDown(event, localRef.current);
      }}
      onPointerMove={(event) => {
        if (!localRef.current) return;
        onPointerMove(event, localRef.current);
      }}
      onPointerUp={() => onPointerUp()}
      onPointerCancel={() => onPointerUp()}
    >
      <canvas ref={canvasRef} className="pointer-events-none block" />
      {rendered && selectedRegion && (
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-[#2563eb] bg-[#2563eb]/15 transition-all duration-300"
          style={{
            left: `${selectedRegion.x}%`,
            top: `${selectedRegion.y}%`,
            width: `${selectedRegion.width}%`,
            height: `${selectedRegion.height}%`,
          }}
        >
          {selectedLabel && (
            <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-[#2563eb] px-2 py-0.5 text-[11px] font-semibold text-white">
              {selectedLabel}
            </span>
          )}
        </div>
      )}
      {rendered && draftRegion && (
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-dashed border-[#16a34a] bg-[#16a34a]/20"
          style={{
            left: `${draftRegion.x}%`,
            top: `${draftRegion.y}%`,
            width: `${draftRegion.width}%`,
            height: `${draftRegion.height}%`,
          }}
        />
      )}
    </div>
  );
}

function ViewerFallback({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
      <FileText className="size-10 text-[#9aa0a6]" aria-hidden />
      <p className="text-sm text-[#8b8f96]">{label}</p>
    </div>
  );
}
