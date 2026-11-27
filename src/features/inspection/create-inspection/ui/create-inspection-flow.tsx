'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { useAuthStore } from '@/features/auth/session/auth-store';
import {
  datasheetDetailQueryKey,
  fetchDatasheetDetail,
  fetchDatasheetFileBlob,
  type DatasheetSummary,
} from '@/features/settings';

import {
  completeInspection,
  discardInspection,
  recordInspectionRecheck,
  restartInspection,
  startInspection,
} from '../api/inspection-api';
import type { InspectionAnswers } from '../lib/inspection-answers';
import {
  emptyBasicInfoValues,
  type BasicInfoFormValues,
} from '../lib/basic-info-fields';
import {
  diffAnswerItemIds,
  fromAnswersResponse,
  fromBasicPayload,
  toAnswerPayload,
  toBasicPayload,
} from '../lib/inspection-mapping';
import { renderFilledPdf } from '../lib/render-filled-pdf';
import { buildResultFileName } from '../lib/result-file-name';
import type { InspectionModeId } from '../model/inspection-modes';
import type { InspectionDetailResponse } from '../model/inspection-types';
import { useInspectionAutosave } from '../model/use-inspection-autosave';
import {
  completedInspectionsQueryKey,
  inProgressInspectionsQueryKey,
} from '../model/use-inspections';
import { BasicInfoForm } from './basic-info-form';
import { DatasheetPicker } from './datasheet-picker';
import { DebugItemSelect } from './debug-item-select';
import {
  InspectionCompleteConfirm,
  type InspectionConfirmResult,
} from './inspection-complete-confirm';
import { InspectionFillForm } from './inspection-fill-form';
import { InspectionModeSelect } from './inspection-mode-select';

/** select: 디버깅 모드에서 검사할 항목을 고르는 단계 */
type Step = 'datasheet' | 'basic' | 'mode' | 'select' | 'inspect' | 'confirm';

export type ResumeInspectionData = {
  inspection: InspectionDetailResponse;
  datasheet: DatasheetSummary;
};

