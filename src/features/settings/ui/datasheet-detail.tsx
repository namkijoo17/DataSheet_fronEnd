'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/client';
import { cn } from '@/shared/lib/utils';

import {
  createDatasheetItem,
  deleteDatasheetItem,
  updateDatasheetItem,
  updateDatasheetItemPosition,
  updateDatasheetSlotPosition,
} from '../api/datasheet-api';
import { normalizeDatasheetItems } from '../lib/normalize-items';
import { formatRevision } from '../lib/format';
import { fromPdfRegion, getItemPdfRegion, getSlotPdfRegion } from '../lib/pdf-region';
import type {
  DatasheetFieldSelection,
  DatasheetItemUpsert,
  DatasheetPdfRegion,
} from '../model/datasheet-types';
import { datasheetDetailQueryKey, useDatasheetDetail } from '../model/use-datasheet-detail';
import { DatasheetDetailHeader } from './datasheet-detail-header';
import { DatasheetFieldList } from './datasheet-field-list';
import { DatasheetItemEditor } from './datasheet-item-editor';
import { DatasheetPdfViewer } from './datasheet-pdf-viewer';

type DatasheetDetailProps = {
  datasheetId: number;
};

export function DatasheetDetail({ datasheetId }: DatasheetDetailProps) {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useDatasheetDetail(datasheetId);
  const [selection, setSelection] = useState<DatasheetFieldSelection | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** 편집 모드 우측: 목록 | 속성 (한 칸만 써서 PDF 공간 확보) */
  const [rightPanel, setRightPanel] = useState<'list' | 'editor'>('list');

  const items = useMemo(() => (data ? normalizeDatasheetItems(data.items) : []), [data]);

  const selectedItem = useMemo(() => {
    if (!selection) return null;
    return items.find((entry) => entry.id === selection.itemId) ?? null;
  }, [items, selection]);

  const highlight = useMemo(() => {
    if (!data || !selection) return null;

    if (selection.kind === 'item') {
      const item = items.find((entry) => entry.id === selection.itemId);
      if (!item) return null;
      return {
        label: item.label,
        region: getItemPdfRegion(item, data),
      };
    }

    const item = items.find((entry) => entry.id === selection.itemId);
    const slot = item?.slots?.find((entry) => entry.id === selection.slotId);
    if (!item || !slot) return null;

    return {
      label: `${item.label} · ${slot.label}`,
      region: getSlotPdfRegion(slot, data),
    };
  }, [data, items, selection]);

  const refreshDetail = async () => {
    await queryClient.invalidateQueries({
      queryKey: datasheetDetailQueryKey(datasheetId),
    });
  };

  const handleRegionDrawn = async (region: DatasheetPdfRegion) => {
    if (!data || !selection) {
      setNotice('항목(또는 슬롯)을 먼저 선택하세요.');
      return;
    }

    const position = fromPdfRegion(region, data.pageWidth, data.pageHeight);
    if (!position) {
      setNotice('페이지 크기 정보가 없어 좌표를 저장할 수 없습니다.');
      return;
    }

    try {
      setSaving(true);
      setNotice(null);
      if (selection.kind === 'slot') {
        await updateDatasheetSlotPosition(
          datasheetId,
          selection.itemId,
          selection.slotId,
          position,
        );
      } else {
        await updateDatasheetItemPosition(datasheetId, selection.itemId, position);
      }
      await refreshDetail();
      setNotice('좌표를 저장했습니다.');
    } catch (err) {
      setNotice(
        err instanceof ApiError || err instanceof Error ? err.message : '좌표 저장에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItem = async (body: DatasheetItemUpsert) => {
    setSaving(true);
    setNotice(null);
    try {
      if (creating) {
        const created = await createDatasheetItem(datasheetId, body);
        await refreshDetail();
        setCreating(false);
        setSelection(
          created.array && created.slots?.[0]
            ? {
                kind: 'slot',
                itemId: created.id,
                slotId: created.slots[0].id,
              }
            : { kind: 'item', itemId: created.id },
        );
        setNotice('항목을 추가했습니다. PDF에서 좌표를 드래그하세요.');
      } else if (selection) {
        const previousSlotIndex =
          selection.kind === 'slot'
            ? selectedItem?.slots?.find((s) => s.id === selection.slotId)?.slotIndex
            : null;
        const updated = await updateDatasheetItem(datasheetId, selection.itemId, body);
        await refreshDetail();
        if (updated.array && updated.slots && updated.slots.length > 0) {
          const matched =
            previousSlotIndex == null
              ? updated.slots[0]
              : (updated.slots.find((s) => s.slotIndex === previousSlotIndex) ?? updated.slots[0]);
          setSelection({
            kind: 'slot',
            itemId: updated.id,
            slotId: matched.id,
          });
        } else {
          setSelection({ kind: 'item', itemId: updated.id });
        }
        setNotice('항목을 저장했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selection) return;
    if (!window.confirm('이 항목을 삭제할까요?')) return;
    setSaving(true);
    setNotice(null);
    try {
      await deleteDatasheetItem(datasheetId, selection.itemId);
      await refreshDetail();
      setSelection(null);
      setCreating(false);
      setNotice('항목을 삭제했습니다.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex flex-1 flex-col">
        <DatasheetDetailHeader title="데이터시트" subtitle="불러오는 중..." />
        <p className="px-5 py-8 text-center text-sm text-[#8b8f96]">
          데이터시트 정보를 불러오는 중...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 flex-col">
        <DatasheetDetailHeader title="데이터시트" subtitle="불러오기 실패" />
        <p className="px-5 py-8 text-center text-sm text-[#8b8f96]">
          {error instanceof Error
            ? error.message
            : '데이터시트 정보를 불러오지 못했습니다.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DatasheetDetailHeader
        title={data.name}
        subtitle={`${data.code} · ${formatRevision(data.revision)} · 항목 ${items.length}개`}
        editMode={editMode}
        onToggleEdit={() => {
          setEditMode((prev) => !prev);
          setCreating(false);
          setRightPanel('list');
          setNotice(null);
        }}
        onAddItem={() => {
          setCreating(true);
          setSelection(null);
          setRightPanel('editor');
          setNotice(null);
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3 md:px-5 md:py-4">
        {notice && (
          <p className="shrink-0 rounded-xl bg-[#f5f6f7] px-3 py-2 text-sm text-[#5f6368]">
            {notice}
          </p>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] md:items-stretch">
          <div className="h-[42svh] min-h-0 md:h-auto">
            <DatasheetPdfViewer
              datasheetId={data.id}
              selectedLabel={highlight?.label}
              selectedRegion={highlight?.region ?? null}
              editMode={editMode && !creating}
              canDraw={editMode && Boolean(selection) && !creating}
              onRegionDrawn={(region) => void handleRegionDrawn(region)}
              onDrawBlocked={() =>
                setNotice('항목(또는 슬롯)을 먼저 선택하세요.')
              }
            />
          </div>

          <div className="flex h-[42svh] min-h-0 flex-col md:h-auto">
            {editMode && (
              <div
                className="mb-2 flex shrink-0 rounded-xl border border-[#d8dce3] bg-white p-1"
                role="tablist"
                aria-label="우측 패널"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={rightPanel === 'list'}
                  onClick={() => {
                    setRightPanel('list');
                    setCreating(false);
                  }}
                  className={cn(
                    'h-9 flex-1 rounded-lg text-sm font-semibold transition-colors',
                    rightPanel === 'list'
                      ? 'bg-[#1f1f1f] text-white'
                      : 'text-[#5f6368] hover:bg-[#f5f6f7]',
                  )}
                >
                  목록
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={rightPanel === 'editor'}
                  onClick={() => setRightPanel('editor')}
                  className={cn(
                    'h-9 flex-1 rounded-lg text-sm font-semibold transition-colors',
                    rightPanel === 'editor'
                      ? 'bg-[#1f1f1f] text-white'
                      : 'text-[#5f6368] hover:bg-[#f5f6f7]',
                  )}
                >
                  속성
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1">
              {!editMode || rightPanel === 'list' ? (
                <DatasheetFieldList
                  items={items}
                  selection={selection}
                  onSelect={(next) => {
                    setCreating(false);
                    setSelection(next);
                    setNotice(null);
                  }}
                />
              ) : (
                <DatasheetItemEditor
                  item={creating ? null : selectedItem}
                  creating={creating}
                  saving={saving}
                  onCancelCreate={() => {
                    setCreating(false);
                    setRightPanel('list');
                  }}
                  onSave={handleSaveItem}
                  onDelete={handleDeleteItem}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
