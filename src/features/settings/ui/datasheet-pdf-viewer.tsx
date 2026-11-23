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
};

export function DatasheetPdfViewer({
  datasheetId,
  selectedLabel,
  selectedRegion,
}: DatasheetPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pageCount, setPageCount] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;
    let doc: PDFDocumentProxy | null = null;

    setStatus('loading');
    setPdfDoc(null);
    setPageCount(0);
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
      // pdf.js 6: PDFDocumentProxy.destroy 없음 → cleanup + loadingTask.destroy
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
    pageNode?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedRegion]);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[420px] overflow-auto rounded-2xl border border-[#e8eaed] bg-[#eceef1]"
    >
      {status === 'loading' && <ViewerFallback label="문서를 불러오는 중..." />}
      {status === 'error' && (
        <ViewerFallback label="문서를 불러오지 못했습니다." />
      )}

      {status === 'ready' && pdfDoc && (
        <div className="space-y-3 p-3">
          {Array.from({ length: pageCount }, (_, index) => {
            const pageNumber = index + 1;
            return (
              <PdfPage
                key={pageNumber}
                pdfDoc={pdfDoc}
                pageNumber={pageNumber}
                selectedLabel={
                  selectedRegion?.page === pageNumber ? selectedLabel : null
                }
                selectedRegion={
                  selectedRegion?.page === pageNumber ? selectedRegion : null
                }
                pageRef={(node) => {
                  if (node) pageRefs.current.set(pageNumber, node);
                  else pageRefs.current.delete(pageNumber);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PdfPage({
  pdfDoc,
  pageNumber,
  selectedLabel,
  selectedRegion,
  pageRef,
}: {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  selectedLabel?: string | null;
  selectedRegion: DatasheetPdfRegion | null;
  pageRef: (node: HTMLDivElement | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const containerWidth =
        canvas.parentElement?.clientWidth || baseViewport.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const scale = (containerWidth / baseViewport.width) * dpr;
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
      context.clearRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvas,
        viewport,
      }).promise;

      if (!cancelled) setRendered(true);
    }

    setRendered(false);
    void renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div
      ref={pageRef}
      className="relative overflow-hidden rounded-xl bg-white shadow-sm"
    >
      <canvas ref={canvasRef} className="block w-full" />
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
