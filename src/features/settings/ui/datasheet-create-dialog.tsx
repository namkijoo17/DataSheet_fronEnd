'use client';

import { useState } from 'react';
import { getDocument } from 'pdfjs-dist';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/client';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

import { createDatasheet } from '../api/datasheet-api';
import { ensurePdfjsWorker } from '../lib/pdfjs';
import { datasheetsQueryKey } from '../model/use-datasheets';

type DatasheetCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

async function readPdfPageSize(file: File) {
  ensurePdfjsWorker();
  const data = await file.arrayBuffer();
  const loadingTask = getDocument({ data });
  const doc = await loadingTask.promise;
  try {
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    return {
      pageWidth: Math.round(viewport.width * 100) / 100,
      pageHeight: Math.round(viewport.height * 100) / 100,
    };
  } finally {
    await doc.cleanup();
    await loadingTask.destroy();
  }
}

export function DatasheetCreateDialog({
  open,
  onOpenChange,
}: DatasheetCreateDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setFile(null);
    setError(null);
    setSaving(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('이름을 입력하세요.');
      return;
    }
    if (!file) {
      setError('PDF 파일을 선택하세요.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('PDF 파일만 업로드할 수 있습니다.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      let pageWidth: number | undefined;
      let pageHeight: number | undefined;
      try {
        const size = await readPdfPageSize(file);
        pageWidth = size.pageWidth;
        pageHeight = size.pageHeight;
      } catch {
        // 페이지 크기 실패 시 서버 기본값(A4) 사용
      }

      const created = await createDatasheet({
        name: name.trim(),
        pageWidth,
        pageHeight,
        file,
      });

      await queryClient.invalidateQueries({ queryKey: datasheetsQueryKey });
      handleOpenChange(false);
      router.push(`/settings/datasheets/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : '데이터시트 추가에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!saving}>
        <DialogHeader>
          <DialogTitle>데이터시트 추가</DialogTitle>
          <DialogDescription>
            PDF와 이름만 입력하면 시트가 생성됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="datasheet-name">이름</Label>
            <Input
              id="datasheet-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: MU-100C 단품 최종검사데이터시트"
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="datasheet-file">PDF 파일</Label>
            <Input
              id="datasheet-file"
              type="file"
              accept="application/pdf,.pdf"
              disabled={saving}
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                setFile(next);
                if (next) {
                  setName(next.name.replace(/\.pdf$/i, ''));
                }
              }}
              className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-[#eceef1] file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            {file && (
              <p className="truncate text-xs text-[#8b8f96]">{file.name}</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
          >
            {saving ? '추가 중...' : '추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
