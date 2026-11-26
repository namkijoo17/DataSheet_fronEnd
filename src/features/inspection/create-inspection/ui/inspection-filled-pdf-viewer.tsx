'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist';

import { fetchDatasheetFileBlob } from '@/features/settings';
import { ensurePdfjsWorker } from '@/features/settings/lib/pdfjs';

import type { InspectionOverlay } from '../lib/build-inspection-overlays';

type ViewerSize = { width: number; height: number };

type InspectionFilledPdfViewerProps = {
  datasheetId: number;
  overlays: InspectionOverlay[];
  /** 고정 페이지 (썸네일용). 없으면 내부에서 페이지 전환 */
  fixedPage?: number;
  /** 썸네일 등 축소 표시 */
  compact?: boolean;
  className?: string;
  onReadyPages?: (pageCount: number) => void;
};

export function InspectionFilledPdfViewer({
  datasheetId,
  overlays,
  fixedPage,
  compact = false,
  className,
  onReadyPages,
}: InspectionFilledPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyPagesRef = useRef(onReadyPages);
  onReadyPagesRef.current = onReadyPages;

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [docError, setDocError] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [viewerSize, setViewerSize] = useState<ViewerSize>({
    width: 0,
    height: 0,
  });
  const [page, setPage] = useState(fixedPage ?? 1);
  const [scale, setScale] = useState(1);

  const activePage = fixedPage ?? page;

  const {
    data: blob,
    isPending: blobPending,
    isError: blobError,
  } = useQuery({
    queryKey: ['datasheet-file-blob', datasheetId],
    queryFn: () => fetchDatasheetFileBlob(datasheetId),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const measure = () => {
      const width = Math.max(
        node.clientWidth,
        node.getBoundingClientRect().width,
        compact ? 0 : Math.min(window.innerWidth - 24, 960),
      );
      const height = Math.max(
        node.clientHeight,
        node.getBoundingClientRect().height,
        compact ? 0 : Math.round(window.innerHeight * 0.6),
      );
      setViewerSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [compact]);

  useEffect(() => {
    if (!blob) return;

    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;
    let doc: PDFDocumentProxy | null = null;

    setDocError(false);
    setPdfDoc(null);
    ensurePdfjsWorker();

    void (async () => {
      try {
        const data = await blob.arrayBuffer();
        if (cancelled) return;
        loadingTask = getDocument({ data });
        doc = await loadingTask.promise;
        if (cancelled) {
          await doc.cleanup();
          await loadingTask.destroy();
          return;
        }
        setPdfDoc(doc);
        setPageCount(doc.numPages);
        if (fixedPage == null) setPage(1);
        onReadyPagesRef.current?.(doc.numPages);
      } catch {
        if (!cancelled) setDocError(true);
      }
    })();

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
  }, [blob, fixedPage]);

  const pageOverlays = overlays.filter((mark) => mark.page === activePage);
  const loading = blobPending || (!!blob && !pdfDoc && !docError);
  const error = blobError || docError;
  const renderWidth = Math.max(
    viewerSize.width || (compact ? 280 : window.innerWidth - 48),
    120,
  );

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className={
          compact
            ? 'relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-[#eceef1]'
            : 'relative min-h-[60svh] w-full overflow-auto rounded-xl bg-[#eceef1]'
        }
      >
        {loading && <Fallback label="PDF 불러오는 중..." />}
        {error && <Fallback label="PDF를 불러오지 못했습니다." />}
        {!loading && !error && pdfDoc && (
          <div
            className={
              compact
                ? 'absolute inset-0 flex items-start justify-center p-2'
                : 'flex min-h-full items-start justify-center p-3'
            }
            style={
              compact
                ? undefined
                : { transform: `scale(${scale})`, transformOrigin: 'top center' }
            }
          >
            <FilledPage
              pdfDoc={pdfDoc}
              pageNumber={activePage}
              viewerWidth={
                compact
                  ? Math.max(renderWidth - 8, 1)
                  : Math.max(renderWidth - 24, 1)
              }
              overlays={pageOverlays}
              fitHeight={
                compact
                  ? Math.max(viewerSize.height || renderWidth * 1.35, 1) - 8
                  : null
              }
            />
          </div>
        )}
      </div>

      {!compact && pageCount > 0 && fixedPage == null && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#5f6368]">
            {activePage} / {pageCount} 페이지
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-[#d8dce3] px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              disabled={activePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-lg border border-[#d8dce3] px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
            >
              다음
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(1))))}
              className="rounded-lg border border-[#d8dce3] px-2.5 py-1.5 text-sm font-semibold"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2, Number((s + 0.1).toFixed(1))))}
              className="rounded-lg border border-[#d8dce3] px-2.5 py-1.5 text-sm font-semibold"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilledPage({
  pdfDoc,
  pageNumber,
  viewerWidth,
  fitHeight,
  overlays,
}: {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  viewerWidth: number;
  fitHeight: number | null;
  overlays: InspectionOverlay[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null =
      null;
    setRendered(false);

    async function renderPage(attempt = 0) {
      const canvas = canvasRef.current;
      if (!canvas) {
        if (!cancelled && attempt < 10) {
          requestAnimationFrame(() => void renderPage(attempt + 1));
        }
        return;
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        let fitScale = viewerWidth / base.width;
        if (fitHeight != null && fitHeight > 0) {
          fitScale = Math.min(fitScale, fitHeight / base.height);
        }
        fitScale = Math.max(fitScale, 0.2);

        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
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

        renderTask = page.render({ canvas, viewport });
        await renderTask.promise;

        if (!cancelled) {
          setSize({ width: displayWidth, height: displayHeight });
          setRendered(true);
        }
      } catch {
        if (!cancelled && attempt < 3) {
          window.setTimeout(() => void renderPage(attempt + 1), 80);
        }
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        // ignore
      }
    };
  }, [pdfDoc, pageNumber, viewerWidth, fitHeight]);

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md bg-white shadow-sm"
      style={
        size.width
          ? { width: size.width, height: size.height }
          : { width: viewerWidth, minHeight: 120 }
      }
    >
      <canvas ref={canvasRef} className="pointer-events-none block" />
      {rendered &&
        overlays.map((mark) => (
          <OverlayMarkView key={mark.id} mark={mark} />
        ))}
    </div>
  );
}

function OverlayMarkView({ mark }: { mark: InspectionOverlay }) {
  const { region, kind, text } = mark;
  const style = {
    left: `${region.x}%`,
    top: `${region.y}%`,
    width: `${Math.max(region.width, 1.2)}%`,
    height: `${Math.max(region.height, 1)}%`,
  } as const;

  if (kind === 'circle') {
    return (
      <div
        className="pointer-events-none absolute flex items-center justify-center"
        style={style}
      >
        <span className="block size-[min(100%,2.4rem)] rounded-full border-[2.5px] border-[#2563eb]" />
      </div>
    );
  }

  if (kind === 'check') {
    return (
      <div
        className="pointer-events-none absolute flex items-center justify-center"
        style={style}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[85%] w-[85%] text-[#2563eb]"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12.5 10 17.5 19 6.5" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute flex items-center overflow-visible"
      style={style}
    >
      <span className="whitespace-nowrap text-[clamp(9px,1.6vw,14px)] font-bold leading-none text-[#2563eb]">
        {text}
      </span>
    </div>
  );
}

function Fallback({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
      <FileText className="size-8 text-[#9aa0a6]" />
      <p className="text-sm text-[#8b8f96]">{label}</p>
    </div>
  );
}
