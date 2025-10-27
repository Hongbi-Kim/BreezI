/**
 * AI Diary Draft Generator using OpenAI API
 * 
 * This module generates diary drafts based on chat history.
 * Falls back to simple emotion-based drafts if OpenAI API fails.
 */

// Emotion mapping for Korean labels
const emotionMapping: { [key: string]: string } = {
  'happy': '기쁨',
  'sad': '슬픔',
  'angry': '화남',
  'anxious': '불안',
};

// Fallback diary generation based on emotions
function generateFallbackDiary(todayMessages: any[]): {
  title: string;
  emotion: string;
  content: string;
  compliment?: string;
  regrets?: string;
} {
  console.log('📝 Using fallback diary generation');
  
  // Extract emotions from today's messages
  const emotions = todayMessages
    .filter(msg => msg.emotion)
    .map(msg => msg.emotion);
  
  let dominantEmotion = 'happy';
  let title = '오늘 하루';
  let content = '오늘 하루를 되돌아본다.';
  
  if (emotions.length > 0) {
    // Use the last emotion as dominant
    dominantEmotion = emotions[emotions.length - 1];
    
    switch (dominantEmotion) {
      case 'happy':
        title = '기분 좋은 하루';
        content = '오늘은 기분 좋은 하루였다.';
        break;
      case 'sad':
        title = '조금 우울한 하루';
        content = '오늘은 조금 우울한 하루였다.';
        break;
      case 'angry':
        title = '화가 났던 하루';
        content = '오늘은 화가 나는 일이 있었다.';
        break;
      case 'anxious':
        title = '불안한 마음';
        content = '오늘은 불안한 마음이 들었다.';
        break;
      default:
        title = '평범한 하루';
        content = '오늘은 평범한 하루였다.';
    }
  }
  
  return {
    title,
    emotion: dominantEmotion,
    content,
  };
}

/**
 * Generate diary draft using AI based on today's chat messages
 */
export async function generateDiaryDraft(
  todayMessages: any[]
): Promise<{
  title: string;
  emotion: string;
  content: string;
  compliment?: string;
  regrets?: string;
}> {
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Check if API key is missing or invalid format
    if (!apiKey || apiKey.length < 20 || !apiKey.startsWith('sk-')) {
      console.log('⚠️ OPENAI_API_KEY not configured properly, using fallback diary generation');
      return generateFallbackDiary(todayMessages);
    }
    
    // If no messages today, use fallback
    if (!todayMessages || todayMessages.length === 0) {
      console.log('⚠️ No messages found for today, using fallback diary generation');
      return generateFallbackDiary(todayMessages);
    }
    
    // Build conversation summary for AI
    const conversationSummary = todayMessages
      .map(msg => `[${msg.emotion || '감정없음'}] ${msg.message}`)
      .join('\n');
    
    const systemPrompt = `당신은 사용자의 채팅 내용을 바탕으로 일기를 작성하는 AI 비서입니다.

**지침:**
1. 사용자가 오늘 나눈 대화 내용을 바탕으로 일기를 작성합니다
2. 일기 제목은 15자 이내로 간결하게 작성합니다
3. 한 줄 일기는 50-100자 정도로 작성합니다
4. 오늘의 기분은 반드시 "기쁨", "슬픔", "화남", "불안" 중 하나를 선택합니다
5. 칭찬하기는 대화에서 긍정적인 행동이나 성과가 있을 때만 작성합니다 (없으면 생략)
6. 아쉬운 점은 대화에서 후회나 아쉬움이 드러날 때만 작성합니다 (없으면 생략)
7. 모든 내용은 존댓말이 아닌 반말로 작성합니다 (예: "~했다", "~였다")
8. 자연스럽고 진솔한 톤으로 작성합니다

**응답 형식:**
반드시 아래 JSON 형식으로만 응답하세요:
{
  "title": "일기 제목",
  "emotion": "기쁨|슬픔|화남|불안 중 하나",
  "content": "한 줄 일기 내용",
  "compliment": "칭찬하기 (선택사항, 없으면 null)",
  "regrets": "아쉬운 점 (선택사항, 없으면 null)"
}`;

    const userPrompt = `오늘 나눈 대화 내용:

${conversationSummary}

위 대화 내용을 바탕으로 일기를 작성해주세요.`;

    console.log(`🤖 Calling OpenAI API for diary draft generation`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error (${response.status}):`, errorText);
      console.log(`🔄 Falling back to simple diary generation`);
      return generateFallbackDiary(todayMessages);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('❌ No response from OpenAI API');
      return generateFallbackDiary(todayMessages);
    }

    // Parse AI response
    const parsedResponse = JSON.parse(aiResponse);
    
    // Validate emotion is one of the allowed values
    const allowedEmotions = ['기쁨', '슬픔', '화남', '불안'];
    let emotion = parsedResponse.emotion;
    
    // Convert Korean emotion to English key
    let emotionKey = 'happy';
    if (emotion === '슬픔') emotionKey = 'sad';
    else if (emotion === '화남') emotionKey = 'angry';
    else if (emotion === '불안') emotionKey = 'anxious';
    
    // Validate the response
    if (!parsedResponse.title || !parsedResponse.content || !allowedEmotions.includes(emotion)) {
      console.error('❌ Invalid AI response format');
      return generateFallbackDiary(todayMessages);
    }

    console.log(`✅ Diary draft generated successfully with emotion: ${emotionKey}`);
    
    return {
      title: parsedResponse.title,
      emotion: emotionKey,
      content: parsedResponse.content,
      compliment: parsedResponse.compliment || undefined,
      regrets: parsedResponse.regrets || undefined,
    };

  } catch (error) {
    console.error('❌ Error generating diary draft:', error);
    return generateFallbackDiary(todayMessages);
  }
}
