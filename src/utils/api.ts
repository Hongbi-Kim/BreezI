import { projectId, publicAnonKey } from './supabase/info';
import { createClient, getAccessToken } from './supabase/client';

// 환경에 따라 API Base URL 결정
const getApiBase = () => {
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
    token = publicAnonKey;
  }
  
  const url = `${API_BASE}${endpoint}`;
  
  // 디버깅 로그 (개발 환경에서만)
  if (import.meta.env.DEV) {
    console.log('📡 API Call:', {
      url,
      method: options.method || 'GET',
      hasAuth: !!token
    });
  }
  
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
      console.log('[API] 401 error, attempting to refresh session...');
      
      const supabase = createClient();
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (data.session?.access_token && !refreshError) {
        console.log('[API] Session refreshed, retrying request...');
        // Retry with new token (recursive call, but only once)
        return apiCall(endpoint, options, useAuth);
      } else {
        // Session is truly invalid
        console.error('[API] Session refresh failed:', refreshError);
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    throw new Error(error.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  
  // 개발 환경에서 응답 로그
  if (import.meta.env.DEV) {
    console.log('✅ API Response:', {
      url,
      data
    });
  }

  return data;
}
