/**
 * 네트워크 유틸리티 - 재시도 로직, 타임아웃, 에러 처리
 */

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * 타임아웃이 있는 fetch
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError('요청 시간이 초과되었습니다', undefined, error);
    }
    throw error;
  }
}

/**
 * 재시도 로직이 있는 fetch
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    retryDelay = 1000,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions);

      // 5xx 에러는 재시도
      if (response.status >= 500 && attempt < retries) {
        lastError = new NetworkError(
          `서버 오류 (${response.status})`,
          response.status
        );
        onRetry?.(attempt + 1, lastError);
        await sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        onRetry?.(attempt + 1, lastError);
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw new NetworkError(
    '네트워크 연결에 실패했습니다. 다시 시도해주세요.',
    undefined,
    lastError || undefined
  );
}

/**
 * JSON 응답을 파싱하는 헬퍼
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options);

  if (!response.ok) {
    let errorMessage = '요청에 실패했습니다';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }
    throw new NetworkError(errorMessage, response.status);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new NetworkError(
      '응답 데이터를 처리할 수 없습니다',
      response.status,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Sleep 유틸리티
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 네트워크 상태 체크
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * 네트워크 상태 변경 리스너
 */
export function addNetworkListener(
  callback: (online: boolean) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
