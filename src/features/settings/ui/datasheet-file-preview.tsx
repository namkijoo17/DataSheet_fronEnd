'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';

import { fetchDatasheetFileBlob } from '../api/datasheet-api';
import { isImageFile, isPdfFile } from '../lib/file-type';
import type { DatasheetFile } from '../model/datasheet-types';

type DatasheetFilePreviewProps = {
  file: DatasheetFile;
};

export function DatasheetFilePreview({ file }: DatasheetFilePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    setStatus('loading');

    fetchDatasheetFileBlob(file.fileName)
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
  }, [file.fileName, isVisible]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[3/4] overflow-hidden rounded-t-xl bg-[#eceef1]"
    >
      {status === 'ready' && previewUrl && isPdfFile(file) && (
        <iframe
          title={`${file.fileName} 미리보기`}
          src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          className="pointer-events-none absolute inset-0 h-[140%] w-full origin-top scale-[1.02] border-0 bg-white"
        />
      )}

      {status === 'ready' && previewUrl && isImageFile(file) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={file.fileName}
          className="absolute inset-0 h-full w-full object-contain bg-white"
        />
      )}

      {status === 'ready' &&
        previewUrl &&
        !isPdfFile(file) &&
        !isImageFile(file) && <PreviewFallback label="미리보기 미지원" />}

      {(status === 'idle' || status === 'loading') && (
        <PreviewFallback label="미리보기 준비 중..." />
      )}

      {status === 'error' && <PreviewFallback label="미리보기를 불러오지 못했습니다" />}
    </div>
  );
}

function PreviewFallback({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
      <FileText className="size-8 text-[#9aa0a6]" aria-hidden />
      <p className="text-xs text-[#8b8f96]">{label}</p>
    </div>
  );
}
