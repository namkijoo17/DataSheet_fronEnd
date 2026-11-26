import { fetchInspectionFileBlob } from '@/features/inspection/create-inspection';

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 정렬 기준 시각: 완료 시각이 있으면 완료, 없으면 마지막 저장 */
export function sortTime(item: { completedAt: string | null; updatedAt: string }) {
  return item.completedAt ?? item.updatedAt;
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * 결과 PDF 를 새 탭에서 연다.
 * 팝업 차단을 피하려고 탭은 클릭 동기 구간에서 먼저 연다. 탭을 못 열면 저장으로 대체한다.
 */
export async function openResultFile(id: number, fileName: string | null) {
  const tab = window.open('', '_blank');
  try {
    const blob = await fetchInspectionFileBlob(id);
    const pdf = new Blob([blob], { type: 'application/pdf' });
    if (tab) {
      const url = URL.createObjectURL(pdf);
      tab.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
      saveBlob(pdf, fileName ?? `inspection_${id}.pdf`);
    }
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export async function downloadResultFile(id: number, fileName: string | null) {
  const blob = await fetchInspectionFileBlob(id, true);
  saveBlob(blob, fileName ?? `inspection_${id}.pdf`);
}
