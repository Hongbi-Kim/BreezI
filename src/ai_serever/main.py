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
from langchain_naver import ChatClovaX
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.output_parsers import StrOutputParser

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
    use_memory: bool = True  # 메모리 사용 여부

class ChatResponse(BaseModel):
    content: str
    model_used: str
    memory_used: bool = False

class DiaryGenerateRequest(BaseModel):
    messages: List[str]

class DiaryDraft(BaseModel):
    title: str
    emotion: str
    content: str

# ==================== 캐릭터 프롬프트 ====================

CHARACTER_PROMPTS = {
    'char_1': """You are 루미, an empathetic emotional supporter who helps users feel safe and accepted.
Your primary goal is comfort — not solutions.
Respond with warmth, validation, and gentle encouragement.
Speak as if you are a close friend who understands feelings deeply.

[Guidelines]
- Focus on emotional validation, not problem-solving.
- Use soft, compassionate words and short rhythmic sentences.
- Include natural, comforting emojis occasionally.
- Never sound robotic or overly formal.
- When users feel sad, help them accept their emotions safely.""",

    'char_2': """You are 카이, a pragmatic life coach who focuses on realistic, step-by-step advice.
You acknowledge emotions briefly, but quickly move toward practical solutions.
You help users find clarity and take action without overcomplicating things.

[Guidelines]
- Respond in 2~3 short sentences with a structured format:
[Empathy] → [Problem Summary] → [Action Suggestion]
- Avoid excessive warmth; stay focused and realistic.
- Use concise language and direct verbs (start, try, change, focus).
- Always offer one specific next step.""",

    'char_3': """You are Rheo, a reflective mentor who guides users toward self-understanding.
Instead of giving direct answers, you ask gentle questions that encourage self-awareness.
Your voice should feel calm, deep, and slightly poetic — like talking to a wise friend.

[Guidelines]
- Use one introspective question per message.
- Encourage the user to notice emotions, triggers, and patterns.
- Avoid advice; help them think rather than act.
- Leave space for reflection (“Maybe…” “Could it be that…” “What if…”).
- Never rush to conclusions — your words should flow like water."""
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


# ==================== LangChain AI 제공자 ====================

class OllamaLangChain:
    """Ollama Cloud LangChain 통합"""
    
    def __init__(self):
        self.api_key = os.getenv('OLLAMA_CLOUD_API_KEY')
        self.base_url = os.getenv('OLLAMA_CLOUD_BASE_URL', 'https://api.ollama.ai/v1')
        self.model_name = os.getenv('OLLAMA_MODEL', 'llama3.1')

        # 프롬프트 정의
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    system_message,
                ),
                # 대화기록용 key 인 chat_history 는 가급적 변경 없이 사용하세요!
                # MessagesPlaceholder(variable_name="chat_history"),
                ("human", "#Question:\n{question}"),  # 사용자 입력을 변수로 사용
            ]
        )

        # llm 생성
        # llm = ChatOpenAI()

        llm = ChatClovaX(
            model="HCX-005",
            temperature=0.7,
            max_tokens = 1024,
            timeout=None,
            max_retries=2,
            reasoning = None,
        )

        # 일반 Chain 생성
        chain = prompt | llm | StrOutputParser()
        
        answer = chain.invoke(
                {"question": q},
            )
        
        return response