'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

import { useAuthStore } from '@/features/auth/session/auth-store';
import {
  normalizeDatasheetItems,
  useDatasheetDetail,
  type DatasheetSummary,
} from '@/features/settings';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/input';

import {
  countFilledParts,
  DEFAULT_UNIT_OPTIONS,
  emptyBasicInfoValues,
  isBasicInfoComplete,
  PART_NUMBER_SLOTS,
  type BasicInfoFormValues,
  type PartNumberSlot,
} from '../lib/basic-info-fields';

type BasicInfoFormProps = {
  datasheet: DatasheetSummary;
  values: BasicInfoFormValues;
  onChange: (values: BasicInfoFormValues) => void;
  onBack: () => void;
  onNext: () => void;
};

function resolveUnitOptions(labels: string[]): string[] {
  if (labels.length > 0) return labels;
  return [...DEFAULT_UNIT_OPTIONS];
}

export function BasicInfoForm({ datasheet, values, onChange, onBack, onNext }: BasicInfoFormProps) {
  const user = useAuthStore((state) => state.user);
  const { data, isPending } = useDatasheetDetail(datasheet.id);

  const unitOptions = useMemo(() => {
    const items = normalizeDatasheetItems(data?.items ?? []);
    const unitItem = items.find(
      (item) =>
        !item.inspectionItem &&
        item.array &&
        (item.inputType === 'CHECK' || item.inputType === 'CIRCLE') &&
        (item.label.includes('유닛') ||
          item.label.includes('유니트') ||
          item.label.toLowerCase().includes('unit')),
    );
    const fromSheet = (unitItem?.slots ?? []).map((slot) => slot.label.trim()).filter(Boolean);
    return resolveUnitOptions(fromSheet);
  }, [data]);

  useEffect(() => {
    if (values.inspector.trim()) return;
    if (!user?.name) return;
    onChange({ ...values, inspector: user.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 로그인 사용자로 검사자 초기값만 채움
  }, [user?.name]);

  useEffect(() => {
    if (values.unit.trim()) return;
    if (unitOptions.length === 0) return;
    onChange({ ...values, unit: unitOptions[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 유닛트 기본 선택
  }, [unitOptions.join('|')]);

  const partProgress = countFilledParts(values);
  const canNext = isBasicInfoComplete(values);

  const patch = (partial: Partial<BasicInfoFormValues>) => onChange({ ...values, ...partial });

  const patchPart = (slot: PartNumberSlot, value: string) =>
    onChange({
      ...values,
      parts: { ...values.parts, [slot]: value },
    });

  return (
    <div className="flex h-svh min-h-0 flex-col bg-[#f4f6f8]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[#e8eaed] bg-white px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-lg text-[#1f1f1f] hover:bg-[#f5f6f7]"
          aria-label="뒤로"
        >
          <ChevronLeft className="size-6" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-[#1f1f1f]">신규 검사</h1>
        <p className="shrink-0 text-right text-xs text-[#8b8f96]">
          <span className="font-semibold text-[#1f1f1f]">1</span> 제품 선택 · 2 모드 · 3 검사
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {isPending && (
          <p className="text-center text-xs text-[#8b8f96]">데이터시트 정보 확인 중...</p>
        )}

        {/* 기번 / 바코드 */}
        <section className="space-y-2">
          <p className="text-sm font-bold text-[#1f1f1f]">기번 / 바코드</p>
          <div className="flex gap-2">
            <Input
              value={values.serialNo}
              onChange={(e) => patch({ serialNo: e.target.value })}
              placeholder="기번 또는 바코드 입력"
              className="h-12 flex-1 rounded-xl border-[#d8dce3] bg-white px-4 text-base font-semibold"
              autoFocus
            />
            <button
              type="button"
              className="h-12 shrink-0 rounded-xl bg-[#3c3c3c] px-4 text-sm font-bold text-white"
              onClick={() => window.alert('스캔 기능은 준비 중입니다.')}
            >
              스캔
            </button>
          </div>
        </section>

        {/* 유닛트 · 라인 */}
        <section className="overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center gap-3 border-b border-[#eceef1] px-4 py-3">
            <p className="w-14 shrink-0 text-sm font-bold text-[#1f1f1f]">유닛트</p>
            <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-2">
              {unitOptions.map((option) => {
                const active = values.unit === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => patch({ unit: option })}
                    className={cn(
                      'h-9 rounded-xl px-3 text-sm font-semibold transition-colors',
                      active
                        ? 'bg-[#3c3c3c] text-white'
                        : 'border border-[#d8dce3] bg-white text-[#1f1f1f] hover:bg-[#f5f6f7]',
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <p className="w-14 shrink-0 text-sm font-bold text-[#1f1f1f]">라인</p>
            <div className="flex min-w-0 flex-1 justify-end">
              <Input
                value={values.line}
                onChange={(e) => patch({ line: e.target.value })}
                placeholder="예: 2라인"
                className="h-9 w-28 rounded-lg border-[#d8dce3] bg-[#f5f6f7] px-3 text-sm"
              />
            </div>
          </div>
        </section>

        {/* 검사 환경 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#1f1f1f]">검사 환경</h2>
          <div className="grid grid-cols-2 gap-2">
            <EnvCard label="검사일">
              <input
                type="date"
                value={values.inspectDate}
                onChange={(e) => patch({ inspectDate: e.target.value })}
                className="w-full bg-transparent text-base font-bold text-[#1f1f1f] outline-none"
              />
            </EnvCard>

            <EnvCard
              label="검사자"
              action={
                <button
                  type="button"
                  className="text-xs font-semibold text-[#5f6368]"
                  onClick={() => {
                    const next = window.prompt('검사자 이름', values.inspector);
                    if (next != null) patch({ inspector: next });
                  }}
                >
                  변경
                </button>
              }
            >
              <p className="text-base font-bold text-[#1f1f1f]">{values.inspector || '—'}</p>
            </EnvCard>

            <EnvCard label="온도">
              <div className="flex items-baseline gap-1">
                <input
                  value={values.temperature}
                  onChange={(e) => patch({ temperature: e.target.value })}
                  inputMode="decimal"
                  placeholder="—"
                  className="w-full bg-transparent text-base font-bold text-[#1f1f1f] outline-none"
                />
                <span className="shrink-0 text-sm text-[#8b8f96]">°C</span>
              </div>
            </EnvCard>

            <EnvCard label="습도">
              <div className="flex items-baseline gap-1">
                <input
                  value={values.humidity}
                  onChange={(e) => patch({ humidity: e.target.value })}
                  inputMode="decimal"
                  placeholder="—"
                  className="w-full bg-transparent text-base font-bold text-[#1f1f1f] outline-none"
                />
                <span className="shrink-0 text-sm text-[#8b8f96]">%</span>
              </div>
            </EnvCard>
          </div>
        </section>

        {/* 부품 번호 */}
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-sm font-bold text-[#1f1f1f]">부품 번호</h2>
            <p className="text-xs font-semibold text-[#8b8f96]">
              바코드 스캔 · {partProgress.filled} / {partProgress.total}
            </p>
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {PART_NUMBER_SLOTS.map((slot) => {
              const value = values.parts[slot];
              const empty = !value.trim();
              return (
                <li key={slot}>
                  <label
                    className={cn(
                      'flex min-h-[72px] flex-col rounded-xl bg-white px-3 py-2',
                      empty ? 'border border-dashed border-[#c5c9d0]' : 'border border-transparent',
                    )}
                  >
                    <span className="text-[11px] font-semibold text-[#8b8f96]">{slot}</span>
                    <input
                      value={value}
                      onChange={(e) => patchPart(slot, e.target.value)}
                      placeholder={empty ? '스캔 대기' : undefined}
                      className={cn(
                        'mt-1 w-full bg-transparent text-sm font-semibold outline-none',
                        empty ? 'text-[#9aa0a6] placeholder:text-[#9aa0a6]' : 'text-[#1f1f1f]',
                      )}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="shrink-0 border-t border-[#e8eaed] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          // disabled={!canNext}
          onClick={onNext}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#3c3c3c] text-base font-bold text-white transition-colors hover:bg-[#2f2f2f] disabled:opacity-40"
        >
          다음 · 검사 모드 선택
        </button>
      </div>
    </div>
  );
}

function EnvCard({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#8b8f96]">{label}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

export { emptyBasicInfoValues };
