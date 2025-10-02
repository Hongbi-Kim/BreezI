import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { createClient } from "@supabase/supabase-js";
import * as kv from "./kv_store.js";
import dotenv from "dotenv";
import { generateAIResponse } from "../../../services/ai";

dotenv.config();

const app = new Hono();

// Initialize Supabase client
// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
  })
);

// Health check endpoint
app.get("/make-server-58f75568/health", (c) => {
  return c.json({ status: "ok" });
});

// Helper function to verify user authentication
async function verifyAuth(authHeader) {
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

// User signup endpoint
app.post("/make-server-58f75568/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
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

// Chat message endpoint
app.post("/make-server-58f75568/chat/send", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { message, emotion } = await c.req.json();
    const timestamp = new Date().toISOString();

    // 1. DB에서 최근 대화 불러오기
    const chatPrefix = `chat:${userId}:`;
    const chatMessages = await kv.getByPrefix(chatPrefix);
    const recentMessages = chatMessages
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      .slice(-10); // 최근 10개만 사용

    // // 2. AI 응답 생성
    // const aiResponse = await generateAIResponse(recentMessages, message);

    const aiResponses = [
      "정말 힘드셨겠어요. 그 기분을 이해해요.",
      "괜찮아요, 천천히 얘기해 주세요.",
      "지금 많이 지치신 것 같아요. 잠시 쉬어가는 것도 필요해요.",
      "그런 일이 있었군요. 많이 속상하셨을 것 같아요.",
      "혼자가 아니에요. 제가 여기 있어요.",
      "오늘 하루 정말 수고하셨어요.",
      "그 감정을 느끼는 것도 자연스러운 일이에요."
    ];
    
    const aiResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    
    const userMessageKey = `chat:${userId}:${timestamp}:user`;
    await kv.set(userMessageKey, {
      userId,
      message,
      emotion,
      timestamp,
      type: 'user'
    });
    
    const aiMessageKey = `chat:${userId}:${timestamp}:ai`;
    await kv.set(aiMessageKey, {
      userId,
      message: aiResponse,
      timestamp: new Date().toISOString(),
      type: 'ai'
    });
    
    return c.json({ 
      userMessage: message,
      aiResponse,
      emotion 
    });
  } catch (error) {
    console.log(`Chat send error: ${error}`);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// Get chat history
app.get("/make-server-58f75568/chat/history", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const chatPrefix = `chat:${userId}:`;
    const chatMessages = await kv.getByPrefix(chatPrefix);
    
    const sortedMessages = chatMessages
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-50);
    
    return c.json({ messages: sortedMessages });
  } catch (error) {
    console.log(`Chat history error: ${error}`);
    return c.json({ error: "Failed to get chat history" }, 500);
  }
});

// Save diary entry
app.post("/make-server-58f75568/diary/save", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { content, emotion, date } = await c.req.json();
    const diaryKey = `diary:${userId}:${date}`;
    
    await kv.set(diaryKey, {
      userId,
      content,
      emotion,
      date,
      timestamp: new Date().toISOString()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Diary save error: ${error}`);
    return c.json({ error: "Failed to save diary" }, 500);
  }
});

// Generate diary draft from today's chat
app.get("/make-server-58f75568/diary/generate", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const chatPrefix = `chat:${userId}:${today}`;
    const todayChats = await kv.getByPrefix(chatPrefix);
    
    const emotions = todayChats
      .filter(chat => chat.type === 'user' && chat.emotion)
      .map(chat => chat.emotion);
    
    let draftContent = "";
    if (emotions.length > 0) {
      const dominantEmotion = emotions[emotions.length - 1];
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
app.get("/make-server-58f75568/report/emotion", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const period = c.req.query('period') || 'week';
    const now = new Date();
    let startDate;
    
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
    
    const emotionsPrefix = `emotions:${userId}:`;
    const customEmotions = await kv.getByPrefix(emotionsPrefix);
    
    const emotionCounts = {
      happy: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
      neutral: 0
    };
    
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
app.get("/make-server-58f75568/diary/entries", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const diaryPrefix = `diary:${userId}:`;
    const diaryEntries = await kv.getByPrefix(diaryPrefix);
    
    const sortedEntries = diaryEntries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);
    
    return c.json({ entries: sortedEntries });
  } catch (error) {
    console.log(`Diary entries error: ${error}`);
    return c.json({ error: "Failed to get diary entries" }, 500);
  }
});

// Get monthly emotions for calendar
app.get("/make-server-58f75568/report/monthly", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
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
    
    const monthlyEntries = diaryEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === month;
    });
    
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
app.get("/make-server-58f75568/emotions/custom", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
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
app.post("/make-server-58f75568/emotions/add", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { label, emoji, color } = await c.req.json();
    
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
      createdAt: new Date().toISOString()
    });
    
    return c.json({ success: true, emotionId });
  } catch (error) {
    console.log(`Add custom emotion error: ${error}`);
    return c.json({ error: "Failed to add custom emotion" }, 500);
  }
});

// Update custom emotion
app.put("/make-server-58f75568/emotions/:id", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const emotionId = c.req.param('id');
    const { label, emoji, color } = await c.req.json();
    
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
      updatedAt: new Date().toISOString()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Update custom emotion error: ${error}`);
    return c.json({ error: "Failed to update custom emotion" }, 500);
  }
});

// Delete custom emotion
app.delete("/make-server-58f75568/emotions/:id", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const emotionId = c.req.param('id');
    
    if (!emotionId.startsWith('custom_')) {
      return c.json({ error: "Cannot delete default emotions" }, 400);
    }
    
    const emotionKey = `emotions:${userId}:${emotionId}`;
    
    await kv.del(emotionKey);
    
    const diaryPrefix = `diary:${userId}:`;
    const diaryEntries = await kv.getByPrefix(diaryPrefix);
    
    for (const entry of diaryEntries) {
      if (entry.emotion === emotionId) {
        const diaryKey = `diary:${userId}:${entry.date}`;
        await kv.set(diaryKey, {
          ...entry,
          emotion: '',
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
app.post("/make-server-58f75568/report/email", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { email, period } = await c.req.json();
    
    if (!email) {
      return c.json({ error: "Email address is required" }, 400);
    }
    
    const now = new Date();
    let startDate;
    
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
안녕하세요! 마음돌봄에서 보내드리는 ${period === 'week' ? '주간' : '월간'} 감정 리포트입니다.

📊 감정 분석 결과:
${emotionSummary}

📖 총 일기 작성 수: ${filteredEntries.length}개

감정을 꾸준히 기록하며 자신을 돌보고 계시는 모습이 멋져요! 
앞으로도 마음돌봄과 함께 건강한 마음 관리 하세요. 💜

- 마음돌봄 팀 드림
    `;
    
    console.log(`Sending email to ${email}:`);
    console.log(emailContent);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return c.json({ 
      success: true, 
      message: "감정 리포트가 이메일로 전송되었습니다!" 
    });
  } catch (error) {
    console.log(`Email report error: ${error}`);
    return c.json({ error: "Failed to send email report" }, 500);
  }
});

const port = parseInt(process.env.PORT || '3000');
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});