type CreateInspectionFlowProps = {
  /** 진행 중이던 검사를 이어서 진행 */
  resume?: ResumeInspectionData;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function CreateInspectionFlow({ resume }: CreateInspectionFlowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userName = useAuthStore((state) => state.user?.name ?? '');
  // 디버깅 모드인데 항목 선택이 아직 없는 검사는 선택 단계부터 연다
  const resumeStep: Step = !resume
    ? 'datasheet'
    : resume.inspection.mode === 'DEBUG' &&
        Object.keys(resume.inspection.answers ?? {}).length === 0
      ? 'select'
      : 'inspect';
  const [step, setStep] = useState<Step>(resumeStep);
  const [datasheet, setDatasheet] = useState<DatasheetSummary | null>(
    resume?.datasheet ?? null,
  );
  const [basicValues, setBasicValues] = useState<BasicInfoFormValues>(() =>
    resume
      ? fromBasicPayload(resume.inspection.basic, userName)
      : emptyBasicInfoValues(userName),
  );
  const [mode, setMode] = useState<InspectionModeId>(resume?.inspection.mode ?? 'BASIC');
  const [answers, setAnswers] = useState<InspectionAnswers>(() =>
    resume ? fromAnswersResponse(resume.inspection.answers) : {},
  );
  const [inspectionId, setInspectionId] = useState<number | null>(
    resume?.inspection.id ?? null,
  );
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmingLabel, setConfirmingLabel] = useState('저장 중...');

  const answersRef = useRef(answers);
  const { queue, status: saveStatus } = useInspectionAutosave(inspectionId);

  const resetAnswers = (next: InspectionAnswers) => {
    answersRef.current = next;
    setAnswers(next);
  };

  const refreshInProgress = () =>
    queryClient.invalidateQueries({ queryKey: inProgressInspectionsQueryKey });

  /** 항목 입력이 바뀔 때마다 바뀐 항목만 서버 저장 큐에 넣는다 */
  const handleAnswersChange = (next: InspectionAnswers) => {
    const changed = diffAnswerItemIds(answersRef.current, next);
    resetAnswers(next);
    for (const itemId of changed) {
      queue?.enqueue(itemId, toAnswerPayload(next[itemId]));
    }
  };

  const handleStart = async (selectedMode: InspectionModeId) => {
    if (!datasheet || starting) return;
    const modeChanged = inspectionId != null && selectedMode !== mode;
    if (
      modeChanged &&
      Object.keys(answersRef.current).length > 0 &&
      !window.confirm('검사 모드를 바꾸면 입력한 내용이 초기화됩니다. 계속할까요?')
    ) {
      return;
    }
    setStarting(true);
    try {
      const body = { mode: selectedMode, basic: toBasicPayload(basicValues) };
      if (inspectionId != null) {
        if (modeChanged) {
          // 모드가 바뀌면 서버 답변도 초기화되므로 대기 중 저장은 버린다
          queue?.clear();
        } else {
          // 기본정보만 수정: 답변은 유지, 대기 중인 저장을 먼저 마친다
          await queue?.flush(8000);
        }
        await restartInspection(inspectionId, body);
        if (modeChanged) resetAnswers({});
      } else {
        const created = await startInspection({ datasheetId: datasheet.id, ...body });
        setInspectionId(created.id);
        resetAnswers({});
      }
      setMode(selectedMode);
      // 디버깅 모드는 먼저 검사할 항목을 고른다
      setStep(selectedMode === 'DEBUG' ? 'select' : 'inspect');
      void refreshInProgress();
    } catch (error) {
      window.alert(errorMessage(error, '검사를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setStarting(false);
    }
  };

  /**
   * 디버깅 모드: 고르지 않은 항목은 SKIP 답변으로 바꾸고 검사 화면으로 간다.
   * 선택에서 빠지는 항목에 입력값이 있으면 확인을 받는다.
   */
  const handleSelectionConfirm = (selectedIds: number[], allItemIds: number[]) => {
    const selectedSet = new Set(selectedIds);
    const current = answersRef.current;
    const hasInput = (answer: InspectionAnswers[number] | undefined) =>
      Boolean(answer) &&
      !answer!.skipped &&
      (Boolean(answer!.value?.trim()) ||
        answer!.judgment != null ||
        answer!.slotIndex != null ||
        Object.values(answer!.slotValues ?? {}).some((value) => value?.trim()));
    const droppedWithInput = allItemIds.filter(
      (id) => !selectedSet.has(id) && hasInput(current[id]),
    ).length;
    if (
      droppedWithInput > 0 &&
      !window.confirm(`선택에서 뺀 항목 ${droppedWithInput}건의 입력값이 지워집니다. 계속할까요?`)
    ) {
      return;
    }

    const next: InspectionAnswers = { ...current };
    for (const itemId of allItemIds) {
      if (selectedSet.has(itemId)) {
        if (next[itemId]?.skipped) delete next[itemId];
      } else {
        next[itemId] = { skipped: true };
      }
    }
    handleAnswersChange(next);
    setStep('inspect');
  };

  /** 항목 재검사 사유를 서버에 기록한다. 실패하면 안내 후 throw 해서 재검사를 막는다. */
  const handleRecheckReason = async (payload: {
    itemId: number;
    itemLabel: string;
    reason: string;
    previousSummary: string | null;
  }) => {
    if (inspectionId == null) return;
    try {
      await recordInspectionRecheck(inspectionId, payload.itemId, {
        reason: payload.reason,
        itemLabel: payload.itemLabel,
        previousSummary: payload.previousSummary,
      });
    } catch (error) {
      window.alert(errorMessage(error, '재검사 사유를 저장하지 못했습니다. 다시 시도해 주세요.'));
      throw error;
    }
  };

  /** 저장된 상태 그대로 검사를 나간다 (대시보드의 '이어하기'로 재개) */
  const leaveToDashboard = async () => {
    const saved = (await queue?.flush(8000)) ?? true;
    if (
      !saved &&
      !window.confirm('일부 입력이 아직 서버에 저장되지 않았습니다. 그래도 나갈까요?')
    ) {
      return;
    }
    await refreshInProgress();
    router.push('/dashboard');
  };

  const handleConfirm = async (result: InspectionConfirmResult) => {
    if (inspectionId == null || !datasheet || confirming) return;
    setConfirming(true);
    setConfirmingLabel('저장 중...');
    try {
      const saved = (await queue?.flush(15000)) ?? true;
      if (!saved) {
        window.alert('아직 저장되지 않은 입력이 있습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.');
        return;
      }
      const failure = queue?.getFailureMessage();
      if (failure) {
        window.alert(`일부 항목을 저장하지 못했습니다: ${failure}\n해당 항목을 다시 입력해 주세요.`);
        return;
      }

      // 원본 PDF 에 입력값을 입힌 결과 PDF 생성
      setConfirmingLabel('PDF 생성 중...');
      const source = await queryClient.fetchQuery({
        queryKey: ['datasheet-file-blob', datasheet.id],
        queryFn: () => fetchDatasheetFileBlob(datasheet.id),
        staleTime: 5 * 60_000,
      });
      const file = await renderFilledPdf({
        source,
        overlays: result.overlays,
        onProgress: (done, total) =>
          setConfirmingLabel(`PDF 생성 중... (${done}/${total})`),
      });

      setConfirmingLabel('파일 보관함에 저장 중...');
      await completeInspection(inspectionId, {
        file,
        fileName: buildResultFileName(basicValues),
        okCount: result.ok,
        ngCount: result.ng,
        skipCount: result.skip,
      });
      await Promise.all([
        refreshInProgress(),
        queryClient.invalidateQueries({ queryKey: completedInspectionsQueryKey }),
      ]);
      window.alert('검사를 저장했습니다. 파일 보관함에서 확인할 수 있습니다.');
      router.push('/archive');
    } catch (error) {
      window.alert(errorMessage(error, '검사를 완료하지 못했습니다.'));
    } finally {
      setConfirming(false);
    }
  };

  if (step === 'datasheet' || !datasheet) {
    return (
      <DatasheetPicker
        onSelect={(sheet) => {
          void queryClient.prefetchQuery({
            queryKey: datasheetDetailQueryKey(sheet.id),
            queryFn: () => fetchDatasheetDetail(sheet.id),
          });
          // 다른 데이터시트로 새로 시작하면 이전에 만든 임시 검사는 폐기
          if (inspectionId != null) {
            queue?.clear();
            void discardInspection(inspectionId)
              .catch(() => undefined)
              .finally(() => void refreshInProgress());
            setInspectionId(null);
          }
          setDatasheet(sheet);
          setBasicValues(emptyBasicInfoValues(userName));
          resetAnswers({});
          setStep('basic');
        }}
      />
    );
  }

  if (step === 'basic') {
    return (
      <BasicInfoForm
        datasheet={datasheet}
        values={basicValues}
        onChange={setBasicValues}
        // 이미 시작한 검사는 데이터시트를 바꿀 수 없으므로, 저장된 채로 대시보드로 나간다
        onBack={() => {
          if (inspectionId != null) {
            void leaveToDashboard();
            return;
          }
          setStep('datasheet');
        }}
        onNext={() => setStep('mode')}
      />
    );
  }

  if (step === 'mode') {
    return (
      <>
        <InspectionModeSelect
          datasheetId={datasheet.id}
          datasheetLabel={datasheet.name}
          metaLabel={basicValues.serialNo || undefined}
          initialMode={mode}
          actionLabel={inspectionId != null ? '검사 이어서 진행' : undefined}
          onBack={() => setStep('basic')}
          onStart={handleStart}
        />
        {starting && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-[1px]">
            <Loader2 className="size-8 animate-spin text-[#3c3c3c]" />
            <p className="text-sm font-semibold text-[#3c3c3c]">검사를 준비하는 중...</p>
          </div>
        )}
      </>
    );
  }

  if (step === 'select') {
    return (
      <DebugItemSelect
        datasheetId={datasheet.id}
        datasheetLabel={datasheet.name}
        answers={answers}
        onBack={() => setStep('mode')}
        onConfirm={handleSelectionConfirm}
      />
    );
  }

  if (step === 'inspect') {
    return (
      <InspectionFillForm
        datasheetId={datasheet.id}
        datasheetLabel={datasheet.name}
        serialNo={basicValues.serialNo}
        unitLabel={basicValues.unit}
        mode={mode}
        answers={answers}
        onChange={handleAnswersChange}
        saveStatus={saveStatus}
        startAtFirstUnanswered={inspectionId != null}
        onHold={() => void leaveToDashboard()}
        onRecheckReason={handleRecheckReason}
        // 뒤로: 모드 선택 → (다시 뒤로) 기번/바코드 등 기본정보. 입력한 답변은 그대로 유지된다
        onBack={() => setStep('mode')}
        onComplete={() => setStep('confirm')}
      />
    );
  }

  return (
    <InspectionCompleteConfirm
      datasheet={datasheet}
      basic={basicValues}
      mode={mode}
      answers={answers}
      confirming={confirming}
      confirmingLabel={confirmingLabel}
      onBack={() => setStep('inspect')}
      onConfirm={(result) => void handleConfirm(result)}
    />
  );
}
