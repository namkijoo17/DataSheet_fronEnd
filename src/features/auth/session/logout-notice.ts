export type LogoutReason = 'idle' | 'expired' | 'manual';

const STORAGE_KEY = 'auth-logout-notice';

const MESSAGES: Record<LogoutReason, string> = {
  idle: '30분 동안 사용이 없어 자동 로그아웃되었습니다.',
  expired: '세션이 만료되어 로그아웃되었습니다. 다시 로그인해주세요.',
  manual: '로그아웃되었습니다.',
};

export function setLogoutNotice(reason: LogoutReason) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, reason);
}

export function consumeLogoutNotice(): string | null {
  if (typeof window === 'undefined') return null;
  const reason = sessionStorage.getItem(STORAGE_KEY) as LogoutReason | null;
  if (!reason) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  return MESSAGES[reason] ?? null;
}
