'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

import { toPdfRegion } from '../lib/pdf-region';
import type {
  DatasheetInputType,
  DatasheetItem,
  DatasheetItemRangeRuleUpsert,
  DatasheetItemSlotUpsert,
  DatasheetItemUpsert,
  DatasheetPdfPosition,
  DatasheetPdfRegion,
} from '../model/datasheet-types';

const RANGE_SOURCE_TYPES: DatasheetInputType[] = ['CIRCLE', 'CHECK', 'OK_NG'];

const GROUP_OPTIONS = ['기본정보', '검사 항목'] as const;
type GroupOption = (typeof GROUP_OPTIONS)[number];

const INPUT_TYPE_OPTIONS: { value: DatasheetInputType; label: string }[] = [
  { value: 'TEXT', label: '일반 텍스트' },
  { value: 'NUMBER', label: '숫자' },
  { value: 'OK_NG', label: '합격/불합격' },
  { value: 'CHECK', label: '체크박스' },
  { value: 'CIRCLE', label: '동그라미' },
  { value: 'MIXED', label: '영문/숫자' },
];

function resolveGroup(item: DatasheetItem): GroupOption {
  if (item.groupName === '기본정보' || item.groupName === '검사 항목') {
    return item.groupName;
  }
  return item.inspectionItem ? '검사 항목' : '기본정보';
}

export type DatasheetItemEditorHandle = {
  applyPosition: (position: DatasheetPdfPosition) => void;
};

type RangeRuleForm = {
  matchSlotIndex: number;
  slotLabel: string;
  minValue: string;
  maxValue: string;
};

type DatasheetItemEditorProps = {
  item: DatasheetItem | null;
  /** 같은 시트의 다른 항목 (기종 기준 선택용) */
  siblingItems?: DatasheetItem[];
  creating: boolean;
  saving: boolean;
  pageWidth?: number | null;
  pageHeight?: number | null;
  onCancelCreate: () => void;
  onSave: (body: DatasheetItemUpsert) => Promise<void>;
  onDelete: () => Promise<void>;
  onDraftRegionChange?: (
    region: DatasheetPdfRegion | null,
    label: string | null,
  ) => void;
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
  /** 배열일 때 PDF 드래그 대상 슬롯 */
  activeSlotIndex: number;
  dependsOnItemId: number | null;
  rangeRules: RangeRuleForm[];
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
    activeSlotIndex: 0,
    dependsOnItemId: null,
    rangeRules: [],
  };
}

function buildRangeRulesFromSource(
  source: DatasheetItem,
  previous: RangeRuleForm[] = [],
): RangeRuleForm[] {
  return (source.slots ?? []).map((slot) => {
    const prev = previous.find((r) => r.matchSlotIndex === slot.slotIndex);
    return {
      matchSlotIndex: slot.slotIndex,
      slotLabel: slot.label,
      minValue: prev?.minValue ?? '',
      maxValue: prev?.maxValue ?? '',
    };
  });
}

function fromItem(item: DatasheetItem, siblings: DatasheetItem[]): FormState {
  const groupName = resolveGroup(item);
  const rules = item.rangeRules ?? [];
  const dependsOnItemId = rules[0]?.dependsOnItemId ?? null;
  const source =
    dependsOnItemId == null
      ? null
      : siblings.find((s) => s.id === dependsOnItemId) ?? null;

  const rangeRules: RangeRuleForm[] =
    source != null
      ? (source.slots ?? []).map((slot) => {
          const matched = rules.find((r) => r.matchSlotIndex === slot.slotIndex);
          return {
            matchSlotIndex: slot.slotIndex,
            slotLabel: slot.label,
            minValue:
              matched?.minValue == null ? '' : String(matched.minValue),
            maxValue:
              matched?.maxValue == null ? '' : String(matched.maxValue),
          };
        })
      : rules.map((r) => ({
          matchSlotIndex: r.matchSlotIndex,
          slotLabel: `슬롯${r.matchSlotIndex + 1}`,
          minValue: r.minValue == null ? '' : String(r.minValue),
          maxValue: r.maxValue == null ? '' : String(r.maxValue),
        }));

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
    activeSlotIndex: 0,
    dependsOnItemId,
    rangeRules,
  };
}

