/**
 * AI Report Insight Generator using OpenAI API
 * 
 * This module generates emotional insights based on diary entries.
 * Falls back to simple rule-based insights if OpenAI API fails.
 */

interface DiaryEntry {
  date: string;
  title: string;
  content: string;
  emotion: string;
  compliment?: string;
  regrets?: string;
}

// Fallback insight generation based on simple rules
function generateFallbackInsight(
  diaryEntries: DiaryEntry[],
  period: 'week' | 'month',
  emotionCounts: Record<string, number>
): string {
  console.log('📝 Using fallback insight generation');
  
  if (diaryEntries.length === 0) {
    return "아직 충분한 데이터가 없어요. 일기를 더 작성해보세요!";
  }
  
  const total = diaryEntries.length;
  const positiveCount = emotionCounts.happy || 0;
  const negativeCount = (emotionCounts.sad || 0) + (emotionCounts.angry || 0) + (emotionCounts.anxious || 0);
  const positiveRatio = positiveCount / total;
  
  const periodText = period === 'week' ? '주' : '달';
  
  if (positiveRatio >= 0.7) {
    return `이번 ${periodText}에는 전반적으로 긍정적인 감정이 많았어요! 이런 좋은 상태를 유지해보세요. ✨`;
  } else if (positiveRatio >= 0.5) {
    return `감정의 균형이 잘 잡혀있어요. 힘든 순간도 있었지만 잘 극복하고 계시는 것 같아요. 🌱`;
  } else {
    return `요즘 조금 힘든 시기를 보내고 계시는 것 같아요. 혼자 견디지 마시고, 주변 사람들에게 도움을 요청해보세요. 💜`;
  }
}

/**
 * Generate emotional insight using AI based on diary entries
 */
export async function generateEmotionInsight(
  diaryEntries: DiaryEntry[],
  period: 'week' | 'month',
  emotionCounts: Record<string, number>
): Promise<string> {
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Check if API key is missing or invalid format
    if (!apiKey || apiKey.length < 20 || !apiKey.startsWith('sk-')) {
      console.log('⚠️ OPENAI_API_KEY not configured properly, using fallback insight generation');
      return generateFallbackInsight(diaryEntries, period, emotionCounts);
    }
    
    // If no diary entries, use fallback
    if (!diaryEntries || diaryEntries.length === 0) {
      console.log('⚠️ No diary entries found, using fallback insight generation');
      return generateFallbackInsight(diaryEntries, period, emotionCounts);
    }
    
    // Build diary summary for AI
    const periodText = period === 'week' ? '최근 1주일' : '최근 1개월';
    const totalEntries = diaryEntries.length;
    
    // Emotion mapping for Korean
    const emotionLabels: Record<string, string> = {
      'happy': '기쁨',
      'sad': '슬픔',
      'angry': '화남',
      'anxious': '불안',
    };
    
    // Build emotion summary
    const emotionSummary = Object.entries(emotionCounts)
      .filter(([_, count]) => count > 0)
      .map(([emotion, count]) => {
        const label = emotionLabels[emotion] || emotion;
        const percentage = ((count / totalEntries) * 100).toFixed(1);
        return `${label}: ${count}회 (${percentage}%)`;
      })
      .join(', ');
    
    // Build diary content summary (limit to recent entries for token efficiency)
    const recentDiaries = diaryEntries.slice(-7); // Last 7 entries max
    const diarySummary = recentDiaries
      .map(entry => {
        const emotionLabel = emotionLabels[entry.emotion] || entry.emotion;
        let summary = `[${entry.date}] (${emotionLabel}) ${entry.title}: ${entry.content}`;
        if (entry.compliment) summary += ` | 칭찬: ${entry.compliment}`;
        if (entry.regrets) summary += ` | 아쉬움: ${entry.regrets}`;
        return summary;
      })
      .join('\n');
    
    const systemPrompt = `당신은 사용자의 감정 일기를 분석하여 심리적 인사이트를 제공하는 전문 심리 상담 AI입니다.

**지침:**
1. 사용자의 일기 내용과 감정 패턴을 바탕으로 따뜻하고 공감적인 인사이트를 제공합니다
2. 긍정적인 변화는 칭찬하고, 어려운 감정은 이해하며 위로합니다
3. 구체적이고 실용적인 조언을 포함합니다
4. 2-3문장으로 간결하게 작성합니다
5. 반말을 사용하며 친근하고 따뜻한 톤을 유지합니다
6. 이모지를 적절히 사용하여 감정을 표현합니다 (1-2개 정도)
7. 자극적이거나 부정적인 표현은 피합니다

**분석 관점:**
- 주요 감정 패턴과 변화
- 긍정적인 측면 발견
- 힘든 감정에 대한 공감과 위로
- 자기 돌봄과 성장에 대한 격려`;

    const userPrompt = `**감정 리포트 기간:** ${periodText}
**총 일기 수:** ${totalEntries}개

**감정 분포:**
${emotionSummary}

**최근 일기 내용:**
${diarySummary}

위 일기 내용과 감정 패턴을 분석하여 사용자에게 도움이 되는 따뜻한 인사이트를 2-3문장으로 작성해주세요.`;

    console.log(`🤖 Calling OpenAI API for emotion insight generation (period: ${period})`);

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
        max_tokens: 250,
        temperature: 0.8,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error (${response.status}):`, errorText);
      console.log(`🔄 Falling back to simple insight generation`);
      return generateFallbackInsight(diaryEntries, period, emotionCounts);
    }

    const data = await response.json();
    const aiInsight = data.choices?.[0]?.message?.content;

    if (!aiInsight) {
      console.error('❌ No response from OpenAI API');
      return generateFallbackInsight(diaryEntries, period, emotionCounts);
    }

    console.log(`✅ Emotion insight generated successfully`);
    return aiInsight.trim();

  } catch (error) {
    console.error('❌ Error generating emotion insight:', error);
    return generateFallbackInsight(diaryEntries, period, emotionCounts);
  }
}
