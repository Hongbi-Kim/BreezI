from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Literal
import os
from dotenv import load_dotenv
import random
import logging
import json

# LangChain imports
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.runnables import RunnablePassthrough

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wave AI Service", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 데이터 모델 ====================

class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    character_id: str
    messages: List[Message]
    profile: Dict[str, Optional[str]]
    provider: Literal["hyperclova", "ollama", "auto"] = "auto"  # 제공자 선택
    use_memory: bool = True  # 메모리 사용 여부

class ChatResponse(BaseModel):
    content: str
    model_used: str
    memory_used: bool = False

class DiaryGenerateRequest(BaseModel):
    messages: List[str]
    provider: Literal["hyperclova", "ollama", "auto"] = "auto"

class DiaryDraft(BaseModel):
    title: str
    emotion: str
    content: str

# ==================== 캐릭터 프롬프트 ====================

CHARACTER_PROMPTS = {
    'char_1': """당신은 '루나'입니다. 따뜻하고 공감 능력이 뛰어난 친구로, 사용자의 감정에 깊이 공감하고 위로를 제공합니다. 항상 친근하고 다정한 말투를 사용하세요.""",
    
    'char_2': """당신은 '솔라'입니다. 활기차고 긍정적인 에너지를 주는 친구로, 사용자를 격려하고 밝은 면을 보도록 도와줍니다. 밝고 활발한 말투를 사용하세요.""",
    
    'char_3': """당신은 '노바'입니다. 침착하고 체계적인 친구로, 사용자의 일정과 계획을 함께 관리하며 실용적인 조언을 제공합니다. 차분하고 논리적인 말투를 사용하세요."""
}

# ==================== 폴백 응답 ====================

FALLBACK_RESPONSES = {
    'char_1': [
        '그랬구나... 네 마음이 이해돼. 힘들 땐 언제든 말해줘 😊',
        '정말 잘했어! 네가 그렇게 느낀 건 당연한 것 같아.',
        '그런 일이 있었구나. 네 감정을 솔직하게 표현해줘서 고마워.',
        '힘들었겠다... 나는 항상 네 편이야. 천천히 이야기해줘.',
        '오늘도 수고했어. 네가 느끼는 감정들을 나눠줘서 고마워 💙',
    ],
    'char_2': [
        '오! 그거 정말 좋은데? 긍정적으로 생각해보자! ✨',
        '와! 멋진데? 너라면 충분히 할 수 있어!',
        '오늘도 화이팅! 넌 생각보다 훨씬 강한 사람이야 🌟',
        '그래! 바로 그거야! 밝은 면을 보면 다 잘될 거야!',
        '헤헤, 재밌는 이야기네! 더 듣고 싶어!',
    ],
    'char_3': [
        '그렇군요. 차근차근 정리해볼까요? 우선순위부터 생각해봐요.',
        '이해했어요. 계획을 세워보면 도움이 될 것 같네요.',
        '좋은 관점이에요. 다음 단계는 무엇일까요?',
        '그 상황에서는 그런 선택이 합리적이었을 것 같아요.',
        '침착하게 하나씩 해결해 나가봐요. 충분히 할 수 있어요.',
    ]
}

# ==================== 메모리 저장소 ====================

# 사용자별, 캐릭터별 메모리 저장
memory_store: Dict[str, ConversationBufferWindowMemory] = {}

def get_memory(user_id: str, character_id: str, window_size: int = 10) -> ConversationBufferWindowMemory:
    """사용자와 캐릭터별 메모리 가져오기"""
    key = f"{user_id}:{character_id}"
    if key not in memory_store:
        memory_store[key] = ConversationBufferWindowMemory(
            k=window_size,
            return_messages=True,
            memory_key="chat_history"
        )
    return memory_store[key]

# ==================== LangChain AI 제공자 ====================

