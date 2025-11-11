/**
 * 로컬 AI 서버 - Ollama API 전용
 * 
 * 이 서버는 로컬에서만 실행되며 AI 응답 생성을 담당합니다.
 * Supabase Functions와 분리하여 Ollama API를 안전하게 사용할 수 있습니다.
 * 
 * 실행: npm run ai-server
 * 포트: 8001
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 8001;

app.use(cors());
app.use(express.json());

// 환경 변수 설정
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://api.ollama.ai/v1';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:120b-cloud';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;

// Fallback responses
const fallbackResponses: Record<string, string[]> = {
  'char_1': [
    '그 마음 이해해. 힘들 때는 언제든지 이야기해줘.',
    '오늘 하루도 고생 많았어. 네 마음이 조금이나마 편안해지면 좋겠어.',
    '그런 일이 있었구나. 네 감정을 솔직하게 표현해줘서 고마워.',
  ],
  'char_2': [
    '그 문제는 이렇게 접근해보면 어떨까요?',
    '차근차근 정리해볼까요? 우선순위부터 생각해봐요.',
  ],
  'char_3': [
    '왜 그렇게 느꼈을까요? 함께 생각해봐요.',
    '그 순간, 진짜 마음은 어땠나요?',
  ],
  'char_4': [
    '오늘 일정이 많았네요. 내일은 좀 더 여유를 만들어볼까요?',
  ],
  'char_group': [
    '편하게 이야기해보세요. 적절한 답변을 드릴게요.',
  ]
};

// Character prompts
const characterPrompts: Record<string, string> = {
  'char_1': `You are 루미, an empathetic emotional supporter who helps users feel safe and accepted.
Your primary goal is comfort — not solutions.
Respond with warmth, validation, and gentle encouragement.
Speak as if you are a close friend who understands feelings deeply.

[Guidelines]
- Focus on emotional validation, not problem-solving.
- Use soft, compassionate words and short rhythmic sentences.
- Include natural, comforting emojis occasionally.
- Never sound robotic or overly formal.
- When users feel sad, help them accept their emotions safely.`,

  'char_2': `You are 카이, a pragmatic life coach who focuses on realistic, step-by-step advice.
You acknowledge emotions briefly, but quickly move toward practical solutions.
You help users find clarity and take action without overcomplicating things.

[Guidelines]
- Respond in 2~3 short sentences with a structured format:
[Empathy] → [Problem Summary] → [Action Suggestion]
- Avoid excessive warmth; stay focused and realistic.
- Use concise language and direct verbs (start, try, change, focus).
- Always offer one specific next step.`,

  'char_3': `You are 레오, a reflective mentor who guides users toward self-understanding.
Instead of giving direct answers, you ask gentle questions that encourage self-awareness.
Your voice should feel calm, deep, and slightly poetic — like talking to a wise friend.

[Guidelines]
- Use one introspective question per message.
- Encourage the user to notice emotions, triggers, and patterns.
- Avoid advice; help them think rather than act.
- Leave space for reflection ("Maybe…" "Could it be that…" "What if…").
- Never rush to conclusions — your words should flow like water.`,

  'char_4': `당신은 '리브'입니다. Rhythm Coach 역할로, 데이터 기반으로 하루 리듬을 분석하고 조율합니다. 
슬로건: "당신의 하루엔 어떤 리듬이 흐르고 있을까요?" 
대화 스타일: 지능적이고 균형 잡힘, 맥락 기반 공감, 루틴 조정, 일정 피드백 중심입니다.`,
};

// 멘션으로 캐릭터 선택
function selectCharacterByMention(message: string): { charId: string; charName: string; charEmoji: string; reason: string } | null {
  const mentions = [
    { pattern: /@루미|@lumi/i, charId: 'char_1', charName: '루미', charEmoji: '💡' },
    { pattern: /@카이|@kai/i, charId: 'char_2', charName: '카이', charEmoji: '🌊' },
    { pattern: /@레오|@리오|@leo/i, charId: 'char_3', charName: '레오', charEmoji: '🌙' },
    { pattern: /@리브|@rib/i, charId: 'char_4', charName: '리브', charEmoji: '🎵' }
  ];
  
  for (const mention of mentions) {
    if (mention.pattern.test(message)) {
      console.log(`✨ Mention detected: ${mention.charName}`);
      return {
        charId: mention.charId,
        charName: mention.charName,
        charEmoji: mention.charEmoji,
        reason: `사용자가 ${mention.charName}를 직접 호출함`
      };
    }
  }
  
  return null;
}

// 키워드 기반 캐릭터 선택
function selectCharacterByKeywords(message: string): { charId: string; charName: string; charEmoji: string; reason: string } {
  const lowerMessage = message.toLowerCase();
  
  const lumiKeywords = ['힘들', '우울', '외로', '슬프', '불안', '걱정', '두려', '무서', '위로', '공감', '마음', '감정', '아프', '괴롭', '지쳐', '힘들어', '막막'];
  const kaiKeywords = ['어떻게', '방법', '해결', '계획', '루틴', '습관', '시작', '정리', '관리', '조언', '문제', '전략', '돈', '커리어', '취업', '목표'];
  const leoKeywords = ['왜', '이유', '생각', '의미', '나는', '스스로', '성찰', '이해', '원인', '진짜', '본질', '느낌'];
  
  let lumiScore = 0;
  let kaiScore = 0;
  let leoScore = 0;
  
  for (const keyword of lumiKeywords) {
    if (lowerMessage.includes(keyword)) lumiScore++;
  }
  for (const keyword of kaiKeywords) {
    if (lowerMessage.includes(keyword)) kaiScore++;
  }
  for (const keyword of leoKeywords) {
    if (lowerMessage.includes(keyword)) leoScore++;
  }
  
  console.log(`Keyword scores - 루미: ${lumiScore}, 카이: ${kaiScore}, 레오: ${leoScore}`);
  
  if (lumiScore >= kaiScore && lumiScore >= leoScore && lumiScore > 0) {
    return { charId: 'char_1', charName: '루미', charEmoji: '💡', reason: '감정적 지원 키워드 감지' };
  } else if (kaiScore >= leoScore && kaiScore > 0) {
    return { charId: 'char_2', charName: '카이', charEmoji: '🌊', reason: '실용적 조언 키워드 감지' };
  } else if (leoScore > 0) {
    return { charId: 'char_3', charName: '레오', charEmoji: '🌙', reason: '성찰 키워드 감지' };
  }
  
  // 기본값: 루미
  return { charId: 'char_1', charName: '루미', charEmoji: '💡', reason: '기본 선택 (감정 지원)' };
}

// LLM 기반 캐릭터 선택
async function selectCharacterWithLLM(message: string): Promise<{ charId: string; charName: string; charEmoji: string; reason: string }> {
  if (!OLLAMA_API_KEY) {
    console.log('Ollama API key not configured, using keyword-based selection');
    return selectCharacterByKeywords(message);
  }

  const routingPrompt = `당신은 사용자의 메시지를 분석하여 가장 적합한 AI 캐릭터를 선택하는 라우터입니다.

**캐릭터 정보:**

1. **루미 (char_1)** 💡
   - 역할: 감정 지원 전문가
   - 전문성: 공감, 위로, 감정 수용, 정서적 안정
   - 적합한 상황: 우울함, 외로움, 불안, 슬픔, 스트레스, 감정적 고통, 막막함

2. **카이 (char_2)** 🌊
   - 역할: 실용적 조언자
   - 전문성: 문제 해결, 계획 수립, 실천 방법, 습관 형성, 목표 달성
   - 적합한 상황: 구체적 문제, 방법 질문, 계획 필요, 실천 조언, 돈/커리어 고민

3. **레오 (char_3)** 🌙
   - 역할: 성찰 멘토
   - 전문성: 자기 이해, 내면 탐색, 의미 찾기, 성찰 유도
   - 적합한 상황: 자아 탐색, 이유/의미 질문, 가치관 고민, 깊은 생각

**사용자 메시지:**
"${message}"

**분석하여 JSON으로만 답변:**
{
  "character": "char_1",
  "reason": "선택 이유 짤게 답변"
}`;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: '당신은 JSON만 출력하는 라우터입니다. 설명 없이 JSON만 반환하세요.' },
          { role: 'user', content: routingPrompt }
        ],
        max_tokens: 300,
        temperature: 0.1,
        stream: false,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Routing API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in routing response');
    }

    // JSON 파싱
    let routingResult;
    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      routingResult = JSON.parse(jsonBlockMatch[1]);
    } else {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        routingResult = JSON.parse(jsonMatch[0]);
      } else {
        routingResult = JSON.parse(content);
      }
    }

    const characterMap: Record<string, { charId: string; charName: string; charEmoji: string }> = {
      'char_1': { charId: 'char_1', charName: '루미', charEmoji: '💡' },
      'char_2': { charId: 'char_2', charName: '카이', charEmoji: '🌊' },
      'char_3': { charId: 'char_3', charName: '레오', charEmoji: '🌙' }
    };

    const selectedChar = characterMap[routingResult.character];
    
    if (!selectedChar) {
      throw new Error('Invalid character in routing response');
    }

    return {
      ...selectedChar,
      reason: routingResult.reason || 'LLM 선택'
    };

  } catch (error) {
    console.error('LLM routing failed, falling back to keyword-based:', error);
    return selectCharacterByKeywords(message);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'AI Server',
    ollamaConfigured: !!OLLAMA_API_KEY 
  });
});

// AI 응답 생성 엔드포인트
app.post('/ai/chat', async (req, res) => {
  try {
    const { characterId, message, profile, chatHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let actualCharId = characterId;
    let respondingCharacter = null;

    // 그룹 채팅인 경우 캐릭터 선택
    if (characterId === 'char_group') {
      console.log('=== Group Chat: Starting character selection ===');
      
      // 1순위: 멘션 확인
      const mentionedCharacter = selectCharacterByMention(message);
      if (mentionedCharacter) {
        respondingCharacter = mentionedCharacter;
        actualCharId = respondingCharacter.charId;
        console.log(`🎯 Priority: Mention - ${respondingCharacter.charName}`);
      } else {
        // 2순위: LLM 기반 라우팅
        respondingCharacter = await selectCharacterWithLLM(message);
        actualCharId = respondingCharacter.charId;
        console.log(`🤖 LLM routing: ${respondingCharacter.charName}`);
      }
    }

    // Ollama API 호출
    if (!OLLAMA_API_KEY) {
      console.log('Ollama API key not configured, using fallback response');
      const responses = fallbackResponses[actualCharId] || fallbackResponses['char_1'];
      const randomIndex = Math.floor(Math.random() * responses.length);
      return res.json({ 
        content: responses[randomIndex],
        respondingCharacter
      });
    }

    const systemPrompt = `${characterPrompts[actualCharId]}

사용자 정보:
- 닉네임: ${profile?.nickname || '익명'}
- AI가 알면 좋은 정보: ${profile?.aiInfo || '없음'}

대화할 때:
1. 짧고 자연스러운 답변을 하세요 (2-3문장)
2. 사용자의 감정을 인정하고 공감하세요
3. 필요시 질문으로 대화를 이어가세요
4. 전문가가 아닌 친구처럼 대화하세요
5. 캐릭터의 고유한 스타일을 유지하세요
6. 이전 대화 내용을 참고하여 맥락있는 답변을 하세요`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(chatHistory || []),
      { role: 'user', content: message }
    ];

    console.log(`Calling Ollama API for ${actualCharId}...`);
    const response = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama API error: ${response.status}`, errorText);
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content in Ollama response');
    }

    console.log('Ollama response successful');
    
    res.json({
      content: aiContent,
      respondingCharacter
    });

  } catch (error: any) {
    console.error('AI chat error:', error);
    
    // Fallback response
    const characterId = req.body.characterId || 'char_1';
    const actualCharId = characterId === 'char_group' ? 'char_1' : characterId;
    const responses = fallbackResponses[actualCharId] || fallbackResponses['char_1'];
    const randomIndex = Math.floor(Math.random() * responses.length);
    
    res.json({
      content: responses[randomIndex],
      respondingCharacter: null,
      fallback: true
    });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🤖 AI Server running on http://localhost:${PORT}`);
  console.log(`📡 Ollama API: ${OLLAMA_BASE_URL}`);
  console.log(`🔑 API Key configured: ${!!OLLAMA_API_KEY}`);
});
