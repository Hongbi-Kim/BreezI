// import { projectId, publicAnonKey } from './supabase/info';
import { createClient, getAccessToken } from './supabase/client';

// 환경 변수에서 Supabase 설정 가져오기
const getSupabaseConfig = () => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!projectId || !publicAnonKey) {
    throw new Error(
      'Supabase 환경 변수가 설정되지 않았습니다.\n' +
      '필요한 변수: VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_ANON_KEY'
    );
  }

  return { projectId, publicAnonKey };
};

// 환경에 따라 API Base URL 결정
const getApiBase = () => {
  const { projectId } = getSupabaseConfig();

  // 1. 환경 변수로 명시적으로 설정된 경우 (최우선)
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    // /make-server-71735bdc가 이미 포함되어 있으면 그대로 사용
    if (url.includes('/make-server-71735bdc')) {
      return url;
    }
    // 없으면 추가
    return `${url.replace(/\/$/, '')}/make-server-71735bdc`;
  }
  
  // 2. 개발 환경 (npm run dev)
  if (import.meta.env.DEV) {
    console.log('🔧 Development mode: Using local backend');
    return 'http://localhost:8000/make-server-71735bdc';
  }
  
  // 3. 프로덕션 환경
  console.log('🚀 Production mode: Using Supabase Functions');
  return `https://${projectId}.supabase.co/functions/v1/make-server-71735bdc`;
};

const API_BASE = getApiBase();

// 시작 시 API Base URL 로그
console.log('🔗 API Base URL:', API_BASE);

/**
 * API 호출 유틸리티 (Cookie 기반 세션 관리)
 * - localStorage 직접 접근 제거
 * - Supabase 세션에서 토큰을 자동으로 가져옴
 * - 401 에러 시 자동으로 세션 갱신 시도
 */
// Track retry attempts to prevent infinite loops
const retryAttempts = new Map<string, number>();
const MAX_RETRIES = 1;

// API call counter for debugging
let apiCallCount = 0;
let apiCallCountResetInterval: NodeJS.Timeout | null = null;

// Reset counter every 10 seconds and log
if (typeof window !== 'undefined') {
  apiCallCountResetInterval = setInterval(() => {
    if (apiCallCount > 0) {
      console.log(`[API Monitor] 📊 API calls in last 10s: ${apiCallCount}`);
      if (apiCallCount > 20) {
        console.warn(`[API Monitor] ⚠️ HIGH API USAGE: ${apiCallCount} calls in 10 seconds!`);
      }
    }
    apiCallCount = 0;
  }, 10000);
}

export async function apiCall(
  endpoint: string,
  options: RequestInit = {},
  useAuth = true
) {
  let token: string | null = null;
  
  if (useAuth) {
    // Supabase 세션에서 토큰 가져오기 (자동 갱신 포함)
    token = await getAccessToken();
    
    if (!token) {
      throw new Error('No valid session found');
    }
  } else {
    const { publicAnonKey } = getSupabaseConfig();
    token = publicAnonKey;
  }
  
  const url = `${API_BASE}${endpoint}`;
  const requestKey = `${endpoint}:${options.method || 'GET'}`;
  
  // Increment API call counter
  apiCallCount++;
  
  // 디버깅 로그 (항상 출력하여 API 호출 추적)
  console.log(`📡 API Call #${apiCallCount}:`, {
    endpoint,
    method: options.method || 'GET',
    hasAuth: !!token,
    retryCount: retryAttempts.get(requestKey) || 0,
    timestamp: new Date().toISOString()
  });
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      
      // 개발 환경에서 에러 로그
      if (import.meta.env.DEV) {
        console.error('❌ API Error:', {
          status: response.status,
          url,
          error
        });
      }
      
      // If 401 and using auth, try to refresh the session
      if (response.status === 401 && useAuth) {
        const currentRetries = retryAttempts.get(requestKey) || 0;
        
        if (currentRetries >= MAX_RETRIES) {
          console.error('[API] Max retries reached for', requestKey);
          retryAttempts.delete(requestKey);
          throw new Error('Session expired. Please log in again.');
        }
        
        console.log('[API] 401 error, attempting to refresh session...');
        
        const supabase = createClient();
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (data.session?.access_token && !refreshError) {
          console.log('[API] Session refreshed successfully, retrying request...');
          retryAttempts.set(requestKey, currentRetries + 1);
          
          // Retry with new token (recursive call, but limited by MAX_RETRIES)
          const result = await apiCall(endpoint, options, useAuth);
          
          // Clear retry count on success
          retryAttempts.delete(requestKey);
          return result;
        } else {
          // Session is truly invalid
          console.error('[API] Session refresh failed:', refreshError);
          retryAttempts.delete(requestKey);
          throw new Error('Session expired. Please log in again.');
        }
      }
      
      throw new Error(error.error || `API error: ${response.status}`);
    }

    // Clear retry count on successful request
    retryAttempts.delete(requestKey);

    const data = await response.json();
    
    // 개발 환경에서 응답 로그
    if (import.meta.env.DEV) {
      console.log('✅ API Response:', {
        url,
        data
      });
    }

    return data;
  } catch (fetchError: any) {
    // Network errors (connection failed, timeout, etc.)
    if (fetchError.message === 'Failed to fetch' || fetchError.name === 'TypeError') {
      console.error('[API] Network error:', fetchError);
      throw new Error('Failed to fetch');
    }
    throw fetchError;
  }
}