import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { createClient } from "@supabase/supabase-js";
import * as kv from "./kv_store.js";
const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

// Helper function to verify user authentication
async function verifyAuth(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const accessToken = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user?.id) {
    return null;
  }
  
  return user.id;
}

// Profile setup endpoint
app.post("/api/profile/setup", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { nickname, birthDate, gender, characterInfo } = await c.req.json();

    if (!nickname || !birthDate || !gender) {
      return c.json({ error: "필수 정보가 누락되었습니다." }, 400);
    }

    const profileData = {
      nickname,
      birthDate,
      gender,
      characterInfo: characterInfo || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`profile:${userId}`, profileData);

    console.log(`Profile setup completed for user ${userId}`);
    return c.json({ message: "Profile setup completed", profile: profileData });
  } catch (error) {
    console.log(`Profile setup error: ${error}`);
    return c.json({ error: "Profile setup failed" }, 500);
  }
});

// Get user profile
app.get("/api/profile/get", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await kv.get(`profile:${userId}`);
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.log(`Get profile error: ${error}`);
    return c.json({ error: "Failed to get profile" }, 500);
  }
});

// Update user profile
app.put("/api/profile/update", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { nickname, occupation, interests, counselingStyle } = await c.req.json();

    if (!nickname) {
      return c.json({ error: "닉네임은 필수입니다." }, 400);
    }

    const existingProfile = await kv.get(`profile:${userId}`);
    if (!existingProfile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const updatedProfile = {
      ...existingProfile,
      nickname,
      occupation: occupation || '',
      interests: interests || '',
      counselingStyle: counselingStyle || '',
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`profile:${userId}`, updatedProfile);

    console.log(`Profile updated for user ${userId}`);
    return c.json({ message: "Profile updated", profile: updatedProfile });
  } catch (error) {
    console.log(`Profile update error: ${error}`);
    return c.json({ error: "Profile update failed" }, 500);
  }
});

// Check if user has completed profile setup
app.get("/api/profile/check", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await kv.get(`profile:${userId}`);
    return c.json({ hasProfile: !!profile });
  } catch (error) {
    console.log(`Profile check error: ${error}`);
    return c.json({ error: "Failed to check profile" }, 500);
  }
});

// Demo user setup endpoint
app.post("/api/auth/setup-demo", async (c) => {
  try {
    const demoEmail = 'demo@example.com';
    const demoPassword = 'demo123';
    const demoName = '데모 사용자';

    // Try to create demo user if it doesn't exist
    const { data, error } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      user_metadata: { name: demoName },
      email_confirm: true
    });

    if (error && !error.message.includes('User already registered')) {
      console.log(`Demo setup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Set up demo profile if user was created or already exists
    let userId = data?.user?.id;
    if (!userId && error?.message.includes('User already registered')) {
      // Get existing user ID
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const demoUser = existingUser?.users?.find((u: { email: string }) => u.email === demoEmail);
      userId = demoUser?.id;
    }

    if (userId) {
      // Create demo profile
      const profileData = {
        nickname: demoName,
        birthDate: '1990-01-01',
        gender: 'other',
        occupation: 'student',
        interests: '테스트, 데모',
        counselingStyle: 'empathetic',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await kv.set(`profile:${userId}`, profileData);
    }

    return c.json({ message: "Demo user setup complete", email: demoEmail });
  } catch (error) {
    console.log(`Demo setup request error: ${error}`);
    return c.json({ error: "Demo setup failed" }, 500);
  }
});

// User signup endpoint
app.post("/api/auth/signup", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });
    
    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }
    
    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Signup request error: ${error}`);
    return c.json({ error: "Invalid request" }, 400);
  }
});

