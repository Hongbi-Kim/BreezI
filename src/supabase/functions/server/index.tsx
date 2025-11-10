import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import * as kv from './kv_store.tsx';

const app = new Hono();

// .env 파일 로드 (맨 위에서 실행)
await load({ export: true });

app.use('*', logger(console.log));
app.use('*', cors());

// ==================== RATE LIMITING ====================

/**
 * Rate Limiting Middleware
 * - 활성화: IP당 1분에 100 요청 제한
 * - 관리자(khb1620@naver.com)는 제한 없음
 * - 프론트엔드 캐싱 + 백엔드 Rate Limit로 이중 보호
 */
const RATE_LIMIT_WINDOW = 60 * 1000; // 1분 (밀리초)
const RATE_LIMIT_MAX_REQUESTS = 100; // 1분에 100 요청 (일반적인 사용량: 40-50 요청)
const RATE_LIMIT_ENABLED = true; // ✅ 활성화

async function rateLimitMiddleware(c: any, next: any) {
  try {
    // Get client IP address
    const clientIP = c.req.header('cf-connecting-ip') || // Cloudflare
                     c.req.header('x-forwarded-for')?.split(',')[0] || // Proxy
                     c.req.header('x-real-ip') || // Nginx
                     'unknown';

    console.log(`[Rate Limit] Request from IP: ${clientIP}, Path: ${c.req.path}`);

    // Check if user is admin (admins have no rate limit)
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const user = await getUserFromToken(authHeader);
      if (user?.email === 'khb1620@naver.com') {
        console.log('[Rate Limit] Admin user, skipping rate limit check');
        return await next();
      }
    }

    const now = Date.now();
    const rateLimitKey = `rate_limit:${clientIP}`;
    
    // Get current rate limit data
    let rateLimitData = await kv.get(rateLimitKey) || { requests: [], resetAt: now + RATE_LIMIT_WINDOW };
    
    console.log(`[Rate Limit] Current requests count BEFORE cleanup: ${rateLimitData.requests.length}`);
    
    // Clean up old requests (older than 1 minute)
    rateLimitData.requests = rateLimitData.requests.filter((timestamp: number) => 
      now - timestamp < RATE_LIMIT_WINDOW
    );
    
    console.log(`[Rate Limit] Current requests count AFTER cleanup: ${rateLimitData.requests.length} / ${RATE_LIMIT_MAX_REQUESTS}`);
    
    // Check if rate limit exceeded (only if enabled)
    if (RATE_LIMIT_ENABLED && rateLimitData.requests.length >= RATE_LIMIT_MAX_REQUESTS) {
      const oldestRequest = rateLimitData.requests[0];
      const retryAfter = Math.ceil((oldestRequest + RATE_LIMIT_WINDOW - now) / 1000);
      
      console.log(`[Rate Limit] ❌ IP ${clientIP} exceeded limit (${rateLimitData.requests.length} requests)`);
      
      return c.json({ 
        error: 'Too many requests. Please try again later.',
        retryAfter,
        limit: RATE_LIMIT_MAX_REQUESTS,
        windowSeconds: RATE_LIMIT_WINDOW / 1000
      }, 429, {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil((rateLimitData.requests[0] + RATE_LIMIT_WINDOW) / 1000))
      });
    }
    
    if (rateLimitData.requests.length >= RATE_LIMIT_MAX_REQUESTS && !RATE_LIMIT_ENABLED) {
      console.log(`[Rate Limit] ⚠️  WOULD BLOCK (disabled): IP ${clientIP} has ${rateLimitData.requests.length} requests`);
    }
    
    // Add current request timestamp
    rateLimitData.requests.push(now);
    
    // Save updated rate limit data (with 2 minute expiry for cleanup)
    await kv.set(rateLimitKey, rateLimitData);
    
    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
    c.header('X-RateLimit-Remaining', String(RATE_LIMIT_MAX_REQUESTS - rateLimitData.requests.length));
    c.header('X-RateLimit-Reset', String(Math.ceil((now + RATE_LIMIT_WINDOW) / 1000)));
    
    return await next();
  } catch (error) {
    console.error('[Rate Limit] Middleware error:', error);
    // On error, allow the request to proceed
    return await next();
  }
}

// Apply rate limiting to all routes except health check
app.use('/make-server-71735bdc/*', rateLimitMiddleware);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Helper function to get user from access token
async function getUserFromToken(authHeader: string | null) {
  if (!authHeader) return null;
  const accessToken = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  return user;
}

// Helper function to format timestamp as ISO 8601
// Frontend will handle timezone conversion for display
function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

// Helper function to parse timestamp (now simplified for ISO 8601)
function parseTimestamp(timestamp: any): Date {
  if (!timestamp) {
    return new Date(0); // Return epoch if no timestamp
  }
  
  // If it's a Date object, return as is
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // Use standard Date constructor for ISO 8601 strings
  try {
    return new Date(timestamp);
  } catch (error) {
    console.log('Error parsing timestamp:', timestamp, error);
    return new Date(0);
  }
}

// ==================== AUTH ====================

