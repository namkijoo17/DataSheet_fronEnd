import { ApiError } from '@/shared/api/client';

import type { InspectionAnswerPayload } from '../model/inspection-types';

export type SaveStatus = 'idle' | 'saving' | 'retrying' | 'error';

type SendFn = (itemId: number, payload: InspectionAnswerPayload) => Promise<void>;

const DEBOUNCE_MS = 250;
const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 15000;

/** 재시도해도 소용없는 오류(잘못된 요청·없는 검사·이미 완료 등) */
function isFatal(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 408 || error.status === 429) return false;
  return error.status >= 400 && error.status < 500 && error.status !== 401;
}

/**
 * 항목별 답변 저장 큐.
 * - 같은 항목은 마지막 값만 저장(coalesce), 서버 요청은 순차 처리
 * - 네트워크/5xx 실패 시 화면은 그대로 두고 백그라운드에서 재시도(지수 백오프)
 */
export class InspectionSaveQueue {
  private pending = new Map<number, InspectionAnswerPayload>();
  private status: SaveStatus = 'idle';
  /** 재시도해도 소용없는 오류로 저장하지 못한 항목 */
  private failed = new Map<number, string>();
  private listeners = new Set<() => void>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private waiters: Array<() => void> = [];
  private failures = 0;

  constructor(private readonly send: SendFn) {}

  enqueue(itemId: number, payload: InspectionAnswerPayload) {
    // 재삽입으로 최신 변경이 뒤로 가도록
    this.pending.delete(itemId);
    this.pending.set(itemId, payload);
    this.failed.delete(itemId);
    if (this.status === 'error' && this.failed.size === 0) this.setStatus('idle');
    // 실행 중이거나 재시도 대기 중이면 해당 루프가 이어서 처리한다
    if (this.running || this.retryTimer) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.run();
    }, DEBOUNCE_MS);
  }

  /** 대기 중인 저장을 모두 버린다 (검사 재시작 직전) */
  clear() {
    this.pending.clear();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.debounceTimer = null;
    this.retryTimer = null;
    this.failures = 0;
    this.failed.clear();
    this.setStatus('idle');
    this.resolveWaiters();
  }

  hasPending() {
    return this.pending.size > 0 || this.running;
  }

  getStatus() {
    return this.status;
  }

  /** 저장하지 못하고 버려진 항목의 오류 메시지 (없으면 null) */
  getFailureMessage() {
    const first = this.failed.values().next();
    return first.done ? null : first.value;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 대기 중인 저장이 모두 끝날 때까지 기다린다. 제한 시간 안에 끝나면 true */
  flush(timeoutMs = 10000): Promise<boolean> {
    if (!this.hasPending()) return Promise.resolve(true);
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    void this.run();

    return new Promise<boolean>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(!this.hasPending());
      };
      const timer = setTimeout(finish, timeoutMs);
      this.waiters.push(finish);
    });
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    this.setStatus(this.failures > 0 ? 'retrying' : 'saving');

    try {
      while (this.pending.size > 0) {
        const [itemId, payload] = this.pending.entries().next().value as [
          number,
          InspectionAnswerPayload,
        ];
        try {
          await this.send(itemId, payload);
          if (this.pending.get(itemId) === payload) {
            this.pending.delete(itemId);
          }
          this.failures = 0;
          this.failed.delete(itemId);
          if (this.failed.size === 0) this.setStatus('saving');
        } catch (error) {
          if (isFatal(error)) {
            // 이 항목은 재시도해도 실패하므로 버리고 다음으로
            if (this.pending.get(itemId) === payload) this.pending.delete(itemId);
            this.failed.set(itemId, error instanceof Error ? error.message : '저장 실패');
            this.setStatus('error');
            continue;
          }
          this.failures += 1;
          this.setStatus('retrying');
          this.scheduleRetry();
          return;
        }
      }
      if (this.failed.size === 0) this.setStatus('idle');
    } finally {
      this.running = false;
      if (this.pending.size === 0 && !this.retryTimer) this.resolveWaiters();
    }
  }

  private scheduleRetry() {
    const delay = Math.min(RETRY_BASE_MS * 2 ** (this.failures - 1), RETRY_MAX_MS);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.run();
    }, delay);
  }

  private setStatus(next: SaveStatus) {
    if (this.status === next) return;
    this.status = next;
    this.listeners.forEach((listener) => listener());
  }

  private resolveWaiters() {
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((resolve) => resolve());
  }
}