// Create new chat room
app.post("/api/chat/rooms/create", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { characterId, title } = await c.req.json();
    
    if (!characterId || !title) {
      return c.json({ error: "Character ID and title are required" }, 400);
    }
    
    // Check if user already has 3 chat rooms
    const roomsPrefix = `chatroom:${userId}:`;
    const existingRooms = await kv.getByPrefix(roomsPrefix);
    
    if (existingRooms.length >= 3) {
      return c.json({ error: "Maximum 3 chat rooms allowed" }, 400);
    }
    
    const chatRoomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const roomKey = `chatroom:${userId}:${chatRoomId}`;
    
    const roomData = {
      id: chatRoomId,
      userId,
      initialCharacterId: characterId, // Store the initial character but don't enforce it
      title,
      lastMessage: `${title} 채팅방이 생성되었습니다`,
      timestamp: new Date().toISOString(),
      messageCount: 0
    };
    
    await kv.set(roomKey, roomData);
    
    return c.json({ 
      chatRoomId,
      message: "Chat room created successfully" 
    });
  } catch (error) {
    console.log(`Create chat room error: ${error}`);
    return c.json({ error: "Failed to create chat room" }, 500);
  }
});

// Get all chat rooms for user
app.get("/api/chat/rooms", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const roomsPrefix = `chatroom:${userId}:`;
    const rooms = await kv.getByPrefix(roomsPrefix);
    
    // Sort by timestamp (newest first) and format for frontend
    const sortedRooms = rooms
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map(room => ({
        id: room.id,
        characterId: room.initialCharacterId, // For compatibility
        title: room.title,
        lastMessage: room.lastMessage,
        timestamp: room.timestamp
      }));
    
    return c.json({ chatRooms: sortedRooms });
  } catch (error) {
    console.log(`Get chat rooms error: ${error}`);
    return c.json({ error: "Failed to get chat rooms" }, 500);
  }
});

// Update chat room title
app.put("/api/chat/rooms/:roomId/title", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const roomId = c.req.param('roomId');
    const { title } = await c.req.json();
    
    if (!title?.trim()) {
      return c.json({ error: "Title is required" }, 400);
    }
    
    const roomKey = `chatroom:${userId}:${roomId}`;
    const existingRoom = await kv.get(roomKey);
    
    if (!existingRoom) {
      return c.json({ error: "Chat room not found" }, 404);
    }
    
    const updatedRoom = {
      ...existingRoom,
      title: title.trim(),
      timestamp: new Date().toISOString() // Update timestamp for sorting
    };
    
    await kv.set(roomKey, updatedRoom);
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Update chat room title error: ${error}`);
    return c.json({ error: "Failed to update chat room title" }, 500);
  }
});

// Delete chat room
app.delete("/api/chat/rooms/:roomId", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const roomId = c.req.param('roomId');
    const roomKey = `chatroom:${userId}:${roomId}`;
    
    // Delete the room
    await kv.del(roomKey);
    
    // Delete all messages in this room
    const messagesPrefix = `chatmsg:${userId}:${roomId}:`;
    const messages = await kv.getByPrefix(messagesPrefix);
    
    for (const message of messages) {
      const messageKey = `chatmsg:${userId}:${roomId}:${message.id}`;
      await kv.del(messageKey);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete chat room error: ${error}`);
    return c.json({ error: "Failed to delete chat room" }, 500);
  }
});