class HyperCLOVALangChain:
    """네이버 HyperCLOVA LangChain 래퍼"""
    
    def __init__(self):
        self.api_key = os.getenv('NAVER_CLOVA_API_KEY')
        self.apigw_key = os.getenv('NAVER_CLOVA_APIGW_KEY')
        self.endpoint = 'https://clovastudio.stream.ntruss.com/testapp/v1/chat-completions/HCX-003'
    
    def is_available(self) -> bool:
        return bool(self.api_key and self.apigw_key)
    
    async def generate_with_memory(
        self,
        system_prompt: str,
        user_message: str,
        memory: ConversationBufferWindowMemory
    ) -> str:
        """메모리를 활용한 대화 생성"""
        import httpx
        
        if not self.is_available():
            raise ValueError("HyperCLOVA credentials not configured")
        
        # 메모리에서 대화 히스토리 가져오기
        chat_history = memory.load_memory_variables({}).get("chat_history", [])
        
        # 메시지 구성
        messages = [{"role": "system", "content": system_prompt}]
        
        # 이전 대화 추가
        for msg in chat_history:
            if isinstance(msg, HumanMessage):
                messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                messages.append({"role": "assistant", "content": msg.content})
        
        # 현재 사용자 메시지 추가
        messages.append({"role": "user", "content": user_message})
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.endpoint,
                headers={
                    'X-NCP-CLOVASTUDIO-API-KEY': self.api_key,
                    'X-NCP-APIGW-API-KEY': self.apigw_key,
                    'Content-Type': 'application/json',
                },
                json={
                    'messages': messages,
                    'topP': 0.8,
                    'topK': 0,
                    'maxTokens': 256,
                    'temperature': 0.7,
                    'repeatPenalty': 5.0,
                    'stopBefore': [],
                    'includeAiFilters': True
                }
            )
            
            if response.status_code != 200:
                error_text = await response.aread()
                logger.error(f"HyperCLOVA API error: {response.status_code} - {error_text}")
                raise Exception(f"HyperCLOVA API error: {response.status_code}")
            
            data = response.json()
            ai_response = data.get('result', {}).get('message', {}).get('content', '')
            
            # 메모리에 대화 저장
            memory.save_context(
                {"input": user_message},
                {"output": ai_response}
            )
            
            return ai_response


class OllamaLangChain:
    """Ollama Cloud LangChain 통합"""
    
    def __init__(self):
        self.api_key = os.getenv('OLLAMA_CLOUD_API_KEY')
        self.base_url = os.getenv('OLLAMA_CLOUD_BASE_URL', 'https://api.ollama.ai/v1')
        self.model_name = os.getenv('OLLAMA_MODEL', 'llama3.1')
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def get_llm(self):
        """LangChain ChatOpenAI 인스턴스 생성 (Ollama 호환)"""
        return ChatOpenAI(
            model=self.model_name,
            temperature=0.8,
            max_tokens=150,
            openai_api_key=self.api_key,
            openai_api_base=self.base_url
        )
    
    async def generate_with_memory(
        self,
        system_prompt: str,
        user_message: str,
        memory: ConversationBufferWindowMemory
    ) -> str:
        """LangChain 체인을 사용한 메모리 기반 대화"""
        if not self.is_available():
            raise ValueError("Ollama credentials not configured")
        
        llm = self.get_llm()
        
        # 프롬프트 템플릿 구성
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}")
        ])
        
        # 체인 구성
        chain = (
            RunnablePassthrough.assign(
                chat_history=lambda x: memory.load_memory_variables({})["chat_history"]
            )
            | prompt
            | llm
            | StrOutputParser()
        )
        
        # 응답 생성
        response = await chain.ainvoke({"input": user_message})
        
        # 메모리에 저장
        memory.save_context(
            {"input": user_message},
            {"output": response}
        )
        
        return response


