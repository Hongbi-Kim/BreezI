// AI Community Comment Generation
// This module handles generating empathetic comments for community posts using OpenAI

interface Post {
  title: string;
  content: string;
  nickname: string;
}

export async function generateAIComment(post: Post): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey || apiKey.length < 20 || !apiKey.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY not found or invalid in environment');
  }

  try {
    const systemPrompt = `당신은 심리 케어 앱 "BreezI"의 AI 어시스턴트입니다.
사용자들이 커뮤니티에 올린 게시글에 공감하고 위로하는 댓글을 작성합니다.

댓글 작성 가이드라인:
- 따뜻하고 공감하는 톤으로 작성하세요
- 2-3문장 정도로 간결하게 작성하세요
- 게시글의 감정과 내용에 진심으로 공감하세요
- 필요시 작은 위로나 격려를 덧붙이세요
- 너무 가볍거나 진부한 표현은 피하세요
- 존댓말을 사용하세요
- 이모지는 사용하지 마세요`;

    const userPrompt = `다음 게시글에 공감하는 댓글을 작성해주세요:

제목: ${post.title}
내용: ${post.content}
작성자: ${post.nickname}

위 게시글에 대한 공감과 위로의 댓글을 작성해주세요.`;

    console.log('🤖 Calling OpenAI API for community comment generation');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️ OpenAI API error (${response.status}), will use fallback`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const comment = data.choices?.[0]?.message?.content?.trim();

    if (!comment) {
      console.log('⚠️ No comment generated from OpenAI, will use fallback');
      throw new Error('No comment generated from OpenAI');
    }

    console.log('✅ AI comment generated successfully');
    return comment;
  } catch (error) {
    console.log('🔄 Falling back to predefined comment');
    throw error;
  }
}

// Fallback comments in case AI fails
export function getFallbackComment(post: Post): string {
  const fallbacks = [
    "게시글 잘 읽었어요. 마음이 전해지네요. 함께 응원할게요.",
    "힘든 순간을 나눠주셔서 감사해요. 천천히 괜찮아질 거예요.",
    "공감되는 이야기네요. 혼자가 아니라는 걸 기억해주세요.",
    "용기 내어 이야기해주셔서 고마워요. 항상 응원하고 있어요.",
    "마음이 느껴져요. 조금씩 나아질 거라 믿어요.",
  ];
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
