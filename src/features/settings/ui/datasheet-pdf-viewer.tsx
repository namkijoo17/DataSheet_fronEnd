'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist';

import { fetchDatasheetFileBlob } from '../api/datasheet-api';
import { ensurePdfjsWorker } from '../lib/pdfjs';
import { isImageFile, isPdfFile } from '../lib/file-type';
import type { DatasheetField } from '../model/field-types';

type DatasheetPdfViewerProps = {
  fileName: string;
  contentType?: string;
  selectedField: DatasheetField | null;
};

export function DatasheetPdfViewer({
  fileName,
  contentType = '',
  selectedField,
}: DatasheetPdfViewerProps) {
  const file = { fileName, contentType, sizeBytes: 0, lastModified: '' };
  const isPdf = isPdfFile(file);
  const isImage = isImageFile(file);

  if (isPdf) {
    return (
      <PdfPagesViewer fileName={fileName} selectedField={selectedField} />
    );
  }

  if (isImage) {
    return <ImageViewer fileName={fileName} selectedField={selectedField} />;
  }

  return (
    <div className="relative flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-[#e8eaed] bg-white">
      <ViewerFallback label="이 파일 형식은 위치 표시를 지원하지 않습니다." />
    </div>
  );
}

function PdfPagesViewer({
  fileName,
  selectedField,
}: {
  fileName: string;
  selectedField: DatasheetField | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pageCount, setPageCount] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;

    setStatus('loading');
    setPdfDoc(null);
    setPageCount(0);
    ensurePdfjsWorker();

    fetchDatasheetFileBlob(fileName)
      .then(async (blob) => {
        const data = await blob.arrayBuffer();
        const loadingTask = getDocument({ data });
        doc = await loadingTask.promise;
        if (cancelled) {
          await doc.destroy();
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
      void doc?.destroy();
    };
  }, [fileName]);

  useEffect(() => {
    if (!selectedField) return;
    const pageNode = pageRefs.current.get(selectedField.pdfRegion.page);
    pageNode?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedField]);

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
                selectedField={
                  selectedField?.pdfRegion.page === pageNumber
                    ? selectedField
                    : null
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
  selectedField,
  pageRef,
}: {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  selectedField: DatasheetField | null;
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
      // Retina 등 고해상도 디스플레이에서 선명하게 그리기 위해 DPR 반영
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
      {rendered && selectedField && (
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-[#2563eb] bg-[#2563eb]/15 transition-all duration-300"
          style={{
            left: `${selectedField.pdfRegion.x}%`,
            top: `${selectedField.pdfRegion.y}%`,
            width: `${selectedField.pdfRegion.width}%`,
            height: `${selectedField.pdfRegion.height}%`,
          }}
        >
          <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-[#2563eb] px-2 py-0.5 text-[11px] font-semibold text-white">
            {selectedField.label}
          </span>
        </div>
      )}
    </div>
  );
}

function ImageViewer({
  fileName,
  selectedField,
}: {
  fileName: string;
  selectedField: DatasheetField | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setStatus('loading');
    fetchDatasheetFileBlob(fileName)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPreviewUrl(objectUrl);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileName]);

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-[#e8eaed] bg-white">
      {status === 'ready' && previewUrl && (
        <div className="relative h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={fileName}
            className="h-full w-full object-contain"
          />
          {selectedField && (
            <div
              className="pointer-events-none absolute rounded-sm border-2 border-[#1f1f1f] bg-[#1f1f1f]/20 transition-all duration-300"
              style={{
                left: `${selectedField.pdfRegion.x}%`,
                top: `${selectedField.pdfRegion.y}%`,
                width: `${selectedField.pdfRegion.width}%`,
                height: `${selectedField.pdfRegion.height}%`,
              }}
            />
          )}
        </div>
      )}
      {status === 'loading' && <ViewerFallback label="이미지를 불러오는 중..." />}
      {status === 'error' && (
        <ViewerFallback label="이미지를 불러오지 못했습니다." />
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