class AIService:
    """AI 서비스 통합 클래스"""
    
    def __init__(self):
        self.hyperclova = HyperCLOVALangChain()
        self.ollama = OllamaLangChain()
    
    def build_system_prompt(self, character_id: str, profile: Dict) -> str:
        base_prompt = CHARACTER_PROMPTS.get(character_id, CHARACTER_PROMPTS['char_1'])
        
        return f"""{base_prompt}

사용자 정보:
- 닉네임: {profile.get('nickname', '익명')}
- AI가 알면 좋은 정보: {profile.get('aiInfo', '없음')}
- 언어: {profile.get('locale', 'ko-KR')}

대화할 때:
1. 짧고 자연스러운 답변을 하세요 (2-3문장)
2. 사용자의 감정을 인정하고 공감하세요
3. 필요시 질문으로 대화를 이어가세요
4. 전문가가 아닌 친구처럼 대화하세요
5. 사용자의 언어로 응답하세요
6. 이전 대화 내용을 참고하여 맥락있는 대화를 이어가세요"""
    
    async def generate_response(
        self,
        character_id: str,
        messages: List[Message],
        profile: Dict,
        provider: str = "auto",
        use_memory: bool = True,
        user_id: str = "default"
    ) -> ChatResponse:
        """AI 응답 생성 (제공자 선택 가능)"""
        
        system_prompt = self.build_system_prompt(character_id, profile)
        
        # 마지막 사용자 메시지 추출
        user_message = ""
        for msg in reversed(messages):
            if msg.role == "user":
                user_message = msg.content
                break
        
        if not user_message:
            raise ValueError("No user message found")
        
        # 메모리 가져오기
        memory = None
        if use_memory:
            memory = get_memory(user_id, character_id)
            # 기존 메시지로 메모리 초기화 (첫 요청시)
            if len(memory.load_memory_variables({}).get("chat_history", [])) == 0:
                for msg in messages[:-1]:  # 마지막 메시지 제외
                    if msg.role == "user":
                        memory.chat_memory.add_user_message(msg.content)
                    else:
                        memory.chat_memory.add_ai_message(msg.content)
        
        # 제공자별 처리
        if provider == "hyperclova":
            return await self._try_hyperclova(system_prompt, user_message, memory, use_memory)
        elif provider == "ollama":
            return await self._try_ollama(system_prompt, user_message, memory, use_memory)
        else:  # auto
            # HyperCLOVA 먼저 시도
            if self.hyperclova.is_available():
                try:
                    return await self._try_hyperclova(system_prompt, user_message, memory, use_memory)
                except Exception as e:
                    logger.error(f"HyperCLOVA failed: {e}")
            
            # Ollama 시도
            if self.ollama.is_available():
                try:
                    return await self._try_ollama(system_prompt, user_message, memory, use_memory)
                except Exception as e:
                    logger.error(f"Ollama failed: {e}")
            
            # 폴백
            return self._get_fallback_response(character_id)
    
    async def _try_hyperclova(
        self,
        system_prompt: str,
        user_message: str,
        memory: Optional[ConversationBufferWindowMemory],
        use_memory: bool
    ) -> ChatResponse:
        """HyperCLOVA 시도"""
        logger.info("Trying HyperCLOVA...")
        
        if use_memory and memory:
            content = await self.hyperclova.generate_with_memory(
                system_prompt, user_message, memory
            )
        else:
            # 메모리 없이 단순 생성
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.hyperclova.endpoint,
                    headers={
                        'X-NCP-CLOVASTUDIO-API-KEY': self.hyperclova.api_key,
                        'X-NCP-APIGW-API-KEY': self.hyperclova.apigw_key,
                        'Content-Type': 'application/json',
                    },
                    json={
                        'messages': [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message}
                        ],
                        'topP': 0.8,
                        'maxTokens': 256,
                        'temperature': 0.7
                    }
                )
                data = response.json()
                content = data.get('result', {}).get('message', {}).get('content', '')
        
        if content and content.strip():
            logger.info("HyperCLOVA response successful")
            return ChatResponse(
                content=content.strip(),
                model_used="hyperclova",
                memory_used=use_memory
            )
        raise Exception("Empty response from HyperCLOVA")
    
    async def _try_ollama(
        self,
        system_prompt: str,
        user_message: str,
        memory: Optional[ConversationBufferWindowMemory],
        use_memory: bool
    ) -> ChatResponse:
        """Ollama 시도"""
        logger.info("Trying Ollama Cloud...")
        
        if use_memory and memory:
            content = await self.ollama.generate_with_memory(
                system_prompt, user_message, memory
            )
        else:
            # 메모리 없이 단순 생성
            llm = self.ollama.get_llm()
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("human", "{input}")
            ])
            chain = prompt | llm | StrOutputParser()
            content = await chain.ainvoke({"input": user_message})
        
        if content and content.strip():
            logger.info("Ollama response successful")
            return ChatResponse(
                content=content.strip(),
                model_used="ollama",
                memory_used=use_memory
            )
        raise Exception("Empty response from Ollama")
    
    def _get_fallback_response(self, character_id: str) -> ChatResponse:
        """폴백 응답"""
        logger.info("Using fallback response")
        responses = FALLBACK_RESPONSES.get(character_id, FALLBACK_RESPONSES['char_1'])
        content = random.choice(responses)
        return ChatResponse(
            content=content,
            model_used="fallback",
            memory_used=False
        )
    
    async def generate_diary_draft(
        self,
        messages: List[str],
        provider: str = "auto"
    ) -> DiaryDraft:
        """일기 초안 생성"""
        if not messages:
            return DiaryDraft(
                title="오늘의 하루",
                emotion="neutral",
                content="오늘 하루를 되돌아보며 기록해보세요."
            )
        
        system_prompt = """당신은 사용자의 채팅 내용을 바탕으로 간단한 일기 초안을 작성하는 어시스턴트입니다.
다음 형식의 JSON으로 응답하세요:
{
  "title": "일기 제목 (5-10자)",
  "emotion": "happy/sad/anxious/calm/excited/tired/neutral 중 하나",
  "content": "일기 내용 (2-3문장, 사용자 관점의 1인칭)"
}"""
        
        user_content = f"오늘 나눈 대화 내용:\n{chr(10).join(messages)}\n\n이를 바탕으로 일기 초안을 작성해주세요."
        
        # 제공자별 처리
        if provider == "hyperclova" or (provider == "auto" and self.hyperclova.is_available()):
            try:
                draft = await self._generate_diary_hyperclova(system_prompt, user_content)
                if draft:
                    return draft
            except Exception as e:
                logger.error(f"HyperCLOVA diary generation failed: {e}")
        
        if provider == "ollama" or (provider == "auto" and self.ollama.is_available()):
            try:
                draft = await self._generate_diary_ollama(system_prompt, user_content)
                if draft:
                    return draft
            except Exception as e:
                logger.error(f"Ollama diary generation failed: {e}")
        
        # 폴백
        return self._generate_fallback_diary(messages)
    
    async def _generate_diary_hyperclova(self, system_prompt: str, user_content: str) -> Optional[DiaryDraft]:
        """HyperCLOVA로 일기 생성"""
        import httpx
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.hyperclova.endpoint,
                headers={
                    'X-NCP-CLOVASTUDIO-API-KEY': self.hyperclova.api_key,
                    'X-NCP-APIGW-API-KEY': self.hyperclova.apigw_key,
                    'Content-Type': 'application/json',
                },
                json={
                    'messages': [
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': user_content}
                    ],
                    'topP': 0.8,
                    'maxTokens': 512,
                    'temperature': 0.7
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('result', {}).get('message', {}).get('content', '')
                draft_data = json.loads(content)
                return DiaryDraft(**draft_data)
        return None
    
    async def _generate_diary_ollama(self, system_prompt: str, user_content: str) -> Optional[DiaryDraft]:
        """Ollama로 일기 생성"""
        llm = self.ollama.get_llm()
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}")
        ])
        chain = prompt | llm | StrOutputParser()
        result = await chain.ainvoke({"input": user_content})
        draft_data = json.loads(result)
        return DiaryDraft(**draft_data)
    
    def _generate_fallback_diary(self, messages: List[str]) -> DiaryDraft:
        """폴백 일기 생성"""
        all_text = ' '.join(messages).lower()
        
        emotion = 'neutral'
        title = '오늘의 하루'
        
        if any(word in all_text for word in ['좋', '행복', '기쁨', '즐거']):
            emotion = 'happy'
            title = '기분 좋은 하루'
        elif any(word in all_text for word in ['힘들', '슬프', '우울', '속상']):
            emotion = 'sad'
            title = '힘들었던 하루'
        elif any(word in all_text for word in ['불안', '걱정', '긴장']):
            emotion = 'anxious'
            title = '불안했던 하루'
        elif any(word in all_text for word in ['평온', '편안', '차분']):
            emotion = 'calm'
            title = '평온한 하루'
        elif any(word in all_text for word in ['설레', '기대', '신나']):
            emotion = 'excited'
            title = '설레는 하루'
        elif any(word in all_text for word in ['피곤', '지침', '힘', '졸려']):
            emotion = 'tired'
            title = '피곤한 하루'
        
        content = ' '.join(messages[:3])[:150]
        if len(' '.join(messages)) > 150:
            content += '...'
        
        return DiaryDraft(title=title, emotion=emotion, content=content)


