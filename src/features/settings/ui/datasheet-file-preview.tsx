'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';

import { fetchDatasheetFileBlob } from '../api/datasheet-api';

type DatasheetFilePreviewProps = {
  datasheetId: number;
  title: string;
};

export function DatasheetFilePreview({
  datasheetId,
  title,
}: DatasheetFilePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { data: blob, isPending, isError } = useQuery({
    queryKey: ['datasheet-file-preview', datasheetId],
    queryFn: () => fetchDatasheetFileBlob(datasheetId),
    enabled: isVisible,
    staleTime: 5 * 60_000,
  });

  const previewUrl = useMemo(() => {
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, [blob]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const showLoading = !isVisible || isPending || (!previewUrl && !isError);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[3/4] overflow-hidden rounded-t-lg bg-[#eceef1]"
    >
      {previewUrl && !isError && (
        <iframe
          title={`${title} 미리보기`}
          src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          className="pointer-events-none absolute inset-0 h-[140%] w-full origin-top scale-[1.02] border-0 bg-white"
        />
      )}

      {showLoading && <PreviewFallback label="준비 중..." />}
      {isError && <PreviewFallback label="불러오기 실패" />}
    </div>
  );
}

function PreviewFallback({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
      <FileText className="size-5 text-[#9aa0a6]" aria-hidden />
      <p className="text-[10px] text-[#8b8f96]">{label}</p>
    </div>
  );
}
