'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

import type {
  DatasheetInputType,
  DatasheetItem,
  DatasheetItemSlotUpsert,
  DatasheetItemUpsert,
} from '../model/datasheet-types';

const GROUP_OPTIONS = ['기본정보', '검사 항목'] as const;
type GroupOption = (typeof GROUP_OPTIONS)[number];

const INPUT_TYPE_OPTIONS: { value: DatasheetInputType; label: string }[] = [
  { value: 'TEXT', label: '일반 텍스트' },
  { value: 'NUMBER', label: '숫자' },
  { value: 'OK_NG', label: '합격/불합격' },
  { value: 'CHECK', label: '체크박스' },
  { value: 'ENGLISH', label: '영문만' },
  { value: 'MIXED', label: '영문/숫자' },
];

function resolveGroup(item: DatasheetItem): GroupOption {
  if (item.groupName === '기본정보' || item.groupName === '검사 항목') {
    return item.groupName;
  }
  return item.inspectionItem ? '검사 항목' : '기본정보';
}

type DatasheetItemEditorProps = {
  item: DatasheetItem | null;
  creating: boolean;
  saving: boolean;
  onCancelCreate: () => void;
  onSave: (body: DatasheetItemUpsert) => Promise<void>;
  onDelete: () => Promise<void>;
};

type FormState = {
  label: string;
  groupName: string;
  inputType: DatasheetInputType;
  inspectionItem: boolean;
  array: boolean;
  unit: string;
  decimalPlaces: string;
  minValue: string;
  maxValue: string;
  allowNegative: boolean;
  required: boolean;
  skippable: boolean;
  pdfPage: number;
  posX: number;
  posY: number;
  posWidth: number;
  posHeight: number;
  slots: DatasheetItemSlotUpsert[];
};

function emptyForm(): FormState {
  return {
    label: '',
    groupName: '기본정보',
    inputType: 'TEXT',
    inspectionItem: false,
    array: false,
    unit: '',
    decimalPlaces: '',
    minValue: '',
    maxValue: '',
    allowNegative: false,
    required: true,
    skippable: false,
    pdfPage: 1,
    posX: 40,
    posY: 780,
    posWidth: 40,
    posHeight: 18,
    slots: [],
  };
}

function fromItem(item: DatasheetItem): FormState {
  const groupName = resolveGroup(item);
  return {
    label: item.label,
    groupName,
    inputType: item.inputType,
    inspectionItem: groupName === '검사 항목',
    array: Boolean(item.array),
    unit: item.unit ?? '',
    decimalPlaces:
      item.decimalPlaces == null ? '' : String(item.decimalPlaces),
    minValue: item.minValue == null ? '' : String(item.minValue),
    maxValue: item.maxValue == null ? '' : String(item.maxValue),
    allowNegative: item.allowNegative,
    required: item.required,
    skippable: item.skippable,
    pdfPage: item.pdfPage,
    posX: item.posX,
    posY: item.posY,
    posWidth: item.posWidth ?? 40,
    posHeight: item.posHeight ?? 18,
    slots: (item.slots ?? []).map((slot) => ({
      id: slot.id,
      slotIndex: slot.slotIndex,
      label: slot.label,
      pdfPage: slot.pdfPage,
      posX: slot.posX,
      posY: slot.posY,
      posWidth: slot.posWidth,
      posHeight: slot.posHeight,
    })),
  };
}

