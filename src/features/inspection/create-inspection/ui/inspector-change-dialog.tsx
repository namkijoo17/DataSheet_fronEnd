'use client';

import { useState } from 'react';

import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';

type InspectorChangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 현재 검사자 */
  inspector: string;
  /** 현재 입력된 변경 사유 */
  reason: string;
  /** 로그인 계정 이름 (기본 검사자). 이 이름으로 되돌리면 사유가 필요 없다. */
  defaultInspector: string;
  onSubmit: (next: { inspector: string; reason: string }) => void;
};

export function InspectorChangeDialog({
  open,
  onOpenChange,
  inspector,
  reason,
  defaultInspector,
  onSubmit,
}: InspectorChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* 열릴 때마다 새로 마운트되어 현재 값으로 초기화된다 */}
        <InspectorChangeForm
          inspector={inspector}
          reason={reason}
          defaultInspector={defaultInspector}
          onCancel={() => onOpenChange(false)}
          onSubmit={(next) => {
            onSubmit(next);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function InspectorChangeForm({
  inspector,
  reason,
  defaultInspector,
  onCancel,
  onSubmit,
}: {
  inspector: string;
  reason: string;
  defaultInspector: string;
  onCancel: () => void;
  onSubmit: (next: { inspector: string; reason: string }) => void;
}) {
  const [name, setName] = useState(inspector);
  const [text, setText] = useState(reason);
  const [touched, setTouched] = useState(false);

  const trimmedName = name.trim();
  const trimmedReason = text.trim();
  const revertsToDefault = !!defaultInspector && trimmedName === defaultInspector;
  const reasonRequired = !revertsToDefault;

  const nameError = touched && !trimmedName ? '검사자 이름을 입력해 주세요.' : null;
  const reasonError =
    touched && reasonRequired && !trimmedReason ? '변경 사유를 입력해 주세요.' : null;

  const handleSubmit = () => {
    setTouched(true);
    if (!trimmedName) return;
    if (reasonRequired && !trimmedReason) return;
    onSubmit({ inspector: trimmedName, reason: reasonRequired ? trimmedReason : '' });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>검사자 변경</DialogTitle>
        <DialogDescription>
          로그인 계정이 아닌 다른 검사자로 진행하려면 변경 사유를 입력해야 합니다.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#5f6368]" htmlFor="inspector-name">
            검사자
          </label>
          <Input
            id="inspector-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="검사자 이름"
            className="h-10"
            autoFocus
          />
          {nameError && <p className="text-xs text-red-600">{nameError}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#5f6368]" htmlFor="inspector-reason">
            변경 사유{reasonRequired ? ' *' : ''}
          </label>
          <textarea
            id="inspector-reason"
            value={reasonRequired ? text : ''}
            onChange={(e) => setText(e.target.value)}
            disabled={!reasonRequired}
            rows={3}
            maxLength={200}
            placeholder={
              reasonRequired
                ? '예: 담당자 교대, 대리 검사 등'
                : '기본 검사자로 되돌리면 사유가 필요 없습니다.'
            }
            className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {reasonError && <p className="text-xs text-red-600">{reasonError}</p>}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button type="button" onClick={handleSubmit}>
          변경
        </Button>
      </DialogFooter>
    </>
  );
}
