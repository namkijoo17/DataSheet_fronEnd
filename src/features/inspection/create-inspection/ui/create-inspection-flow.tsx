'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/session/auth-store';
import {
  datasheetDetailQueryKey,
  fetchDatasheetDetail,
  type DatasheetSummary,
} from '@/features/settings';

import type { InspectionAnswers } from '../lib/inspection-answers';
import {
  emptyBasicInfoValues,
  type BasicInfoFormValues,
} from '../lib/basic-info-fields';
import type { InspectionModeId } from '../model/inspection-modes';
import { BasicInfoForm } from './basic-info-form';
import { DatasheetPicker } from './datasheet-picker';
import { InspectionCompleteConfirm } from './inspection-complete-confirm';
import { InspectionFillForm } from './inspection-fill-form';
import { InspectionModeSelect } from './inspection-mode-select';

type Step = 'datasheet' | 'basic' | 'mode' | 'inspect' | 'confirm';

export function CreateInspectionFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userName = useAuthStore((state) => state.user?.name ?? '');
  const [step, setStep] = useState<Step>('datasheet');
  const [datasheet, setDatasheet] = useState<DatasheetSummary | null>(null);
  const [basicValues, setBasicValues] = useState<BasicInfoFormValues>(() =>
    emptyBasicInfoValues(userName),
  );
  const [mode, setMode] = useState<InspectionModeId>('BASIC');
  const [answers, setAnswers] = useState<InspectionAnswers>({});

  if (step === 'datasheet' || !datasheet) {
    return (
      <DatasheetPicker
        onSelect={(sheet) => {
          void queryClient.prefetchQuery({
            queryKey: datasheetDetailQueryKey(sheet.id),
            queryFn: () => fetchDatasheetDetail(sheet.id),
          });
          setDatasheet(sheet);
          setBasicValues(emptyBasicInfoValues(userName));
          setAnswers({});
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
        onBack={() => setStep('datasheet')}
        onNext={() => setStep('mode')}
      />
    );
  }

  if (step === 'mode') {
    return (
      <InspectionModeSelect
        datasheetId={datasheet.id}
        datasheetLabel={datasheet.code || datasheet.name}
        metaLabel={basicValues.serialNo || undefined}
        onBack={() => setStep('basic')}
        onStart={(selectedMode) => {
          setMode(selectedMode);
          setAnswers({});
          setStep('inspect');
        }}
      />
    );
  }

  if (step === 'inspect') {
    return (
      <InspectionFillForm
        datasheetId={datasheet.id}
        datasheetLabel={datasheet.code || datasheet.name}
        serialNo={basicValues.serialNo}
        unitLabel={basicValues.unit}
        mode={mode}
        answers={answers}
        onChange={setAnswers}
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
      onBack={() => setStep('inspect')}
      onConfirm={() => {
        window.alert('검사를 저장했습니다. (서버 연동 예정)');
        router.push('/dashboard');
      }}
    />
  );
}