// Chat message endpoint
app.post("/api/chat/send", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { message, emotion, characterId, chatRoomId } = await c.req.json();
    const timestamp = new Date().toISOString();
    
    // Character information
    const charactersInfo = {
      fox: { name: '여우', emoji: '🦊' },
      rabbit: { name: '토끼', emoji: '🐰' },
      dog: { name: '강아지', emoji: '🐕' },
      bear: { name: '곰', emoji: '🐻' }
    };
    
    // Warning detection (simple keyword-based)
    const warningKeywords = ['죽고싶', '자살', '죽어버리', '사라지고싶', '끝내고싶'];
    const isWarning = warningKeywords.some(keyword => message.includes(keyword));
    
    // Character-specific AI responses
    const characterResponses = {
      fox: [
        "와! 그 도전정신이 멋져! 🌟",
        "포기하지 말아! 넌 할 수 있어! 💪",
        "오늘도 한 걸음 더 나아가자! 🚀",
        "힘든 일도 있겠지만, 그것도 성장의 기회야!",
        "와우! 정말 대단한데? 계속 그 기세로! ✨",
        "걱정 마! 우리 함께 해결책을 찾아보자! 🔥",
        "넌 생각보다 훨씬 강해! 믿어봐! 💫"
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
      ]
    };
    
    let aiResponse = "따뜻한 위로의 말씀을 드릴게요 💕";
    
    // Warning response
    if (isWarning) {
      aiResponse = "지금 정말 힘드시겠지만, 당신은 소중한 존재예요. 전문적인 도움을 받아보시는 건 어떨까요? 생명사랑콜센터(1393) 같은 곳에서 24시간 상담을 받으실 수 있어요. 💝";
    } else {
      const responses = characterResponses[characterId as keyof typeof characterResponses] || characterResponses.rabbit;
      aiResponse = responses[Math.floor(Math.random() * responses.length)];
    }
    
    const currentCharacter = charactersInfo[characterId as keyof typeof charactersInfo] || charactersInfo.rabbit;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save user message
    const userMessageKey = `chatmsg:${userId}:${chatRoomId}:${messageId}_user`;
    await kv.set(userMessageKey, {
      id: `${messageId}_user`,
      chatRoomId,
      userId,
      message,
      type: 'user',
      timestamp,
      emotion,
      warning: isWarning
    });
    
    // Save AI response with character info at the time of sending
    const aiMessageKey = `chatmsg:${userId}:${chatRoomId}:${messageId}_ai`;
    await kv.set(aiMessageKey, {
      id: `${messageId}_ai`,
      chatRoomId,
      userId,
      message: aiResponse,
      type: 'ai',
      timestamp: new Date().toISOString(),
      characterId, // Store current character
      characterName: currentCharacter.name,
      characterEmoji: currentCharacter.emoji,
      warning: isWarning
    });
    
    // Update chat room with last message
    if (chatRoomId) {
      const roomKey = `chatroom:${userId}:${chatRoomId}`;
      const existingRoom = await kv.get(roomKey);
      if (existingRoom) {
        await kv.set(roomKey, {
          ...existingRoom,
          lastMessage: message.length > 30 ? message.substring(0, 30) + '...' : message,
          timestamp: new Date().toISOString(),
          messageCount: (existingRoom.messageCount || 0) + 1
        });
      }
    }
    
    return c.json({ 
      userMessage: message,
      aiResponse,
      emotion,
      warning: isWarning
    });
  } catch (error) {
    console.log(`Chat send error: ${error}`);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// Get chat history
app.get("/api/chat/history", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const chatRoomId = c.req.query('chatRoomId');
    if (!chatRoomId) {
      return c.json({ error: "Chat room ID is required" }, 400);
    }
    
    const chatPrefix = `chatmsg:${userId}:${chatRoomId}:`;
    const chatMessages = await kv.getByPrefix(chatPrefix);
    
    // Sort by timestamp
    const sortedMessages = chatMessages
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-50); // Get last 50 messages
    
    return c.json({ messages: sortedMessages });
  } catch (error) {
    console.log(`Chat history error: ${error}`);
    return c.json({ error: "Failed to get chat history" }, 500);
  }
});

// Get recent chats for character selection
app.get("/api/chat/recent", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const chatPrefix = `chat:${userId}:`;
    const allChatMessages = await kv.getByPrefix(chatPrefix);
    
    // Group by character and get recent info
    const recentChats: Record<string, { lastMessage: string; timestamp: string; messageCount: number }> = {};
    
    for (const message of allChatMessages) {
      if (message.characterId && message.type === 'user') {
        const characterId = message.characterId;
        
        if (!recentChats[characterId]) {
          recentChats[characterId] = {
            lastMessage: message.message,
            timestamp: message.timestamp,
            messageCount: 0
          };
        }
        
        recentChats[characterId].messageCount++;
        
        // Update if this message is more recent
        if (new Date(message.timestamp) > new Date(recentChats[characterId].timestamp)) {
          recentChats[characterId].lastMessage = message.message;
          recentChats[characterId].timestamp = message.timestamp;
        }
      }
    }
    
    return c.json({ recentChats });
  } catch (error) {
    console.log(`Recent chats error: ${error}`);
    return c.json({ error: "Failed to get recent chats" }, 500);
  }
});

