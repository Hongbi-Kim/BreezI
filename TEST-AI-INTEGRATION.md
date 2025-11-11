# AI Server Integration Test Plan

## Phase 2 Complete! 🎉

### What Changed

1. **Removed from Supabase Functions** (`src/supabase/functions/server/index.tsx`):
   - `selectCharacterByMention()` - 멘션 감지 로직
   - `selectCharacterWithLLM()` - LLM 기반 캐릭터 라우팅
   - `selectCharacterForGroupChat()` - 키워드 기반 폴백 라우팅
   - `getAIResponseWithMemory()` - AI 응답 생성
   - `generateSummaryWithOllama()` - 대화 요약 생성
   - `initializeMemory()` - LangChain 메모리 초기화

2. **Added to Supabase Functions**:
   - Simple `fetch()` call to `AI_SERVER_URL/ai/chat`
   - Fallback response mechanism when AI server is unavailable
   - Simplified chat history preparation (`prepareChatHistory()`)

3. **Result**:
   - Supabase Functions: ~200 lines shorter, cleaner, faster
   - AI Server: Contains all complex AI logic
   - Clear separation of concerns

## Testing Steps

### 1. Start Both Servers

```bash
# Terminal 1: Frontend + Supabase Functions
npm run dev

# Terminal 2: AI Server
npm run ai-server

# OR run both at once:
npm run dev:all
```

### 2. Test Single Character Chat

1. Open browser: http://localhost:5173
2. Login with test account
3. Click on any character (루미, 카이, 레오)
4. Send a test message: "안녕하세요"
5. Verify AI response appears

**Expected Console Logs (Supabase)**:
```
Processing chat for char_1... (Total messages: X)
Calling AI server at http://localhost:8001/ai/chat
✅ AI server response received
```

**Expected Console Logs (AI Server)**:
```
📥 Received chat request for character: char_1
📝 Message: "안녕하세요"
📜 Chat history length: X messages
✅ AI response generated
```

### 3. Test Group Chat

1. Click on "루미+카이+레오" group chat
2. Send message WITHOUT mention: "오늘 힘든 하루였어"
3. Verify appropriate character responds (likely 루미)

**Expected**: LLM routing selects emotional support character

4. Send message WITH mention: "@카이 어떻게 해야 할까요?"
5. Verify 카이 responds

**Expected**: Mention detection overrides LLM routing

### 4. Test Fallback (AI Server Down)

1. Stop AI server (Ctrl+C in Terminal 2)
2. Send a message
3. Verify fallback response appears

**Expected Console Logs**:
```
❌ AI server call failed: Error: fetch failed
Using fallback response...
```

**Expected Response**: Random fallback response from predefined list

### 5. Test Performance

Compare response times:
- **Before** (old system): ~2-5 seconds
- **After** (new system): Similar (AI processing time unchanged)
- **Advantage**: Easier to scale, debug, and maintain

## Success Criteria

✅ Single character chat works
✅ Group chat with LLM routing works
✅ Group chat with mentions works
✅ Fallback responses work when AI server is down
✅ No errors in console (frontend or backend)
✅ Response times acceptable

## Next Steps (Future)

1. **Production Deployment**:
   - Deploy AI server to cloud (AWS/GCP/DigitalOcean)
   - Update `AI_SERVER_URL` environment variable in Supabase
   - Add authentication between Supabase and AI server

2. **Add Summary Endpoint**:
   - Create `/ai/summary` endpoint in AI server
   - Call from Supabase when message count exceeds threshold

3. **Monitoring**:
   - Add logging/metrics to AI server
   - Monitor AI server health from Supabase
   - Alert when AI server is unreachable

## Troubleshooting

### AI Server Connection Refused
**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:8001`
**Solution**: Ensure AI server is running (`npm run ai-server`)

### Ollama API Errors
**Problem**: AI server returns 401/403 from Ollama
**Solution**: Check `.env` file has valid `OLLAMA_API_KEY`

### Fallback Responses Always Triggered
**Problem**: Never gets AI responses
**Solution**: 
1. Check AI server console for errors
2. Verify `AI_SERVER_URL` in Supabase Functions
3. Test AI server directly: `curl http://localhost:8001/health`

