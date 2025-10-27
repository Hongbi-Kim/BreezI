from fastapi import FastAPI
from pydantic import BaseModel
from langchain.chat_models import ChatOpenAI

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    characterId: str

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    # 1. 캐릭터 정보 로드 (여우/토끼/강아지 등)
    characters = {
        "fox": {"tone": "밝고 에너지 넘치는", "role": "격려 코치"},
        "rabbit": {"tone": "공감적이고 부드러운", "role": "감정 케어러"},
    }
    char = characters.get(req.characterId, characters["rabbit"])

    # 2. LangChain 모델 초기화
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.8)

    # 3. 시스템 프롬프트 구성
    system_prompt = f"""
    당신은 감정 케어 AI 캐릭터 "{req.characterId}"입니다.
    톤: {char['tone']}
    역할: {char['role']}
    사용자의 감정을 공감하고 따뜻하게 2~3문장으로 답변하세요.
    """

    # 4. LangChain으로 응답 생성
    response = llm.invoke([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req.message}
    ])

    return {"reply": response.content}
