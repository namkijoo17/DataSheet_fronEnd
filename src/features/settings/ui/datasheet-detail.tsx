'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { ApiError } from '@/shared/api/client';
import { cn } from '@/shared/lib/utils';

import {
  createDatasheetItem,
  deleteDatasheet,
  deleteDatasheetItem,
  reorderDatasheetItems,
  updateDatasheetItem,
  updateDatasheetItemPosition,
  updateDatasheetSlotPosition,
} from '../api/datasheet-api';
import { normalizeDatasheetItems } from '../lib/normalize-items';
import { formatRevision } from '../lib/format';
import {
  fromPdfRegion,
  getItemPdfRegion,
  getSlotPdfRegion,
} from '../lib/pdf-region';
import type {
  DatasheetFieldSelection,
  DatasheetItemUpsert,
  DatasheetPdfRegion,
} from '../model/datasheet-types';
import {
  datasheetDetailQueryKey,
  useDatasheetDetail,
} from '../model/use-datasheet-detail';
import { datasheetsQueryKey } from '../model/use-datasheets';
import { DatasheetDetailHeader } from './datasheet-detail-header';
import { DatasheetFieldList } from './datasheet-field-list';
import {
  DatasheetItemEditor,
  type DatasheetItemEditorHandle,
} from './datasheet-item-editor';
import { DatasheetPdfViewer } from './datasheet-pdf-viewer';

type DatasheetDetailProps = {
  datasheetId: number;
};

