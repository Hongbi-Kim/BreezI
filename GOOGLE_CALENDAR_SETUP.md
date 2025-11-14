# Google Calendar Integration Setup Guide

이 가이드는 Wave-I의 Rive 캐릭터에 Google Calendar 연동 기능을 설정하는 방법을 설명합니다.

## 📋 목차

1. [개요](#개요)
2. [Google Cloud Console 설정](#google-cloud-console-설정)
3. [Supabase Auth 설정](#supabase-auth-설정)
4. [환경 변수 설정](#환경-변수-설정)
5. [사용 방법](#사용-방법)
6. [문제 해결](#문제-해결)

## 개요

Google Calendar 연동 기능을 통해 Rive 캐릭터가 사용자의 일정을 참고하여 더 맥락 있는 대화를 제공합니다.

### 주요 기능

- ✅ Google OAuth 2.0 인증
- ✅ 캘린더 이벤트 읽기 (읽기 전용)
- ✅ AI 대화 시 일정 참조
- ✅ 자동 토큰 갱신
- ✅ 연결 상태 표시

## Google Cloud Console 설정

### 1. 프로젝트 생성 또는 선택

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트를 생성하거나 기존 프로젝트 선택

### 2. Google Calendar API 활성화

1. 좌측 메뉴에서 **APIs & Services > Library** 선택
2. "Google Calendar API" 검색
3. **Enable** 클릭

### 3. OAuth 2.0 클라이언트 ID 생성

1. **APIs & Services > Credentials** 이동
2. **+ CREATE CREDENTIALS** 클릭
3. **OAuth client ID** 선택
4. Application type: **Web application**
5. Name: `Wave-I Web Client` (원하는 이름)
6. **Authorized JavaScript origins** 추가:
   ```
   http://localhost:5173
   https://your-domain.com
   ```
7. **Authorized redirect URIs** 추가:
   ```
   http://localhost:5173/auth/callback
   https://your-domain.com/auth/callback
   https://your-supabase-project.supabase.co/auth/v1/callback
   ```
8. **CREATE** 클릭
9. **Client ID**와 **Client Secret**를 복사하여 안전하게 보관

### 4. OAuth Consent Screen 설정

1. **OAuth consent screen** 탭으로 이동
2. User Type: **External** 선택 (테스트 중에는 Internal도 가능)
3. 필수 정보 입력:
   - App name: `Wave-I`
   - User support email: 본인 이메일
   - Developer contact information: 본인 이메일
4. **Scopes** 추가:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
5. **Test users** 추가 (External 모드인 경우):
   - 테스트할 Google 계정 이메일 추가
6. **SAVE AND CONTINUE**

## Supabase Auth 설정

### 1. Supabase Dashboard에서 Google Provider 활성화

1. [Supabase Dashboard](https://app.supabase.com/) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **Authentication > Providers** 클릭
4. **Google** provider 찾기
5. **Enable** 토글을 켜기
6. Google Cloud Console에서 복사한 정보 입력:
   - **Client ID**: Google OAuth Client ID
   - **Client Secret**: Google OAuth Client Secret
7. **Save** 클릭

### 2. Redirect URLs 확인

Supabase Auth의 Redirect URLs가 Google Cloud Console에 등록되어 있는지 확인:
```
https://your-project-ref.supabase.co/auth/v1/callback
```

## 환경 변수 설정

### 프론트엔드 (.env 또는 .env.local)

```bash
# Google OAuth (프론트엔드)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your-client-secret

# Supabase (이미 설정되어 있어야 함)
VITE_SUPABASE_PROJECT_ID=your-project-ref
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 백엔드 (Supabase Functions - .env)

Supabase Functions의 환경 변수를 설정합니다:

```bash
# src/supabase/functions/server/.env 또는 Supabase Dashboard에서 설정

# Google OAuth (백엔드)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# AI Server URL
AI_SERVER_URL=http://localhost:8001
```

**Supabase Dashboard에서 환경 변수 설정하는 방법:**
1. Project Settings > Edge Functions > Environment variables
2. 각 변수 추가

## 사용 방법

### 1. 캘린더 연동하기

1. Wave-I 앱에서 Rive 캐릭터(리브 🎵)와의 채팅방 열기
2. 상단 헤더에서 **캘린더 버튼** (📅) 클릭
3. Google 계정 선택 및 권한 승인
4. 캘린더 연동 완료 시 버튼이 초록색으로 변경되고 체크 아이콘이 표시됨

### 2. 캘린더 정보를 활용한 대화

연동 후 Rive 캐릭터와 대화하면:
- 사용자의 앞으로 7일간의 일정을 참고하여 답변
- 일정이 많은 날을 파악하고 휴식 제안
- 루틴 패턴 분석 및 조정 제안

**예시 대화:**
```
사용자: "오늘 뭐 하지?"
리브: "오늘은 오후 2시에 회의가 있고, 저녁 7시에 저녁 약속이 있네요. 
      회의 전에 준비 시간을 가지고, 약속 사이 여유 시간에는 
      가볍게 산책하는 건 어떨까요? 🌿"
```

### 3. 연동 해제하기

1. 캘린더 버튼을 **마우스 오른쪽 클릭** (또는 길게 누르기)
2. 연결 해제 확인 메시지에서 **해제** 클릭

## 문제 해결

### 1. "Failed to connect Google Calendar" 오류

**원인:**
- Google Cloud Console에서 OAuth 클라이언트 ID가 올바르게 설정되지 않음
- Redirect URI가 일치하지 않음

**해결 방법:**
1. Google Cloud Console에서 Redirect URI 확인
2. 브라우저 콘솔에서 실제 redirect URI 확인
3. 둘이 정확히 일치하는지 확인

### 2. "Token expired" 오류

**원인:**
- Access Token이 만료되었고 Refresh Token도 없음

**해결 방법:**
1. 캘린더 연동을 해제하고 다시 연동
2. OAuth 승인 시 `access_type=offline`이 설정되어 있는지 확인

### 3. 캘린더 이벤트가 표시되지 않음

**원인:**
- 캘린더에 이벤트가 없거나 권한이 없음
- API 호출 실패

**해결 방법:**
1. Google Calendar에서 실제 이벤트가 있는지 확인
2. 브라우저 개발자 도구 > Network 탭에서 API 호출 확인
3. 백엔드 로그에서 에러 메시지 확인

### 4. Supabase Auth 오류

**원인:**
- Supabase에서 Google Provider가 활성화되지 않음
- 환경 변수가 올바르지 않음

**해결 방법:**
1. Supabase Dashboard > Authentication > Providers에서 Google 확인
2. Client ID와 Secret이 올바른지 확인
3. Redirect URL이 등록되어 있는지 확인

### 5. 로컬 개발 시 OAuth 리다이렉트 오류

**원인:**
- `http://localhost:5173`이 Authorized redirect URIs에 없음

**해결 방법:**
1. Google Cloud Console에서 다음 URI 추가:
   ```
   http://localhost:5173/auth/callback
   ```
2. 캐시 삭제 후 다시 시도

## 보안 고려사항

### 1. 토큰 저장

- Access Token과 Refresh Token은 Supabase의 user metadata에 저장됩니다
- localStorage에도 캐싱되지만 민감한 정보는 서버에서 관리됩니다

### 2. 권한 범위

- 읽기 전용 권한만 요청합니다 (`calendar.readonly`)
- 캘린더 수정/삭제 권한은 요청하지 않습니다

### 3. 데이터 사용

- 캘린더 데이터는 AI 대화에만 사용되며 저장되지 않습니다
- 대화 종료 후 캘린더 정보는 메모리에서 삭제됩니다

## API 엔드포인트

### Frontend Utils

```typescript
// src/utils/googleCalendar.ts

// OAuth 시작
initiateGoogleCalendarAuth(): Promise<void>

// 캘린더 이벤트 가져오기
fetchCalendarEvents(timeMin?: string, timeMax?: string, maxResults?: number): Promise<CalendarEvent[]>

// 오늘의 일정
getTodayEvents(): Promise<CalendarEvent[]>

// 이번 주 일정
getWeekEvents(): Promise<CalendarEvent[]>

// 연결 상태 확인
getCalendarAuthState(): Promise<CalendarAuthState>

// 토큰 제거
clearCalendarTokens(): void
```

### Backend Endpoints

```bash
# 캘린더 이벤트 조회
GET /make-server-71735bdc/calendar/events
Query Parameters:
  - timeMin (optional): ISO 8601 timestamp
  - timeMax (optional): ISO 8601 timestamp
  - maxResults (optional): number (default: 10)

# 연결 상태 확인
GET /make-server-71735bdc/calendar/status
```

## 다음 단계

1. ✅ 기본 OAuth 연동 완료
2. ✅ 캘린더 데이터 AI 컨텍스트에 통합
3. 🔄 일정 기반 자동 알림 (선택사항)
4. 🔄 주간/월간 일정 요약 (선택사항)
5. 🔄 일정 패턴 분석 및 리포트 (선택사항)

## 참고 자료

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/v3/reference)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)

---

**문의사항이나 문제가 있으시면 이슈를 등록해주세요!** 🌊
