import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Supabase 클라이언트 생성 (Cookie 기반 세션 관리)
 * - 자동 토큰 갱신 활성화
 * - 세션 지속성 활성화
 * - Access Token: 15분 (Supabase 프로젝트 설정에서 조정 필요)
 * - Refresh Token: 2주 (Supabase 프로젝트 설정에서 조정 필요)
 */
export function createClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          // 자동 토큰 갱신 활성화 (기본값이지만 명시)
          autoRefreshToken: true,
          // 세션 지속성 활성화
          persistSession: true,
          // localStorage 사용 (브라우저 환경에서는 HttpOnly Cookie 직접 사용 불가)
          // 프로덕션에서는 서버 사이드 렌더링 시 Cookie 저장소 사용 권장
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          // 토큰 갱신 임계값: 만료 60초 전에 자동 갱신
          detectSessionInUrl: true,
        },
      }
    );

    // 세션 상태 변경 ���스너 설정
    supabaseInstance.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State changed:', event, session ? 'Session active' : 'No session');
      
      // 토큰이 갱신되면 로그 출력
      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Access token refreshed successfully');
      }
      
      // 세션이 만료되면 로그 출력
      if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out');
      }
      
      // 에러 발생 시 로그
      if (event === 'USER_UPDATED') {
        console.log('[Auth] User data updated');
      }
    });
  }
  return supabaseInstance;
}

/**
 * 현재 세션의 Access Token 가져오기
 * localStorage 직접 접근 대신 이 함수를 사용하세요
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Auth] Failed to get session:', error);
      return null;
    }
    
    return session?.access_token || null;
  } catch (error) {
    console.error('[Auth] Error getting access token:', error);
    return null;
  }
}

/**
 * 세션 갱신 (수동 갱신이 필요한 경우)
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('[Auth] Failed to refresh session:', error);
      return false;
    }
    
    console.log('[Auth] Session refreshed manually');
    return !!data.session;
  } catch (error) {
    console.error('[Auth] Error refreshing session:', error);
    return false;
  }
}
