# Google Calendar Integration - 문제 해결 및 개선사항

## 🔧 해결된 문제들

### 1. ❌ **문제**: 캘린더 연동 시 다른 계정으로 로그인되는 문제

**원인**:
- `supabase.auth.signInWithOAuth()`를 사용하여 새로운 인증 세션이 생성됨
- 기존 로그인 세션이 구글 계정으로 대체됨

**해결**:
- ✅ **OAuth 팝업 방식**으로 변경
- ✅ 백엔드에서 OAuth URL 생성 (`/calendar/auth/url`)
- ✅ 팝업 창에서 OAuth 진행, 메인 세션 유지
- ✅ 콜백 처리 후 팝업 자동 닫힘

**새로운 플로우**:
```
사용자 클릭 
  → 백엔드에서 OAuth URL 생성 
  → 팝업 열림 
  → 구글 인증 
  → 백엔드 콜백 처리 
  → 토큰 저장 
  → 팝업 닫힘 (postMessage) 
  → 메인 창 상태 업데이트
```

---

### 2. ❌ **문제**: AI가 캘린더 데이터를 사용하는지 불명확

**원인**:
- 로그가 부족하여 캘린더 데이터 전달 여부 확인 어려움
- AI 응답에 캘린더 정보 포함 여부 불확실

**해결**:
- ✅ **로그 추가**: AI 서버에서 캘린더 이벤트 수 출력
- ✅ **백엔드 로그**: 캘린더 데이터 fetch 성공/실패 로그
- ✅ **프론트 콘솔**: OAuth 플로우 각 단계 로그

**확인 방법**:
```bash
# Python AI 서버 콘솔에서 확인
📅 Including 5 calendar events in AI context

# 브라우저 콘솔에서 확인
✅ Fetched 5 calendar events
📅 Fetching calendar events for Rive character...
```

---

### 3. ❌ **문제**: 연동 상태 표시 및 해제 기능 부족

**원인**:
- 캘린더 버튼이 연결 상태를 명확히 표시하지 않음
- 연결 해제 방법이 직관적이지 않음 (길게 누르기)

**해결**:
- ✅ **시각적 표시**: 연결 시 초록색 + 체크마크 (✓)
- ✅ **연결 상태 토스트**: 클릭 시 현재 계정 이메일 표시
- ✅ **해제 버튼**: 토스트에 "연결 해제" 액션 버튼 추가
- ✅ **백엔드 API**: `/calendar/disconnect` 엔드포인트

**UI 개선**:
- 🔴 연결 전: 회색 캘린더 아이콘
- 🟢 연결 후: 초록색 + 체크마크 + 캘린더 아이콘
- 클릭 시: 이메일 표시 + "연결 해제" 버튼

---

## 📁 변경된 파일

### 새로 생성된 파일
없음 (기존 파일만 수정)

### 수정된 파일

#### 1. `src/utils/googleCalendar.ts`
**변경사항**:
- `initiateGoogleCalendarAuth()`: Supabase OAuth 대신 백엔드 API 호출
- 팝업 방식으로 변경하여 메인 세션 유지
- `getAccessToken()` helper 추가

**코드**:
```typescript
export async function initiateGoogleCalendarAuth(): Promise<void> {
  // 백엔드 API를 호출하여 OAuth URL 가져오기
  const response = await fetch('/make-server-71735bdc/calendar/auth/url', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`,
    },
  });

  const { authUrl } = await response.json();
  
  // 팝업으로 열기
  const popup = window.open(authUrl, 'Google Calendar Authorization', ...);
}
```

#### 2. `src/supabase/functions/server/index.tsx`
**추가된 엔드포인트**:

**a) `GET /calendar/auth/url`**
- OAuth URL 생성
- 사용자 ID를 state에 포함
- 팝업 redirect URI 사용

**b) `GET /calendar/callback`**
- OAuth code를 token으로 교환
- User metadata에 토큰 저장
- 성공 페이지 표시 후 팝업 자동 닫기

**c) `POST /calendar/disconnect`**
- User metadata에서 캘린더 토큰 제거
- 연결 해제 성공 응답

#### 3. `src/components/ChatRoom.tsx`
**변경사항**:
- `window.message` 이벤트 리스너 추가 (팝업에서 연결 완료 메시지 수신)
- `connectGoogleCalendar()`: 연결 시 이메일 + 해제 버튼 표시
- `disconnectGoogleCalendar()`: 백엔드 API 호출하여 토큰 제거
- `onContextMenu` 제거 (더 직관적인 UI로 대체)

**코드**:
```typescript
// Listen for calendar connection from popup
const handleMessage = (event: MessageEvent) => {
  if (event.data?.type === 'calendar-connected') {
    toast.success('구글 캘린더 연동이 완료되었습니다!');
    setTimeout(() => checkCalendarAuthState(), 1000);
  }
};

window.addEventListener('message', handleMessage);
```

#### 4. `src/local-backend/ai_server.py`
**변경사항**:
- 캘린더 이벤트 수 로그 추가
- AI 컨텍스트에 캘린더 데이터 포함 여부 명확히 표시

**코드**:
```python
if actual_char_id == 'char_4' and request.calendarEvents:
    print(f"📅 Including {len(request.calendarEvents)} calendar events in AI context")
    calendar_context = "\n\n📅 **구글 캘린더 일정:**\n"
    # ... 이벤트 포맷팅