// Sign up endpoint
app.post('/make-server-71735bdc/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    console.log('Signup attempt for email:', email);

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);
    
    if (userExists) {
      console.log('User already exists:', email);
      return c.json({ error: 'User with this email already registered' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        name,
        full_name: name // Also set full_name for display purposes
      },
      email_confirm: true // Auto-confirm email since email server is not configured
    });

    if (error) {
      console.error('Signup error from Supabase:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
      return c.json({ error: error.message }, 400);
    }

    console.log('User created successfully:', data.user?.id);

    // Update user's display name in auth.users table
    if (data.user) {
      await supabase.auth.admin.updateUserById(data.user.id, {
        user_metadata: {
          name,
          full_name: name
        }
      });
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Signup unexpected error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== PROFILE ====================

// Get user profile
app.get('/make-server-71735bdc/profile', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profiles = await kv.get('profiles') || {};
    let profile = profiles[user.id] || {};
    
    // Admin automatically has access to all premium features
    if (user.email === 'khb1620@naver.com') {
      profile = {
        ...profile,
        hasItemPackage: true,
      };
    }
    
    return c.json({ profile: profile || null, email: user.email });
  } catch (error) {
    console.log('Get profile error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Check nickname availability
app.get('/make-server-71735bdc/profile/check-nickname/:nickname', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const nickname = c.req.param('nickname');
    const profiles = await kv.get('profiles') || {};
    
    // Check if nickname is already taken by another active user (exclude withdrawn users)
    const isDuplicate = Object.entries(profiles).some(([userId, profile]: [string, any]) => {
      return userId !== user.id && 
             profile.status !== 'withdrawn' && 
             profile.nickname && 
             profile.nickname.toLowerCase() === nickname.toLowerCase();
    });
    
    return c.json({ available: !isDuplicate });
  } catch (error) {
    console.log('Check nickname error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update user profile
app.post('/make-server-71735bdc/profile', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { birthDate, nickname, aiInfo, countryCode, timezone } = await c.req.json();
    
    const profiles = await kv.get('profiles') || {};
    const existingProfile = profiles[user.id] || {}; 
    
    // Check for nickname duplication (only if nickname is being changed, exclude withdrawn users)
    if (nickname && nickname !== existingProfile.nickname) {
      const isDuplicate = Object.entries(profiles).some(([userId, profile]: [string, any]) => {
        return userId !== user.id && 
               profile.status !== 'withdrawn' && 
               profile.nickname && 
               profile.nickname.toLowerCase() === nickname.toLowerCase();
      });
      
      if (isDuplicate) {
        return c.json({ error: '이미 사용 중인 닉네임입니다.', duplicateNickname: true }, 400);
      }
    }
    
    const profile = {
      ...existingProfile,
      name: user.user_metadata?.name || existingProfile.name, // Store name from auth metadata
      nickname,
      aiInfo,
      // Birth date can only be set once
      birthDate: existingProfile.birthDate || birthDate,
      // Update countryCode and timezone if provided
      countryCode: countryCode || existingProfile.countryCode || 'KR',
      timezone: timezone || existingProfile.timezone || 'Asia/Seoul',
      // Pro subscription fields (keep existing values)
      isPro: existingProfile.isPro || false,
      proStartDate: existingProfile.proStartDate || null,
      proEndDate: existingProfile.proEndDate || null,
      proPaymentInfo: existingProfile.proPaymentInfo || null,
      updatedAt: new Date().toISOString()
    };

    profiles[user.id] = profile;
    await kv.set('profiles', profiles);

    return c.json({ success: true, profile });
  } catch (error) {
    console.log('Update profile error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== CHARACTERS ====================

// Get all characters
app.get('/make-server-71735bdc/characters', async (c) => {
  try {
    const characters = [
      {
        id: 'char_1',
        name: '루미',
        role: 'Emotional Support',
        slogan: '마음이 어두울 때, 내가 작은 빛이 되어줄게요.',
        description: '감정 표현과 위로가 필요할 때',
        avatar: '💡',
        personality: 'empathetic',
        color: '#FFF5EE',
        accentColor: '#FFB6A3',
        symbol: '빛'
      },
      {
        id: 'char_2',
        name: '카이',
        role: 'Solution Guide',
        slogan: '파도는 방향을 잃지 않아요. 흐름 속에서 길을 찾아가죠.',
        description: '문제 해결과 실질적 조언이 필요할 때',
        avatar: '🌊',
        personality: 'logical',
        color: '#1E3A8A',
        accentColor: '#60A5FA',
        symbol: '파도'
      },
      {
        id: 'char_3',
        name: '레오',
        role: 'Reflective Mentor',
        slogan: '흘러가는 감정 속에서, 진짜 나의 생각이 남아요.',
        description: '자기 성찰과 내면 탐색이 필요할 때',
        avatar: '🌙',
        personality: 'reflective',
        color: '#7C3AED',
        accentColor: '#C4B5FD',
        symbol: '거울'
      },
      {
        id: 'char_4',
        name: '리브',
        role: 'Rhythm Coach',
        slogan: '당신의 하루엔 어떤 리듬이 흐르고 있을까요?',
        description: '일상 루틴 관리 및 일정 조율 (구글 캘린더 연동)',
        avatar: '🍃',
        personality: 'balanced',
        color: '#6EE7B7',
        accentColor: '#A7F3D0',
        symbol: '바람',
        hasCalendar: true
      },
      {
        id: 'char_group',
        name: '루미+카이+레오',
        role: 'Multi-Agent Hub',
        slogan: '누가 당신의 마음에 가장 어울릴까요?',
        description: '자동 캐릭터 매칭 단톡방',
        avatar: '💬',
        personality: 'adaptive',
        color: '#F3F4F6',
        accentColor: '#9CA3AF',
        symbol: '하모니',
        isGroup: true,
        isPro: true // Pro 전용 기능
      }
    ];

    return c.json({ characters });
  } catch (error) {
    console.log('Get characters error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== CHAT ====================

import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

// 설정값
const MAX_RECENT_MESSAGES = 5;  // LLM에 전달할 최근 메시지 수
const SUMMARY_TRIGGER = 5;      // 이 개수가 넘으면 요약 생성
const MAX_TOKENS_FOR_SUMMARY = 2000;

// Ollama LLM 초기화
function createOllamaLLM() {
  const ollamaBaseUrl = Deno.env.get('OLLAMA_BASE_URL') || 'https://api.ollama.ai/v1';
  const ollamaModel = Deno.env.get('OLLAMA_MODEL') || 'gpt-oss:120b-cloud';
  const ollamaApiKey = Deno.env.get('OLLAMA_API_KEY');

  return new ChatOllama({
    baseUrl: ollamaBaseUrl,
    model: ollamaModel,
    temperature: 0.3,
    apiKey: ollamaApiKey,
  });
}

// LangChain 메모리 초기화 함수 - 그룹 채팅 지원
async function initializeMemory(characterId: string, chatData: any) {
  const llm = createOllamaLLM();

  // ChatMessageHistory 생성
  const messageHistory = new ChatMessageHistory();

  // 기존 요약이 있으면 SystemMessage로 추가
  if (chatData?.summary) {
    try {
      await messageHistory.addMessage(
        new SystemMessage(`이전 대화 요약: ${chatData.summary}`)
      );
      console.log('Loaded conversation summary into memory');
    } catch (error) {
      console.log('Failed to load summary:', error);
    }
  }

  // 최근 메시지들만 메모리에 로드
  if (chatData?.messages && chatData.messages.length > 0) {
    const recentMessages = chatData.messages.slice(-MAX_RECENT_MESSAGES);
    
    try {
      for (const msg of recentMessages) {
        if (msg.role === 'user') {
          await messageHistory.addMessage(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          // 그룹 채팅인 경우 어떤 캐릭터가 답변했는지 포함
          let content = msg.content;
          if (characterId === 'char_group' && msg.respondingCharacter) {
            content = `[${msg.respondingCharacter.charName}] ${msg.content}`;
          }
          await messageHistory.addMessage(new AIMessage(content));
        }
      }
      console.log(`Loaded ${recentMessages.length} recent messages into memory (total: ${chatData.messages.length})`);
    } catch (error) {
      console.log('Failed to load messages into memory:', error);
    }
  }

  // ConversationSummaryBufferMemory 생성
  const memory = new ConversationSummaryBufferMemory({
    llm: llm,
    chatHistory: messageHistory,
    maxTokenLimit: MAX_TOKENS_FOR_SUMMARY,
    returnMessages: true,
    memoryKey: "chat_history"
  });

  return memory;
}


// Get total unread count (super fast - for notifications badge)
app.get('/make-server-71735bdc/chat/unread-count', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const allChats = await kv.get(`chat:${user.id}`) || {};
    const characterIds = ['char_1', 'char_2', 'char_3', 'char_4', 'char_group'];
    let totalUnread = 0;
    
    for (const charId of characterIds) {
      const chatData = allChats[charId];
      if (!chatData) continue;

      const messages = chatData.messages || [];
      const lastRead = chatData.lastRead;

      if (messages.length > 0) {
        if (lastRead) {
          const lastReadTime = parseTimestamp(lastRead).getTime();
          totalUnread += messages.filter((m: any) => {
            return m.role === 'assistant' && parseTimestamp(m.timestamp).getTime() > lastReadTime;
          }).length;
        } else {
          const lastUserMsgIndex = messages.map((m: any) => m.role).lastIndexOf('user');
          if (lastUserMsgIndex >= 0) {
            totalUnread += messages.slice(lastUserMsgIndex + 1).filter((m: any) => m.role === 'assistant').length;
          } else if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
            totalUnread += messages.filter((m: any) => m.role === 'assistant').length;
          }
        }
      }
    }

    return c.json({ unreadCount: totalUnread });
  } catch (error) {
    console.log('Get unread count error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get chat list summary (optimized for chat list view)
app.get('/make-server-71735bdc/chat/list/summary', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const allChats = await kv.get(`chat:${user.id}`) || {};
    const characterIds = ['char_1', 'char_2', 'char_3', 'char_4', 'char_group'];
    const summaries = [];

    for (const charId of characterIds) {
      const chatData = allChats[charId];
      const messages = chatData?.messages || [];
      const lastRead = chatData?.lastRead || null;
      
      let lastMessage = '';
      let lastMessageTime = '';
      let unreadCount = 0;

      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        lastMessage = lastMsg.content;
        lastMessageTime = lastMsg.timestamp;

        if (lastRead) {
          const lastReadTime = parseTimestamp(lastRead).getTime();
          unreadCount = messages.filter((m: any) => {
            return m.role === 'assistant' && parseTimestamp(m.timestamp).getTime() > lastReadTime;
          }).length;
        } else {
          const lastUserMsgIndex = messages.map((m: any) => m.role).lastIndexOf('user');
          if (lastUserMsgIndex >= 0) {
            unreadCount = messages.slice(lastUserMsgIndex + 1).filter((m: any) => m.role === 'assistant').length;
          } else if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
            unreadCount = messages.filter((m: any) => m.role === 'assistant').length;
          }
        }
      }

      summaries.push({
        characterId: charId,
        lastMessage,
        lastMessageTime,
        unreadCount
      });
    }

    return c.json({ summaries });
  } catch (error) {
    console.log('Get chat list summary error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get chat messages for a character
app.get('/make-server-71735bdc/chat/:characterId', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const characterId = c.req.param('characterId');
    const allChats = await kv.get(`chat:${user.id}`) || {};
    const chatData = allChats[characterId] || {};
    
    const messages = chatData.messages || [];
    const lastRead = chatData.lastRead || null;
    const summary = chatData.summary || null;
    const totalMessages = chatData.totalMessages || messages.length;

    return c.json({ 
      messages, 
      lastRead,
      summary,
      totalMessages,
      displayingRecent: messages.length
    });
  } catch (error) {
    console.log('Get chat messages error:', error);
    return c.json({ error: String(error) }, 500);
  }
});


// Initialize chat with greeting
app.post('/make-server-71735bdc/chat/:characterId/init', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const characterId = c.req.param('characterId');

    const allChats = await kv.get(`chat:${user.id}`) || {};
    const chatData = allChats[characterId];
    
    if (chatData && chatData.messages && chatData.messages.length > 0) {
      return c.json({ success: true, alreadyInitialized: true });
    }

    const characters: Record<string, { name: string; greeting: string }> = {
      'char_1': { name: '루미', greeting: '안녕. 루미예요. 마음이 어두울 때, 내가 작은 빛이 되어줄게요. 오늘 하루는 어떠셨나요?' },
      'char_2': { name: '카이', greeting: '안녕하세요. 카이입니다. 파도는 방향을 잃지 않아요. 함께 정리해볼까요?' },
      'char_3': { name: '레오', greeting: '안녕하세요. 레오예요. 흘러가는 감정 속에서, 진짜 나의 생각을 찾아봐요. 지금 어떤 기분이신가요?' },
      'char_4': { name: '리브', greeting: '안녕하세요. 리브입니다. 당신의 하루엔 어떤 리듬이 흐르고 있을까요? 함께 조율해볼까요?' },
      'char_group': { name: '루미+카이+레오', greeting: '안녕하세요! 💡루미, 🌊카이, 🌙레오가 함께 있어요.\n\n특정 캐릭터와 대화하고 싶다면 @루미, @카이, @레오 처럼 멘션해주세요!\n멘션 없이 말하면 상황에 맞는 캐릭터가 자동으로 답변드릴게요.' }
    };

    const character = characters[characterId];
    if (!character) {
      return c.json({ error: 'Invalid character' }, 400);
    }

    const greetingTimestamp = formatTimestamp(new Date());
    const greetingMessage: any = {
      role: 'assistant',
      content: character.greeting,
      timestamp: greetingTimestamp
    };

    // 그룹 채팅의 경우 초기 인사는 루미가 담당
    if (characterId === 'char_group') {
      greetingMessage.respondingCharacter = {
        charId: 'char_1',
        charName: '루미',
        charEmoji: '💡'
      };
    }

    allChats[characterId] = {
      messages: [greetingMessage],
      lastRead: greetingTimestamp,
      summary: null,
      totalMessages: 1,
      lastSummarizedAt: null,
      summarizedUpTo: 0
    };

    await kv.set(`chat:${user.id}`, allChats);

    return c.json({ success: true, message: greetingMessage });
  } catch (error) {
    console.log('Initialize chat error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

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

// 멘션으로 캐릭터 선택 (최우선)
function selectCharacterByMention(message: string): { charId: string; charName: string; charEmoji: string; reason: string } | null {
  const lowerMessage = message.toLowerCase();
  
  // 멘션 패턴: @루미, @카이, @레오, @리브
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

// LLM을 사용한 지능적 캐릭터 선택
async function selectCharacterWithLLM(message: string): Promise<{ charId: string; charName: string; charEmoji: string; reason: string }> {
  const ollamaApiKey = Deno.env.get('OLLAMA_API_KEY');
  const ollamaBaseUrl = Deno.env.get('OLLAMA_BASE_URL') || 'https://api.ollama.ai/v1';
  const ollamaModel = Deno.env.get('OLLAMA_MODEL') || 'gpt-oss:120b-cloud';

  // API 키가 없으면 키워드 기반 폴백
  if (!ollamaApiKey) {
    console.log('Ollama API key not configured, using keyword-based selection');
    return selectCharacterForGroupChat(message);
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
    console.log('Routing message with LLM...');
    
    const response = await fetch(`${ollamaBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ollamaApiKey}`
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { 
            role: 'system', 
            content: '당신은 JSON만 출력하는 라우터입니다. 설명 없이 JSON만 반환하세요.' 
          },
          { role: 'user', content: routingPrompt }
        ],
        max_tokens: 300,
        temperature: 0.1,  // 더 결정적으로
        stream: false,
        response_format: { type: "json_object" } 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Routing API error: ${response.status}`, errorText);
      throw new Error(`Routing API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('Raw routing response:', content);
    
    if (!content) {
      console.error('Empty content in routing response');
      throw new Error('No content in routing response');
    }

    // 응답이 잘렸는지 확인
    const finishReason = data.choices?.[0]?.finish_reason;
    if (finishReason === 'length') {
      console.warn('Response was truncated due to max_tokens limit');
      // 잘린 JSON 복구 시도
      if (!content.trim().endsWith('}')) {
        content = content.trim() + '"}';  // 간단한 복구
      }
    }

    // JSON 파싱
    let routingResult;
    try {
      // 1. 먼저 ```json ``` 블록 찾기
      const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        routingResult = JSON.parse(jsonBlockMatch[1]);
      } else {
        // 2. 중괄호만 추출
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonStr = jsonMatch[0];
          
          // 잘린 JSON 복구 시도
          if (!jsonStr.trim().endsWith('}')) {
            console.log('Attempting to fix truncated JSON...');
            // "reason": "사용자는 돈 → "reason": "사용자는 돈을 벌고 싶어함"}
            if (jsonStr.includes('"reason"') && !jsonStr.includes('"}')) {
              jsonStr = jsonStr.trim() + '"}';
            } else {
              jsonStr = jsonStr.trim() + '}';
            }
            console.log('Fixed JSON:', jsonStr);
          }
          
          routingResult = JSON.parse(jsonStr);
        } else {
          // 3. 그냥 파싱 시도
          routingResult = JSON.parse(content);
        }
      }
    } catch (parseError) {
      console.error('Failed to parse routing result:', content);
      console.error('Parse error:', parseError);

      // 마지막 시도: 정규식으로 character 추출
      const charMatch = content.match(/"character"\s*:\s*"(char_\d)"/);
      if (charMatch) {
        console.log('Extracted character from broken JSON:', charMatch[1]);
        routingResult = {
          character: charMatch[1],
          reason: '자동 추출'
        };
      } else {
        throw new Error('Invalid JSON in routing response');
      }
    }

    console.log('Parsed routing result:', routingResult);

    // 유효성 검사
    if (!routingResult.character || !routingResult.reason) {
      console.error('Invalid routing result structure:', routingResult);
      throw new Error('Missing character or reason in routing response');
    }

    // reason이 없으면 기본값
    if (!routingResult.reason) {
      routingResult.reason = 'LLM 선택';
    }

    // 캐릭터 매핑
    const characterMap: Record<string, { charId: string; charName: string; charEmoji: string }> = {
      'char_1': { charId: 'char_1', charName: '루미', charEmoji: '💡' },
      'char_2': { charId: 'char_2', charName: '카이', charEmoji: '🌊' },
      'char_3': { charId: 'char_3', charName: '레오', charEmoji: '🌙' }
    };

    const selectedChar = characterMap[routingResult.character];
    
    if (!selectedChar) {
      console.error('Invalid character ID:', routingResult.character);
      throw new Error('Invalid character in routing response');
    }

    console.log(`✅ LLM routing success: ${selectedChar.charName} (${selectedChar.charEmoji})`);
    console.log(`   Reason: ${routingResult.reason}`);

    return {
      ...selectedChar,
      reason: routingResult.reason
    };

  } catch (error) {
    console.error('❌ LLM routing failed, falling back to keyword-based:', error);
    // 폴백: 키워드 기반 선택
    const fallbackResult = selectCharacterForGroupChat(message);
    return fallbackResult;
  }
}

// 키워드 기반 폴백 함수
function selectCharacterForGroupChat(message: string): { charId: string; charName: string; charEmoji: string; reason: string } {
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
  
  // 기본값: 루미 (감정 지원)
  console.log('No clear keyword match, defaulting to 루미');
  return { charId: 'char_1', charName: '루미', charEmoji: '💡', reason: '기본 선택 (감정 지원)' };
}


// 메모리 컨텍스트를 활용한 AI 응답 생성 - 그룹 채팅 지원
// 메모리 컨텍스트를 활용한 AI 응답 생성 - LLM 라우팅 사용
async function getAIResponseWithMemory(
  characterId: string,
  currentMessage: string,
  memory: ConversationSummaryBufferMemory,
  profile: any
): Promise<{ content: string; respondingCharacter?: { charId: string; charName: string; charEmoji: string; reason: string } }> {
  
  const ollamaApiKey = Deno.env.get('OLLAMA_API_KEY');
  const ollamaBaseUrl = Deno.env.get('OLLAMA_BASE_URL') || 'https://api.ollama.ai/v1';
  const ollamaModel = Deno.env.get('OLLAMA_MODEL') || 'gpt-oss:120b-cloud';
  
  let actualCharId = characterId;
  let respondingCharacter = null;
  
  // 그룹 채팅인 경우 캐릭터 선택
  if (characterId === 'char_group') {
    console.log('=== Group Chat: Starting character selection ===');
    console.log(`User message: "${currentMessage}"`);
    
    // 1순위: 멘션 확인
    const mentionedCharacter = selectCharacterByMention(currentMessage);
    if (mentionedCharacter) {
      respondingCharacter = mentionedCharacter;
      actualCharId = respondingCharacter.charId;
      console.log(`🎯 Priority: Mention - ${respondingCharacter.charName} ${respondingCharacter.charEmoji}`);
    } else {
      // 2순위: LLM 기반 라우팅
      console.log('No mention found, using LLM routing...');
      respondingCharacter = await selectCharacterWithLLM(currentMessage);
      actualCharId = respondingCharacter.charId;
      console.log(`🤖 LLM routing: ${respondingCharacter.charName} ${respondingCharacter.charEmoji}`);
    }
    
    console.log(`Selected: ${respondingCharacter.charName} ${respondingCharacter.charEmoji}`);
    console.log(`Reason: ${respondingCharacter.reason}`);
    console.log('=== Selection Complete ===');
  }
  
  if (!ollamaApiKey) {
    console.log('Ollama API key not configured, using fallback response');
    const responses = fallbackResponses[actualCharId] || fallbackResponses['char_1'];
    const randomIndex = Math.floor(Math.random() * responses.length);
    return { 
      content: responses[randomIndex],
      respondingCharacter: respondingCharacter
    };
  }

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

    'char_3': `You are 리오, a reflective mentor who guides users toward self-understanding.
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

  // 그룹 채팅용 시스템 프롬프트 추가
  let groupChatContext = '';
  if (characterId === 'char_group' && respondingCharacter) {
    // 멘션으로 호출되었는지 확인
    const wasMentioned = respondingCharacter.reason.includes('직접 호출');
    
    if (wasMentioned) {
      groupChatContext = `\n\n[그룹 채팅 모드 - 직접 호출됨]
사용자가 당신(${respondingCharacter.charName})을 @멘션으로 직접 호출했습니다.
당신에게 직접 질문하거나 대화하고 싶어합니다.
당신의 캐릭터 특성에 맞게 친근하게 답변해주세요.

참고: 사용자 메시지에서 @멘션 부분은 무시하고 내용에 집중하세요.`;
    } else {
      groupChatContext = `\n\n[그룹 채팅 모드]
당신은 루미, 카이, 레오 중 ${respondingCharacter.charName}로 선택되었습니다.
선택 이유: ${respondingCharacter.reason}
사용자의 메시지를 분석한 결과, 당신의 전문성이 가장 적합하다고 판단되었습니다.
당신의 캐릭터 특성에 맞게 답변해주세요.`;
    }
  }

  const systemPrompt = `${characterPrompts[actualCharId]}${groupChatContext}
  
사용자 정보:
- 닉네임: ${profile.nickname || '익명'}
- AI가 알면 좋은 정보: ${profile.aiInfo || '없음'}

대화할 때:
1. 짧고 자연스러운 답변을 하세요 (2-3문장)
2. 사용자의 감정을 인정하고 공감하세요
3. 필요시 질문으로 대화를 이어가세요
4. 전문가가 아닌 친구처럼 대화하세요
5. 캐릭터의 고유한 스타일을 유지하세요
6. 이전 대화 내용을 참고하여 맥락있는 답변을 하세요`;

  try {
    const memoryVariables = await memory.loadMemoryVariables({});
    const chatHistory = memoryVariables.chat_history || [];
    
    console.log(`Memory loaded: ${chatHistory.length} messages in history`);
    
    const formattedMessages = [];
    
    for (const msg of chatHistory) {
      const msgType = msg.constructor.name;
      
      if (msgType === 'HumanMessage') {
        formattedMessages.push({ 
          role: 'user', 
          content: msg.content 
        });
      } else if (msgType === 'AIMessage') {
        formattedMessages.push({ 
          role: 'assistant', 
          content: msg.content 
        });
      } else if (msgType === 'SystemMessage') {
        formattedMessages.push({ 
          role: 'system', 
          content: msg.content 
        });
      }
    }

    console.log(`Calling Ollama API with ${formattedMessages.length} context messages`);
    
    const response = await fetch(`${ollamaBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ollamaApiKey}`
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedMessages,
          { role: 'user', content: currentMessage }
        ],
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

    console.log('Ollama response successful with memory context');
    
    return {
      content: aiContent,
      respondingCharacter: respondingCharacter
    };
    
  } catch (error) {
    console.log('AI response error, using fallback:', error);
    
    const responses = fallbackResponses[actualCharId] || fallbackResponses['char_1'];
    const randomIndex = Math.floor(Math.random() * responses.length);
    
    return {
      content: responses[randomIndex],
      respondingCharacter: respondingCharacter
    };
  }
}
// Ollama를 사용한 대화 요약 생성 - 제대로 작동하도록 수정
async function generateSummaryWithOllama(messages: any[]): Promise<string> {
  const ollamaApiKey = Deno.env.get('OLLAMA_API_KEY');
  const ollamaBaseUrl = Deno.env.get('OLLAMA_BASE_URL') || 'https://api.ollama.ai/v1';
  const ollamaModel = Deno.env.get('OLLAMA_MODEL') || 'gpt-oss:120b-cloud';

  if (!ollamaApiKey) {
    console.log('Ollama API key not configured, skipping summary');
    return "이전 대화 내용이 있습니다.";
  }

  try {
    // 메시지를 텍스트로 변환
    const conversationText = messages.map((msg: any) => {
      const role = msg.role === 'user' ? '사용자' : 'AI';
      return `${role}: ${msg.content}`;
    }).join('\n');

    console.log(`Generating summary for ${messages.length} messages...`);

    const summaryPrompt = `다음 대화를 간결하게 요약해주세요. 주요 주제, 감정 상태, 중요한 정보만 3-4문장으로 포함하세요:

${conversationText}

요약:`;

    const response = await fetch(`${ollamaBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ollamaApiKey}`
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: 'system', content: '당신은 대화를 간결하게 요약하는 어시스턴트입니다.' },
          { role: 'user', content: summaryPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Summary API error: ${response.status}`, errorText);
      throw new Error(`Summary API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;
    
    if (!summary) {
      throw new Error('No summary content in response');
    }

    console.log('Summary generated successfully:', summary.substring(0, 100) + '...');
    return summary;
    
  } catch (error) {
    console.error('Summary generation error:', error);
    return "이전 대화 내용이 있습니다.";
  }
}

// POST 엔드포인트 - 모든 메시지 저장, 요약 로직 수정
app.post('/make-server-71735bdc/chat/:characterId', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const characterId = c.req.param('characterId');
    const { message } = await c.req.json();

    const profiles = await kv.get('profiles') || {};
    const profile = profiles[user.id] || {};

    const allChats = await kv.get(`chat:${user.id}`) || {};
    const chatData = allChats[characterId] || { 
      messages: [],
      summary: null,
      lastRead: null,
      totalMessages: 0,
      lastSummarizedAt: null,
      summarizedUpTo: 0
    };

    console.log(`Initializing memory for ${characterId}... (Total messages: ${chatData.messages.length})`);
    
    // LangChain 메모리 초기화
    const memory = await initializeMemory(characterId, chatData);

    // 사용자 메시지 추가
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: formatTimestamp(new Date()),
      userId: user.id
    };
    chatData.messages.push(userMessage);
    chatData.totalMessages = chatData.messages.length;

    // Get AI response with memory context
    const responseStartTime = Date.now();
    const aiResponse = await getAIResponseWithMemory(
      characterId, 
      message,
      memory,
      profile
    );
    const responseTime = Date.now() - responseStartTime;

    // AI 응답 추가 - 그룹 채팅인 경우 응답 캐릭터 정보 포함
    // POST 엔드포인트에서 reason도 저장
    const assistantMessage: any = {
      role: 'assistant',
      content: aiResponse.content,
      timestamp: formatTimestamp(new Date()),
      responseTime: responseTime
    };

    // 그룹 채팅인 경우 어떤 캐릭터가 답변했는지 + 이유 저장
    if (aiResponse.respondingCharacter) {
      assistantMessage.respondingCharacter = {
        charId: aiResponse.respondingCharacter.charId,
        charName: aiResponse.respondingCharacter.charName,
        charEmoji: aiResponse.respondingCharacter.charEmoji,
        reason: aiResponse.respondingCharacter.reason  // 선택 이유 추가
      };
      console.log(`Group chat response by: ${aiResponse.respondingCharacter.charName}`);
      console.log(`Selection reason: ${aiResponse.respondingCharacter.reason}`);
    }
    
    chatData.messages.push(assistantMessage);
    chatData.totalMessages = chatData.messages.length;

    // 메모리에 대화 저장 - ChatMessageHistory에 직접 추가
    try {
      const chatHistory = memory.chatHistory;
      await chatHistory.addMessage(new HumanMessage(message));
      await chatHistory.addMessage(new AIMessage(aiResponse.content));
      console.log('Conversation saved to memory');
    } catch (error) {
      console.log('Failed to save to memory (non-critical):', error);
      // 메모리 저장 실패는 치명적이지 않음 (DB에는 저장됨)
    }

    // 요약 생성 로직 (전체 재요약 방식)
    if (chatData.messages.length > SUMMARY_TRIGGER) {
      const endIdx = chatData.messages.length - MAX_RECENT_MESSAGES;
      
      if (endIdx > (chatData.summarizedUpTo || 0)) {
        console.log(`Generating summary for ${characterId}...`);
        console.log(`Total messages: ${chatData.messages.length}, Summarizing up to: ${endIdx}`);
        
        try {
          const messagesToSummarize = chatData.messages.slice(0, endIdx);
          
          if (messagesToSummarize.length > 0) {
            console.log(`Summarizing entire conversation: ${messagesToSummarize.length} messages`);
            
            const newSummary = await generateSummaryWithOllama(messagesToSummarize);
            
            chatData.summary = newSummary;
            chatData.lastSummarizedAt = formatTimestamp(new Date());
            chatData.summarizedUpTo = endIdx;
            
            console.log(`Summary updated. Summarized ${messagesToSummarize.length} messages.`);
          }
        } catch (error) {
          console.error('Summary generation failed:', error);
        }
      }
    }

    console.log(`AI response time for ${characterId}: ${responseTime}ms`);
    console.log(`Total messages in DB: ${chatData.messages.length}`);

    // 모든 메시지를 DB에 저장
    allChats[characterId] = chatData;
    await kv.set(`chat:${user.id}`, allChats);

    return c.json({ success: true, message: assistantMessage });
  } catch (error) {
    console.log('Send chat message error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Mark chat as read
app.post('/make-server-71735bdc/chat/:characterId/read', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const characterId = c.req.param('characterId');
    const timestamp = formatTimestamp(new Date());
    
    console.log('Marking chat as read:', { userId: user.id, characterId, timestamp });
    
    const allChats = await kv.get(`chat:${user.id}`) || {};
    
    if (!allChats[characterId]) {
      allChats[characterId] = { messages: [], lastRead: timestamp };
    } else {
      allChats[characterId].lastRead = timestamp;
    }
    
    await kv.set(`chat:${user.id}`, allChats);

    return c.json({ success: true, timestamp });
  } catch (error) {
    console.log('Mark read error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete chat for a character
app.delete('/make-server-71735bdc/chat/:characterId', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const characterId = c.req.param('characterId');
    
    console.log('Deleting chat for:', { userId: user.id, characterId });
    
    const allChats = await kv.get(`chat:${user.id}`) || {};
    
    if (allChats[characterId]) {
      delete allChats[characterId];
      await kv.set(`chat:${user.id}`, allChats);
      console.log('Chat deleted successfully');
    } else {
      console.log('No chat found for character:', characterId);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Delete chat error:', error);
    return c.json({ error: String(error) }, 500);
  }
});


// ==================== DIARY ====================

// Get all diaries for user
app.get('/make-server-71735bdc/diaries', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      console.log('Unauthorized diaries fetch attempt');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('Fetching diaries for user:', user.id);
    // Single KV read for all diaries
    const diaries = await kv.get(`diary:${user.id}`) || [];
    console.log('Raw diaries from KV:', diaries.length);
    
    // Sort by date descending (newest first)
    const sortedDiaries = diaries
      .filter((diary: any) => diary && diary.id && diary.date)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log('Filtered and sorted diaries:', sortedDiaries.length);
    if (sortedDiaries.length > 0) {
      console.log('Sample diary:', sortedDiaries[0]);
    }
    return c.json({ diaries: sortedDiaries });
  } catch (error) {
    console.log('Get diaries error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get diary by date
app.get('/make-server-71735bdc/diary/:date', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const date = c.req.param('date');
    const diaries = await kv.get(`diary:${user.id}`) || [];
    const diary = diaries.find((d: any) => d.date === date);

    return c.json({ diary: diary || null });
  } catch (error) {
    console.log('Get diary error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Create or update diary
app.post('/make-server-71735bdc/diary', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      console.log('Unauthorized diary save attempt');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { date, title, emotion, content, praise, regret } = await c.req.json();
    
    console.log('Saving diary for user:', user.id, 'date:', date);

    if (!date || !title || !content) {
      console.log('Missing required fields:', { date, title, content });
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const diary = {
      id: `${user.id}:${date}`,
      userId: user.id,
      date,
      title,
      emotion: emotion || 'neutral',
      content,
      praise: praise || '',
      regret: regret || '',
      createdAt: new Date().toISOString()
    };

    console.log('Saving diary:', diary);
    
    // Get all diaries for user
    const diaries = await kv.get(`diary:${user.id}`) || [];
    
    // Find and update existing diary or add new one
    const existingIndex = diaries.findIndex((d: any) => d.date === date);
    if (existingIndex >= 0) {
      diaries[existingIndex] = diary;
    } else {
      diaries.push(diary);
    }
    
    // Save all diaries
    await kv.set(`diary:${user.id}`, diaries);
    console.log('Saved diaries, total count:', diaries.length);

    return c.json({ success: true, diary });
  } catch (error) {
    console.log('Create diary error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete diary
app.delete('/make-server-71735bdc/diary/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const diaryId = c.req.param('id');
    console.log('Deleting diary:', diaryId, 'for user:', user.id);

    // Get all diaries for user
    const diaries = await kv.get(`diary:${user.id}`) || [];

    // Filter out the diary to delete
    const updatedDiaries = diaries.filter((d: any) => d.id !== diaryId);

    if (updatedDiaries.length === diaries.length) {
      return c.json({ error: 'Diary not found' }, 404);
    }

    // Save updated diaries
    await kv.set(`diary:${user.id}`, updatedDiaries);
    console.log('Deleted diary, remaining count:', updatedDiaries.length);

    return c.json({ success: true });
  } catch (error) {
    console.log('Delete diary error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Generate diary draft from chat
app.post('/make-server-71735bdc/diary/generate', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      console.log('Unauthorized diary generate attempt');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { date } = await c.req.json();
    console.log('Generating diary draft for user:', user.id, 'date:', date);

    // Get today's chat messages from all characters
    const allChats = await kv.get(`chat:${user.id}`) || {};
    const allMessages: string[] = [];
    
    for (const charId of ['char_1', 'char_2', 'char_3', 'char_4', 'char_group']) {
      const chatData = allChats[charId];
      const messages = chatData?.messages || [];
      const todayMessages = messages.filter((m: any) => {
        const msgDate = new Date(m.timestamp).toISOString().split('T')[0];
        return msgDate === date && m.role === 'user';
      });
      allMessages.push(...todayMessages.map((m: any) => m.content));
    }

    console.log('Found messages for diary generation:', allMessages.length);

    if (allMessages.length === 0) {
      console.log('No messages found, returning default draft');
      return c.json({ 
        draft: {
          title: '오늘의 하루',
          emotion: 'neutral',
          content: '오늘 하루를 되돌아보며 기록해��세요.'
        }
      });
    }

    // Helper function to generate fallback diary based on keywords
    const generateFallbackDiary = (messages: string[]) => {
      const allText = messages.join(' ').toLowerCase();
      
      // Detect emotions based on keywords
      let emotion = 'neutral';
      let title = '오늘의 하루';
      
      if (allText.includes('좋') || allText.includes('행복') || allText.includes('기쁨') || allText.includes('즐거')) {
        emotion = 'happy';
        title = '기분 좋은 하루';
      } else if (allText.includes('힘들') || allText.includes('슬프') || allText.includes('우울') || allText.includes('속상')) {
        emotion = 'sad';
        title = '힘들었던 하루';
      } else if (allText.includes('불안') || allText.includes('걱정') || allText.includes('긴장')) {
        emotion = 'anxious';
        title = '불안했던 하루';
      } else if (allText.includes('평온') || allText.includes('편안') || allText.includes('차분')) {
        emotion = 'calm';
        title = '평온한 하루';
      } else if (allText.includes('설레') || allText.includes('기대') || allText.includes('신나')) {
        emotion = 'excited';
        title = '설레는 하루';
      } else if (allText.includes('피곤') || allText.includes('지침') || allText.includes('힘') || allText.includes('졸려')) {
        emotion = 'tired';
        title = '피곤한 하루';
      }
      
      // Create content from first few messages
      const content = messages.slice(0, 3).join(' ').substring(0, 150) + 
        (messages.join(' ').length > 150 ? '...' : '');
      
      return { title, emotion, content };
    };

    // Generate draft using AI
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return c.json({ 
        draft: generateFallbackDiary(allMessages)
      });
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `당신은 사용자의 채팅 내용을 바탕으로 간단한 일기 초안을 작성하는 어시스턴트입니다.
다음 형식의 JSON으로 응답하세요:
{
  "title": "일기 제목 (5-10자)",
  "emotion": "happy/sad/anxious/calm/excited/tired/neutral 중 하나",
  "content": "일기 내용 (2-3문장, 사용자 관점���� 1인칭)"
}`
            },
            {
              role: 'user',
              content: `오늘 나눈 대화 내용:\n${allMessages.join('\n')}\n\n이를 바탕으로 일기 초안을 작성해주세요.`
            }
          ],
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        const draft = JSON.parse(data.choices[0].message.content);
        return c.json({ draft });
      }
    } catch (error) {
      console.log('AI diary generation error, using fallback:', error);
    }

    // Fallback with keyword detection
    return c.json({ 
      draft: generateFallbackDiary(allMessages)
    });
  } catch (error) {
    console.log('Generate diary error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== TIME CAPSULE ====================

// Create time capsule
app.post('/make-server-71735bdc/timecapsule/create', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { diaryId, diaryTitle, openDate } = await c.req.json();
    console.log('Creating time capsule:', { diaryId, diaryTitle, openDate });

    // Get existing capsules
    const capsules = await kv.get(`timecapsule:${user.id}`) || [];

    // Create new capsule
    const capsule = {
      id: `capsule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      diaryId,
      diaryTitle,
      openDate,
      createdAt: new Date().toISOString(),
      isOpen: false,
    };

    capsules.push(capsule);
    await kv.set(`timecapsule:${user.id}`, capsules);

    console.log('Time capsule created:', capsule.id);
    return c.json({ success: true, capsule });
  } catch (error) {
    console.log('Create time capsule error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// List time capsules
app.get('/make-server-71735bdc/timecapsule/list', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const capsules = await kv.get(`timecapsule:${user.id}`) || [];
    console.log('Found time capsules:', capsules.length);

    return c.json({ capsules });
  } catch (error) {
    console.log('List time capsules error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Open time capsule
app.post('/make-server-71735bdc/timecapsule/open/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const capsuleId = c.req.param('id');
    console.log('Opening time capsule:', capsuleId);

    const capsules = await kv.get(`timecapsule:${user.id}`) || [];
    const capsuleIndex = capsules.findIndex((c: any) => c.id === capsuleId);

    if (capsuleIndex === -1) {
      return c.json({ error: 'Capsule not found' }, 404);
    }

    const capsule = capsules[capsuleIndex];
    const today = new Date().toISOString().split('T')[0];

    // Check if can open
    if (capsule.openDate > today) {
      return c.json({ error: 'Cannot open yet' }, 403);
    }

    // Mark as open
    capsules[capsuleIndex].isOpen = true;
    await kv.set(`timecapsule:${user.id}`, capsules);

    // Get the diary
    const diaries = await kv.get(`diary:${user.id}`) || [];
    const diary = diaries.find((d: any) => d.id === capsule.diaryId);

    return c.json({ success: true, capsule, diary });
  } catch (error) {
    console.log('Open time capsule error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== REPORTS ====================

// Get emotion statistics
app.get('/make-server-71735bdc/reports/emotions', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { period = 'week' } = c.req.query();

    console.log('Loading emotion reports for period:', period);
    const diaries = await kv.get(`diary:${user.id}`) || [];
    console.log('Found diaries for reports:', diaries.length);
    
    // Filter by period
    const now = new Date();
    const filteredDiaries = diaries.filter((diary: any) => {
      if (!diary || !diary.date) return false;
      const diaryDate = new Date(diary.date);
      const diffDays = Math.floor((now.getTime() - diaryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Use < instead of <= to ensure exactly 7 days for week and 30 days for month
      if (period === 'week') return diffDays < 7;
      if (period === 'month') return diffDays < 30;
      return true;
    });

    // Count emotions
    const emotionCounts: Record<string, number> = {};
    filteredDiaries.forEach(diary => {
      if (diary && diary.emotion) {
        emotionCounts[diary.emotion] = (emotionCounts[diary.emotion] || 0) + 1;
      }
    });

    // Prepare calendar data (use all diaries for calendar, not just filtered ones)
    const calendarData = diaries
      .filter((diary: any) => diary && diary.date && diary.emotion && diary.title)
      .map((diary: any) => ({
        date: diary.date,
        emotion: diary.emotion,
        title: diary.title
      }));

    // Analyze chat activity time
    // ✅ GOOD: 1번의 KV 읽기로 모든 채팅 데이터 조회
    const allChats = await kv.get(`chat:${user.id}`) || {};
    const chatTimes: number[] = [];
    
    // Get user's timezone from profile (default: Asia/Seoul)
    const profiles = await kv.get('profiles') || {};
    const userProfile = profiles[user.id] || {};
    const userTimezone = userProfile.timezone || 'Asia/Seoul';
    console.log(`[Reports] Using timezone: ${userTimezone} for user ${user.id}`);
    
    Object.values(allChats).forEach((chatData: any) => {
      if (chatData.messages && Array.isArray(chatData.messages)) {
        chatData.messages.forEach((msg: any) => {
          if (msg.role === 'user' && msg.timestamp) {
            const date = new Date(msg.timestamp);
            // Filter by period
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            if ((period === 'week' && diffDays <= 7) || (period === 'month' && diffDays <= 30)) {
              // Convert UTC time to user's local time
              const localTimeString = date.toLocaleString('en-US', { 
                timeZone: userTimezone,
                hour: '2-digit',
                hour12: false 
              });
              const localHour = parseInt(localTimeString.split(',')[1]?.trim().split(':')[0] || '0');
              chatTimes.push(localHour);
            }
          }
        });
      }
    });

    // Count messages by hour
    const hourCounts: Record<number, number> = {};
    chatTimes.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Find peak hours
    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));

    // Analyze character interactions for insights
    const characterInsights: Array<{ characterId: string; characterName: string; messageCount: number; insight: string }> = [];
    
    const characterInfo: Record<string, { name: string; emoji: string }> = {
      'lumi': { name: '루미', emoji: '🌙' },
      'kai': { name: '카이', emoji: '💡' },
      'leo': { name: '레오', emoji: '🦁' },
      'liv': { name: '리브', emoji: '📊' },
      'group': { name: '단톡방', emoji: '💬' }
    };

    // Map char_1, char_2, etc to lumi, kai, etc
    const charIdMapping: Record<string, string> = {
      'char_1': 'lumi',
      'char_2': 'kai',
      'char_3': 'leo',
      'char_4': 'liv',
      'char_group': 'group'
    };

    // Count messages per character in the period
    const characterMessageCounts: Record<string, number> = {};
    Object.entries(allChats).forEach(([characterId, chatData]: [string, any]) => {
      if (chatData.messages && Array.isArray(chatData.messages)) {
        const userMessages = chatData.messages.filter((msg: any) => {
          if (msg.role !== 'user' || !msg.timestamp) return false;
          const date = new Date(msg.timestamp);
          const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          return (period === 'week' && diffDays <= 7) || (period === 'month' && diffDays <= 30);
        });
        if (userMessages.length > 0) {
          // Map character ID to standard format
          const mappedCharId = charIdMapping[characterId] || characterId;
          characterMessageCounts[mappedCharId] = (characterMessageCounts[mappedCharId] || 0) + userMessages.length;
        }
      }
    });

    // Generate insights for characters with interaction
    for (const [charId, msgCount] of Object.entries(characterMessageCounts)) {
      const char = characterInfo[charId];
      if (!char || msgCount === 0) continue;

      let insight = '';
      const topEmotion = Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0];
      const topEmotionName = topEmotion ? topEmotion[0] : null;

      // Generate character-specific insights based on their personality
      if (charId === 'lumi') {
        if (topEmotionName === 'sad' || topEmotionName === 'anxious') {
          insight = '힘든 시간을 보내고 계신 것 같아요. 당신의 감정을 함께 나누어주셔서 고마워요. 언제나 당신 곁에 있어요.';
        } else if (topEmotionName === 'happy' || topEmotionName === 'excited') {
          insight = '행복한 순간들이 많았네요! 당신의 기쁨이 저에게도 전해져요. 이런 순간들이 계속되길 바랄게요.';
        } else {
          insight = '이번 주도 당신과 함께할 수 있어서 좋았어요. 어떤 감정이든 편하게 나눠주세요.';
        }
      } else if (charId === 'kai') {
        if (topEmotionName === 'anxious' || topEmotionName === 'tired') {
          insight = '스트레스가 쌓인 것 같네요. 작은 목표를 세워서 하나씩 해결해보는 건 어떨까요? 제가 도와드릴게요.';
        } else if (topEmotionName === 'happy') {
          insight = '좋은 흐름이네요! 이 패턴을 유지하면서 더 발전할 수 있는 방법을 함께 찾아봐요.';
        } else {
          insight = '꾸준히 기록하고 계시네요. 다음 단계로 나아갈 준비가 된 것 같아요.';
        }
      } else if (charId === 'leo') {
        if (emotionCounts && Object.keys(emotionCounts).length > 3) {
          insight = '다양한 감정을 경험하셨네요. 이런 감정의 변화 속에서 자신에 대해 무엇을 발견하셨나요?';
        } else if (topEmotionName) {
          insight = `${topEmotionName === 'sad' ? '슬픔' : topEmotionName === 'happy' ? '행복' : topEmotionName}이 주를 이뤘네요. 이 감정이 당신에게 전하는 메시지는 무엇일까요?`;
        } else {
          insight = '내면의 ���리에 귀 기울이는 시간을 가지셨군요. 이런 성찰이 성장의 밑거름이 됩니다.';
        }
      } else if (charId === 'liv') {
        const diaryCount = filteredDiaries.length;
        const periodDays = period === 'week' ? 7 : 30;
        const consistency = ((diaryCount / periodDays) * 100).toFixed(0);
        
        insight = `${period === 'week' ? '이번 ���' : '이번 달'} ${diaryCount}일 기록하셨네요. (꾸준도: ${consistency}%) ${parseInt(consistency) > 70 ? '훌륭한 일관성이에요!' : parseInt(consistency) > 40 ? '좋은 습관이 만들어지고 있어요.' : '조금씩 더 자주 기록해보면 어떨까요?'}`;
      } else if (charId === 'group') {
        insight = '여러 캐릭터들과 함께 이야기 나누면서 다양한 관점�� 얻으셨을 거예요. 균형잡힌 시각이 중요하죠.';
      }

      characterInsights.push({
        characterId: charId,
        characterName: char.name,
        messageCount: msgCount,
        insight
      });
    }

    // Sort by message count
    characterInsights.sort((a, b) => b.messageCount - a.messageCount);

    // Analyze frequent words from user messages
    const frequentWords: Record<string, number> = {};
    const stopWords = new Set([
      '이', '그', '저', '것', '수', '등', '들', '및', '더', '또', '및',
      '나', '내', '제', '우리', '저희', '너', '당신', '그', '이', '저',
      '은', '는', '이', '가', '을', '를', '에', '의', '와', '과', '도',
      '으로', '로', '에서', '부터', '까지', '하고', '하다', '있다', '없다',
      '이다', '아니다', '되다', '하다', '같다', '다', '네', '요', '해',
      '게', '지', '것', '거', '뭐', '뭘', '좀', '너무', '진짜', '정말',
      '그냥', '막', '약간', '조금', '많이', '아주', '매우', '엄청', '완전'
    ]);

    Object.values(allChats).forEach((chatData: any) => {
      if (chatData.messages && Array.isArray(chatData.messages)) {
        chatData.messages.forEach((msg: any) => {
          if (msg.role === 'user' && msg.content && msg.timestamp) {
            const date = new Date(msg.timestamp);
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            
            if ((period === 'week' && diffDays <= 7) || (period === 'month' && diffDays <= 30)) {
              // Extract words (Korean and English, minimum 2 characters)
              const words = msg.content.match(/[가-힣a-zA-Z]{2,}/g) || [];
              
              words.forEach((word: string) => {
                const normalized = word.toLowerCase();
                // Skip stop words and very common short words
                if (!stopWords.has(normalized) && word.length >= 2) {
                  frequentWords[word] = (frequentWords[word] || 0) + 1;
                }
              });
            }
          }
        });
      }
    });

    // Get top 30 most frequent words
    const topWords = Object.entries(frequentWords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30)
      .map(([word, count]) => ({ word, count }));

    return c.json({ 
      emotionCounts,
      calendarData,
      totalDiaries: filteredDiaries.length,
      chatActivity: {
        peakHours,
        totalMessages: chatTimes.length
      },
      characterInsights,
      frequentWords: topWords
    });
  } catch (error) {
    console.log('Get emotion statistics error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== FEEDBACK ====================

// Submit feedback
app.post('/make-server-71735bdc/feedback', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { content } = await c.req.json();
    
    if (!content || !content.trim()) {
      return c.json({ error: 'Content is required' }, 400);
    }

    // Get user profile for additional info
    const profiles = await kv.get('profiles') || {};
    const profile = profiles[user.id] || {};
    
    const feedback = {
      id: crypto.randomUUID(),
      userId: user.id,
      email: user.email,
      nickname: profile.nickname || 'Unknown',
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    console.log('Saving feedback:', feedback);
    
    // Get all feedbacks and add new one
    const feedbacks = await kv.get('feedbacks') || [];
    feedbacks.push(feedback);
    await kv.set('feedbacks', feedbacks);

    return c.json({ success: true, feedback });
  } catch (error) {
    console.log('Submit feedback error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get all feedback (admin only)
app.get('/make-server-71735bdc/admin/feedback', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    const feedbacks = await kv.get('feedbacks') || [];
    
    // Sort by createdAt descending (newest first)
    const sortedFeedbacks = feedbacks.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return c.json({ feedbacks: sortedFeedbacks });
  } catch (error) {
    console.log('Get feedback error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== ADMIN ====================

// Get all users (admin only)
app.get('/make-server-71735bdc/admin/users', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      return c.json({ error: error.message }, 500);
    }

    // Batch fetch all diaries (new structure: diary:userId = [...])
    const allDiaryKeys = await kv.getByPrefix('diary:');
    
    // Create a map of userId -> diary count
    const diaryCountMap = new Map<string, number>();
    allDiaryKeys.forEach((diaries: any) => {
      if (Array.isArray(diaries) && diaries.length > 0 && diaries[0]?.userId) {
        const userId = diaries[0].userId;
        diaryCountMap.set(userId, diaries.length);
      }
    });

    // Fetch all profiles in one read
    const profiles = await kv.get('profiles') || {};

    const userStats = users.users.map((u) => {
      const birthDate = profiles[u.id]?.birthDate;
      let age = null;
      if (birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
      }

      const profile = profiles[u.id];
      
      // Get country code from profile (directly stored, not extracted from locale)
      const countryCode = profile?.countryCode || 'KR';
      
      const isPro = profile?.isPro || false;
      const proEndDate = profile?.proEndDate;
      
      // Check if pro subscription is expired
      const isProActive = isPro && proEndDate && new Date(proEndDate) > new Date();
      
      // Check if user has item package
      const hasItemPackage = profile?.hasItemPackage || false;
      const itemPackagePurchasedAt = profile?.itemPackagePurchasedAt;
      
      // Admin automatically has Pro and item package
      const isAdmin = u.email === 'khb1620@naver.com';

      return {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name,
        nickname: profiles[u.id]?.nickname,
        birthDate: birthDate,
        age: age,
        countryCode: countryCode,
        timezone: profiles[u.id]?.timezone,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        diaryCount: diaryCountMap.get(u.id) || 0,
        isPro: isAdmin ? true : isProActive,
        proStartDate: profile?.proStartDate,
        proEndDate: profile?.proEndDate,
        hasItemPackage: isAdmin ? true : hasItemPackage,
        itemPackagePurchasedAt: itemPackagePurchasedAt,
        status: profile?.status || 'active',
        withdrawnAt: profile?.withdrawnAt
      };
    });

    return c.json({ users: userStats });
  } catch (error) {
    console.log('Get admin users error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// DEPRECATED: Old stats endpoint without Pro stats - REMOVED (duplicate endpoint)
// The correct endpoint with proStats is at line 3200+ (search for 'admin/stats')

// ==================== USER BEHAVIOR LOGS ====================

// Log user action
app.post('/make-server-71735bdc/logs/action', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { action, feature, metadata } = await c.req.json();

    const logEntry = {
      userId: user.id,
      action, // 'view', 'click', 'complete', etc.
      feature, // 'chat', 'diary', 'report', 'garden', 'mission', etc.
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    // Get existing logs
    const logs = await kv.get(`logs:${user.id}`) || [];
    
    // Add new log
    logs.push(logEntry);
    
    // Keep only last 1000 logs per user to prevent data bloat
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    await kv.set(`logs:${user.id}`, logs);

    return c.json({ success: true });
  } catch (error) {
    console.log('Log action error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get user behavior statistics (admin only)
app.get('/make-server-71735bdc/admin/behavior-logs', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    const { data: users } = await supabase.auth.admin.listUsers();
    const profiles = await kv.get('profiles') || {};
    
    // Filter active users
    const activeUsers = users?.users.filter(u => profiles[u.id]?.status !== 'withdrawn') || [];
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Collect all user logs
    const allLogKeys = await kv.getByPrefix('logs:');
    
    // DAU - Daily Active Users (today)
    const dauSet = new Set<string>();
    const wauSet = new Set<string>(); // Weekly Active Users
    const mauSet = new Set<string>(); // Monthly Active Users
    
    // Feature clicks
    const featureClicks: Record<string, number> = {
      chat: 0,
      diary: 0,
      report: 0,
      garden: 0,
      wave: 0,
      mission: 0,
      profile: 0
    };
    
    // Mission participation
    let totalMissions = 0;
    const missionParticipants = new Set<string>();
    
    allLogKeys.forEach((logs: any) => {
      if (!Array.isArray(logs)) return;
      
      logs.forEach((log: any) => {
        if (!log || !log.userId || !log.timestamp) return;
        
        const logDate = new Date(log.timestamp);
        const userId = log.userId;
        
        // Check if user is active
        if (profiles[userId]?.status === 'withdrawn') return;
        
        // DAU/WAU/MAU
        if (logDate >= todayStart) {
          dauSet.add(userId);
        }
        if (logDate >= sevenDaysAgo) {
          wauSet.add(userId);
        }
        if (logDate >= thirtyDaysAgo) {
          mauSet.add(userId);
        }
        
        // Feature clicks
        if (log.feature && featureClicks.hasOwnProperty(log.feature)) {
          featureClicks[log.feature]++;
        }
        
        // Mission participation
        if (log.feature === 'mission' && log.action === 'complete') {
          totalMissions++;
          missionParticipants.add(userId);
        }
      });
    });

    // Calculate retention rates
    const retention1Day = new Set<string>();
    const retention7Day = new Set<string>();
    const retention30Day = new Set<string>();
    
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    
    activeUsers.forEach((u) => {
      const signupDate = new Date(u.created_at);
      const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Get user logs
      const userLogs = allLogKeys.find((logs: any) => 
        Array.isArray(logs) && logs.length > 0 && logs[0].userId === u.id
      );
      
      if (!userLogs || !Array.isArray(userLogs)) return;
      
      // Check if user has activity after signup
      const hasActivityAfter1Day = daysSinceSignup >= 1 && userLogs.some((log: any) => {
        const logDate = new Date(log.timestamp);
        return logDate > new Date(signupDate.getTime() + 24 * 60 * 60 * 1000);
      });
      
      const hasActivityAfter7Days = daysSinceSignup >= 7 && userLogs.some((log: any) => {
        const logDate = new Date(log.timestamp);
        return logDate > new Date(signupDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      });
      
      const hasActivityAfter30Days = daysSinceSignup >= 30 && userLogs.some((log: any) => {
        const logDate = new Date(log.timestamp);
        return logDate > new Date(signupDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      });
      
      if (hasActivityAfter1Day) retention1Day.add(u.id);
      if (hasActivityAfter7Days) retention7Day.add(u.id);
      if (hasActivityAfter30Days) retention30Day.add(u.id);
    });

    // Calculate retention rates as percentages
    const eligibleFor1Day = activeUsers.filter(u => {
      const daysSinceSignup = Math.floor((now.getTime() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceSignup >= 1;
    }).length;
    
    const eligibleFor7Days = activeUsers.filter(u => {
      const daysSinceSignup = Math.floor((now.getTime() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceSignup >= 7;
    }).length;
    
    const eligibleFor30Days = activeUsers.filter(u => {
      const daysSinceSignup = Math.floor((now.getTime() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceSignup >= 30;
    }).length;

    return c.json({
      dau: dauSet.size,
      wau: wauSet.size,
      mau: mauSet.size,
      featureClicks,
      missionParticipation: {
        totalMissions,
        uniqueParticipants: missionParticipants.size,
        participationRate: activeUsers.length > 0 
          ? ((missionParticipants.size / activeUsers.length) * 100).toFixed(1)
          : '0'
      },
      retentionRate: {
        day1: eligibleFor1Day > 0 ? ((retention1Day.size / eligibleFor1Day) * 100).toFixed(1) : '0',
        day7: eligibleFor7Days > 0 ? ((retention7Day.size / eligibleFor7Days) * 100).toFixed(1) : '0',
        day30: eligibleFor30Days > 0 ? ((retention30Day.size / eligibleFor30Days) * 100).toFixed(1) : '0',
        eligible1Day: eligibleFor1Day,
        eligible7Days: eligibleFor7Days,
        eligible30Days: eligibleFor30Days
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log('Get behavior logs error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== NOTIFICATIONS ====================

// Send notification (admin only)
app.post('/make-server-71735bdc/admin/notifications', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    const { userIds, message } = await c.req.json();
    
    if (!message || !message.trim()) {
      return c.json({ error: 'Message is required' }, 400);
    }

    // If userIds is null (전체 선택), get all current users
    let targetUserIds = userIds;
    if (!userIds || userIds.length === 0) {
      // Get all users from auth
      const { data: { users: allUsers }, error } = await supabase.auth.admin.listUsers();
      if (error) {
        console.error('Failed to get users for notification:', error);
        return c.json({ error: 'Failed to get users' }, 500);
      }
      // Extract user IDs (only active users, not withdrawn)
      targetUserIds = allUsers.map((u: any) => u.id);
      console.log(`Sending notification to ${targetUserIds.length} current users`);
    }

    const notification = {
      id: crypto.randomUUID(),
      userIds: targetUserIds, // Always store as array of specific user IDs
      message: message.trim(),
      createdAt: new Date().toISOString()
    };

    // Get all notifications and add new one
    const notifications = await kv.get('notifications') || [];
    notifications.push(notification);
    await kv.set('notifications', notifications);

    console.log('Notification sent:', notification);

    return c.json({ success: true, notification });
  } catch (error) {
    console.log('Send notification error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Set user pro status (admin only)
app.post('/make-server-71735bdc/admin/set-pro', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    const { userId, isPro, durationDays } = await c.req.json();
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const profiles = await kv.get('profiles') || {};
    const existingProfile = profiles[userId] || {};
    
    let proStartDate = existingProfile.proStartDate;
    let proEndDate = existingProfile.proEndDate;

    if (isPro && durationDays) {
      // Set new pro period
      proStartDate = new Date().toISOString();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(durationDays));
      proEndDate = endDate.toISOString();
    } else if (!isPro) {
      // Remove pro status
      proStartDate = null;
      proEndDate = null;
    }

    profiles[userId] = {
      ...existingProfile,
      isPro: isPro || false,
      proStartDate,
      proEndDate,
      updatedAt: new Date().toISOString()
    };

    await kv.set('profiles', profiles);

    console.log('Pro status updated for user:', userId, { isPro, proStartDate, proEndDate });

    return c.json({ success: true, profile: profiles[userId] });
  } catch (error) {
    console.log('Set pro status error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get user's unread notifications
app.get('/make-server-71735bdc/notifications', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all notifications
    const notifications = await kv.get('notifications') || [];
    
    // Get user's read notification IDs
    const readNotifications = await kv.get(`notifications:read:${user.id}`) || [];
    
    // Filter notifications for this user and unread ones
    const userNotifications = notifications
      .filter((notif: any) => {
        // Show if notification is for all users or specifically for this user
        const isForUser = notif.userIds === null || (Array.isArray(notif.userIds) && notif.userIds.includes(user.id));
        // Show only unread notifications
        const isUnread = !readNotifications.includes(notif.id);
        return isForUser && isUnread;
      })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ notifications: userNotifications });
  } catch (error) {
    console.log('Get notifications error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Mark notification as read
app.post('/make-server-71735bdc/notifications/:id/read', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const notificationId = c.req.param('id');
    
    // Get user's read notifications
    const readNotifications = await kv.get(`notifications:read:${user.id}`) || [];
    
    // Add notification ID if not already read
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
      await kv.set(`notifications:read:${user.id}`, readNotifications);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Mark notification as read error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== GOOGLE CALENDAR ====================

// Get calendar events (for char_3)
app.get('/make-server-71735bdc/calendar/events', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const googleToken = c.req.header('X-Google-Token');
    if (!googleToken) {
      return c.json({ error: 'Google token not provided' }, 400);
    }

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${googleToken}`
        }
      }
    );

    if (!response.ok) {
      return c.json({ error: 'Failed to fetch calendar events' }, response.status);
    }

    const data = await response.json();
    return c.json({ events: data.items || [] });
  } catch (error) {
    console.log('Get calendar events error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== WAVE ====================

// Get wave data
app.get('/make-server-71735bdc/wave', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const waveData = await kv.get(`wave:${user.id}`) || {};
    
    return c.json({
      bottledEmotions: waveData.bottledEmotions || [],
      drawings: waveData.drawings || [],
      positiveMessages: waveData.positiveMessages || []
    });
  } catch (error) {
    console.log('Get wave data error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Send emotion bottle
app.post('/make-server-71735bdc/wave/bottle', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { content } = await c.req.json();
    
    const waveData = await kv.get(`wave:${user.id}`) || {};
    const bottledEmotions = waveData.bottledEmotions || [];
    
    bottledEmotions.push({
      id: crypto.randomUUID(),
      content,
      timestamp: formatTimestamp()
    });
    
    waveData.bottledEmotions = bottledEmotions;
    await kv.set(`wave:${user.id}`, waveData);
    
    return c.json({ bottledEmotions });
  } catch (error) {
    console.log('Send bottle error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete emotion bottle
app.delete('/make-server-71735bdc/wave/bottle/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    
    const waveData = await kv.get(`wave:${user.id}`) || {};
    const bottledEmotions = waveData.bottledEmotions || [];
    
    waveData.bottledEmotions = bottledEmotions.filter((bottle: any) => bottle.id !== id);
    await kv.set(`wave:${user.id}`, waveData);
    
    return c.json({ bottledEmotions: waveData.bottledEmotions });
  } catch (error) {
    console.log('Delete bottle error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Save drawing
app.post('/make-server-71735bdc/wave/drawing', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { dataUrl } = await c.req.json();
    
    const waveData = await kv.get(`wave:${user.id}`) || {};
    const drawings = waveData.drawings || [];
    
    drawings.push({
      id: crypto.randomUUID(),
      dataUrl,
      timestamp: formatTimestamp()
    });
    
    waveData.drawings = drawings;
    await kv.set(`wave:${user.id}`, waveData);
    
    return c.json({ drawings });
  } catch (error) {
    console.log('Save drawing error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete drawing
app.delete('/make-server-71735bdc/wave/drawing/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    
    const waveData = await kv.get(`wave:${user.id}`) || {};
    const drawings = waveData.drawings || [];
    
    waveData.drawings = drawings.filter((d: any) => d.id !== id);
    await kv.set(`wave:${user.id}`, waveData);
    
    return c.json({ drawings: waveData.drawings });
  } catch (error) {
    console.log('Delete drawing error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Add positive message
app.post('/make-server-71735bdc/wave/positive', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { content } = await c.req.json();
    
    const waveData = await kv.get(`wave:${user.id}`) || {};
    const positiveMessages = waveData.positiveMessages || [];
    
    positiveMessages.push({
      id: crypto.randomUUID(),
      content,
      timestamp: formatTimestamp()
    });
    
    waveData.positiveMessages = positiveMessages;
    await kv.set(`wave:${user.id}`, waveData);
    
    return c.json({ positiveMessages });
  } catch (error) {
    console.log('Add positive message error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete positive message
app.delete('/make-server-71735bdc/wave/positive/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    
    const waveData = await kv.get(`wave:${user.id}`) || {};
    const positiveMessages = waveData.positiveMessages || [];
    
    waveData.positiveMessages = positiveMessages.filter((m: any) => m.id !== id);
    await kv.set(`wave:${user.id}`, waveData);
    
    return c.json({ positiveMessages: waveData.positiveMessages });
  } catch (error) {
    console.log('Delete positive message error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get missions
app.get('/make-server-71735bdc/wave/missions', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const waveData = await kv.get(`wave:${user.id}`) || {};
    const missions = waveData.missions || [];
    
    // Check for failed missions (missed consecutive days)
    const today = formatTimestamp().split(' ')[0];
    const updatedMissions = missions.map((mission: any) => {
      if (mission.completed || mission.failed) return mission;
      
      // If there are checks, check if we missed a day
      if (mission.checks && mission.checks.length > 0) {
        const lastCheck = mission.checks[mission.checks.length - 1].split(' ')[0];
        const lastCheckDate = new Date(lastCheck);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // If more than 1 day has passed since last check, mark as failed
        if (daysDiff > 1) {
          mission.failed = true;
          mission.failedAt = formatTimestamp();
        }
      }
      
      return mission;
    });
    
    // Save updated missions if any changed
    if (JSON.stringify(missions) !== JSON.stringify(updatedMissions)) {
      waveData.missions = updatedMissions;
      await kv.set(`wave:${user.id}`, waveData);
    }
    
    return c.json({
      missions: updatedMissions
    });
  } catch (error) {
    console.log('Get missions error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Create mission
app.post('/make-server-71735bdc/wave/missions', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { title, duration } = await c.req.json();
    
    const waveData = await kv.get(`wave:${user.id}`) || {};
    const missions = waveData.missions || [];
    
    // Check for failed missions before adding new one
    const today = formatTimestamp().split(' ')[0];
    const updatedMissions = missions.map((mission: any) => {
      if (mission.completed || mission.failed) return mission;
      
      if (mission.checks && mission.checks.length > 0) {
        const lastCheck = mission.checks[mission.checks.length - 1].split(' ')[0];
        const lastCheckDate = new Date(lastCheck);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 1) {
          mission.failed = true;
          mission.failedAt = formatTimestamp();
        }
      }
      
      return mission;
    });
    
    updatedMissions.push({
      id: crypto.randomUUID(),
      title,
      duration,
      createdAt: formatTimestamp(),
      checks: [],
      completed: false,
      failed: false
    });
    
    waveData.missions = updatedMissions;
    await kv.set(`wave:${user.id}`, waveData);
    
    return c.json({ missions: updatedMissions });
  } catch (error) {
    console.log('Create mission error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Check mission (add daily sticker)
app.post('/make-server-71735bdc/wave/missions/:id/check', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    
    const waveData = await kv.get(`wave:${user.id}`) || {};
    const missions = waveData.missions || [];
    
    const missionIndex = missions.findIndex((m: any) => m.id === id);
    if (missionIndex === -1) {
      return c.json({ error: 'Mission not found' }, 404);
    }
    
    const mission = missions[missionIndex];
    
    // Check if already failed
    if (mission.failed) {
      return c.json({ error: 'Mission already failed' }, 400);
    }
    
    // Check if already completed
    if (mission.completed) {
      return c.json({ error: 'Mission already completed' }, 400);
    }
    
    // Check if already checked today
    const today = formatTimestamp().split(' ')[0]; // Get date part only
    const alreadyCheckedToday = mission.checks.some((check: string) => check.startsWith(today));
    
    if (alreadyCheckedToday) {
      return c.json({ error: 'Already checked today' }, 400);
    }
    
    // Check for consecutive days - if missed a day, mark as failed
    if (mission.checks.length > 0) {
      const lastCheck = mission.checks[mission.checks.length - 1].split(' ')[0];
      const lastCheckDate = new Date(lastCheck);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 1) {
        mission.failed = true;
        mission.failedAt = formatTimestamp();
        missions[missionIndex] = mission;
        waveData.missions = missions;
        await kv.set(`wave:${user.id}`, waveData);
        return c.json({ error: 'Mission failed due to missed day', missions }, 400);
      }
    }
    
    // Add today's check
    mission.checks.push(formatTimestamp());
    
    // Check if mission is completed
    if (mission.checks.length >= mission.duration) {
      mission.completed = true;
      mission.completedAt = formatTimestamp();
    }
    
    missions[missionIndex] = mission;
    waveData.missions = missions;
    await kv.set(`wave:${user.id}`, waveData);
    
    return c.json({ missions });
  } catch (error) {
    console.log('Check mission error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete mission
app.delete('/make-server-71735bdc/wave/missions/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    
    const waveData = await kv.get(`wave:${user.id}`) || {};
    const missions = waveData.missions || [];
    
    waveData.missions = missions.filter((m: any) => m.id !== id);
    await kv.set(`wave:${user.id}`, waveData);
    
    return c.json({ missions: waveData.missions });
  } catch (error) {
    console.log('Delete mission error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// Payment Endpoints
// ============================================

// Initialize payment
app.post('/make-server-71735bdc/payment/init', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { plan, paymentMethod, amount } = await c.req.json();

    // Generate order ID
    const orderId = `order_${user.id}_${Date.now()}`;

    // Store payment info
    const payments = await kv.get('payments') || {};
    payments[orderId] = {
      userId: user.id,
      plan,
      paymentMethod,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await kv.set('payments', payments);

    // ============================================
    // Real Implementation Guide:
    // ============================================
    // 
    // For Toss Payments:
    // const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY');
    // const response = await fetch('https://api.tosspayments.com/v1/payments', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${btoa(tossSecretKey + ':')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     amount,
    //     orderId,
    //     orderName: `Wave Pro ${plan === 'monthly' ? '월간' : '연간'} 구독`,
    //     customerEmail: user.email,
    //   })
    // });
    //
    // For Kakao Pay:
    // const kakaoAdminKey = Deno.env.get('KAKAO_ADMIN_KEY');
    // const response = await fetch('https://kapi.kakao.com/v1/payment/ready', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `KakaoAK ${kakaoAdminKey}`,
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //   },
    //   body: new URLSearchParams({
    //     cid: 'TC0ONETIME',
    //     partner_order_id: orderId,
    //     partner_user_id: user.id,
    //     item_name: `Wave Pro ${plan === 'monthly' ? '월간' : '연간'} 구독`,
    //     quantity: '1',
    //     total_amount: String(amount),
    //     tax_free_amount: '0',
    //   })
    // });
    //
    // For Naver Pay:
    // Redirect to Naver Pay checkout page
    // 
    // ============================================
    
    // For now, simulate the payment flow
    console.log(`Payment initialized: ${orderId} for user ${user.email}, amount: ${amount}원`);

    return c.json({
      orderId,
      // In production, return paymentUrl for redirect
      // paymentUrl: `https://payment-gateway.com/pay/${orderId}`,
    });
  } catch (error) {
    console.log('Payment initialization error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Confirm payment and activate Pro
app.post('/make-server-71735bdc/payment/confirm', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { orderId, plan } = await c.req.json();

    // Verify payment
    const payments = await kv.get('payments') || {};
    const payment = payments[orderId];

    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    if (payment.userId !== user.id) {
      return c.json({ error: 'Unauthorized payment access' }, 403);
    }

    if (payment.status === 'completed') {
      return c.json({ error: 'Payment already completed' }, 400);
    }

    // In a real implementation, verify with payment gateway
    // For Toss: Call Toss confirm API
    // For Kakao: Call Kakao approval API
    // etc.

    // Update payment status
    payment.status = 'completed';
    payment.completedAt = new Date().toISOString();
    payments[orderId] = payment;
    await kv.set('payments', payments);

    // Activate Pro subscription
    const profiles = await kv.get('profiles') || {};
    const profile = profiles[user.id] || {};

    const startDate = new Date();
    const endDate = new Date();
    
    if (plan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    profile.isPro = true;
    profile.proStartDate = startDate.toISOString();
    profile.proEndDate = endDate.toISOString();
    profile.proPaymentInfo = {
      plan,
      lastPayment: startDate.toISOString(),
      orderId,
    };

    profiles[user.id] = profile;
    await kv.set('profiles', profiles);

    console.log(`Pro activated for user ${user.email} until ${endDate.toISOString()}`);

    return c.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.log('Payment confirmation error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Confirm item package payment
app.post('/make-server-71735bdc/payment/confirm-item-package', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { orderId } = await c.req.json();

    // Verify payment
    const payments = await kv.get('payments') || {};
    const payment = payments[orderId];

    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    if (payment.userId !== user.id) {
      return c.json({ error: 'Unauthorized payment access' }, 403);
    }

    if (payment.status === 'completed') {
      return c.json({ error: 'Payment already completed' }, 400);
    }

    // Update payment status
    payment.status = 'completed';
    payment.completedAt = new Date().toISOString();
    payments[orderId] = payment;
    await kv.set('payments', payments);

    // Activate item package
    const profiles = await kv.get('profiles') || {};
    const profile = profiles[user.id] || {};

    profile.hasItemPackage = true;
    profile.itemPackagePurchasedAt = new Date().toISOString();
    profile.itemPackagePaymentInfo = {
      lastPayment: new Date().toISOString(),
      orderId,
    };

    profiles[user.id] = profile;
    await kv.set('profiles', profiles);

    console.log(`Item package activated for user ${user.email}`);

    return c.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.log('Item package payment confirmation error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get payment history
app.get('/make-server-71735bdc/payment/history', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const payments = await kv.get('payments') || {};
    const userPayments = Object.values(payments).filter(
      (p: any) => p.userId === user.id
    );

    return c.json({ payments: userPayments });
  } catch (error) {
    console.log('Get payment history error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Admin: Get all payments
app.get('/make-server-71735bdc/admin/payments', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    const payments = await kv.get('payments') || {};
    const allPayments = Object.entries(payments).map(([orderId, payment]: [string, any]) => ({
      orderId,
      ...payment,
    }));

    // Sort by created date (newest first)
    allPayments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({ payments: allPayments });
  } catch (error) {
    console.log('Get admin payments error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== GARDEN PREMIUM ITEMS ====================

// Get active premium items
app.get('/make-server-71735bdc/garden/premium-items', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const gardenData = await kv.get(`garden:${user.id}`) || {};
    let activePremiumItems = gardenData.activePremiumItems || [];
    
    // 신규 사용자의 경우 기본 해를 자동으로 활성화
    if (activePremiumItems.length === 0) {
      activePremiumItems = ['default_sun'];
      gardenData.activePremiumItems = activePremiumItems;
      await kv.set(`garden:${user.id}`, gardenData);
    }
    
    return c.json({ activePremiumItems });
  } catch (error) {
    console.log('Get premium items error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Toggle premium item
app.post('/make-server-71735bdc/garden/premium-items/toggle', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { itemId, itemType } = await c.req.json();
    
    if (!itemId || !itemType) {
      return c.json({ error: 'Missing itemId or itemType' }, 400);
    }

    const gardenData = await kv.get(`garden:${user.id}`) || {};
    let activePremiumItems = gardenData.activePremiumItems || [];
    
    // 배경은 하나만 활성화 가능
    if (itemType === 'background') {
      // 현재 배경이 활성화되어 있는지 먼저 확인
      const isCurrentlyActive = activePremiumItems.includes(itemId);
      
      // 다른 배경 모두 제거
      activePremiumItems = activePremiumItems.filter((id: string) => 
        !id.endsWith('_bg')
      );
      
      // 현재 배경이 활성화되어 있지 않았다면 추가 (이미 활성화되어 있었다면 제거된 상태 유지)
      if (!isCurrentlyActive) {
        activePremiumItems.push(itemId);
      }
    } else if (itemType === 'decoration' && itemId.includes('sun')) {
      // 해 아이템은 하나만 활성화 가능
      const isCurrentlyActive = activePremiumItems.includes(itemId);
      
      // 다른 해 아이템 모두 제거
      activePremiumItems = activePremiumItems.filter((id: string) => 
        !id.includes('sun')
      );
      
      // 현재 해가 활성화되어 있지 않았다면 추가 (이미 활성화되어 있었다면 제거된 상태 유지)
      if (!isCurrentlyActive) {
        activePremiumItems.push(itemId);
      }
    } else {
      // 펫/일반 장식은 여러 개 가능
      if (activePremiumItems.includes(itemId)) {
        activePremiumItems = activePremiumItems.filter((id: string) => id !== itemId);
      } else {
        activePremiumItems.push(itemId);
      }
    }
    
    gardenData.activePremiumItems = activePremiumItems;
    await kv.set(`garden:${user.id}`, gardenData);
    
    console.log('Toggled premium item:', itemId, 'Active items:', activePremiumItems);
    
    return c.json({ activePremiumItems });
  } catch (error) {
    console.log('Toggle premium item error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== TIME RIPPLE ====================

// Get answer for specific date
app.get('/make-server-71735bdc/time-ripple/:date', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const date = c.req.param('date'); // YYYY-MM-DD
    const monthDay = date.substring(5); // MM-DD

    // Get all time ripple answers for this user
    const userAnswers = await kv.get(`time_ripple:${user.id}`) || {};
    
    // Get answer for today
    const todayAnswer = userAnswers[date] || null;
    
    // Get all past answers for this month-day
    const pastAnswers: any[] = [];
    Object.entries(userAnswers).forEach(([answerDate, answerData]: [string, any]) => {
      const answerMonthDay = answerDate.substring(5);
      if (answerMonthDay === monthDay && answerDate !== date) {
        pastAnswers.push({
          id: answerDate,
          date: answerDate,
          answer: answerData.answer,
          createdAt: answerData.createdAt,
        });
      }
    });

    // Sort past answers by date (newest first)
    pastAnswers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return c.json({
      answer: todayAnswer ? {
        id: date,
        date,
        answer: todayAnswer.answer,
        createdAt: todayAnswer.createdAt,
      } : null,
      pastAnswers,
    });
  } catch (error) {
    console.log('Get time ripple answer error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get all answers for a specific month-day (across all years)
app.get('/make-server-71735bdc/time-ripple/by-month-day/:monthDay', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const monthDay = c.req.param('monthDay'); // MM-DD

    // Get all time ripple answers for this user
    const userAnswers = await kv.get(`time_ripple:${user.id}`) || {};
    
    // Filter answers for this month-day
    const answers: any[] = [];
    Object.entries(userAnswers).forEach(([answerDate, answerData]: [string, any]) => {
      const answerMonthDay = answerDate.substring(5);
      if (answerMonthDay === monthDay) {
        answers.push({
          id: answerDate,
          date: answerDate,
          answer: answerData.answer,
          createdAt: answerData.createdAt,
        });
      }
    });

    // Sort by date (newest first)
    answers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return c.json({ answers });
  } catch (error) {
    console.log('Get time ripple answers by month-day error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Save/Update answer
app.post('/make-server-71735bdc/time-ripple', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { date, monthDay, answer } = await c.req.json();

    if (!date || !monthDay || !answer) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get user's answers
    const userAnswers = await kv.get(`time_ripple:${user.id}`) || {};

    // Save or update answer
    userAnswers[date] = {
      answer,
      monthDay,
      createdAt: formatTimestamp(),
    };

    await kv.set(`time_ripple:${user.id}`, userAnswers);

    return c.json({ 
      success: true,
      answer: {
        id: date,
        date,
        answer,
        createdAt: userAnswers[date].createdAt,
      }
    });
  } catch (error) {
    console.log('Save time ripple answer error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get answer statistics (how many times each month-day has been answered)
app.get('/make-server-71735bdc/time-ripple/stats', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all answers
    const userAnswers = await kv.get(`time_ripple:${user.id}`) || {};
    
    // Count answers by month-day
    const stats: Record<string, number> = {};
    Object.keys(userAnswers).forEach((date) => {
      const monthDay = date.substring(5); // MM-DD
      stats[monthDay] = (stats[monthDay] || 0) + 1;
    });

    return c.json({ stats });
  } catch (error) {
    console.log('Get time ripple stats error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get all dates that have answers
app.get('/make-server-71735bdc/time-ripple/all-dates', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all answers
    const userAnswers = await kv.get(`time_ripple:${user.id}`) || {};
    
    // Get all dates that have answers
    const dates = Object.keys(userAnswers);

    return c.json({ dates });
  } catch (error) {
    console.log('Get time ripple all dates error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== AI MEMORIES ====================

// Get all AI memories for the user
app.get('/make-server-71735bdc/ai-memories', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const memories = await kv.get(`ai-memories:${user.id}`) || [];
    return c.json({ memories });
  } catch (error) {
    console.log('Get AI memories error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Add a new AI memory (used by AI during chat)
app.post('/make-server-71735bdc/ai-memories', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { content } = await c.req.json();
    
    if (!content || !content.trim()) {
      return c.json({ error: 'Content is required' }, 400);
    }

    // Get user profile for timezone
    const profiles = await kv.get('profiles') || {};
    const profile = profiles[user.id] || {};
    const timezone = profile.timezone || 'Asia/Seoul';

    const memories = await kv.get(`ai-memories:${user.id}`) || [];
    
    const newMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      createdAt: formatTimestamp(new Date(), timezone)
    };
    
    memories.push(newMemory);
    await kv.set(`ai-memories:${user.id}`, memories);

    return c.json({ success: true, memory: newMemory });
  } catch (error) {
    console.log('Add AI memory error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete an AI memory
app.delete('/make-server-71735bdc/ai-memories/:id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const memoryId = c.req.param('id');
    const memories = await kv.get(`ai-memories:${user.id}`) || [];
    
    const filteredMemories = memories.filter((m: any) => m.id !== memoryId);
    
    if (filteredMemories.length === memories.length) {
      return c.json({ error: 'Memory not found' }, 404);
    }
    
    await kv.set(`ai-memories:${user.id}`, filteredMemories);

    return c.json({ success: true });
  } catch (error) {
    console.log('Delete AI memory error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// User Withdrawal
// ============================================

// Withdraw user account
app.post('/make-server-71735bdc/withdraw', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { reason, customReason } = await c.req.json();

    console.log('User withdrawal:', { userId: user.id, email: user.email, reason, customReason });

    // Save withdrawal information before deleting data
    const withdrawals = await kv.get('withdrawals') || [];
    withdrawals.push({
      userId: user.id,
      email: user.email,
      reason,
      customReason: customReason || null,
      withdrawnAt: new Date().toISOString()
    });
    await kv.set('withdrawals', withdrawals);

    // Update user status in profiles
    const profiles = await kv.get('profiles') || {};
    if (profiles[user.id]) {
      profiles[user.id].status = 'withdrawn';
      profiles[user.id].withdrawnAt = new Date().toISOString();
      await kv.set('profiles', profiles);
    }

    // Delete all user data
    await kv.del(`chat:${user.id}`);
    await kv.del(`diaries:${user.id}`);
    await kv.del(`wave:${user.id}`);
    await kv.del(`ai-memories:${user.id}`);
    await kv.del(`notifications:read:${user.id}`);

    // Delete user from Supabase Auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user's identity providers
    const { data: userData } = await supabase.auth.admin.getUserById(user.id);
    const providers = userData?.user?.identities || [];

    console.log('User providers:', providers.map((p: any) => p.provider));

    // Delete user from Supabase Auth (this will unlink all OAuth providers)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('Failed to delete user from auth:', deleteError);
      // Continue anyway since we've already deleted the data
    }

    // Note: For OAuth providers (Google, Kakao), Supabase's deleteUser will unlink the connection,
    // but users may need to manually revoke app access from their Google/Kakao account settings.
    // This is standard OAuth behavior - the app can't force-delete the OAuth authorization.

    return c.json({ 
      success: true, 
      message: 'Account withdrawn successfully',
      note: 'If you signed up with Google or Kakao, you may want to revoke app access from your account settings.'
    });
  } catch (error) {
    console.log('Withdraw error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get all users (admin only)
app.get('/make-server-71735bdc/admin/users', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    // Get all users from auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching users:', authError);
      return c.json({ error: 'Failed to fetch users' }, 500);
    }

    // Get all profiles
    const profiles = await kv.get('profiles') || {};
    
    // Get diary counts for each user
    const users = await Promise.all(authUsers.users.map(async (authUser: any) => {
      const profile = profiles[authUser.id] || {};
      const diaries = await kv.get(`diary:${authUser.id}`) || [];
      
      return {
        id: authUser.id,
        email: authUser.email,
        name: profile.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name,
        nickname: profile.nickname,
        birthDate: profile.birthDate,
        age: profile.birthDate ? new Date().getFullYear() - new Date(profile.birthDate).getFullYear() : null,
        countryCode: profile.countryCode,
        timezone: profile.timezone,
        createdAt: authUser.created_at,
        lastSignInAt: authUser.last_sign_in_at,
        diaryCount: diaries.length,
        isPro: profile.isPro || false,
        proStartDate: profile.proStartDate,
        proEndDate: profile.proEndDate,
        proPaymentCompleted: profile.proPaymentCompleted || false,
        hasItemPackage: profile.hasItemPackage || false,
        itemPackagePurchasedAt: profile.itemPackagePurchasedAt,
        status: profile.status || 'active',
        withdrawnAt: profile.withdrawnAt
      };
    }));

    return c.json({ users });
  } catch (error) {
    console.log('Get users error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get admin statistics
app.get('/make-server-71735bdc/admin/stats', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const profiles = await kv.get('profiles') || {};
    
    // Calculate statistics
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const ageGroups: Record<string, number> = {
      '10대': 0,
      '20대': 0,
      '30대': 0,
      '40대': 0,
      '50대': 0,
      '60대+': 0,
    };
    
    const countryStats: Record<string, number> = {};
    
    let activeUsers7Days = 0;
    let activeUsers30Days = 0;
    let newUsers7Days = 0;
    let newUsers30Days = 0;
    
    authUsers?.users.forEach((authUser: any) => {
      const profile = profiles[authUser.id] || {};
      
      // Skip withdrawn users
      if (profile.status === 'withdrawn') {
        return;
      }
      
      // Age groups
      if (profile.birthDate) {
        const age = now.getFullYear() - new Date(profile.birthDate).getFullYear();
        if (age < 20) ageGroups['10대']++;
        else if (age < 30) ageGroups['20대']++;
        else if (age < 40) ageGroups['30대']++;
        else if (age < 50) ageGroups['40대']++;
        else if (age < 60) ageGroups['50대']++;
        else ageGroups['60대+']++;
      }
      
      // Country stats
      const country = profile.countryCode || 'KR';
      countryStats[country] = (countryStats[country] || 0) + 1;
      
      // Active users
      if (authUser.last_sign_in_at) {
        const lastSignIn = new Date(authUser.last_sign_in_at);
        if (lastSignIn > sevenDaysAgo) activeUsers7Days++;
        if (lastSignIn > thirtyDaysAgo) activeUsers30Days++;
      }
      
      // New users
      const createdAt = new Date(authUser.created_at);
      if (createdAt > sevenDaysAgo) newUsers7Days++;
      if (createdAt > thirtyDaysAgo) newUsers30Days++;
    });
    
    const feedbacks = await kv.get('feedback') || [];
    
    // Calculate Pro Stats
    const activeAuthUsers = authUsers?.users.filter((u: any) => {
      const profile = profiles[u.id] || {};
      return profile.status !== 'withdrawn';
    }) || [];

    // Monthly Pro Ratio (last 6 months)
    const monthlyRatio = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
      
      let totalInMonth = 0;
      let proInMonth = 0;
      
      activeAuthUsers.forEach((u: any) => {
        const createdAt = new Date(u.created_at);
        if (createdAt <= monthEnd) {
          totalInMonth++;
          const profile = profiles[u.id] || {};
          const isAdmin = u.email === 'khb1620@naver.com';
          
          // Check if user was Pro during this month
          if (isAdmin) {
            proInMonth++;
          } else if (profile.proEndDate) {
            const proEnd = new Date(profile.proEndDate);
            const proStart = profile.proStartDate ? new Date(profile.proStartDate) : new Date(0);
            // User was Pro if their subscription overlaps with this month
            if (proEnd >= monthStart && proStart <= monthEnd) {
              proInMonth++;
            }
          }
        }
      });
      
      const percentage = totalInMonth > 0 ? ((proInMonth / totalInMonth) * 100).toFixed(1) : '0.0';
      monthlyRatio.push({
        month: `${monthDate.getFullYear()}.${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        totalUsers: totalInMonth,
        proUsers: proInMonth,
        percentage
      });
    }

    // User Tenure Brackets
    const tenureBrackets = {
      '1month': { count: 0, percentage: '0' },
      '3months': { count: 0, percentage: '0' },
      '6months': { count: 0, percentage: '0' },
      '12months': { count: 0, percentage: '0' }
    };
    
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    
    activeAuthUsers.forEach((u: any) => {
      const createdAt = new Date(u.created_at);
      if (createdAt > oneMonthAgo) {
        tenureBrackets['1month'].count++;
      } else if (createdAt > threeMonthsAgo) {
        tenureBrackets['3months'].count++;
      } else if (createdAt > sixMonthsAgo) {
        tenureBrackets['6months'].count++;
      } else {
        tenureBrackets['12months'].count++;
      }
    });
    
    const totalActiveUsers = activeAuthUsers.length;
    if (totalActiveUsers > 0) {
      tenureBrackets['1month'].percentage = ((tenureBrackets['1month'].count / totalActiveUsers) * 100).toFixed(1);
      tenureBrackets['3months'].percentage = ((tenureBrackets['3months'].count / totalActiveUsers) * 100).toFixed(1);
      tenureBrackets['6months'].percentage = ((tenureBrackets['6months'].count / totalActiveUsers) * 100).toFixed(1);
      tenureBrackets['12months'].percentage = ((tenureBrackets['12months'].count / totalActiveUsers) * 100).toFixed(1);
    }

    // Resubscription Rate
    let totalExpired = 0;
    let resubscribed = 0;
    
    activeAuthUsers.forEach((u: any) => {
      const profile = profiles[u.id] || {};
      const isAdmin = u.email === 'khb1620@naver.com';
      
      // Skip admin
      if (isAdmin) return;
      
      // Check if user ever had Pro (expired)
      if (profile.proEndDate) {
        const proEnd = new Date(profile.proEndDate);
        if (proEnd < now) {
          totalExpired++;
          
          // Check if they renewed (have a newer proEndDate or currently active)
          if (profile.isPro && proEnd < now) {
            // Currently active means they resubscribed
            resubscribed++;
          }
        }
      }
    });
    
    const resubscriptionPercentage = totalExpired > 0 
      ? ((resubscribed / totalExpired) * 100).toFixed(1)
      : '0.0';
    
    // Monthly User Signups (last 6 months)
    const monthlySignups = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
      
      let signupsInMonth = 0;
      
      activeAuthUsers.forEach((u: any) => {
        const createdAt = new Date(u.created_at);
        if (createdAt >= monthStart && createdAt <= monthEnd) {
          signupsInMonth++;
        }
      });
      
      monthlySignups.push({
        month: `${monthDate.getFullYear()}.${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        signups: signupsInMonth
      });
    }
    
    return c.json({
      totalUsers: totalActiveUsers,
      ageGroups,
      countryStats,
      activeUsers: {
        last7Days: activeUsers7Days,
        last30Days: activeUsers30Days,
      },
      newUsers: {
        last7Days: newUsers7Days,
        last30Days: newUsers30Days,
      },
      totalFeedbacks: feedbacks.length,
      monthlySignups,
      proStats: {
        monthlyRatio,
        tenureBrackets,
        resubscriptionRate: {
          totalExpired,
          resubscribed,
          percentage: resubscriptionPercentage
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log('Get stats error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get all feedback (admin only)
app.get('/make-server-71735bdc/admin/feedback', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    const feedbacks = await kv.get('feedback') || [];
    
    return c.json({ feedbacks });
  } catch (error) {
    console.log('Get feedback error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Send notifications (admin only) - DUPLICATE - This should be removed but keeping for backwards compatibility
app.post('/make-server-71735bdc/admin/notifications', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    const { userIds, message } = await c.req.json();
    
    if (!message || !message.trim()) {
      return c.json({ error: 'Message is required' }, 400);
    }

    // If userIds is null (전체 선택), get all current users
    let targetUserIds = userIds;
    if (!userIds || userIds.length === 0) {
      // Get all users from auth
      const { data: { users: allUsers }, error } = await supabase.auth.admin.listUsers();
      if (error) {
        console.error('Failed to get users for notification:', error);
        return c.json({ error: 'Failed to get users' }, 500);
      }
      // Extract user IDs (only active users, not withdrawn)
      targetUserIds = allUsers.map((u: any) => u.id);
      console.log(`Sending notification to ${targetUserIds.length} current users`);
    }

    const notification = {
      id: crypto.randomUUID(),
      userIds: targetUserIds, // Always store as array of specific user IDs
      message: message.trim(),
      createdAt: new Date().toISOString()
    };

    // Get all notifications and add new one
    const notifications = await kv.get('notifications') || [];
    notifications.push(notification);
    await kv.set('notifications', notifications);

    console.log('Notification sent:', notification);
    
    return c.json({ success: true, notification });
  } catch (error) {
    console.log('Send notification error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Set Pro subscription (admin only)
app.post('/make-server-71735bdc/admin/set-pro', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    const { userId, isPro, durationDays } = await c.req.json();
    
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const profiles = await kv.get('profiles') || {};
    const profile = profiles[userId] || {};
    
    if (isPro) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (durationDays || 30));
      
      profile.isPro = true;
      profile.proStartDate = startDate.toISOString();
      profile.proEndDate = endDate.toISOString();
      profile.proPaymentCompleted = false; // Admin granted, not paid
    } else {
      profile.isPro = false;
      profile.proStartDate = null;
      profile.proEndDate = null;
      profile.proPaymentCompleted = false;
    }
    
    profiles[userId] = profile;
    await kv.set('profiles', profiles);
    
    return c.json({ success: true, profile });
  } catch (error) {
    console.log('Set Pro error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Request Pro cancellation
app.post('/make-server-71735bdc/pro-cancellation', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { reason, customReason } = await c.req.json();
    
    if (!reason) {
      return c.json({ error: 'Reason is required' }, 400);
    }

    if (reason === 'other' && (!customReason || !customReason.trim())) {
      return c.json({ error: 'Custom reason is required when reason is "other"' }, 400);
    }

    // Get existing cancellations
    const cancellations = await kv.get('pro_cancellations') || [];
    
    const cancellation = {
      id: crypto.randomUUID(),
      userId: user.id,
      email: user.email,
      reason,
      customReason: reason === 'other' ? customReason.trim() : undefined,
      createdAt: new Date().toISOString()
    };

    cancellations.push(cancellation);
    await kv.set('pro_cancellations', cancellations);

    console.log('Pro cancellation requested:', cancellation);
    
    return c.json({ success: true, cancellation });
  } catch (error) {
    console.log('Pro cancellation error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get Pro cancellation requests (admin only)
app.get('/make-server-71735bdc/admin/pro-cancellations', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Unauthorized - Admin only' }, 403);
    }

    const cancellations = await kv.get('pro_cancellations') || [];
    
    // Calculate reason statistics
    const reasonStats: Record<string, number> = {};
    cancellations.forEach((c: any) => {
      reasonStats[c.reason] = (reasonStats[c.reason] || 0) + 1;
    });
    
    return c.json({ 
      cancellations: cancellations.reverse(), // Most recent first
      total: cancellations.length,
      reasonStats
    });
  } catch (error) {
    console.log('Get pro cancellations error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get withdrawal statistics (admin only)
app.get('/make-server-71735bdc/admin/withdrawals', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    if (user.email !== 'khb1620@naver.com') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const withdrawals = await kv.get('withdrawals') || [];
    
    // Calculate statistics
    const reasonStats: Record<string, number> = {};
    withdrawals.forEach((w: any) => {
      const reason = w.customReason || w.reason;
      reasonStats[reason] = (reasonStats[reason] || 0) + 1;
    });

    return c.json({ 
      total: withdrawals.length,
      withdrawals,
      reasonStats
    });
  } catch (error) {
    console.log('Get withdrawals error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
