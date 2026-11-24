'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { Button } from '@/shared/ui/button';

type DatasheetDetailHeaderProps = {
  title: string;
  subtitle?: string;
  editMode?: boolean;
  deleting?: boolean;
  onToggleEdit?: () => void;
  onAddItem?: () => void;
  onDelete?: () => void;
};

export function DatasheetDetailHeader({
  title,
  subtitle,
  editMode = false,
  deleting = false,
  onToggleEdit,
  onAddItem,
  onDelete,
}: DatasheetDetailHeaderProps) {
  return (
    <header className="z-40 border-b border-[#e8eaed] bg-white">
      <div className="flex h-14 items-center gap-2 px-3 md:h-16 md:gap-3 md:px-4">
        <Link
          href="/settings"
          aria-label="설정으로 돌아가기"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-[#1f1f1f] transition-colors hover:bg-[#f5f6f7]"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-[#1f1f1f] md:text-lg">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-[#8b8f96] md:text-sm">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onDelete && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? '삭제 중...' : '삭제'}
            </Button>
          )}
          {onToggleEdit && (
            <>
              <Button
                type="button"
                size="sm"
                variant={editMode ? 'default' : 'outline'}
                onClick={onToggleEdit}
                disabled={deleting}
              >
                {editMode ? '편집 종료' : '편집'}
              </Button>
              {editMode && onAddItem && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onAddItem}
                  disabled={deleting}
                >
                  추가
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
