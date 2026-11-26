'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';

import type { NgEventInfo } from '../lib/ng-event';
import { NG_ACTION_OPTIONS, type NgAction } from '../model/ng-actions';

type NgOccurredDialogProps = {
  info: NgEventInfo;
  /** 발생 시각 (yyyy-MM-dd HH:mm:ss) */
  occurredAt: string;
  /** 선택할 수 없는 처리 방법 (예: 이미 재검증한 항목의 '재검증') */
  disabledActions?: NgAction[];
  saving?: boolean;
  onRecheck: () => void;
  onConfirm: (action: NgAction) => void;
};

export function NgOccurredDialog({
  info,
  occurredAt,
  disabledActions = [],
  saving = false,
  onRecheck,
  onConfirm,
}: NgOccurredDialogProps) {
  const [selected, setSelected] = useState<NgAction>('CONTINUE');
  const timeLabel = occurredAt.split(' ')[1] ?? occurredAt;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="NG 발생"
    >
      <div className="flex max-h-[94svh] w-full max-w-[640px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="shrink-0 bg-[#d13b3b] px-6 py-5 text-white md:px-8 md:py-6">
          <p className="text-sm font-medium text-white/90 md:text-base">NG 발생 · {timeLabel}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{info.title}</h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 md:px-8 md:py-6">
          {/* 요약 */}
          <dl className="grid grid-cols-2 border-b border-[#eceef1]">
            <Cell label="항목" value={info.itemLabel} className="border-b border-r border-[#eceef1]" />
            <Cell label="측정값" value={info.measured} tone="ng" className="border-b border-[#eceef1] pl-5" />
            <Cell label="규격" value={info.spec} className="border-b border-r border-[#eceef1]" />
            <Cell
              label="편차"
              value={info.deviation ?? '-'}
              tone={info.deviation ? 'ng' : 'default'}
              className="border-b border-[#eceef1] pl-5"
            />
            <Cell label="발생시간" value={occurredAt} className="col-span-2" />
          </dl>

          {/* 처리 방법 */}
          <h3 className="mt-5 text-base font-bold text-[#1f1f1f] md:text-lg">처리 방법 선택</h3>
          <ul className="mt-3 space-y-2.5">
            {NG_ACTION_OPTIONS.map((option, i) => {
              const disabled = disabledActions.includes(option.id);
              const active = selected === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={disabled || saving}
                    onClick={() => setSelected(option.id)}
                    aria-pressed={active}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-2xl border bg-white px-4 py-3.5 text-left transition-colors md:px-5 md:py-4',
                      active ? 'border-2 border-[#3c3c3c]' : 'border-[#d8dce3] hover:bg-[#fafafa]',
                      disabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        active ? 'bg-[#3c3c3c] text-white' : 'bg-[#eceff3] text-[#3c3c3c]',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-bold text-[#1f1f1f] md:text-lg">
                        {option.title}
                        {disabled && (
                          <span className="ml-2 text-xs font-medium text-[#8b8f96]">(이미 재검증함)</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#8b8f96] md:text-sm">
                        {option.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* 버튼 */}
          <div className="mt-5 grid grid-cols-[1fr_2fr] gap-3">
            <button
              type="button"
              onClick={onRecheck}
              disabled={saving}
              className="h-14 rounded-2xl border border-[#d8dce3] bg-white text-base font-bold text-[#1f1f1f] disabled:opacity-40"
            >
              재검사
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selected)}
              disabled={saving || disabledActions.includes(selected)}
              className="h-14 rounded-2xl bg-[#3c3c3c] text-base font-bold text-white disabled:opacity-40"
            >
              선택 확정
            </button>
          </div>

          <p className="mt-4 text-xs text-[#8b8f96] md:text-sm">
            선택 결과와 처리 이력은 검사 건에 함께 저장됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  tone = 'default',
  className,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'ng';
  className?: string;
}) {
  return (
    <div className={cn('px-0 py-3.5 md:py-4', className)}>
      <dt className="text-xs text-[#8b8f96] md:text-sm">{label}</dt>
      <dd
        className={cn(
          'mt-1 break-words text-lg font-bold md:text-xl',
          tone === 'ng' ? 'text-[#d13b3b]' : 'text-[#1f1f1f]',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
