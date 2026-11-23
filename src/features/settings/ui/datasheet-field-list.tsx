'use client';

import { cn } from '@/shared/lib/utils';

import type { DatasheetField } from '../model/field-types';

type DatasheetFieldListProps = {
  fields: DatasheetField[];
  selectedFieldId: string | null;
  onSelect: (fieldId: string) => void;
};

export function DatasheetFieldList({
  fields,
  selectedFieldId,
  onSelect,
}: DatasheetFieldListProps) {
  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#e8eaed] bg-white">
      <div className="border-b border-[#eceef1] px-4 py-3">
        <h2 className="text-base font-bold text-[#1f1f1f]">입력 가능 항목</h2>
        <p className="mt-1 text-sm text-[#8b8f96]">
          항목을 누르면 PDF에서 해당 위치가 표시됩니다.
        </p>
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {fields.map((field, index) => {
          const selected = field.id === selectedFieldId;

          return (
            <li key={field.id}>
              <button
                type="button"
                onClick={() => onSelect(field.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                  selected
                    ? 'border-[#1f1f1f] bg-[#f5f6f7]'
                    : 'border-transparent hover:bg-[#f5f6f7]',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                    selected
                      ? 'bg-[#1f1f1f] text-white'
                      : 'bg-[#eceef1] text-[#5f6368]',
                  )}
                >
                  {index + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#1f1f1f]">
                    {field.label}
                  </span>
                  <span className="mt-1 block text-sm text-[#5f6368]">
                    범위 {field.range}
                    {field.unit ? ` ${field.unit}` : ''}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#9aa0a6]">
                    PDF {field.pdfRegion.page}페이지
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