// Save diary entry
app.post("/api/diary/save", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { title, content, emotion, compliment, regrets, date } = await c.req.json();
    const diaryKey = `diary:${userId}:${date}`;
    
    // Get emotion positivity info
    const emotionPositivity = {
      happy: true,
      sad: false,
      angry: false,
      irritated: false,
      anxious: false
    };
    
    await kv.set(diaryKey, {
      userId,
      title,
      content,
      emotion,
      emotionPositivity: emotionPositivity[emotion] || false,
      compliment,
      regrets,
      date,
      timestamp: new Date().toISOString()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Diary save error: ${error}`);
    return c.json({ error: "Failed to save diary" }, 500);
  }
});

// Get today's diary entry
app.get("/api/diary/today", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const date = c.req.query('date');
    if (!date) {
      return c.json({ error: "Date is required" }, 400);
    }
    
    const diaryKey = `diary:${userId}:${date}`;
    const entry = await kv.get(diaryKey);
    
    return c.json({ entry });
  } catch (error) {
    console.log(`Get today diary error: ${error}`);
    return c.json({ error: "Failed to get diary entry" }, 500);
  }
});

// Get character messages for today
app.get("/api/diary/character-messages", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const date = c.req.query('date');
    if (!date) {
      return c.json({ error: "Date is required" }, 400);
    }
    
    // Get today's chat messages to generate character messages
    const chatPrefix = `chatmsg:${userId}:`;
    const allMessages = await kv.getByPrefix(chatPrefix);
    
    // Filter messages for today
    const todayMessages = allMessages.filter(msg => {
      const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
      return msgDate === date && msg.type === 'user';
    });
    
    // Get unique characters that user chatted with today
    const charactersToday = [...new Set(todayMessages.map(msg => msg.characterId))];
    
    // Generate messages from characters
    const characterMessages = charactersToday.map(characterId => {
      const characterEmojis = {
        fox: '🦊',
        rabbit: '🐰',
        dog: '🐕'
      };
      
      const characterMessagesByType = {
        fox: [
          "오늘도 정말 수고했어! 너의 노력이 빛나고 있어! ✨",
          "힘든 순간도 있었지만 잘 견뎌냈네! 정말 대단해!",
          "오늘 하루도 성장하는 너의 모습이 멋져!",
          "내일은 오늘보다 더 좋은 일들이 기다리고 있을 거야!"
        ],
        rabbit: [
          "오늘 하루도 정말 수고하셨어요 💕 충분히 잘하고 계세요",
          "힘든 시간도 있었지만, 그런 마음을 나눠주셔서 고마워요",
          "오늘도 자신을 아끼며 따뜻하게 보내시길 바라요",
          "언제든 힘들면 저에게 말해주세요. 항상 들어드릴게요"
        ],
        dog: [
          "오늘 하루를 차근차근 잘 보내셨네요. 체계적으로 잘 관리하고 계십니다",
          "상황을 객관적으로 바라보며 현명하게 대처하셨어요",
          "오늘의 경험들이 내일을 위한 좋은 밑거름이 될 것입니다",
          "꾸준히 자신을 돌보는 모습이 인상적입니다"
        ]
      };
      
      const messages = characterMessagesByType[characterId] || [];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      return {
        characterId,
        emoji: characterEmojis[characterId] || '🤖',
        message: randomMessage || "오늘도 함께해서 즐거웠어요!"
      };
    });
    
    return c.json({ messages: characterMessages });
  } catch (error) {
    console.log(`Get character messages error: ${error}`);
    return c.json({ error: "Failed to get character messages" }, 500);
  }
});

// Generate diary draft from today's chat
app.get("/api/diary/generate", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const chatPrefix = `chatmsg:${userId}:`;
    const todayChats = await kv.getByPrefix(chatPrefix);
    
    // Filter for today's user messages
    const todayUserMessages = todayChats.filter(msg => {
      const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
      return msgDate === today && msg.type === 'user';
    });
    
    // Simple diary generation based on emotions
    const emotions = todayUserMessages
      .filter(chat => chat.emotion)
      .map(chat => chat.emotion);
    
    let draftContent = "";
    if (emotions.length > 0) {
      const dominantEmotion = emotions[emotions.length - 1]; // Last emotion
      switch (dominantEmotion) {
        case 'happy':
          draftContent = "오늘은 기분 좋은 하루였다.";
          break;
        case 'sad':
          draftContent = "오늘은 조금 우울한 하루였다.";
          break;
        case 'angry':
          draftContent = "오늘은 화가 나는 일이 있었다.";
          break;
        case 'anxious':
          draftContent = "오늘은 불안한 마음이 들었다.";
          break;
        default:
          draftContent = "오늘 하루를 되돌아본다.";
      }
    } else {
      draftContent = "오늘 하루를 되돌아본다.";
    }
    
    return c.json({ draftContent });
  } catch (error) {
    console.log(`Diary generate error: ${error}`);
    return c.json({ error: "Failed to generate diary" }, 500);
  }
});

// Get emotion report data
app.get("/api/report/emotion", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const period = c.req.query('period') || 'week'; // week or month
    const now = new Date();
    let startDate: Date;
    
    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get diary entries for the period
    const diaryPrefix = `diary:${userId}:`;
    const diaryEntries = await kv.getByPrefix(diaryPrefix);
    
    const filteredEntries = diaryEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= now;
    });
    
    // Get custom emotions
    const emotionsPrefix = `emotions:${userId}:`;
    const customEmotions = await kv.getByPrefix(emotionsPrefix);
    
    // Count emotions (including custom ones)
    const emotionCounts: Record<string, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
      neutral: 0
    };
    
    // Add custom emotions to the counts
    customEmotions.forEach(emotion => {
      emotionCounts[emotion.id] = 0;
    });
    
    filteredEntries.forEach(entry => {
      if (entry.emotion && emotionCounts.hasOwnProperty(entry.emotion)) {
        emotionCounts[entry.emotion]++;
      }
    });
    
    return c.json({ 
      period,
      emotionCounts,
      totalEntries: filteredEntries.length,
      customEmotions 
    });
  } catch (error) {
    console.log(`Emotion report error: ${error}`);
    return c.json({ error: "Failed to get emotion report" }, 500);
  }
});

// Get diary entries
app.get("/api/diary/entries", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const diaryPrefix = `diary:${userId}:`;
    const diaryEntries = await kv.getByPrefix(diaryPrefix);
    
    // Sort by date (newest first)
    const sortedEntries = diaryEntries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30); // Get last 30 entries
    
    return c.json({ entries: sortedEntries });
  } catch (error) {
    console.log(`Diary entries error: ${error}`);
    return c.json({ error: "Failed to get diary entries" }, 500);
  }
});

// Get monthly emotions for calendar
app.get("/api/report/monthly", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const year = parseInt(c.req.query('year') || '');
    const month = parseInt(c.req.query('month') || '');
    
    if (!year || !month) {
      return c.json({ error: "Year and month are required" }, 400);
    }
    
    const diaryPrefix = `diary:${userId}:`;
    const diaryEntries = await kv.getByPrefix(diaryPrefix);
    
    // Filter entries for the specific month
    const monthlyEntries = diaryEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === month;
    });
    
    // Create emotion data for each day
    const emotions = monthlyEntries.map(entry => ({
      date: entry.date,
      emotion: entry.emotion || 'neutral',
      diary: entry.content
    }));
    
    return c.json({ emotions });
  } catch (error) {
    console.log(`Monthly emotions error: ${error}`);
    return c.json({ error: "Failed to get monthly emotions" }, 500);
  }
});

// Get custom emotions for user
app.get("/api/emotions/custom", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const emotionsPrefix = `emotions:${userId}:`;
    const customEmotions = await kv.getByPrefix(emotionsPrefix);
    
    return c.json({ emotions: customEmotions });
  } catch (error) {
    console.log(`Get custom emotions error: ${error}`);
    return c.json({ error: "Failed to get custom emotions" }, 500);
  }
});

// Add custom emotion
app.post("/api/emotions/add", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { label, emoji, color, isPositive } = await c.req.json();
    
    if (!label || !emoji) {
      return c.json({ error: "Label and emoji are required" }, 400);
    }
    
    const emotionId = `custom_${Date.now()}`;
    const emotionKey = `emotions:${userId}:${emotionId}`;
    
    await kv.set(emotionKey, {
      id: emotionId,
      label,
      emoji,
      color: color || 'bg-purple-100 text-purple-700',
      isCustom: true,
      isPositive: isPositive !== undefined ? isPositive : true,
      createdAt: new Date().toISOString()
    });
    
    return c.json({ success: true, emotionId });
  } catch (error) {
    console.log(`Add custom emotion error: ${error}`);
    return c.json({ error: "Failed to add custom emotion" }, 500);
  }
});

// Update custom emotion
app.put("/api/emotions/:id", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const emotionId = c.req.param('id');
    const { label, emoji, color, isPositive } = await c.req.json();
    
    if (!emotionId.startsWith('custom_')) {
      return c.json({ error: "Cannot edit default emotions" }, 400);
    }
    
    const emotionKey = `emotions:${userId}:${emotionId}`;
    const existingEmotion = await kv.get(emotionKey);
    
    if (!existingEmotion) {
      return c.json({ error: "Emotion not found" }, 404);
    }
    
    await kv.set(emotionKey, {
      ...existingEmotion,
      label: label || existingEmotion.label,
      emoji: emoji || existingEmotion.emoji,
      color: color || existingEmotion.color,
      isPositive: isPositive !== undefined ? isPositive : existingEmotion.isPositive,
      updatedAt: new Date().toISOString()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Update custom emotion error: ${error}`);
    return c.json({ error: "Failed to update custom emotion" }, 500);
  }
});