```

#### 5. `.env.google.example`
**변경사항**:
- `APP_URL` 환경 변수 추가 (redirect URI 생성에 필요)
- 불필요한 주석 제거

---

## 🚀 배포 가이드

### 1. 환경 변수 설정

#### 프론트엔드 (`.env` 또는 `.env.local`)
```bash
# Google OAuth 클라이언트 ID (프론트엔드)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your-client-secret
```

#### 백엔드 (Supabase Functions 환경 변수)
```bash
# Google OAuth (백엔드)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# 앱 URL (redirect URI 생성용)
APP_URL=https://your-domain.com  # 프로덕션
# APP_URL=http://localhost:5173   # 로컬 개발
```

### 2. Google Cloud Console 설정

**Authorized redirect URIs에 추가**:
```
http://localhost:5173/calendar-callback     # 로컬 개발
https://your-domain.com/calendar-callback   # 프로덕션
```

**중요**: `/calendar-callback`은 백엔드 엔드포인트입니다!

### 3. 테스트 절차

#### Step 1: 로컬 환경 테스트
```bash
# 1. 모든 서버 실행
npm run dev:all:py

# 2. 리브 캐릭터 채팅 열기
# 3. 캘린더 버튼 클릭
# 4. 팝업에서 구글 계정 선택 및 권한 승인
# 5. "Calendar Connected!" 메시지 확인
# 6. 팝업 자동 닫힘 확인
# 7. 메인 창에서 초록색 체크마크 확인
```

#### Step 2: 캘린더 데이터 확인
```bash
# 브라우저 콘솔에서 확인
✅ Fetched 5 calendar events

# Python AI 서버 콘솔에서 확인
📅 Including 5 calendar events in AI context

# 채팅 테스트
"오늘 일정 어때?"
→ AI가 실제 캘린더 이벤트를 참고하여 답변
```

#### Step 3: 연결 해제 테스트
```bash
# 1. 캘린더 버튼 클릭
# 2. 토스트에서 "연결 해제" 버튼 클릭
# 3. 버튼이 회색으로 변경되는지 확인
# 4. 다시 연결 가능한지 확인
```

---

## 🐛 문제 해결

### 문제 1: 팝업이 차단됨
**증상**: 팝업 창이 열리지 않음

**해결**:
1. 브라우저 팝업 차단 해제
2. 팝업이 차단되면 현재 탭에서 열림 (fallback)

### 문제 2: 캘린더 데이터가 AI에 포함되지 않음
**증상**: AI가 일정을 참고하지 않음

**확인 사항**:
```bash
# 1. 브라우저 콘솔 확인
✅ Fetched X calendar events  # X > 0 이어야 함

# 2. Python 서버 콘솔 확인
📅 Including X calendar events in AI context

# 3. 네트워크 탭 확인
/chat/char_4 요청의 payload에 calendarEvents 배열 있는지 확인
```

**해결**:
- 구글 캘린더에 실제 이벤트가 있는지 확인
- 환경 변수가 올바르게 설정되었는지 확인
- 토큰이 만료되지 않았는지 확인

### 문제 3: 콜백 페이지에서 에러
**증상**: "Token Exchange Failed" 메시지

**원인**:
- `GOOGLE_CLIENT_SECRET`이 백엔드에 설정되지 않음
- Redirect URI가 Google Cloud Console에 등록되지 않음

**해결**:
```bash
# 1. 백엔드 환경 변수 확인
echo $GOOGLE_CLIENT_SECRET

# 2. Google Cloud Console에서 Redirect URI 확인
# Authorized redirect URIs에 다음이 있는지:
http://localhost:5173/calendar-callback
https://your-domain.com/calendar-callback
```

---

## ✅ 테스트 체크리스트

### 기능 테스트
- [ ] 캘린더 버튼 클릭 시 팝업 열림
- [ ] 구글 계정 선택 및 권한 승인
- [ ] 팝업 자동 닫힘
- [ ] 메인 창에서 초록색 체크마크 표시
- [ ] 연결 상태 토스트 표시 (이메일 포함)
- [ ] "연결 해제" 버튼으로 해제 가능
- [ ] 해제 후 다시 연결 가능

### AI 통합 테스트
- [ ] 리브 캐릭터와 대화 시 일정 참고
- [ ] 브라우저 콘솔에 "Fetched X calendar events" 로그
- [ ] Python 서버 콘솔에 "Including X calendar events" 로그
- [ ] AI 응답에 실제 일정 내용 포함

### 에러 처리 테스트
- [ ] 팝업 차단 시 현재 탭에서 열림
- [ ] OAuth 거부 시 적절한 에러 메시지
- [ ] 네트워크 에러 시 재시도 가능
- [ ] 토큰 만료 시 자동 갱신

---

## 📝 다음 단계 (선택사항)

### 향상된 기능
1. **일정 알림**: 다가오는 이벤트 알림
2. **주간 요약**: 주간 일정 요약 자동 생성
3. **일정 생성**: 대화 중 일정 추가 기능
4. **다중 캘린더**: 여러 캘린더 지원

### UI/UX 개선
1. **로딩 상태**: OAuth 진행 중 로딩 표시
2. **에러 복구**: 에러 시 재시도 버튼
3. **캘린더 미리보기**: 버튼 hover 시 최근 일정 표시

---

**모든 문제 해결 완료!** ✅

이제 사용자는:
1. ✅ 기존 계정 유지하면서 캘린더 연동 가능
2. ✅ AI가 캘린더 데이터 사용하는지 명확히 확인 가능
3. ✅ 연결 상태를 시각적으로 확인 및 쉽게 해제 가능