function toNumberOrNull(value: string) {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function DatasheetItemEditor({
  item,
  creating,
  saving,
  onCancelCreate,
  onSave,
  onDelete,
}: DatasheetItemEditorProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (creating) {
      setForm(emptyForm());
      setError(null);
      return;
    }
    if (item) {
      setForm(fromItem(item));
      setError(null);
    }
  }, [creating, item]);

  if (!creating && !item) {
    return (
      <div className="rounded-2xl border border-[#e8eaed] bg-white px-4 py-8 text-center text-sm text-[#8b8f96]">
        편집할 항목을 선택하거나 새 항목을 추가하세요.
      </div>
    );
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      setError('라벨을 입력하세요.');
      return;
    }
    if (form.array && form.slots.length === 0) {
      setError('배열 항목에는 슬롯이 필요합니다.');
      return;
    }

    const body: DatasheetItemUpsert = {
      label: form.label.trim(),
      groupName: form.groupName.trim() || null,
      inputType: form.inputType,
      inspectionItem: form.inspectionItem,
      array: form.array,
      arraySize: form.array ? form.slots.length : null,
      unit: form.unit.trim() || null,
      decimalPlaces: toNumberOrNull(form.decimalPlaces),
      minValue: toNumberOrNull(form.minValue),
      maxValue: toNumberOrNull(form.maxValue),
      allowNegative: form.allowNegative,
      required: form.required,
      skippable: form.skippable,
      pdfPage: form.pdfPage,
      posX: form.posX,
      posY: form.posY,
      posWidth: form.posWidth,
      posHeight: form.posHeight,
      slots: form.array ? form.slots : [],
    };

    try {
      setError(null);
      await onSave(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#e8eaed] bg-white">
      <div className="shrink-0 border-b border-[#eceef1] px-4 py-3">
        <h2 className="text-base font-bold text-[#1f1f1f]">
          {creating ? '항목 추가' : '항목 편집'}
        </h2>
        <p className="mt-1 text-sm text-[#8b8f96]">
          메타 정보를 저장한 뒤, PDF에서 드래그로 좌표를 맞추세요.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <Field label="라벨">
          <Input
            value={form.label}
            onChange={(e) => update('label', e.target.value)}
            placeholder="예: 기번"
          />
        </Field>
        <Field label="그룹">
          <select
            value={form.groupName}
            onChange={(e) => {
              const groupName = e.target.value as GroupOption;
              setForm((prev) => ({
                ...prev,
                groupName,
                inspectionItem: groupName === '검사 항목',
              }));
            }}
            className="flex h-9 w-full rounded-lg border border-[#d8dce3] bg-white px-3 text-sm text-[#1f1f1f]"
          >
            {GROUP_OPTIONS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </Field>
        <Field label="입력 타입">
          <select
            value={form.inputType}
            onChange={(e) =>
              update('inputType', e.target.value as DatasheetInputType)
            }
            className="flex h-9 w-full rounded-lg border border-[#d8dce3] bg-white px-3 text-sm text-[#1f1f1f]"
          >
            {INPUT_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Toggle
            label="배열"
            checked={form.array}
            onChange={(v) => {
              update('array', v);
              if (!v) update('slots', []);
              else if (form.slots.length === 0) {
                update('slots', [
                  {
                    slotIndex: 0,
                    label: '슬롯1',
                    pdfPage: form.pdfPage,
                    posX: form.posX,
                    posY: form.posY,
                    posWidth: form.posWidth,
                    posHeight: form.posHeight,
                  },
                ]);
              }
            }}
          />
          <Toggle
            label="필수"
            checked={form.required}
            onChange={(v) => update('required', v)}
          />
          <Toggle
            label="스킵 가능"
            checked={form.skippable}
            onChange={(v) => update('skippable', v)}
          />
          <Toggle
            label="음수 허용"
            checked={form.allowNegative}
            onChange={(v) => update('allowNegative', v)}
          />
        </div>

        {(form.inputType === 'NUMBER' || form.unit) && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="단위">
              <Input
                value={form.unit}
                onChange={(e) => update('unit', e.target.value)}
              />
            </Field>
            <Field label="소수 자릿수">
              <Input
                value={form.decimalPlaces}
                onChange={(e) => update('decimalPlaces', e.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="최소">
              <Input
                value={form.minValue}
                onChange={(e) => update('minValue', e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="최대">
              <Input
                value={form.maxValue}
                onChange={(e) => update('maxValue', e.target.value)}
                inputMode="decimal"
              />
            </Field>
          </div>
        )}

        <div className="rounded-xl bg-[#f5f6f7] px-3 py-2 text-xs text-[#5f6368]">
          대표 좌표 · p{form.pdfPage} · ({form.posX}, {form.posY}) ·{' '}
          {form.posWidth}×{form.posHeight}
          {form.array
            ? ' · 슬롯은 목록에서 선택 후 PDF 드래그'
            : ' · PDF 드래그로 갱신'}
        </div>

        {form.array && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#1f1f1f]">슬롯</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  update('slots', [
                    ...form.slots,
                    {
                      slotIndex: form.slots.length,
                      label: `슬롯${form.slots.length + 1}`,
                      pdfPage: form.pdfPage,
                      posX: form.posX,
                      posY: form.posY,
                      posWidth: form.posWidth,
                      posHeight: form.posHeight,
                    },
                  ])
                }
              >
                슬롯 추가
              </Button>
            </div>
            {form.slots.map((slot, index) => (
              <div
                key={`${slot.id ?? 'new'}-${index}`}
                className="space-y-2 rounded-xl border border-[#e8eaed] p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={slot.label}
                    onChange={(e) => {
                      const next = [...form.slots];
                      next[index] = { ...slot, label: e.target.value };
                      update('slots', next);
                    }}
                    placeholder="슬롯 라벨"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      update(
                        'slots',
                        form.slots
                          .filter((_, i) => i !== index)
                          .map((s, i) => ({ ...s, slotIndex: i })),
                      )
                    }
                  >
                    삭제
                  </Button>
                </div>
                <p className="text-[11px] text-[#9aa0a6]">
                  p{slot.pdfPage} · ({slot.posX}, {slot.posY}) ·{' '}
                  {slot.posWidth ?? '-'}×{slot.posHeight ?? '-'}
                </p>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex shrink-0 gap-2 border-t border-[#eceef1] px-4 py-3">
        {creating ? (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancelCreate}
            disabled={saving}
          >
            취소
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => void onDelete()}
            disabled={saving}
          >
            삭제
          </Button>
        )}
        <Button
          type="button"
          className="flex-1"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-[#5f6368]">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e8eaed] px-3 py-2 text-sm text-[#1f1f1f]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4"
      />
      {label}
    </label>
  );
}