// Delete custom emotion
app.delete("/api/emotions/:id", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const emotionId = c.req.param('id');
    
    if (!emotionId.startsWith('custom_')) {
      return c.json({ error: "Cannot delete default emotions" }, 400);
    }
    
    const emotionKey = `emotions:${userId}:${emotionId}`;
    
    // Delete the custom emotion
    await kv.del(emotionKey);
    
    // Update all diary entries that used this emotion to "unselected"
    const diaryPrefix = `diary:${userId}:`;
    const diaryEntries = await kv.getByPrefix(diaryPrefix);
    
    for (const entry of diaryEntries) {
      if (entry.emotion === emotionId) {
        const diaryKey = `diary:${userId}:${entry.date}`;
        await kv.set(diaryKey, {
          ...entry,
          emotion: '', // Set to empty string (unselected)
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete custom emotion error: ${error}`);
    return c.json({ error: "Failed to delete custom emotion" }, 500);
  }
});

// Send email report
app.post("/api/report/email", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { email, period } = await c.req.json();
    
    if (!email) {
      return c.json({ error: "Email address is required" }, 400);
    }
    
    // Get emotion report data
    const now = new Date();
    let startDate: Date;
    
    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const diaryPrefix = `diary:${userId}:`;
    const diaryEntries = await kv.getByPrefix(diaryPrefix);
    
    const filteredEntries = diaryEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= now;
    });
    
    const emotionCounts = {
      happy: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
      neutral: 0
    };
    
    filteredEntries.forEach(entry => {
      if (entry.emotion && emotionCounts.hasOwnProperty(entry.emotion)) {
        emotionCounts[entry.emotion]++;
      }
    });
    
    // Create email content
    const emotionLabels = {
      happy: '기쁨',
      sad: '슬픔',
      angry: '화남',
      anxious: '불안',
      neutral: '평온'
    };
    
    let emotionSummary = '';
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      if (count > 0) {
        emotionSummary += `${emotionLabels[emotion]}: ${count}번\n`;
      }
    });
    
    const emailContent = `
안녕하세요! BreezI에서 보내드리는 ${period === 'week' ? '주간' : '월간'} 감정 리포트입니다.

📊 감정 분석 결과:
${emotionSummary}

📖 총 일기 작성 수: ${filteredEntries.length}개

감정을 꾸준히 기록하며 자신을 돌보고 계시는 모습이 멋져요! 
앞으로도 BreezI과 함께 건강한 마음 관리 하세요. 💜

- BreezI 팀 드림
    `;
    
    // In a real application, you would integrate with an email service like SendGrid, AWS SES, etc.
    console.log(`Sending email to ${email}:`);
    console.log(emailContent);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return c.json({ 
      success: true, 
      message: "감정 리포트가 카카오톡으로 전송되었습니다!" 
    });
  } catch (error) {
    console.log(`Email report error: ${error}`);
    return c.json({ error: "Failed to send email report" }, 500);
  }
});

// Get recommended emotion keywords based on user's chat/diary patterns
app.get("/api/emotion-care/recommended-keywords", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Get user's recent chats and diary entries to find common emotional patterns
    const chatPrefix = `chatmsg:${userId}:`;
    const diaryPrefix = `diary:${userId}:`;
    
    const [chatMessages, diaryEntries] = await Promise.all([
      kv.getByPrefix(chatPrefix),
      kv.getByPrefix(diaryPrefix)
    ]);
    
    // Analyze text for emotion-related keywords
    const emotionKeywords = ['불안', '슬픔', '분노', '외로움', '무기력', '행복', '신남'];
    const keywordCounts: Record<string, number> = {};
    
    // Count emotion words in chat messages
    chatMessages.forEach(message => {
      if (message.type === 'user') {
        emotionKeywords.forEach(keyword => {
          if (message.message.includes(keyword)) {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
          }
        });
      }
    });
    
    // Count emotion words in diary entries
    diaryEntries.forEach(entry => {
      emotionKeywords.forEach(keyword => {
        if (entry.content && entry.content.includes(keyword)) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        }
      });
    });
    
    // Get top 3 most frequent keywords
    const sortedKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([keyword]) => keyword);
    
    return c.json({ keywords: sortedKeywords });
  } catch (error) {
    console.log(`Recommended keywords error: ${error}`);
    return c.json({ error: "Failed to get recommended keywords" }, 500);
  }
});

// Get today's mission for emotion care
app.get("/api/emotion-care/today-mission", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Get user's recent emotional state to suggest appropriate mission
    const diaryPrefix = `diary:${userId}:`;
    const recentEntries = await kv.getByPrefix(diaryPrefix);
    
    // Get last 3 days of entries
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentEmotions = recentEntries
      .filter(entry => new Date(entry.date) >= threeDaysAgo)
      .map(entry => entry.emotion)
      .filter(Boolean);
    
    // Default missions based on recent emotions
    const missions = {
      sad: {
        id: '1',
        title: '자신에게 친절한 말 건네기',
        description: '거울을 보며 자신에게 "오늘도 수고했어"라고 말해보세요. 자신을 향한 따뜻한 마음이 슬픔을 달래줄 거예요.',
        emotionKeywords: ['슬픔', '우울']
      },
      anxious: {
        id: '2',
        title: '5분 심호흡 명상하기',
        description: '편안한 자세로 앉아 5분간 깊게 숨쉬어보세요. 숨을 들이마실 때 4초, 참을 때 4초, 내쉴 때 6초로 해보세요.',
        emotionKeywords: ['불안', '걱정']
      },
      angry: {
        id: '3',
        title: '감정 일기 쓰기',
        description: '화가 난 이유를 종이에 적어보세요. 감정을 글로 표현하면 마음이 정리되고 분노가 줄어들 거예요.',
        emotionKeywords: ['분노', '화남']
      },
      happy: {
        id: '4',
        title: '감사 인사 전하기',
        description: '오늘 고마웠던 사람에게 짧은 메시지를 보내보세요. 좋은 감정을 나누면 더 큰 행복으로 돌아올 거예요.',
        emotionKeywords: ['기쁨', '행복']
      },
      default: {
        id: '5',
        title: '오늘 하루 되돌아보기',
        description: '오늘 있었던 좋은 일 3가지를 떠올려보세요. 작은 것이라도 괜찮아요. 긍정적인 순간들을 기억하는 연습을 해보세요.',
        emotionKeywords: ['일상']
      }
    };
    
    // Select mission based on most recent emotion
    let selectedMission = missions.default;
    if (recentEmotions.length > 0) {
      const lastEmotion = recentEmotions[recentEmotions.length - 1];
      if (lastEmotion in missions) {
        selectedMission = missions[lastEmotion];
      }
    }
    
    return c.json({ mission: selectedMission });
  } catch (error) {
    console.log(`Today mission error: ${error}`);
    return c.json({ error: "Failed to get today mission" }, 500);
  }
});

// Get emotion care content (breathing exercises, videos, tips)
app.post("/api/emotion-care/content", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization') ?? null);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { keywords } = await c.req.json();
    
    if (!keywords || keywords.length === 0) {
      return c.json({ error: "Keywords are required" }, 400);
    }
    
    // Determine content type based on keywords
    const hasNegativeEmotion = keywords.some(keyword => 
      ['불안', '슬픔', '분노', '외로움', '피로', '무기력'].includes(keyword)
    );
    
    let content: any = {};
    
    // Breathing exercises
    if (hasNegativeEmotion) {
      if (keywords.includes('불안')) {
        content.breathingExercise = "4-7-8 호흡법: 4초간 코로 숨을 들이마시고, 7초간 참은 후, 8초간 입으로 내쉬세요. 이를 4번 반복하면 불안감이 줄어들 거예요.";
      } else if (keywords.includes('분노')) {
        content.breathingExercise = "화가 날 때는 깊고 천천히 숨쉬기: 코로 5초간 깊게 들이마시고, 입으로 5초간 천천히 내쉬세요. 10회 반복하며 마음을 진정시켜보세요.";
      } else {
        content.breathingExercise = "복식호흡법: 배에 손을 올리고 코로 천천히 숨을 들이마셔 배가 부풀어 오르게 하고, 입으로 천천히 내쉬며 배가 들어가게 하세요.";
      }
    } else {
      content.breathingExercise = "기쁨 유지 호흡법: 편안하게 앉아 자연스럽게 숨쉬며, 들이마실 때마다 '감사함'을, 내쉴 때마다 '행복함'을 느껴보세요.";
    }
    
    // Tips based on emotions
    content.tips = [];
    if (keywords.includes('불안')) {
      content.tips.push("불안할 때는 지금 이 순간에 집중해보세요. 주변의 소리, 냄새, 촉감을 느껴보세요.");
      content.tips.push("불안한 생각이 들면 '이것은 생각일 뿐이야'라고 스스로에게 말해보세요.");
    }
    if (keywords.includes('슬픔')) {
      content.tips.push("슬플 때는 눈물을 참지 마세요. 감정을 충분히 느끼는 것도 중요합니다.");
      content.tips.push("따뜻한 차를 마시거나 좋아하는 음악을 들으며 마음을 달래보세요.");
    }
    if (keywords.includes('분노')) {
      content.tips.push("화가 날 때는 즉시 반응하지 말고 10까지 세어보세요.");
      content.tips.push("운동이나 물리적 활동으로 분노 에너지를 건설적으로 표출해보세요.");
    }
    if (keywords.includes('외로움')) {
      content.tips.push("친구나 가족에게 안부 인사를 보내보세요. 작은 연결도 외로움을 달래줍니다.");
      content.tips.push("반려동물이나 식물을 돌보는 것도 외로움을 줄이는 좋은 방법입니다.");
    }
    
    // Sample YouTube videos (in a real app, you'd integrate with YouTube API)
    content.videos = [];
    if (keywords.includes('불안')) {
      content.videos.push({
        id: '1',
        title: '불안할 때 듣는 10분 명상 음악',
        thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop',
        url: '#'
      });
    }
    if (keywords.includes('슬픔')) {
      content.videos.push({
        id: '2',
        title: '마음을 위로하는 자연 소리',
        thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=150&fit=crop',
        url: '#'
      });
    }
    if (keywords.includes('분노')) {
      content.videos.push({
        id: '3',
        title: '화를 다스리는 명상',
        thumbnail: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=200&h=150&fit=crop',
        url: '#'
      });
    }
    
    return c.json({ content });
  } catch (error) {
    console.log(`Emotion care content error: ${error}`);
    return c.json({ error: "Failed to get emotion care content" }, 500);
  }
});

serve({ fetch: app.fetch });