'use client';

import { cn } from '@/shared/lib/utils';

import { formatItemRange } from '../lib/format';
import type {
  DatasheetFieldSelection,
  DatasheetItem,
} from '../model/datasheet-types';

type DatasheetFieldListProps = {
  items: DatasheetItem[];
  selection: DatasheetFieldSelection | null;
  onSelect: (selection: DatasheetFieldSelection) => void;
};

function hasSlots(item: DatasheetItem) {
  return Boolean(item.slots && item.slots.length > 0);
}

export function DatasheetFieldList({
  items,
  selection,
  onSelect,
}: DatasheetFieldListProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#e8eaed] bg-white">
      <div className="shrink-0 border-b border-[#eceef1] px-4 py-3">
        <h2 className="text-base font-bold text-[#1f1f1f]">입력 가능 항목</h2>
        <p className="mt-1 text-sm text-[#8b8f96]">
          항목을 누르면 PDF에서 해당 위치가 표시됩니다.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[#8b8f96]">
          등록된 항목이 없습니다.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3">
          {items.map((item) => {
            if (hasSlots(item)) {
              return (
                <li key={item.id} className="space-y-1.5">
                  <div className="px-3 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#eceef1] text-xs font-bold text-[#5f6368]">
                        {item.itemNo}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1f1f1f]">
                          {item.label}
                        </p>
                        <p className="text-xs text-[#8b8f96]">
                          {item.groupName ? `${item.groupName} · ` : ''}
                          {formatItemRange(item)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-1 pl-4">
                    {item.slots!.map((slot) => {
                      const selected =
                        selection?.kind === 'slot' &&
                        selection.itemId === item.id &&
                        selection.slotId === slot.id;

                      return (
                        <li key={slot.id}>
                          <button
                            type="button"
                            onClick={() =>
                              onSelect({
                                kind: 'slot',
                                itemId: item.id,
                                slotId: slot.id,
                              })
                            }
                            className={cn(
                              'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                              selected
                                ? 'border-[#1f1f1f] bg-[#f5f6f7]'
                                : 'border-transparent hover:bg-[#f5f6f7]',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold',
                                selected
                                  ? 'bg-[#1f1f1f] text-white'
                                  : 'bg-[#eceef1] text-[#5f6368]',
                              )}
                            >
                              {slot.slotIndex + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-[#1f1f1f]">
                                {slot.label}
                              </span>
                              <span className="mt-0.5 block text-xs text-[#9aa0a6]">
                                PDF {slot.pdfPage}페이지 · 개별 위치
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            }

            const selected =
              selection?.kind === 'item' && selection.itemId === item.id;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect({ kind: 'item', itemId: item.id })}
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
                    {item.itemNo}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[#1f1f1f]">
                        {item.label}
                      </span>
                      {item.inspectionItem ? (
                        <span className="shrink-0 rounded bg-[#eceef1] px-1.5 py-0.5 text-[10px] font-medium text-[#5f6368]">
                          검사
                        </span>
                      ) : (
                        <span className="shrink-0 rounded bg-[#f5f6f7] px-1.5 py-0.5 text-[10px] font-medium text-[#8b8f96]">
                          정보
                        </span>
                      )}
                    </span>
                    {item.groupName && (
                      <span className="mt-0.5 block text-xs text-[#9aa0a6]">
                        {item.groupName}
                      </span>
                    )}
                    <span className="mt-1 block text-sm text-[#5f6368]">
                      범위 {formatItemRange(item)}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#9aa0a6]">
                      PDF {item.pdfPage}페이지
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
