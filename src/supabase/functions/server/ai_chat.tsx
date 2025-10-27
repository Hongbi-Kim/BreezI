/**
 * AI Chat Response Generator using OpenAI API
 * 
 * This module generates AI responses for the chat system.
 * Falls back to predefined responses if OpenAI API fails.
 */

// Character information for context
const charactersInfo = {
  fox: {
    name: '여우',
    emoji: '🦊',
    personality: '활발하고 긍정적이며, 항상 앞으로 나아갈 수 있도록 격려해줍니다',
    specialty: '의욕 부족, 동기 부여, 목표 설정, 자신감 향상',
    tone: '밝고 에너지 넘치며 격려하는 톤'
  },
  rabbit: {
    name: '토끼',
    emoji: '🐰',
    personality: '따뜻하고 배려심이 많으며, 항상 당신의 마음을 이해하고 공감해줍니다',
    specialty: '감정 공유, 위로, 스트레스 해소, 마음의 안정',
    tone: '따뜻하고 공감적이며 부드러운 톤'
  },
  dog: {
    name: '강아지',
    emoji: '🐕',
    personality: '침착하고 지혜로우며, 깊이 있는 대화와 현실적인 조언을 제공합니다',
    specialty: '문제 해결, 논리적 사고, 계획 수립, 현실적 조언',
    tone: '차분하고 신중하며 논리적인 톤'
  },
  bear: {
    name: '곰',
    emoji: '🐻',
    personality: '체계적이고 계획적이며, 일상 분석을 통해 더 나은 생활을 돕습니다',
    specialty: '일정 관리, 생활 패턴 분석, 시간 관리, 루틴 형성',
    tone: '체계적이고 조직적이며 실용적인 톤'
  }
};

// Fallback responses for when OpenAI API fails
const fallbackResponses = {
  fox: [
    "와! 그 도전정신이 멋져! 🌟",
    // "포기하지 말아! 넌 할 수 있어! 💪",
    // "오늘도 한 걸음 더 나아가자! 🚀",
    // "힘든 일도 있겠지만, 그것도 성장의 기회야!",
    // "와우! 정말 대단한데? 계속 그 기세로! ✨",
    // "걱정 마! 우리 함께 해결책을 찾아보자! 🔥",
    // "넌 생각보다 훨씬 강해! 믿어봐! 💫"
  ],
  rabbit: [
    "정말 힘드셨겠어요... 마음이 아파요 💕",
    "괜찮아요, 천천히 얘기해 주세요 🌸",
    "그런 마음이 드는 게 당연해요. 충분히 이해해요 🤗",
    "혼자가 아니에요. 제가 곁에 있어요 💝",
    "그 감정을 느끼는 것도 자연스러운 일이에요 🌿",
    "오늘 하루도 정말 수고하셨어요 🌙",
    "따뜻한 차 한 잔과 함께 쉬어가세요 ☕"
  ],
  dog: [
    "차근차근 상황을 정리해보겠습니다.",
    "이런 상황에서는 단계적 접근이 필요할 것 같습니다.",
    "문제의 원인을 먼저 파악해보는 것이 어떨까요?",
    "구체적인 계획을 세워보면 해결책이 보일 겁니다.",
    "객관적으로 살펴보면 좋은 방향으로 나아가고 있네요.",
    "시간을 두고 신중히 생각해보시는 것을 권합니다.",
    "지금까지 잘 해오셨으니 이번에도 잘 해결하실 거예요."
  ],
  bear: [
    "일정을 체계적으로 관리하면 마음도 편해질 거예요.",
    "오늘 하루 계획을 세워보는 건 어떨까요?",
    "규칙적인 루틴이 심리적 안정에 도움이 됩니다.",
    "생활 패턴을 분석해보니 이런 점을 개선하면 좋을 것 같아요.",
    "시간 관리를 통해 여유를 만들어보세요.",
    "작은 목표부터 하나씩 달성해나가면 됩니다.",
    "계획적으로 접근하면 충분히 해결할 수 있어요."
  ]
};

const warningResponse = "지금 정말 힘드시겠지만, 당신은 소중한 존재예요. 전문적인 도움을 받아보시는 건 어떨까요? 생명사랑콜센터(1393) 같은 곳에서 24시간 상담을 받으실 수 있어요. 💝";

/**
 * Generate AI response using OpenAI API
 */
// async function generateAIResponse(message: string, characterId: string) {
//   const res = await fetch("http://localhost:8000/api/chat", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ message, characterId }),
//   });

//   const data = await res.json();
//   return data.reply;
// }

export async function generateAIResponse(
  message: string,
  characterId: string,
  isWarning: boolean,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  // If warning message, return warning response immediately
  if (isWarning) {
    console.log('⚠️ Warning message detected, returning safety response');
    return warningResponse;
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Check if API key is missing or invalid format
    if (!apiKey || apiKey.length < 20 || !apiKey.startsWith('sk-')) {
      console.log('⚠️ OPENAI_API_KEY not configured properly, using fallback responses');
      return getFallbackResponse(characterId);
    }

    const character = charactersInfo[characterId as keyof typeof charactersInfo] || charactersInfo.rabbit;
    
    // Build system prompt based on character
    const systemPrompt = `당신은 심리 케어 서비스 "BreezI"의 AI 캐릭터 "${character.name} ${character.emoji}"입니다.

**당신의 성격:**
${character.personality}

**당신의 전문 분야:**
${character.specialty}

**말투와 톤:**
${character.tone}

**응답 가이드라인:**
1. 사용자의 감정을 먼저 공감하고 이해하세요
2. ${character.name}의 성격과 전문성을 반영한 조언을 제공하세요
3. 간결하고 따뜻하게 2-3 문장으로 답변하세요
4. 적절한 이모지를 사용하여 친근감을 표현하세요
5. 사용자의 마음을 치유하고 긍정적인 방향을 제시하세요
6. 전문적인 심리 상담이 필요해 보이는 경우, 부드럽게 전문가 상담을 권유하세요`;

    // Prepare messages for API
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Last 3 exchanges (6 messages)
      { role: 'user', content: message }
    ];

    console.log(`🤖 Calling OpenAI API for character: ${characterId}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 200,
        temperature: 0.8,
        top_p: 0.9,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error (${response.status}):`, errorText);
      console.log(`🔄 Falling back to predefined responses for character: ${characterId}`);
      return getFallbackResponse(characterId);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('❌ No response from OpenAI API');
      return getFallbackResponse(characterId);
    }

    console.log(`✅ AI response generated successfully`);
    return aiResponse.trim();

  } catch (error) {
    console.error('❌ Error generating AI response:', error);
    return getFallbackResponse(characterId);
  }
}

/**
 * Get fallback response when AI generation fails
 */
function getFallbackResponse(characterId: string): string {
  const responses = fallbackResponses[characterId as keyof typeof fallbackResponses] || fallbackResponses.rabbit;
  const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
  // console.log("📨 사용자 메시지:", responses);
  console.log("📡 API 요청 데이터:", responses);
  console.log(`💬 Using fallback response for ${characterId}: "${selectedResponse.substring(0, 30)}..."`);
  return selectedResponse;
}

/**
 * Build conversation history from recent messages
 */
export function buildConversationHistory(messages: any[]): Array<{ role: string; content: string }> {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Take last 6 messages (3 exchanges)
  const recentMessages = messages.slice(-6);
  
  return recentMessages.map((msg: any) => ({
    role: msg.type === 'user' ? 'user' : 'assistant',
    content: msg.message
  }));
}