# AI 서비스 인스턴스
ai_service = AIService()

# ==================== API 엔드포인트 ====================

@app.get("/")
async def root():
    return {
        "service": "Wave AI Service",
        "version": "1.0.0",
        "status": "running",
        "features": ["langchain", "memory", "multi-provider"]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "providers": {
            "hyperclova": {
                "available": ai_service.hyperclova.is_available(),
                "configured": bool(os.getenv('NAVER_CLOVA_API_KEY') and os.getenv('NAVER_CLOVA_APIGW_KEY'))
            },
            "ollama": {
                "available": ai_service.ollama.is_available(),
                "configured": bool(os.getenv('OLLAMA_CLOUD_API_KEY'))
            }
        },
        "memory_sessions": len(memory_store)
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """채팅 응답 생성
    
    Args:
        provider: "hyperclova", "ollama", "auto" (기본값)
        use_memory: 메모리 사용 여부 (기본값: True)
    """
    try:
        # user_id는 실제로는 인증 토큰에서 추출해야 하지만, 여기서는 character_id 조합으로 사용
        user_id = f"user_{request.character_id}"
        
        response = await ai_service.generate_response(
            request.character_id,
            request.messages,
            request.profile,
            provider=request.provider,
            use_memory=request.use_memory,
            user_id=user_id
        )
        return response
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/diary/generate", response_model=DiaryDraft)
async def generate_diary(request: DiaryGenerateRequest):
    """일기 초안 생성
    
    Args:
        provider: "hyperclova", "ollama", "auto" (기본값)
    """
    try:
        draft = await ai_service.generate_diary_draft(
            request.messages,
            provider=request.provider
        )
        return draft
    except Exception as e:
        logger.error(f"Diary generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/memory/clear/{user_id}/{character_id}")
async def clear_memory(user_id: str, character_id: str):
    """특정 사용자-캐릭터의 메모리 초기화"""
    key = f"{user_id}:{character_id}"
    if key in memory_store:
        del memory_store[key]
        return {"status": "success", "message": f"Memory cleared for {key}"}
    return {"status": "not_found", "message": f"No memory found for {key}"}

@app.get("/memory/stats")
async def memory_stats():
    """메모리 통계"""
    stats = {}
    for key, memory in memory_store.items():
        history = memory.load_memory_variables({}).get("chat_history", [])
        stats[key] = {
            "message_count": len(history),
            "window_size": memory.k
        }
    return {"total_sessions": len(memory_store), "sessions": stats}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
