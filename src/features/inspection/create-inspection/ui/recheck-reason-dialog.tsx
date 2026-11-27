'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

/** 자주 쓰는 재검사 사유. '기타'는 직접 입력한다. */
const PRESET_REASONS = [
  '입력 실수',
  '측정 오류 / 재측정',
  '장비·지그 문제',
  '규격 재확인',
] as const;
const OTHER = '기타';

type RecheckReasonDialogProps = {
  open: boolean;
  /** 재검사할 항목 이름 */
  itemLabel: string;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
};

export function RecheckReasonDialog({
  open,
  itemLabel,
  saving = false,
  onCancel,
  onSubmit,
}: RecheckReasonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onCancel()}>
      <DialogContent className="sm:max-w-md">
        {/* 열릴 때마다 새로 마운트되어 선택이 초기화된다 */}
        <RecheckReasonForm
          itemLabel={itemLabel}
          saving={saving}
          onCancel={onCancel}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

function RecheckReasonForm({
  itemLabel,
  saving,
  onCancel,
  onSubmit,
}: {
  itemLabel: string;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [touched, setTouched] = useState(false);

  const isOther = selected === OTHER;
  const trimmedCustom = custom.trim();
  const reason = isOther ? trimmedCustom : (selected ?? '');

  const error = !touched
    ? null
    : !selected
      ? '재검사 사유를 선택해 주세요.'
      : isOther && !trimmedCustom
        ? '사유를 직접 입력해 주세요.'
        : null;

  const handleSubmit = () => {
    setTouched(true);
    if (!reason) return;
    onSubmit(reason);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>재검사 사유</DialogTitle>
        <DialogDescription>
          「{itemLabel}」 항목을 다시 검사합니다. 입력한 값은 지워지고 사유가 이력에 남습니다.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="재검사 사유">
          {[...PRESET_REASONS, OTHER].map((option) => {
            const active = selected === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={saving}
                onClick={() => setSelected(option)}
                className={cn(
                  'h-10 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-50',
                  active
                    ? 'border-[#3c3c3c] bg-[#3c3c3c] text-white'
                    : 'border-[#d8dce3] bg-white text-[#1f1f1f] hover:bg-[#f5f6f7]',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>

        {isOther && (
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            disabled={saving}
            rows={3}
            maxLength={200}
            autoFocus
            placeholder="재검사 사유를 입력하세요"
            className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          취소
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? '저장 중...' : '재검사 시작'}
        </Button>
      </DialogFooter>
    </>
  );
}
