/**
 * 간단한 캐싱 시스템 (메모리 + localStorage)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5분

  /**
   * 캐시에서 데이터 가져오기
   */
  get<T>(key: string): T | null {
    // 1. 메모리 캐시 확인
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.data as T;
    }

    // 2. localStorage 확인
    try {
      const storedData = localStorage.getItem(`cache:${key}`);
      if (storedData) {
        const entry: CacheEntry<T> = JSON.parse(storedData);
        if (entry.expiresAt > Date.now()) {
          // 메모리 캐시에도 저장
          this.memoryCache.set(key, entry);
          return entry.data;
        } else {
          // 만료된 데이터 삭제
          localStorage.removeItem(`cache:${key}`);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }

    return null;
  }

  /**
   * 캐시에 데이터 저장
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    // 메모리 캐시에 저장
    this.memoryCache.set(key, entry);

    // localStorage에 저장 (에러 무시)
    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Cache write error (localStorage full?):', error);
    }
  }

  /**
   * 특정 키 삭제
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`cache:${key}`);
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  /**
   * 패턴에 맞는 모든 키 삭제
   */
  deletePattern(pattern: string): void {
    // 메모리 캐시
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // localStorage
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('cache:') && key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Cache delete pattern error:', error);
    }
  }

  /**
   * 모든 캐시 삭제
   */
  clear(): void {
    this.memoryCache.clear();
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('cache:')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup(): void {
    const now = Date.now();

    // 메모리 캐시
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }

    // localStorage
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('cache:')) {
          const data = localStorage.getItem(key);
          if (data) {
            const entry = JSON.parse(data);
            if (entry.expiresAt <= now) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }
}

// 싱글톤 인스턴스
export const cache = new CacheManager();

// 정기적으로 만료된 캐시 정리 (10분마다)
if (typeof window !== 'undefined') {
  setInterval(() => cache.cleanup(), 10 * 60 * 1000);
}

/**
 * 캐시 키 생성 헬퍼
 */
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

/**
 * 캐시와 함께 데이터 페칭하는 헬퍼
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // 캐시 확인
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // 데이터 페칭
  const data = await fetcher();

  // 캐시에 저장
  cache.set(key, data, ttl);

  return data;
}
