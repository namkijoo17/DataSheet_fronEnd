export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiErrorBody = {
  code?: string;
  message?: string;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      body?.code ?? 'UNKNOWN',
      body?.message ?? '요청에 실패했습니다.',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
