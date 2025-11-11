# 🤖 로컬 AI 서버 가이드

## 📌 개요

Ollama API를 사용한 AI 응답 생성을 로컬 서버로 분리했습니다.
Supabase Functions는 서버리스 환경이라 Ollama를 직접 실행할 수 없기 때문입니다.

## 🏗️ 아키텍처

```
Frontend (Vercel)
    ↓
Supabase Functions (프로필, 일기, 리포트 등)
    
로컬 AI 서버 (Port 8001)
    ↓
Ollama API (AI 응답 생성)
```

## 🚀 시작하기

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가:

```bash
# Ollama API 설정
OLLAMA_BASE_URL=https://api.ollama.ai/v1
OLLAMA_MODEL=gpt-oss:120b-cloud
OLLAMA_API_KEY=your-api-key-here
```

### 2. AI 서버만 실행

```bash
npm run ai-server
```

출력 예시:
```
🤖 AI Server running on http://localhost:8001
📡 Ollama API: https://api.ollama.ai/v1
🔑 API Key configured: true
```

### 3. 프론트엔드 + AI 서버 동시 실행

```bash
npm run dev:all
```

이 명령어는 다음 2개를 동시에 실행합니다:
- Frontend (Port 5173)
- AI Server (Port 8001)

## 🧪 테스트

### Health Check

```bash
curl http://localhost:8001/health
```

응답:
```json
{
  "status": "ok",
  "service": "AI Server",
  "ollamaConfigured": true
}
```

### AI 채팅 테스트

```bash
curl -X POST http://localhost:8001/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "char_1",
    "message": "안녕하세요",
    "profile": {
      "nickname": "테스터",
      "aiInfo": "개발자입니다"
    },
    "chatHistory": []
  }'
```

응답 예시:
```json
{
  "content": "안녕하세요! 오늘 하루는 어떠셨나요?",
  "respondingCharacter": null
}
```

### 그룹 채팅 테스트 (캐릭터 자동 선택)

```bash
curl -X POST http://localhost:8001/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "char_group",
    "message": "요즘 너무 힘들어...",
    "profile": {
      "nickname": "테스터"
    },
    "chatHistory": []
  }'
```

응답 예시:
```json
{
  "content": "그 마음 이해해요. 힘들 때는 언제든 이야기해주세요.",
  "respondingCharacter": {
    "charId": "char_1",
    "charName": "루미",
    "charEmoji": "💡",
    "reason": "감정적 지원 키워드 감지"
  }
}
```

## 📁 파일 구조

```
/home/user/webapp/
├── src/
│   └── local-backend/
│       └── ai-server.ts          # AI 서버 메인 파일
├── .env.ai.example                # 환경 변수 예시
├── package.json                   # AI 서버 스크립트 추가됨
└── README-AI-SERVER.md            # 이 문서
```

## 🔧 개발 워크플로우

### 현재 상태 (Phase 1 - 점진적 마이그레이션)

1. ✅ **로컬 AI 서버 생성 완료**
2. ✅ **의존성 설치 완료**
3. ✅ **실행 스크립트 추가 완료**
4. ⏳ **Supabase Functions 수정 대기 중**

### 다음 단계 (Phase 2 - 나중에)

Supabase Functions (`src/supabase/functions/server/index.tsx`)를 수정하여:
- AI 관련 코드 제거
- 로컬 AI 서버 호출로 변경

```typescript
// Before: Supabase Functions에서 직접 Ollama 호출
const aiResponse = await getAIResponseWithMemory(...)

// After: 로컬 AI 서버 호출
const response = await fetch('http://localhost:8001/ai/chat', {...})
```

## 🎯 현재 작동 방식

### AI 서버가 처리하는 것:
- ✅ AI 응답 생성
- ✅ 그룹 채팅 캐릭터 선택 (멘션/키워드/LLM)
- ✅ Ollama API 호출
- ✅ Fallback 응답 (에러 시)

### Supabase Functions가 처리하는 것:
- ✅ 사용자 인증
- ✅ 프로필 관리
- ✅ 채팅 메시지 저장
- ✅ 일기/리포트 CRUD
- ⚠️ AI 응답 생성 (아직 로컬 Ollama 사용 중 - 수정 필요)

## 🐛 문제 해결

### AI 서버가 시작되지 않을 때

```bash
# 포트 8001이 이미 사용 중인지 확인
lsof -i :8001

# 프로세스 종료
kill -9 <PID>
```

### Ollama API 키 오류

```bash
# 환경 변수 확인
echo $OLLAMA_API_KEY

# .env.local 파일 확인
cat .env.local
```

### Fallback 응답만 나올 때

이는 정상입니다! Ollama API 호출 실패 시 안전한 fallback 응답을 제공합니다.

원인:
- API 키 미설정
- 네트워크 연결 문제
- API Rate Limit

## 📝 향후 계획

- [ ] Supabase Functions에서 로컬 AI 서버 호출하도록 수정
- [ ] Production 환경에서는 별도 AI 서버 배포 (AWS/GCP)
- [ ] AI 응답 캐싱 추가
- [ ] 응답 시간 모니터링
- [ ] 로깅 시스템 개선

## 💡 팁

1. **개발 시**: `npm run dev:all`로 모든 서버 동시 실행
2. **프로덕션**: AI 서버는 별도 배포 필요 (로컬이 아닌 곳에)
3. **테스트**: `curl`로 AI 서버 엔드포인트 직접 테스트
4. **디버깅**: AI 서버 콘솔 로그 확인

## 🔗 관련 파일

- **AI 서버**: `src/local-backend/ai-server.ts`
- **Supabase Functions**: `src/supabase/functions/server/index.tsx` (수정 예정)
- **Frontend API**: `src/utils/api.ts` (나중에 AI 엔드포인트 분리)

---

**현재 상태**: 로컬 AI 서버 준비 완료 ✅  
**다음 단계**: Supabase Functions 수정 및 연동 (나중에)