function toNumberOrNull(value: string) {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function defaultSlotsForType(
  inputType: DatasheetInputType,
  base: Pick<FormState, 'pdfPage' | 'posX' | 'posY' | 'posWidth' | 'posHeight'>,
): DatasheetItemSlotUpsert[] {
  if (inputType === 'OK_NG') {
    return [
      {
        slotIndex: 0,
        label: 'OK',
        pdfPage: base.pdfPage,
        posX: base.posX,
        posY: base.posY,
        posWidth: base.posWidth,
        posHeight: base.posHeight,
      },
      {
        slotIndex: 1,
        label: 'NG',
        pdfPage: base.pdfPage,
        posX: base.posX + base.posWidth + 8,
        posY: base.posY,
        posWidth: base.posWidth,
        posHeight: base.posHeight,
      },
    ];
  }
  return [
    {
      slotIndex: 0,
      label: '슬롯1',
      pdfPage: base.pdfPage,
      posX: base.posX,
      posY: base.posY,
      posWidth: base.posWidth,
      posHeight: base.posHeight,
    },
  ];
}

export const DatasheetItemEditor = forwardRef<
  DatasheetItemEditorHandle,
  DatasheetItemEditorProps
>(function DatasheetItemEditor(
  {
    item,
    siblingItems = [],
    creating,
    saving,
    pageWidth,
    pageHeight,
    onCancelCreate,
    onSave,
    onDelete,
    onDraftRegionChange,
  },
  ref,
) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [drawnSlotIndexes, setDrawnSlotIndexes] = useState<Set<number>>(
    () => new Set(),
  );
  const formRef = useRef(form);
  formRef.current = form;

  const rangeSourceItems = siblingItems.filter(
    (entry) =>
      entry.array &&
      RANGE_SOURCE_TYPES.includes(entry.inputType) &&
      (item == null || entry.id !== item.id),
  );

  useEffect(() => {
    if (creating) {
      setForm(emptyForm());
      setError(null);
      setHasDrawn(false);
      setDrawnSlotIndexes(new Set());
      return;
    }
    if (item) {
      setForm(fromItem(item, siblingItems));
      setError(null);
      setHasDrawn(true);
      setDrawnSlotIndexes(
        new Set((item.slots ?? []).map((_, index) => index)),
      );
    }
  }, [creating, item, siblingItems]);

  useEffect(() => {
    if (!onDraftRegionChange) return;
    if (!creating && !item) {
      onDraftRegionChange(null, null);
      return;
    }

    const target = form.array
      ? form.slots[form.activeSlotIndex]
      : {
          pdfPage: form.pdfPage,
          posX: form.posX,
          posY: form.posY,
          posWidth: form.posWidth,
          posHeight: form.posHeight,
        };

    if (!target) {
      onDraftRegionChange(null, null);
      return;
    }

    const region = toPdfRegion(target, pageWidth, pageHeight);
    const label = form.array
      ? `${form.label || '새 항목'} · ${target.label ?? `슬롯${form.activeSlotIndex + 1}`}`
      : form.label || '새 항목';
    onDraftRegionChange(region, label);
  }, [
    creating,
    item,
    form,
    pageWidth,
    pageHeight,
    onDraftRegionChange,
  ]);

  useImperativeHandle(ref, () => ({
    applyPosition(position) {
      const prev = formRef.current;
      setHasDrawn(true);

      if (prev.array && prev.slots.length > 0) {
        const index = Math.min(
          Math.max(prev.activeSlotIndex, 0),
          prev.slots.length - 1,
        );
        setDrawnSlotIndexes((drawn) => new Set(drawn).add(index));
        const slots = prev.slots.map((slot, i) =>
          i === index
            ? {
                ...slot,
                pdfPage: position.pdfPage,
                posX: position.posX,
                posY: position.posY,
                posWidth: position.posWidth,
                posHeight: position.posHeight,
              }
            : slot,
        );
        const first = slots[0];
        setForm({
          ...prev,
          slots,
          activeSlotIndex: index,
          pdfPage: first?.pdfPage ?? position.pdfPage,
          posX: first?.posX ?? position.posX,
          posY: first?.posY ?? position.posY,
          posWidth: first?.posWidth ?? position.posWidth,
          posHeight: first?.posHeight ?? position.posHeight,
        });
        return;
      }

      setForm({
        ...prev,
        pdfPage: position.pdfPage,
        posX: position.posX,
        posY: position.posY,
        posWidth: position.posWidth,
        posHeight: position.posHeight,
      });
    },
  }));

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
    if (creating && !hasDrawn) {
      setError('저장 전에 PDF에서 좌표 박스를 드래그하세요.');
      return;
    }
    if (creating && form.array) {
      const missing = form.slots.findIndex(
        (_, index) => !drawnSlotIndexes.has(index),
      );
      if (missing >= 0) {
        setError(
          `슬롯 ${missing + 1}(${form.slots[missing]?.label || ''}) 좌표를 지정하세요.`,
        );
        update('activeSlotIndex', missing);
        return;
      }
    }

    const rangeRules: DatasheetItemRangeRuleUpsert[] =
      form.inputType === 'NUMBER' && form.dependsOnItemId != null
        ? form.rangeRules.map((rule) => ({
            dependsOnItemId: form.dependsOnItemId as number,
            matchSlotIndex: rule.matchSlotIndex,
            minValue: toNumberOrNull(rule.minValue),
            maxValue: toNumberOrNull(rule.maxValue),
          }))
        : [];

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
      rangeRules,
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
          {creating
            ? 'PDF에서 좌표를 드래그한 뒤 저장하세요.'
            : '속성을 수정하거나 PDF에서 좌표를 다시 지정하세요.'}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-4 py-3">
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
            onChange={(e) => {
              const inputType = e.target.value as DatasheetInputType;
              setForm((prev) => {
                const next = { ...prev, inputType };
                if (inputType === 'OK_NG') {
                  next.array = true;
                  next.slots = defaultSlotsForType(inputType, prev);
                  next.activeSlotIndex = 0;
                }
                return next;
              });
            }}
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
              setForm((prev) => ({
                ...prev,
                array: v,
                slots: v
                  ? prev.slots.length > 0
                    ? prev.slots
                    : defaultSlotsForType(prev.inputType, prev)
                  : [],
                activeSlotIndex: 0,
              }));
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
            <Field label="기본 최소">
              <Input
                value={form.minValue}
                onChange={(e) => update('minValue', e.target.value)}
                inputMode="decimal"
                placeholder="기종 미선택 시"
              />
            </Field>
            <Field label="기본 최대">
              <Input
                value={form.maxValue}
                onChange={(e) => update('maxValue', e.target.value)}
                inputMode="decimal"
                placeholder="기종 미선택 시"
              />
            </Field>
          </div>
        )}

        {form.inputType === 'NUMBER' && (
          <div className="space-y-2 rounded-xl border border-[#e8eaed] p-3">
            <p className="text-sm font-semibold text-[#1f1f1f]">
              기종별 범위
            </p>
            <p className="text-xs text-[#8b8f96]">
              동그라미/체크 항목을 먼저 추가한 뒤, 여기서 기준을 고르세요.
            </p>
            <Field label="기준 항목">
              <select
                value={form.dependsOnItemId ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) {
                    setForm((prev) => ({
                      ...prev,
                      dependsOnItemId: null,
                      rangeRules: [],
                    }));
                    return;
                  }
                  const id = Number(raw);
                  const source = rangeSourceItems.find((s) => s.id === id);
                  setForm((prev) => ({
                    ...prev,
                    dependsOnItemId: id,
                    rangeRules: source
                      ? buildRangeRulesFromSource(source, prev.rangeRules)
                      : [],
                  }));
                }}
                className="flex h-9 w-full rounded-lg border border-[#d8dce3] bg-white px-3 text-sm text-[#1f1f1f]"
              >
                <option value="">사용 안 함 (기본 min/max)</option>
                {rangeSourceItems.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.label}
                  </option>
                ))}
              </select>
            </Field>
            {form.dependsOnItemId != null && form.rangeRules.length === 0 && (
              <p className="text-xs text-[#9a3412]">
                기준 항목에 슬롯이 없습니다.
              </p>
            )}
            {form.rangeRules.map((rule, index) => (
              <div
                key={rule.matchSlotIndex}
                className="grid grid-cols-2 gap-2 rounded-lg bg-[#f5f6f7] p-2"
              >
                <p className="col-span-2 text-xs font-semibold text-[#5f6368]">
                  {rule.slotLabel || `슬롯${rule.matchSlotIndex + 1}`}
                </p>
                <Field label="최소">
                  <Input
                    value={rule.minValue}
                    onChange={(e) => {
                      const next = [...form.rangeRules];
                      next[index] = { ...rule, minValue: e.target.value };
                      update('rangeRules', next);
                    }}
                    inputMode="decimal"
                  />
                </Field>
                <Field label="최대">
                  <Input
                    value={rule.maxValue}
                    onChange={(e) => {
                      const next = [...form.rangeRules];
                      next[index] = { ...rule, maxValue: e.target.value };
                      update('rangeRules', next);
                    }}
                    inputMode="decimal"
                  />
                </Field>
              </div>
            ))}
          </div>
        )}

        <div
          className={`rounded-xl px-3 py-2 text-xs ${
            hasDrawn
              ? 'bg-[#ecfdf3] text-[#166534]'
              : 'bg-[#fff7ed] text-[#9a3412]'
          }`}
        >
          {hasDrawn
            ? `좌표 지정됨 · p${form.pdfPage} · (${form.posX}, ${form.posY}) · ${form.posWidth}×${form.posHeight}`
            : 'PDF에서 드래그해 좌표를 지정하세요.'}
          {form.array ? ' · 슬롯을 선택한 뒤 각각 드래그' : ''}
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
                  setForm((prev) => ({
                    ...prev,
                    slots: [
                      ...prev.slots,
                      {
                        slotIndex: prev.slots.length,
                        label: `슬롯${prev.slots.length + 1}`,
                        pdfPage: prev.pdfPage,
                        posX: prev.posX,
                        posY: prev.posY,
                        posWidth: prev.posWidth,
                        posHeight: prev.posHeight,
                      },
                    ],
                  }))
                }
              >
                슬롯 추가
              </Button>
            </div>
            {form.slots.map((slot, index) => {
              const active = form.activeSlotIndex === index;
              return (
                <div
                  key={`${slot.id ?? 'new'}-${index}`}
                  className={`space-y-2 rounded-xl border p-3 ${
                    active
                      ? 'border-[#1f1f1f] bg-[#f5f6f7]'
                      : 'border-[#e8eaed]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => update('activeSlotIndex', index)}
                      className="shrink-0 rounded-md bg-[#eceef1] px-2 py-1 text-[11px] font-semibold text-[#5f6368]"
                    >
                      {active ? '선택됨' : '선택'}
                    </button>
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
                        setForm((prev) => {
                          const slots = prev.slots
                            .filter((_, i) => i !== index)
                            .map((s, i) => ({ ...s, slotIndex: i }));
                          return {
                            ...prev,
                            slots,
                            activeSlotIndex: Math.min(
                              prev.activeSlotIndex,
                              Math.max(slots.length - 1, 0),
                            ),
                          };
                        })
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
              );
            })}
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
});

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