export function DatasheetDetail({ datasheetId }: DatasheetDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const editorRef = useRef<DatasheetItemEditorHandle>(null);
  const { data, isPending, isError, error } = useDatasheetDetail(datasheetId);
  const [selection, setSelection] = useState<DatasheetFieldSelection | null>(
    null,
  );
  const [editMode, setEditMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rightPanel, setRightPanel] = useState<'list' | 'editor'>('list');
  const [draftRegion, setDraftRegion] = useState<DatasheetPdfRegion | null>(
    null,
  );
  const [draftLabel, setDraftLabel] = useState<string | null>(null);

  const items = useMemo(
    () => (data ? normalizeDatasheetItems(data.items) : []),
    [data],
  );

  const selectedItem = useMemo(() => {
    if (!selection) return null;
    return items.find((entry) => entry.id === selection.itemId) ?? null;
  }, [items, selection]);

  const highlight = useMemo(() => {
    if (editMode && rightPanel === 'editor' && draftRegion) {
      return { label: draftLabel, region: draftRegion };
    }

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
  }, [
    data,
    items,
    selection,
    editMode,
    rightPanel,
    draftRegion,
    draftLabel,
  ]);

  const handleDraftRegionChange = useCallback(
    (region: DatasheetPdfRegion | null, label: string | null) => {
      setDraftRegion(region);
      setDraftLabel(label);
    },
    [],
  );

  const refreshDetail = async () => {
    await queryClient.refetchQueries({
      queryKey: datasheetDetailQueryKey(datasheetId),
    });
  };

  const handleDeleteSheet = async () => {
    if (
      !window.confirm(
        '이 데이터시트와 PDF 파일을 삭제할까요? 항목·좌표도 함께 삭제됩니다.',
      )
    ) {
      return;
    }
    try {
      setDeleting(true);
      await deleteDatasheet(datasheetId);
      await queryClient.invalidateQueries({ queryKey: datasheetsQueryKey });
      router.replace('/settings');
    } catch (err) {
      window.alert(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : '삭제에 실패했습니다.',
      );
      setDeleting(false);
    }
  };

  const handleRegionDrawn = async (region: DatasheetPdfRegion) => {
    if (!data) return;

    const pageWidth = data.pageWidth && data.pageWidth > 0 ? data.pageWidth : 595.44;
    const pageHeight =
      data.pageHeight && data.pageHeight > 0 ? data.pageHeight : 841.92;

    const position = fromPdfRegion(region, pageWidth, pageHeight);
    if (!position) {
      window.alert('좌표 변환에 실패했습니다.');
      return;
    }

    // 추가/속성 편집 중이면 API 호출 없이 폼에 반영 후 저장
    if (editMode && rightPanel === 'editor' && (creating || selectedItem)) {
      editorRef.current?.applyPosition(position);
      return;
    }

    if (!selection) return;

    try {
      setSaving(true);
      if (selection.kind === 'slot') {
        await updateDatasheetSlotPosition(
          datasheetId,
          selection.itemId,
          selection.slotId,
          position,
        );
      } else {
        await updateDatasheetItemPosition(
          datasheetId,
          selection.itemId,
          position,
        );
      }
      await refreshDetail();
    } catch (err) {
      window.alert(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : '좌표 저장에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItem = async (body: DatasheetItemUpsert) => {
    setSaving(true);
    try {
      if (creating) {
        const created = await createDatasheetItem(datasheetId, body);
        await refreshDetail();
        setCreating(false);
        setDraftRegion(null);
        setDraftLabel(null);
        setSelection(
          created.array && created.slots?.[0]
            ? {
                kind: 'slot',
                itemId: created.id,
                slotId: created.slots[0].id,
              }
            : { kind: 'item', itemId: created.id },
        );
        setRightPanel('list');
      } else if (selection) {
        const previousSlotIndex =
          selection.kind === 'slot'
            ? selectedItem?.slots?.find((s) => s.id === selection.slotId)
                ?.slotIndex
            : null;
        const updated = await updateDatasheetItem(
          datasheetId,
          selection.itemId,
          body,
        );
        await refreshDetail();
        setDraftRegion(null);
        setDraftLabel(null);
        if (updated.array && updated.slots && updated.slots.length > 0) {
          const matched =
            previousSlotIndex == null
              ? updated.slots[0]
              : (updated.slots.find((s) => s.slotIndex === previousSlotIndex) ??
                updated.slots[0]);
          setSelection({
            kind: 'slot',
            itemId: updated.id,
            slotId: matched.id,
          });
        } else {
          setSelection({ kind: 'item', itemId: updated.id });
        }
        setRightPanel('list');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveItem = async (
    itemId: number,
    direction: 'up' | 'down',
  ) => {
    const index = items.findIndex((entry) => entry.id === itemId);
    if (index < 0) return;

    const next = [...items];
    if (direction === 'up') {
      if (index === 0) return;
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
    } else {
      if (index >= next.length - 1) return;
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
    }

    try {
      setReordering(true);
      await reorderDatasheetItems(
        datasheetId,
        next.map((entry) => entry.id),
      );
      await refreshDetail();
    } catch (err) {
      window.alert(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : '순서 변경에 실패했습니다.',
      );
    } finally {
      setReordering(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selection) return;
    if (!window.confirm('이 항목을 삭제할까요?')) return;
    setSaving(true);
    try {
      await deleteDatasheetItem(datasheetId, selection.itemId);
      await refreshDetail();
      setSelection(null);
      setCreating(false);
      setDraftRegion(null);
      setDraftLabel(null);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : '삭제에 실패했습니다.',
      );
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

  const editorOpen = editMode && rightPanel === 'editor';
  const canDrawOnPdf =
    editMode &&
    (editorOpen
      ? creating || Boolean(selectedItem)
      : Boolean(selection));

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {deleting && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2
            className="size-10 animate-spin text-[#3c3c3c]"
            aria-hidden
          />
          <p className="text-sm font-semibold text-[#1f1f1f]">삭제 중...</p>
        </div>
      )}

      <div className="shrink-0">
        <DatasheetDetailHeader
          title={data.name}
          subtitle={`${formatRevision(data.revision)} · 항목 ${items.length}개`}
          editMode={editMode}
          deleting={deleting}
          onDelete={() => void handleDeleteSheet()}
          onToggleEdit={() => {
            setEditMode((prev) => !prev);
            setCreating(false);
            setRightPanel('list');
            setDraftRegion(null);
            setDraftLabel(null);
          }}
          onAddItem={() => {
            setCreating(true);
            setSelection(null);
            setRightPanel('editor');
            setDraftRegion(null);
            setDraftLabel(null);
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3 md:px-5 md:py-4">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
          <div className="min-h-0 overflow-hidden max-md:h-[42svh] md:h-full">
            <DatasheetPdfViewer
              datasheetId={data.id}
              selectedLabel={highlight?.label}
              selectedRegion={highlight?.region ?? null}
              editMode={editMode}
              canDraw={canDrawOnPdf}
              onRegionDrawn={(region) => void handleRegionDrawn(region)}
            />
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden max-md:h-[42svh] md:h-full">
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
                    setDraftRegion(null);
                    setDraftLabel(null);
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

            <div className="min-h-0 flex-1 overflow-hidden">
              {!editMode || rightPanel === 'list' ? (
                <DatasheetFieldList
                  items={items}
                  selection={selection}
                  editMode={editMode}
                  reordering={reordering}
                  onMove={(itemId, direction) =>
                    void handleMoveItem(itemId, direction)
                  }
                  onSelect={(next) => {
                    setCreating(false);
                    setSelection(next);
                    setDraftRegion(null);
                    setDraftLabel(null);
                  }}
                />
              ) : (
                <DatasheetItemEditor
                  ref={editorRef}
                  item={creating ? null : selectedItem}
                  siblingItems={items}
                  creating={creating}
                  saving={saving}
                  pageWidth={data.pageWidth}
                  pageHeight={data.pageHeight}
                  onDraftRegionChange={handleDraftRegionChange}
                  onCancelCreate={() => {
                    setCreating(false);
                    setDraftRegion(null);
                    setDraftLabel(null);
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
