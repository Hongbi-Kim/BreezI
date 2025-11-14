import { createClient } from './supabase/client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`;

// Google Calendar API scopes
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly'
];

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  recurrence?: string[];
  status?: string;
}

export interface CalendarAuthState {
  isConnected: boolean;
  email?: string;
  hasValidToken: boolean;
}

/**
 * Google OAuth URL 생성
 */
export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID || '',
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: CALENDAR_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: crypto.randomUUID() // CSRF protection
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * 백엔드를 통한 Google OAuth 시작
 * 기존 로그인 세션을 유지하면서 캘린더 권한만 요청
 */
export async function initiateGoogleCalendarAuth(): Promise<void> {
  try {
    // 백엔드 API를 호출하여 OAuth URL 가져오기
    const response = await fetch('/make-server-71735bdc/calendar/auth/url', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get OAuth URL');
    }

    const { authUrl } = await response.json();
    
    // 팝업으로 열기
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      authUrl,
      'Google Calendar Authorization',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      // 팝업 차단되면 현재 창에서 열기
      window.location.href = authUrl;
    } else {
      // 팝업 닫힘 감지
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          console.log('OAuth popup closed');
          // 연결 상태 재확인은 ChatRoom에서 처리
        }
      }, 1000);
    }

    console.log('Google Calendar OAuth initiated');
  } catch (error) {
    console.error('Failed to initiate Google Calendar auth:', error);
    throw error;
  }
}

// Access Token 가져오기 helper
async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

/**
 * OAuth 콜백 처리 (Authorization Code 교환)
 */
export async function handleGoogleCalendarCallback(code: string): Promise<string> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Access Token과 Refresh Token 저장
    await storeCalendarTokens(data.access_token, data.refresh_token, data.expires_in);
    
    return data.access_token;
  } catch (error) {
    console.error('Failed to handle Google Calendar callback:', error);
    throw error;
  }
}

/**
 * Calendar 토큰 저장 (localStorage + 백엔드에도 저장)
 */
async function storeCalendarTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const expiresAt = Date.now() + expiresIn * 1000;
  
  // localStorage에 저장 (클라이언트 사이드 사용)
  localStorage.setItem('google_calendar_access_token', accessToken);
  localStorage.setItem('google_calendar_refresh_token', refreshToken);
  localStorage.setItem('google_calendar_expires_at', expiresAt.toString());
  
  // 백엔드에도 저장 (서버 사이드에서 사용할 수 있도록)
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Supabase의 user metadata 또는 별도 테이블에 저장
      await supabase.auth.updateUser({
        data: {
          google_calendar_access_token: accessToken,
          google_calendar_refresh_token: refreshToken,
          google_calendar_expires_at: expiresAt,
        }
      });
    }
  } catch (error) {
    console.error('Failed to store tokens in backend:', error);
  }
}

/**
 * 저장된 Access Token 가져오기
 */
export async function getCalendarAccessToken(): Promise<string | null> {
  const token = localStorage.getItem('google_calendar_access_token');
  const expiresAt = localStorage.getItem('google_calendar_expires_at');
  
  if (!token || !expiresAt) {
    return null;
  }
  
  // 토큰 만료 확인
  if (Date.now() >= parseInt(expiresAt)) {
    console.log('Access token expired, refreshing...');
    return await refreshCalendarAccessToken();
  }
  
  return token;
}

/**
 * Access Token 갱신
 */
async function refreshCalendarAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('google_calendar_refresh_token');
  
  if (!refreshToken) {
    console.error('No refresh token available');
    return null;
  }
  
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 새 토큰 저장
    await storeCalendarTokens(
      data.access_token,
      refreshToken, // Refresh token은 재사용
      data.expires_in
    );
    
    return data.access_token;
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    // 갱신 실패 시 저장된 토큰 제거
    clearCalendarTokens();
    return null;
  }
}

/**
 * Calendar 토큰 제거 (연동 해제)
 */
export function clearCalendarTokens(): void {
  localStorage.removeItem('google_calendar_access_token');
  localStorage.removeItem('google_calendar_refresh_token');
  localStorage.removeItem('google_calendar_expires_at');
}

/**
 * Calendar 연동 상태 확인
 */
export async function getCalendarAuthState(): Promise<CalendarAuthState> {
  const accessToken = await getCalendarAccessToken();
  
  if (!accessToken) {
    return {
      isConnected: false,
      hasValidToken: false,
    };
  }
  
  // 사용자 정보 가져오기
  try {
    const userInfo = await fetchGoogleUserInfo(accessToken);
    return {
      isConnected: true,
      hasValidToken: true,
      email: userInfo.email,
    };
  } catch (error) {
    return {
      isConnected: false,
      hasValidToken: false,
    };
  }
}

/**
 * Google 사용자 정보 가져오기
 */
async function fetchGoogleUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  return response.json();
}

/**
 * Google Calendar 이벤트 가져오기
 * @param timeMin 시작 시간 (ISO 8601 format)
 * @param timeMax 종료 시간 (ISO 8601 format)
 * @param maxResults 최대 결과 개수
 */
export async function fetchCalendarEvents(
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 10
): Promise<CalendarEvent[]> {
  const accessToken = await getCalendarAccessToken();
  
  if (!accessToken) {
    throw new Error('Not authenticated with Google Calendar');
  }
  
  // 기본값: 오늘부터 7일간의 이벤트
  const now = new Date();
  const defaultTimeMin = timeMin || now.toISOString();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const defaultTimeMax = timeMax || weekLater.toISOString();
  
  const params = new URLSearchParams({
    timeMin: defaultTimeMin,
    timeMax: defaultTimeMax,
    maxResults: maxResults.toString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // 토큰 만료, 갱신 시도
        const newToken = await refreshCalendarAccessToken();
        if (newToken) {
          // 재시도
          return fetchCalendarEvents(timeMin, timeMax, maxResults);
        }
      }
      throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    throw error;
  }
}

/**
 * Calendar 이벤트를 읽기 쉬운 텍스트로 변환
 */
export function formatCalendarEventsForAI(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return '일정이 없습니다.';
  }
  
  const formattedEvents = events.map((event, index) => {
    const startTime = event.start.dateTime || event.start.date;
    const endTime = event.end.dateTime || event.end.date;
    const startDate = new Date(startTime!);
    const endDate = new Date(endTime!);
    
    // 날짜/시간 포맷팅
    const dateFormat = new Intl.DateTimeFormat('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }).format(startDate);
    
    const timeFormat = event.start.dateTime
      ? `${startDate.getHours()}:${startDate.getMinutes().toString().padStart(2, '0')} - ${endDate.getHours()}:${endDate.getMinutes().toString().padStart(2, '0')}`
      : '종일';
    
    let eventText = `${index + 1}. ${event.summary}\n`;
    eventText += `   📅 ${dateFormat} ${timeFormat}\n`;
    
    if (event.location) {
      eventText += `   📍 ${event.location}\n`;
    }
    
    if (event.description) {
      eventText += `   📝 ${event.description}\n`;
    }
    
    return eventText;
  }).join('\n');
  
  return `📆 다가오는 일정 (${events.length}개):\n\n${formattedEvents}`;
}

/**
 * 오늘의 일정 가져오기
 */
export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return fetchCalendarEvents(
    today.toISOString(),
    tomorrow.toISOString(),
    50
  );
}

/**
 * 이번 주 일정 가져오기
 */
export async function getWeekEvents(): Promise<CalendarEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  return fetchCalendarEvents(
    today.toISOString(),
    nextWeek.toISOString(),
    50
  );
}
