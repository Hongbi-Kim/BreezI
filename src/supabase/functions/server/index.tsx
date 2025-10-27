import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createClient } from "@supabase/supabase-js";
import * as kv from "./kv_store";
import { generateAIResponse, buildConversationHistory } from "./ai_chat";
import { generateDiaryDraft } from "./ai_diary";
import { generateEmotionInsight } from "./ai_report";
import { generateAIComment, getFallbackComment } from "./ai_community";
import { serve } from "@hono/node-server";

import dotenv from "dotenv";
dotenv.config();

const app = new Hono();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Starting server with Supabase URL:', supabaseUrl ? 'configured' : 'missing');
console.log('Service role key:', supabaseServiceKey ? 'configured' : 'missing');

// Check OpenAI API key status
const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey || openaiKey.length < 20 || !openaiKey.startsWith('sk-')) {
  console.log('⚠️ WARNING: OPENAI_API_KEY not configured properly. AI features will use fallback responses.');
  console.log('   To enable AI features, please set a valid OpenAI API key in the Supabase secrets.');
} else {
  console.log('✅ OpenAI API key: configured');
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

// Auto-cleanup function for old deletion records (run once per day)
async function cleanupOldDeletionRecords() {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const deletions = await kv.get('user_deletions');
    if (!Array.isArray(deletions) || deletions.length === 0) {
      return;
    }
    
    // Find deletions older than 1 year
    const oldDeletions = deletions.filter((deletion: any) => {
      const deletedAt = new Date(deletion.deletedAt);
      return deletedAt <= oneYearAgo;
    });
    
    if (oldDeletions.length === 0) {
      return;
    }
    
    console.log(`🗑️ Starting cleanup of ${oldDeletions.length} deletion records older than 1 year...`);
    
    // Collect user IDs and emails to anonymize
    const userIdsToClean = oldDeletions.map((d: any) => d.userId).filter(Boolean);
    const emailsToClean = oldDeletions.map((d: any) => d.email).filter(Boolean);
    
    // 1. Remove from user_deletions array
    const recentDeletions = deletions.filter((deletion: any) => {
      const deletedAt = new Date(deletion.deletedAt);
      return deletedAt > oneYearAgo;
    });
    await kv.set('user_deletions', recentDeletions);
    
    // 2. Remove individual deleted_user records
    for (const email of emailsToClean) {
      await kv.del(`deleted_user:${email}`);
    }
    
    // 3. Anonymize data in reports (신고 기록에서 개인정보 제거)
    const reports = await kv.get('reports') || [];
    let reportsCleaned = 0;
    if (Array.isArray(reports)) {
      for (const report of reports) {
        let modified = false;
        
        // Anonymize reporter info if they deleted their account more than 1 year ago
        if (userIdsToClean.includes(report.reporterId) || emailsToClean.includes(report.reporterEmail)) {
          report.reporterEmail = '[삭제된 이메일]';
          report.reporterIp = '[삭제됨]';
          modified = true;
        }
        
        // Anonymize target user info if they deleted their account more than 1 year ago
        if (userIdsToClean.includes(report.targetUserId) || emailsToClean.includes(report.targetUserEmail)) {
          report.targetUserEmail = '[삭제된 이메일]';
          // Delete saved content (신고 당한 글 완전 삭제)
          if (report.savedContent) {
            report.savedContent = {
              deleted: true,
              deletedReason: '법적 보관 기한(1년) 만료로 영구 삭제됨'
            };
          }
          modified = true;
        }
        
        if (modified) reportsCleaned++;
      }
      
      if (reportsCleaned > 0) {
        await kv.set('reports', reports);
      }
    }
    
    // 4. Remove activity logs for deleted users (활동 로그 삭제)
    const allActivityLogs = await kv.getByPrefix('activitylog:');
    let activityLogsCleaned = 0;
    for (const log of allActivityLogs) {
      if (userIdsToClean.includes(log.userId)) {
        const logKeys = await kv.getByPrefix(`activitylog:${log.userId}:`);
        for (const logEntry of logKeys) {
          // Delete the log key - need to extract the key from the data
          // Since getByPrefix returns values, we need to delete by pattern
          await kv.del(`activitylog:${log.userId}:${logEntry.id}`);
        }
        activityLogsCleaned++;
      }
    }
    
    // 5. Remove user warnings and suspensions (경고/정지 이력 삭제)
    let warningsCleaned = 0;
    for (const userId of userIdsToClean) {
      const warningKey = `user_warnings:${userId}`;
      const warnings = await kv.get(warningKey);
      if (warnings) {
        await kv.del(warningKey);
        warningsCleaned++;
      }
    }
    
    console.log(`✅ Cleanup completed: ${oldDeletions.length} deletion records removed`);
    console.log(`   - ${reportsCleaned} reports anonymized`);
    console.log(`   - ${activityLogsCleaned} activity logs deleted`);
    console.log(`   - ${warningsCleaned} warning records deleted`);
    console.log(`   - Legal retention period (1 year) expired - all personal data permanently deleted`);
    
  } catch (error) {
    console.error(`Failed to cleanup old deletion records: ${error}`);
  }
}

// Run cleanup on server start
cleanupOldDeletionRecords();

// Schedule daily cleanup (run every 24 hours)
setInterval(() => {
  cleanupOldDeletionRecords();
}, 24 * 60 * 60 * 1000);

// Health check endpoint
app.get("/make-server-58f75568/health", (c) => {
  return c.json({ status: "ok" });
});

// Helper function to verify user authentication
async function verifyAuth(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const accessToken = authHeader.split(' ')[1];
  if (!accessToken) {
    return null;
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error) {
      // Only log non-credential errors to avoid confusion
      if (!error.message?.includes('Invalid login credentials')) {
        console.log('Authentication error:', error.message);
      }
      return null;
    }
    
    if (!user?.id) {
      return null;
    }
    
    return user.id;
  } catch (error) {
    console.log('Unexpected error during authentication:', error);
    return null;
  }
}

// Helper function to check if nickname is already taken
async function isNicknameTaken(nickname: string, excludeUserId?: string) {
  try {
    const allProfiles = await kv.getByPrefix('profile:');
    for (const profile of allProfiles) {
      if (profile.nickname === nickname && profile.userId !== excludeUserId) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(`Failed to check nickname availability: ${error}`);
    return false;
  }
}

// Helper function to log user activity
async function logActivity(
  userId: string,
  action: string,
  details: any = {},
  ipAddress?: string
) {
  try {
    const logId = `activitylog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const logKey = `activitylog:${userId}:${logId}`;
    
    const logData = {
      id: logId,
      userId,
      action,
      details,
      ipAddress: ipAddress || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    await kv.set(logKey, logData);
    console.log(`Activity logged: ${userId} - ${action}`);
  } catch (error) {
    console.error(`Failed to log activity: ${error}`);
    // Don't throw error - logging failure shouldn't break the main operation
  }
}

// Profile setup endpoint
app.post("/make-server-58f75568/profile/setup", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { nickname, birthDate, characterInfo } = await c.req.json();

    if (!nickname || !birthDate) {
      return c.json({ error: "필수 정보가 누락되었습니다." }, 400);
    }

    // Check if nickname is already taken
    const nicknameTaken = await isNicknameTaken(nickname);
    if (nicknameTaken) {
      return c.json({ error: "이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요." }, 400);
    }

    // Get user email from Supabase Auth
    let userEmail = '';
    try {
      const { data: { user } } = await supabase.auth.getUser(c.req.header('Authorization')?.split(' ')[1]);
      userEmail = user?.email || '';
    } catch (authError) {
      console.log('Failed to get user email from auth:', authError);
    }

    // Check for previous deletion history (abuse prevention)
    const deletionData = await kv.get('user_deletions');
    const deletions = deletionData || [];
    const previousDeletions = deletions.filter((d: any) => d.email === userEmail);
    
    let warningCount = 0;
    let suspensionHistory: any[] = [];
    let isReturningOffender = false;
    let needsVerification = false;
    
    // Check deleted user record for report history
    const deletedUserRecord = await kv.get(`deleted_user:${userEmail}`);
    if (deletedUserRecord && deletedUserRecord.reportedCount > 0) {
      needsVerification = true;
      console.log(`⚠️ User ${userEmail} needs verification - had ${deletedUserRecord.reportedCount} reports in previous account`);
    }
    
    if (previousDeletions.length > 0) {
      // User has previous account deletion(s)
      const mostRecentDeletion = previousDeletions[previousDeletions.length - 1];
      
      // If user had serious violations (3+ warnings or suspension history), start with penalty
      if (mostRecentDeletion.warningCount >= 3 || (mostRecentDeletion.suspensionHistory && mostRecentDeletion.suspensionHistory.length > 0)) {
        isReturningOffender = true;
        // Start with reduced warning count (not full history, but not clean slate)
        warningCount = Math.min(2, mostRecentDeletion.warningCount || 0);
        suspensionHistory = mostRecentDeletion.suspensionHistory || [];
        
        console.log(`⚠️ Returning user with violation history: ${userEmail}, starting with ${warningCount} warnings`);
      }
    }

    const profileData = {
      userId,
      email: userEmail,
      nickname,
      birthDate,
      characterInfo: characterInfo || '',
      warningCount, // Carry over partial warning count if serious offender
      suspensionHistory, // Track suspension history
      isReturningOffender, // Flag for monitoring
      needsVerification, // Flag for accounts needing admin verification
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: needsVerification ? 'pending_verification' : 'active',
    };

    await kv.set(`profile:${userId}`, profileData);
    
    // If verification needed, add to verification queue
    if (needsVerification) {
      const verificationId = `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const verificationRecord = {
        id: verificationId,
        userId,
        email: userEmail,
        nickname,
        deletedUserRecord,
        status: 'pending',
        createdAt: new Date().toISOString(),
        processedAt: null,
        processedBy: null,
      };
      await kv.set(`verification:${verificationId}`, verificationRecord);
      console.log(`📋 Verification record created: ${verificationId}`);
    }

    // Log activity
    await logActivity(userId, 'profile_setup', { 
      nickname, 
      isReturningOffender,
      previousWarnings: warningCount 
    }, c.req.header('x-forwarded-for') || 'unknown');

    console.log(`Profile setup completed for user ${userId} (${userEmail})`);
    
    if (isReturningOffender) {
      console.log(`⚠️ User ${userId} flagged as returning offender with ${warningCount} initial warnings`);
    }
    
    return c.json({ message: "Profile setup completed", profile: profileData });
  } catch (error) {
    console.log(`Profile setup error: ${error}`);
    return c.json({ error: "Profile setup failed" }, 500);
  }
});

// Get user profile
app.get("/make-server-58f75568/profile/get", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const userId = await verifyAuth(authHeader);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await kv.get(`profile:${userId}`);
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    // Get user metadata (name, email) from auth
    const accessToken = authHeader?.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    
    const profileWithAuth = {
      ...profile,
      name: user?.user_metadata?.name || '',
      email: user?.email || '',
    };

    return c.json({ profile: profileWithAuth });
  } catch (error) {
    console.log(`Get profile error: ${error}`);
    return c.json({ error: "Failed to get profile" }, 500);
  }
});

// Check nickname availability
app.post("/make-server-58f75568/profile/check-nickname", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { nickname } = await c.req.json();

    if (!nickname || !nickname.trim()) {
      return c.json({ error: "닉네임을 입력해주세요" }, 400);
    }

    const isTaken = await isNicknameTaken(nickname, userId);
    
    return c.json({ available: !isTaken });
  } catch (error) {
    console.log(`Check nickname error: ${error}`);
    return c.json({ error: "Failed to check nickname" }, 500);
  }
});

// Update user profile
app.put("/make-server-58f75568/profile/update", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { nickname, characterInfo, greeting } = await c.req.json();

    if (!nickname) {
      return c.json({ error: "닉네임은 필수입니다." }, 400);
    }

    const existingProfile = await kv.get(`profile:${userId}`);
    if (!existingProfile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    // Check if nickname is already taken (excluding current user)
    if (existingProfile.nickname !== nickname) {
      const nicknameTaken = await isNicknameTaken(nickname, userId);
      if (nicknameTaken) {
        return c.json({ error: "이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요." }, 400);
      }
    }

    // Get user email from Supabase Auth if not already in profile
    let userEmail = existingProfile.email || '';
    if (!userEmail) {
      try {
        const { data: { user } } = await supabase.auth.getUser(c.req.header('Authorization')?.split(' ')[1]);
        userEmail = user?.email || '';
      } catch (authError) {
        console.log('Failed to get user email from auth:', authError);
      }
    }

    // Check if nickname changed
    const nicknameChanged = existingProfile.nickname !== nickname;

    // Only allow updating nickname, characterInfo, and greeting
    // birthDate cannot be changed after initial setup
    const updatedProfile = {
      ...existingProfile,
      userId,
      email: userEmail,
      nickname,
      characterInfo: characterInfo || '',
      greeting: greeting !== undefined ? greeting : existingProfile.greeting || '',
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`profile:${userId}`, updatedProfile);

    // If nickname changed, update all posts by this user
    if (nicknameChanged) {
      console.log(`Nickname changed from "${existingProfile.nickname}" to "${nickname}". Updating posts...`);
      
      try {
        // Get all posts with 'communitypost:' prefix
        const allPosts = await kv.getByPrefix('communitypost:');
        console.log(`Found ${allPosts.length} total posts to check`);
        
        let updateCount = 0;
        for (const post of allPosts) {
          if (post.userId === userId) {
            const updatedPost = {
              ...post,
              nickname: nickname
            };
            await kv.set(`communitypost:${post.id}`, updatedPost);
            updateCount++;
          }
        }
        
        console.log(`Updated ${updateCount} posts with new nickname for user ${userId}`);
      } catch (postError) {
        console.log(`Warning: Failed to update posts with new nickname: ${postError}`);
        console.error(postError);
        // Don't fail the profile update if post update fails
      }
    }

    console.log(`Profile updated for user ${userId}`);
    return c.json({ message: "Profile updated", profile: updatedProfile });
  } catch (error) {
    console.log(`Profile update error: ${error}`);
    return c.json({ error: "Profile update failed" }, 500);
  }
});

// Check if user has completed profile setup
app.get("/make-server-58f75568/profile/check", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await kv.get(`profile:${userId}`);
    return c.json({ 
      hasProfile: !!profile,
      profile: profile || null
    });
  } catch (error) {
    console.log(`Profile check error: ${error}`);
    return c.json({ error: "Failed to check profile" }, 500);
  }
});

// Demo user setup endpoint
app.post("/make-server-58f75568/auth/setup-demo", async (c) => {
  try {
    const demoEmail = 'demo@example.com';
    const demoPassword = 'demo123';
    const demoName = '��모 사용자';

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
app.post("/make-server-58f75568/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!name || name.trim().length < 2) {
      return c.json({ error: "이��은 최소 2자 이상이어야 합니다." }, 400);
    }
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        name: name.trim(),
        full_name: name.trim() 
      },
      // Set display name (full_name field in auth.users table)
      email_confirm: false
    });
    
    if (error) {
      console.log(`Signup error: ${error.message}`);
      
      // Provide user-friendly error messages
      let errorMessage = error.message;
      
      if (error.message?.includes('already been registered') || error.message?.includes('User already registered')) {
        errorMessage = 'USER_ALREADY_EXISTS';
      }
      
      return c.json({ error: errorMessage }, 400);
    }

    // Update the user's raw_user_meta_data to include full_name
    // This ensures it appears in the Display Name column
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      data.user.id,
      {
        user_metadata: {
          name: name.trim(),
          full_name: name.trim()
        }
      }
    );

    if (updateError) {
      console.log(`Update user metadata error: ${updateError.message}`);
    }
    
    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Signup request error: ${error}`);
    return c.json({ error: "Invalid request" }, 400);
  }
});

// Create new chat room
app.post("/make-server-58f75568/chat/rooms/create", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    let requestBody;
    try {
      requestBody = await c.req.json();
    } catch (parseError) {
      console.log(`JSON parse error in create chat room: ${parseError}`);
      return c.json({ error: "Invalid JSON in request body" }, 400);
    }
    
    const { characterId, title } = requestBody;
    
    if (!characterId || !title) {
      console.log(`Missing required fields - characterId: ${characterId}, title: ${title}`);
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
      createdAt: new Date().toISOString(), // 채팅방 생성 시간 추가
      isNewRoom: true, // 새로운 채팅방 플래그
      messageCount: 0,
      messages: [] // 채팅 메시지들을 저장할 배열
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
app.get("/make-server-58f75568/chat/rooms", async (c) => {
  try {
    console.log('Getting chat rooms, checking auth...');
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      console.log('Authentication failed for chat rooms request');
      return c.json({ error: "Unauthorized - Invalid or expired token" }, 401);
    }
    
    console.log(`Loading chat rooms for user: ${userId}`);
    const roomsPrefix = `chatroom:${userId}:`;
    const rooms = await kv.getByPrefix(roomsPrefix);
    
    console.log(`Found ${rooms.length} chat rooms for user ${userId}`);
    
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
    
    console.log(`Returning ${sortedRooms.length} sorted chat rooms`);
    return c.json({ chatRooms: sortedRooms });
  } catch (error) {
    console.log(`Get chat rooms error: ${error}`);
    return c.json({ error: "Failed to get chat rooms" }, 500);
  }
});

// Update chat room title
app.put("/make-server-58f75568/chat/rooms/:roomId/title", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
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
app.delete("/make-server-58f75568/chat/rooms/:roomId", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const roomId = c.req.param('roomId');
    const roomKey = `chatroom:${userId}:${roomId}`;
    
    // Delete the room (messages are now stored inside the room)
    await kv.del(roomKey);
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete chat room error: ${error}`);
    return c.json({ error: "Failed to delete chat room" }, 500);
  }
});

// Chat message endpoint
app.post("/make-server-58f75568/chat/send", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
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
    
    const currentCharacter = charactersInfo[characterId as keyof typeof charactersInfo] || charactersInfo.rabbit;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Skip old characterResponses - using AI instead
    /*const characterResponses = {
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
        "오늘 하��도 정말 수고하셨어요 🌙",
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
    };*/
    
    // Ensure we have a valid chat room ID
    if (!chatRoomId) {
      return c.json({ error: "Chat room ID is required" }, 400);
    }
    
    console.log(`Saving message to room: ${chatRoomId}, character: ${characterId}`);
    
    // Get existing chatroom first to retrieve conversation history
    const roomKey = `chatroom:${userId}:${chatRoomId}`;
    const existingRoom = await kv.get(roomKey);
    
    if (!existingRoom) {
      console.error(`Chatroom not found: ${chatRoomId}`);
      return c.json({ error: "Chat room not found" }, 404);
    }
    
    // Build conversation history from existing messages
    const conversationHistory = buildConversationHistory(existingRoom.messages || []);
    
    // Generate AI response using OpenAI (with fallback to predefined responses)
    console.log(`🤖 Generating AI response for character: ${characterId}`);
    const aiResponse = await generateAIResponse(
      message,
      characterId,
      isWarning,
      conversationHistory
    );
    
    // Prepare user message data
    const userMessageData = {
      id: `${messageId}_user`,
      chatRoomId,
      userId,
      message,
      type: 'user',
      timestamp,
      emotion,
      warning: isWarning
    };
    
    // Prepare AI response data
    const aiMessageData = {
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
    };
    
    // Add messages to existing room
    const messages = existingRoom.messages || [];
    messages.push(userMessageData);
    messages.push(aiMessageData);
    
    const updatedRoom = {
      ...existingRoom,
      messages,
      lastMessage: message.length > 30 ? message.substring(0, 30) + '...' : message,
      timestamp: new Date().toISOString(),
      messageCount: (existingRoom.messageCount || 0) + 1
    };
    
    // Remove isNewRoom flag once a message is sent
    if (existingRoom.isNewRoom) {
      delete updatedRoom.isNewRoom;
      console.log(`Removed isNewRoom flag for room: ${chatRoomId}`);
    }
    
    await kv.set(roomKey, updatedRoom);
    console.log(`✅ Saved messages to chatroom: ${chatRoomId}, total messages: ${messages.length}`);
    
    // Also save to user's general chat history for legacy compatibility
    const legacyUserKey = `chat:${userId}:${characterId}:${timestamp}:user`;
    await kv.set(legacyUserKey, {
      userId,
      characterId,
      message,
      emotion,
      timestamp,
      type: 'user',
      chatRoomId,
      warning: isWarning
    });
    
    const legacyAiKey = `chat:${userId}:${characterId}:${timestamp}:ai`;
    await kv.set(legacyAiKey, {
      userId,
      characterId,
      message: aiResponse,
      timestamp: new Date().toISOString(),
      type: 'ai',
      chatRoomId,
      warning: isWarning
    });
    
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
app.get("/make-server-58f75568/chat/history", async (c) => {
  const startTime = Date.now();
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const chatRoomId = c.req.query('chatRoomId');
    if (!chatRoomId) {
      return c.json({ error: "Chat room ID is required" }, 400);
    }
    
    console.log(`Loading chat history for room: ${chatRoomId}`);
    
    // Get messages from chatroom
    const roomKey = `chatroom:${userId}:${chatRoomId}`;
    const roomInfo = await kv.get(roomKey);
    
    let allMessages = [];
    
    if (roomInfo?.messages && roomInfo.messages.length > 0) {
      // Use messages from chatroom
      allMessages = roomInfo.messages;
      console.log(`Found ${allMessages.length} messages in chatroom`);
    }
    
    // Only check for legacy messages if no new messages found and room exists
    // AND the room is not a newly created room (to avoid showing old messages in new rooms)
    if (allMessages.length === 0) {
      try {
        if (roomInfo?.initialCharacterId && !roomInfo.isNewRoom) {
          console.log(`Room is not marked as new, checking for legacy messages...`);
          
          // Get legacy messages for specific character only
          const legacyPrefix = `chat:${userId}:${roomInfo.initialCharacterId}:`;
          const legacyMessages = await kv.getByPrefix(legacyPrefix);
          
          if (legacyMessages.length > 0) {
            console.log(`Migrating ${legacyMessages.length} legacy messages for existing room`);
            // Convert legacy messages to new format
            allMessages = legacyMessages.map(msg => ({
              ...msg,
              id: msg.id || `legacy-${msg.timestamp}-${msg.type}`,
              chatRoomId: chatRoomId,
              characterName: msg.characterId === 'fox' ? '여우' : 
                           msg.characterId === 'rabbit' ? '토끼' : 
                           msg.characterId === 'dog' ? '강아지' : '캐릭터',
              characterEmoji: msg.characterId === 'fox' ? '🦊' : 
                             msg.characterId === 'rabbit' ? '🐰' : 
                             msg.characterId === 'dog' ? '🐕' : '🤖'
            }));
          }
        } else if (roomInfo?.isNewRoom) {
          console.log(`Room is marked as new, no messages yet`);
        }
      } catch (legacyError) {
        console.log(`Legacy migration error: ${legacyError}`);
        // Continue with empty messages if legacy migration fails
      }
    } else if (!roomInfo) {
      console.log(`Chatroom not found: ${chatRoomId}`);
    }
    
    // Sort by timestamp
    const sortedMessages = allMessages
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-50); // Get last 50 messages
    
    const processingTime = Date.now() - startTime;
    console.log(`Returning ${sortedMessages.length} sorted messages (processed in ${processingTime}ms)`);
    
    return c.json({ messages: sortedMessages });
  } catch (error) {
    console.log(`Chat history error: ${error}`);
    return c.json({ error: "Failed to get chat history" }, 500);
  }
});

// Get recent chats for character selection
app.get("/make-server-58f75568/chat/recent", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
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
app.post("/make-server-58f75568/diary/save", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
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

// Delete diary entry
app.delete("/make-server-58f75568/diary/delete", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { date } = await c.req.json();
    const diaryKey = `diary:${userId}:${date}`;
    
    await kv.del(diaryKey);
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Diary delete error: ${error}`);
    return c.json({ error: "Failed to delete diary" }, 500);
  }
});

// Get today's diary entry
app.get("/make-server-58f75568/diary/today", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
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
app.get("/make-server-58f75568/diary/character-messages", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const date = c.req.query('date');
    if (!date) {
      return c.json({ error: "Date is required" }, 400);
    }
    
    // Get today's chat messages more efficiently
    console.log(`Getting character messages for date: ${date}`);
    
    // Try to get messages from all possible chat rooms for today
    const roomsPrefix = `chatroom:${userId}:`;
    const userRooms = await kv.getByPrefix(roomsPrefix);
    
    let todayMessages = [];
    let charactersToday = new Set();
    
    // Check each chat room for today's messages
    for (const room of userRooms) {
      try {
        const roomMessages = room.messages || [];
        const roomTodayMessages = roomMessages.filter(msg => {
          const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
          return msgDate === date && msg.type === 'ai' && msg.characterId;
        });
        
        todayMessages.push(...roomTodayMessages);
        roomTodayMessages.forEach(msg => {
          if (msg.characterId) {
            charactersToday.add(msg.characterId);
          }
        });
      } catch (roomError) {
        console.log(`Error processing room ${room.id}: ${roomError}`);
      }
    }
    
    console.log(`Found ${todayMessages.length} messages from ${charactersToday.size} characters`);
    const charactersArray = Array.from(charactersToday);
    
    // Generate messages from characters
    const characterMessages = charactersArray.map(characterId => {
      const characterEmojis = {
        fox: '🦊',
        rabbit: '🐰',
        dog: '🐕'
      };
      
      const characterMessagesByType = {
        fox: [
          "오늘도 정말 수고했어! 너의 노력이 ���나고 있어! ✨",
          "힘든 순간도 있었지만 잘 견뎌냈네! 정말 대단해!",
          "오늘 하루도 성장하는 너의 모습이 멋져!",
          "내일은 오늘보다 더 좋은 일들이 기다리고 있을 거야!"
        ],
        rabbit: [
          "오늘 하루도 정말 수고하셨어요 💕 충분히 잘하고 계세요",
          "힘든 시간도 있었지만, 그런 마음을 나눠주셔서 고마워요",
          "오늘도 자신을 아끼며 따뜻하게 보내시길 바라요",
          "언제든 힘들면 저���게 말해주세요. 항상 들어드릴게요"
        ],
        dog: [
          "오늘 하루를 차근차근 잘 보내셨네요. 체계적으로 잘 관리하고 계십니다",
          "상황을 객관적으로 바라보며 현명하게 대처하셨어요",
          "오늘의 경험들이 내일을 위한 좋은 밑거름이 될 것입니다",
          "꾸준히 자신을 돌보는 모습이 인상적입니다"
        ]
      };
      
      const messages = characterMessagesByType[characterId as keyof typeof characterMessagesByType] || [];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      return {
        characterId,
        emoji: characterEmojis[characterId as keyof typeof characterEmojis] || '🤖',
        message: randomMessage || "오늘도 함께해서 즐거웠어요!"
      };
    });
    
    return c.json({ messages: characterMessages });
  } catch (error) {
    console.log(`Get character messages error: ${error}`);
    return c.json({ error: "Failed to get character messages" }, 500);
  }
});

// Generate diary draft from today's chat using AI
app.get("/make-server-58f75568/diary/generate", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const dateParam = c.req.query('date');
    const targetDate = dateParam || new Date().toISOString().split('T')[0];
    console.log(`Generating diary draft for user: ${userId}, date: ${targetDate}`);
    
    // Get user's chat rooms and check for messages on the target date
    const roomsPrefix = `chatroom:${userId}:`;
    const userRooms = await kv.getByPrefix(roomsPrefix);
    
    let todayUserMessages = [];
    
    // Check each chat room for target date's user messages
    for (const room of userRooms.slice(0, 5)) { // Limit to first 5 rooms for performance
      try {
        const roomMessages = room.messages || [];
        const roomTodayMessages = roomMessages.filter(msg => {
          const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
          return msgDate === targetDate && msg.type === 'user';
        });
        
        todayUserMessages.push(...roomTodayMessages);
      } catch (roomError) {
        console.log(`Error processing room for draft generation: ${roomError}`);
      }
    }
    
    console.log(`Found ${todayUserMessages.length} user messages for date: ${targetDate}`);
    
    // Generate diary draft using AI
    const diaryDraft = await generateDiaryDraft(todayUserMessages);
    
    return c.json(diaryDraft);
  } catch (error) {
    console.log(`Diary generate error: ${error}`);
    return c.json({ error: "Failed to generate diary" }, 500);
  }
});

// Get emotion report data
app.get("/make-server-58f75568/report/emotion", async (c) => {
  try {
    console.log('Getting emotion report, checking auth...');
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      console.log('Authentication failed for emotion report request');
      return c.json({ error: "Unauthorized - Invalid or expired token" }, 401);
    }
    
    const period = c.req.query('period') || 'week'; // week or month
    console.log(`Loading emotion report for user: ${userId}, period: ${period}`);
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
    
    console.log(`Emotion report generated for user ${userId}: ${filteredEntries.length} entries, ${customEmotions.length} custom emotions`);
    
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

// Generate AI emotion insight based on diary entries
app.get("/make-server-58f75568/report/insight", async (c) => {
  try {
    console.log('Generating emotion insight, checking auth...');
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      console.log('Authentication failed for insight generation request');
      return c.json({ error: "Unauthorized - Invalid or expired token" }, 401);
    }
    
    const period = c.req.query('period') || 'week'; // week or month
    console.log(`Generating emotion insight for user: ${userId}, period: ${period}`);
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
    
    // Count emotions
    const emotionCounts: Record<string, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
    };
    
    filteredEntries.forEach(entry => {
      if (entry.emotion && emotionCounts.hasOwnProperty(entry.emotion)) {
        emotionCounts[entry.emotion]++;
      }
    });
    
    console.log(`Found ${filteredEntries.length} diary entries for insight generation`);
    
    // Generate AI insight
    const insight = await generateEmotionInsight(
      filteredEntries,
      period as 'week' | 'month',
      emotionCounts
    );
    
    return c.json({ insight });
  } catch (error) {
    console.log(`Emotion insight generation error: ${error}`);
    return c.json({ error: "Failed to generate emotion insight" }, 500);
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
app.get("/make-server-58f75568/report/monthly", async (c) => {
  try {
    console.log('Getting monthly emotions, checking auth...');
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      console.log('Authentication failed for monthly emotions request');
      return c.json({ error: "Unauthorized - Invalid or expired token" }, 401);
    }
    
    const year = parseInt(c.req.query('year') || '');
    const month = parseInt(c.req.query('month') || '');
    
    console.log(`Loading monthly emotions for user: ${userId}, year: ${year}, month: ${month}`);
    
    if (!year || !month) {
      console.log('Invalid year or month parameters');
      return c.json({ error: "Year and month are required" }, 400);
    }
    
    const diaryPrefix = `diary:${userId}:`;
    const diaryEntries = await kv.getByPrefix(diaryPrefix);
    
    console.log(`Found ${diaryEntries.length} total diary entries for user ${userId}`);
    
    // Filter entries for the specific month
    const monthlyEntries = diaryEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === month;
    });
    
    console.log(`Found ${monthlyEntries.length} entries for ${year}-${month}`);
    
    // Create emotion data for each day with mission info
    const emotionsWithMissions = await Promise.all(monthlyEntries.map(async (entry) => {
      // Get mission status for this date
      const missionKey = `mission:${userId}:${entry.date}`;
      const missionStatus = await kv.get(missionKey);
      
      // Get mission title from predefined missions
      let missionTitle = null;
      if (missionStatus?.missionId) {
        const missions = {
          '1': '자신에게 친절한 말 건네기',
          '2': '5분 심호흡 명상하기',
          '3': '감정 일기 쓰기',
          '4': '감사 인사 전하기',
          '5': '오늘 하루 되돌아보기'
        };
        missionTitle = missions[missionStatus.missionId] || null;
      }
      
      return {
        date: entry.date,
        emotion: entry.emotion || 'neutral',
        diary: entry.content,
        title: entry.title,
        compliment: entry.compliment,
        regrets: entry.regrets,
        missionTitle: missionTitle,
        missionCompleted: missionStatus?.completed || false
      };
    }));
    
    console.log(`Returning ${emotionsWithMissions.length} emotion records for monthly calendar`);
    return c.json({ emotions: emotionsWithMissions });
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
app.put("/make-server-58f75568/emotions/:id", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
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
앞으��도 BreezI와 함께 건강한 마음 관리 하세요. 💜

- BreezI 팀 드림
    `;
    
    // In a real application, you would integrate with an email service like SendGrid, AWS SES, etc.
    console.log(`Sending email to ${email}:`);
    console.log(emailContent);
    
    // Simulate email sending delay
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

// Get recommended emotion keywords based on user's chat/diary patterns
app.get("/make-server-58f75568/emotion-care/recommended-keywords", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Get user's recent chats and diary entries to find common emotional patterns
    console.log(`Getting recommended keywords for user: ${userId}`);
    
    // Limit to recent data for performance
    const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    
    // Get diary entries (smaller dataset)
    const diaryPrefix = `diary:${userId}:`;
    const diaryEntries = await kv.getByPrefix(diaryPrefix);
    
    // Get recent chat messages from user's rooms (more limited approach)
    const roomsPrefix = `chatroom:${userId}:`;
    const userRooms = await kv.getByPrefix(roomsPrefix);
    
    let recentChatMessages = [];
    
    // Limit to first 3 rooms for performance
    for (const room of userRooms.slice(0, 3)) {
      try {
        const roomMessages = room.messages || [];
        const recentMessages = roomMessages.filter(msg => {
          const msgDate = new Date(msg.timestamp);
          return msgDate >= recentDate && msg.type === 'user';
        });
        recentChatMessages.push(...recentMessages);
      } catch (roomError) {
        console.log(`Error processing room ${room.id} for keywords: ${roomError}`);
      }
    }
    
    console.log(`Analyzing ${recentChatMessages.length} chat messages and ${diaryEntries.length} diary entries`);
    
    // Analyze text for emotion-related keywords
    const emotionKeywords = ['불안', '슬픔', '분노', '외로움', '피로', '무기력', '기쁨', '행복', '희망'];
    const keywordCounts: Record<string, number> = {};
    
    // Count emotion words in recent chat messages
    recentChatMessages.forEach(message => {
      emotionKeywords.forEach(keyword => {
        if (message.message && message.message.includes(keyword)) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        }
      });
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
app.get("/make-server-58f75568/emotion-care/today-mission", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
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
        description: '거울을 보며 자신에게 "오늘도 수고했어"라고 말해보세요. 자신을 향한 따뜻한 마음이 슬픔�� 달래줄 거예요.',
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
app.post("/make-server-58f75568/emotion-care/content", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
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
        content.breathingExercise = "화가 날 때는 깊고 천천히 숨쉬기: 코로 5초간 깊게 들이마시고, 입���로 5초간 천천히 내쉬세요. 10회 반복하며 마음을 진정시켜보세요.";
      } else {
        content.breathingExercise = "복식호흡법: 배에 손을 올리고 코로 천천히 숨을 들이마셔 배가 부풀어 오르게 하고, 입으로 천천히 내쉬며 배가 들어가게 하세요.";
      }
    } else {
      content.breathingExercise = "���쁨 유지 호흡법: 편안하게 앉아 자연스럽게 숨쉬며, 들이마실 때마다 '감사함'을, 내쉴 때마다 '행복함'을 느껴보세요.";
    }
    
    // Tips based on emotions
    content.tips = [];
    if (keywords.includes('불안')) {
      content.tips.push("불안할 때는 지금 이 순간에 집중해보세요. 주변의 소리, 냄새, 촉감을 느껴보세요.");
      content.tips.push("불안한 생각이 들면 '이것은 생각일 뿐이야'라고 스스로에게 말해보세요.");
    }
    if (keywords.includes('슬픔')) {
      content.tips.push("슬플 때는 눈물을 참지 마세요. 감정을 충분히 느끼는 것도 중요합니다.");
      content.tips.push("따뜻한 차를 마시거나 좋아하는 음악을 ���으며 마음을 달래보세요.");
    }
    if (keywords.includes('분노')) {
      content.tips.push("화가 날 때는 즉시 반응하지 말고 10까지 세어보세요.");
      content.tips.push("운동이나 물리적 활동으로 분노 에너지를 건설적으로 표출해보세요.");
    }
    if (keywords.includes('외로움')) {
      content.tips.push("친구나 가족에게 안부 인사를 보내보세요. 작은 연결도 외로움을 달래줍니다.");
      content.tips.push("반려동물이�� 식물을 돌보��� 것도 외로움을 줄이는 좋은 방법입니다.");
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
        title: '화를 다스리는 명���',
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

// Save mission completion
app.post("/make-server-58f75568/diary/mission-complete", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { date, missionId, completed } = await c.req.json();
    
    if (!date || !missionId) {
      return c.json({ error: "Date and missionId are required" }, 400);
    }
    
    const missionKey = `mission:${userId}:${date}`;
    await kv.set(missionKey, {
      userId,
      date,
      missionId,
      completed: completed !== undefined ? completed : true,
      completedAt: new Date().toISOString()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Mission completion error: ${error}`);
    return c.json({ error: "Failed to save mission completion" }, 500);
  }
});

// Get mission completion status
app.get("/make-server-58f75568/diary/mission-status", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const date = c.req.query('date');
    if (!date) {
      return c.json({ error: "Date is required" }, 400);
    }
    
    const missionKey = `mission:${userId}:${date}`;
    const missionStatus = await kv.get(missionKey);
    
    return c.json({ 
      completed: missionStatus?.completed || false,
      missionId: missionStatus?.missionId || null
    });
  } catch (error) {
    console.log(`Get mission status error: ${error}`);
    return c.json({ error: "Failed to get mission status" }, 500);
  }
});

// Create community post
app.post("/make-server-58f75568/community/posts/create", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Check if user is suspended or banned
    const profile = await kv.get(`profile:${userId}`);
    if (!profile) {
      return c.json({ error: "프로필을 찾을 수 없습니다" }, 404);
    }
    
    if (profile.status === 'suspended') {
      return c.json({ error: "계정이 정지되어 게시글을 작성할 수 없습니다" }, 403);
    }
    
    if (profile.status === 'banned') {
      return c.json({ error: "차단된 계정입니다" }, 403);
    }
    
    const { title, content } = await c.req.json();
    
    if (!title?.trim() || !content?.trim()) {
      return c.json({ error: "제목과 내용을 모두 입력해주세요" }, 400);
    }
    
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const postKey = `communitypost:${postId}`;
    
    // Get user profile for nickname
    const nickname = profile?.nickname || '사용자';
    
    // Get IP address from headers
    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';
    
    const postData = {
      id: postId,
      userId,
      title: title.trim(),
      content: content.trim(),
      nickname,
      likes: 0,
      commentCount: 0,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorIp: ipAddress  // Store author IP
    };
    
    await kv.set(postKey, postData);
    
    // Log activity
    await logActivity(userId, 'create_post', { postId, title: title.trim() }, c.req.header('x-forwarded-for') || 'unknown');
    
    // Generate AI comment asynchronously (don't wait for it)
    (async () => {
      try {
        console.log(`Triggering AI comment generation for post ${postId}`);
        
        let commentContent: string;
        try {
          commentContent = await generateAIComment({
            title: title.trim(),
            content: content.trim(),
            nickname
          });
        } catch (aiError) {
          console.error('AI comment generation failed, using fallback:', aiError);
          commentContent = getFallbackComment({
            title: title.trim(),
            content: content.trim(),
            nickname
          });
        }
        
        const commentId = `comment_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const commentKey = `postcomment:${postId}:${commentId}`;
        
        const commentData = {
          id: commentId,
          postId,
          userId: 'ai_breezi_bot',
          content: commentContent,
          nickname: 'BreezI 봇 🤖',
          createdAt: new Date().toISOString(),
          isAI: true
        };
        
        await kv.set(commentKey, commentData);
        
        // Update comment count on post
        const updatedPost = await kv.get(postKey);
        if (updatedPost) {
          updatedPost.commentCount = (updatedPost.commentCount || 0) + 1;
          await kv.set(postKey, updatedPost);
        }
        
        console.log(`AI comment successfully added to post ${postId}`);
      } catch (error) {
        console.error(`Failed to add AI comment to post ${postId}:`, error);
      }
    })();
    
    return c.json({ success: true, postId });
  } catch (error) {
    console.log(`Create post error: ${error}`);
    return c.json({ error: "Failed to create post" }, 500);
  }
});

// Delete community post
app.delete("/make-server-58f75568/community/posts/:postId", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const postId = c.req.param('postId');
    const postKey = `communitypost:${postId}`;
    
    // Get post to check ownership
    const post = await kv.get(postKey);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }
    
    // Get user profile to check if admin
    const profile = await kv.get(`profile:${userId}`);
    const isAdmin = profile?.email === 'khb1620@naver.com';
    
    // Check if user owns this post or is admin
    if (post.userId !== userId && !isAdmin) {
      return c.json({ error: "Unauthorized - You can only delete your own posts" }, 403);
    }
    
    // Delete the post
    await kv.del(postKey);
    
    // Delete all comments for this post
    const commentsPrefix = `postcomment:${postId}:`;
    const comments = await kv.getByPrefix(commentsPrefix);
    for (const comment of comments) {
      const commentKey = `postcomment:${postId}:${comment.id}`;
      await kv.del(commentKey);
    }
    
    // Delete all likes for this post
    const likesPrefix = `postlike:${postId}:`;
    const likes = await kv.getByPrefix(likesPrefix);
    for (const like of likes) {
      await kv.del(`postlike:${postId}:${like.userId}`);
    }
    
    // Delete all keeps for this post
    const keepsPattern = `postkeep:`;
    const allKeeps = await kv.getByPrefix(keepsPattern);
    for (const keep of allKeeps) {
      if (keep.postId === postId) {
        await kv.del(`postkeep:${keep.userId}:${postId}`);
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Create community post error: ${error}`);
    return c.json({ error: "Failed to create post" }, 500);
  }
});

// Increase view count for a post
app.post("/make-server-58f75568/community/posts/:postId/view", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const postId = c.req.param('postId');
    const postKey = `communitypost:${postId}`;
    
    // Get post
    const post = await kv.get(postKey);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }
    
    // Increase view count
    post.viewCount = (post.viewCount || 0) + 1;
    await kv.set(postKey, post);
    
    console.log(`View count increased for post ${postId}: ${post.viewCount}`);
    return c.json({ success: true, viewCount: post.viewCount });
  } catch (error) {
    console.log(`Increase view count error: ${error}`);
    return c.json({ error: "Failed to increase view count" }, 500);
  }
});

// Get community posts
app.get("/make-server-58f75568/community/posts", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const sort = c.req.query('sort') || 'recent'; // recent, popular
    const search = c.req.query('search') || '';
    
    const postsPrefix = `communitypost:`;
    const posts = await kv.getByPrefix(postsPrefix);
    
    // Add email to posts
    const postsWithEmail = await Promise.all(posts.map(async (post) => {
      const profile = await kv.get(`profile:${post.userId}`);
      return {
        ...post,
        email: profile?.email || null
      };
    }));
    
    // Filter by search
    let filteredPosts = postsWithEmail;
    if (search.trim()) {
      filteredPosts = postsWithEmail.filter(post => 
        post.title.includes(search) || post.content.includes(search)
      );
    }
    
    // Sort posts
    const sortedPosts = filteredPosts.sort((a, b) => {
      if (sort === 'popular') {
        // 인기순: 조회수 > 하트수 > 댓글수
        const viewDiff = (b.viewCount || 0) - (a.viewCount || 0);
        if (viewDiff !== 0) return viewDiff;
        
        const likesDiff = (b.likes || 0) - (a.likes || 0);
        if (likesDiff !== 0) return likesDiff;
        
        return (b.commentCount || 0) - (a.commentCount || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return c.json({ posts: sortedPosts });
  } catch (error) {
    console.log(`Get community posts error: ${error}`);
    return c.json({ error: "Failed to get posts" }, 500);
  }
});

// Get single community post
app.get("/make-server-58f75568/community/posts/:postId", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const postId = c.req.param('postId');
    console.log(`Getting post with ID: ${postId}`);
    const postKey = `communitypost:${postId}`;
    const post = await kv.get(postKey);
    
    console.log(`Post found:`, post ? 'yes' : 'no');
    
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }
    
    // Add email to post
    const profile = await kv.get(`profile:${post.userId}`);
    const postWithEmail = {
      ...post,
      email: profile?.email || null
    };
    
    return c.json({ post: postWithEmail });
  } catch (error) {
    console.log(`Get community post error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to get post" }, 500);
  }
});

// Like community post
app.post("/make-server-58f75568/community/posts/:postId/like", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const postId = c.req.param('postId');
    const likeKey = `postlike:${postId}:${userId}`;
    const postKey = `communitypost:${postId}`;
    
    // Check if already liked
    const existingLike = await kv.get(likeKey);
    const post = await kv.get(postKey);
    
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }
    
    if (existingLike) {
      // Unlike
      await kv.del(likeKey);
      post.likes = Math.max(0, (post.likes || 0) - 1);
      await kv.set(postKey, post);
      return c.json({ liked: false, likes: post.likes });
    } else {
      // Like
      await kv.set(likeKey, {
        userId,
        postId,
        createdAt: new Date().toISOString()
      });
      post.likes = (post.likes || 0) + 1;
      await kv.set(postKey, post);
      return c.json({ liked: true, likes: post.likes });
    }
  } catch (error) {
    console.log(`Like post error: ${error}`);
    return c.json({ error: "Failed to like post" }, 500);
  }
});

// Check if post is liked
app.get("/make-server-58f75568/community/posts/:postId/liked", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const postId = c.req.param('postId');
    const likeKey = `postlike:${postId}:${userId}`;
    const existingLike = await kv.get(likeKey);
    
    return c.json({ liked: !!existingLike });
  } catch (error) {
    console.log(`Check liked error: ${error}`);
    return c.json({ error: "Failed to check like status" }, 500);
  }
});

// Keep (save) community post
app.post("/make-server-58f75568/community/posts/:postId/keep", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const postId = c.req.param('postId');
    const keepKey = `postkeep:${userId}:${postId}`;
    
    // Check if already kept
    const existingKeep = await kv.get(keepKey);
    
    if (existingKeep) {
      // Remove from keeps
      await kv.del(keepKey);
      return c.json({ kept: false });
    } else {
      // Add to keeps
      await kv.set(keepKey, {
        userId,
        postId,
        createdAt: new Date().toISOString()
      });
      return c.json({ kept: true });
    }
  } catch (error) {
    console.log(`Keep post error: ${error}`);
    return c.json({ error: "Failed to keep post" }, 500);
  }
});

// Check if post is kept
app.get("/make-server-58f75568/community/posts/:postId/kept", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const postId = c.req.param('postId');
    const keepKey = `postkeep:${userId}:${postId}`;
    const existingKeep = await kv.get(keepKey);
    
    return c.json({ kept: !!existingKeep });
  } catch (error) {
    console.log(`Check kept error: ${error}`);
    return c.json({ error: "Failed to check keep status" }, 500);
  }
});

// Get kept posts
app.get("/make-server-58f75568/community/kept-posts", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const keepPrefix = `postkeep:${userId}:`;
    const keeps = await kv.getByPrefix(keepPrefix);
    
    // Get post details for each kept post
    const keptPosts = [];
    for (const keep of keeps) {
      const postKey = `communitypost:${keep.postId}`;
      const post = await kv.get(postKey);
      if (post) {
        // Add email to post
        const profile = await kv.get(`profile:${post.userId}`);
        keptPosts.push({
          ...post,
          email: profile?.email || null
        });
      }
    }
    
    // Sort by keep date (most recent first)
    keptPosts.sort((a, b) => {
      const keepA = keeps.find(k => k.postId === a.id);
      const keepB = keeps.find(k => k.postId === b.id);
      return new Date(keepB?.createdAt || 0).getTime() - new Date(keepA?.createdAt || 0).getTime();
    });
    
    return c.json({ posts: keptPosts });
  } catch (error) {
    console.log(`Get kept posts error: ${error}`);
    return c.json({ error: "Failed to get kept posts" }, 500);
  }
});

// Get my posts
app.get("/make-server-58f75568/community/my-posts", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const sort = c.req.query('sort') || 'recent'; // recent, popular
    const postPrefix = 'communitypost:';
    const allPosts = await kv.getByPrefix(postPrefix);
    
    // Filter posts by userId
    const myPosts = allPosts.filter(post => post.userId === userId);
    
    // Add email to posts
    const profile = await kv.get(`profile:${userId}`);
    const myPostsWithEmail = myPosts.map(post => ({
      ...post,
      email: profile?.email || null
    }));
    
    // Sort posts
    if (sort === 'popular') {
      myPostsWithEmail.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
      myPostsWithEmail.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    return c.json({ posts: myPostsWithEmail });
  } catch (error) {
    console.log(`Get my posts error: ${error}`);
    return c.json({ error: "Failed to get my posts" }, 500);
  }
});

// Add comment to post
app.post("/make-server-58f75568/community/posts/:postId/comments", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Check if user is suspended or banned
    const profile = await kv.get(`profile:${userId}`);
    if (!profile) {
      return c.json({ error: "프로필을 찾을 수 없습니다" }, 404);
    }
    
    if (profile.status === 'suspended') {
      return c.json({ error: "계정이 정지되어 댓글을 작성할 수 없습���다" }, 403);
    }
    
    if (profile.status === 'banned') {
      return c.json({ error: "차단된 계정입니다" }, 403);
    }
    
    const postId = c.req.param('postId');
    const { content } = await c.req.json();
    
    if (!content?.trim()) {
      return c.json({ error: "댓글 내용을 입력해주세요" }, 400);
    }
    
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const commentKey = `postcomment:${postId}:${commentId}`;
    
    // Get user profile for nickname
    const nickname = profile?.nickname || '사용���';
    
    // Get IP address from headers
    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';
    
    const commentData = {
      id: commentId,
      postId,
      userId,
      content: content.trim(),
      nickname,
      createdAt: new Date().toISOString(),
      authorIp: ipAddress  // Store author IP
    };
    
    await kv.set(commentKey, commentData);
    
    // Update comment count on post
    const postKey = `communitypost:${postId}`;
    const post = await kv.get(postKey);
    if (post) {
      post.commentCount = (post.commentCount || 0) + 1;
      await kv.set(postKey, post);
      
      // Send notification to post author (if not commenting on own post)
      if (post.userId !== userId) {
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notification = {
          id: notificationId,
          userId: post.userId,
          type: 'comment',
          title: '새 댓글',
          message: `${nickname}님이 회원님의 게시글에 댓글을 남겼습니다.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: postId,
          relatedType: 'post',
          relatedCommentId: commentId,
          commenterNickname: nickname
        };
        await kv.set(`notification:${post.userId}:${notificationId}`, notification);
        console.log(`Comment notification sent to user ${post.userId}`);
      }
    }
    
    // Log activity
    await logActivity(userId, 'create_comment', { commentId, postId }, c.req.header('x-forwarded-for') || 'unknown');
    
    return c.json({ success: true, comment: commentData });
  } catch (error) {
    console.log(`Add comment error: ${error}`);
    return c.json({ error: "Failed to add comment" }, 500);
  }
});

// Get comments for post
app.get("/make-server-58f75568/community/posts/:postId/comments", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const postId = c.req.param('postId');
    const commentsPrefix = `postcomment:${postId}:`;
    const comments = await kv.getByPrefix(commentsPrefix);
    
    // Add email to comments
    const commentsWithEmail = await Promise.all(comments.map(async (comment) => {
      const profile = await kv.get(`profile:${comment.userId}`);
      return {
        ...comment,
        email: profile?.email || null
      };
    }));
    
    // Sort by creation time (oldest first)
    const sortedComments = commentsWithEmail.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    return c.json({ comments: sortedComments });
  } catch (error) {
    console.log(`Get comments error: ${error}`);
    return c.json({ error: "Failed to get comments" }, 500);
  }
});

// Delete comment
app.delete("/make-server-58f75568/community/posts/:postId/comments/:commentId", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const postId = c.req.param('postId');
    const commentId = c.req.param('commentId');
    const commentKey = `postcomment:${postId}:${commentId}`;
    
    const comment = await kv.get(commentKey);
    if (!comment) {
      return c.json({ error: "Comment not found" }, 404);
    }
    
    // Get user profile to check if admin
    const profile = await kv.get(`profile:${userId}`);
    const isAdmin = profile?.email === 'khb1620@naver.com';
    
    // Only allow the comment author or admin to delete
    if (comment.userId !== userId && !isAdmin) {
      return c.json({ error: "Unauthorized to delete this comment" }, 403);
    }
    
    await kv.del(commentKey);
    
    // Update comment count on post
    const postKey = `communitypost:${postId}`;
    const post = await kv.get(postKey);
    if (post) {
      post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
      await kv.set(postKey, post);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete comment error: ${error}`);
    return c.json({ error: "Failed to delete comment" }, 500);
  }
});

// Generate AI comment for a post
app.post("/make-server-58f75568/community/posts/:postId/ai-comment", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const postId = c.req.param('postId');
    const postKey = `communitypost:${postId}`;
    const post = await kv.get(postKey);
    
    if (!post) {
      return c.json({ error: "게시글을 찾을 수 없습니다" }, 404);
    }
    
    // Check if AI comment already exists for this post
    const aiCommentPrefix = `postcomment:${postId}:`;
    const existingComments = await kv.getByPrefix(aiCommentPrefix);
    const aiCommentExists = existingComments.some(comment => comment.userId === 'ai_breezi_bot');
    
    if (aiCommentExists) {
      return c.json({ error: "AI 댓글이 이미 존재합니다" }, 400);
    }
    
    let commentContent: string;
    
    // Try to generate AI comment
    try {
      console.log(`Generating AI comment for post ${postId}`);
      commentContent = await generateAIComment({
        title: post.title,
        content: post.content,
        nickname: post.nickname
      });
      console.log(`AI comment generated successfully`);
    } catch (aiError) {
      console.log('⚠️ AI comment generation not available, using fallback response');
      commentContent = getFallbackComment({
        title: post.title,
        content: post.content,
        nickname: post.nickname
      });
    }
    
    // Create AI comment
    const commentId = `comment_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const commentKey = `postcomment:${postId}:${commentId}`;
    
    const commentData = {
      id: commentId,
      postId,
      userId: 'ai_breezi_bot',
      content: commentContent,
      nickname: 'BreezI 봇 🤖',
      createdAt: new Date().toISOString(),
      isAI: true
    };
    
    await kv.set(commentKey, commentData);
    
    // Update comment count on post
    post.commentCount = (post.commentCount || 0) + 1;
    await kv.set(postKey, post);
    
    console.log(`AI comment added to post ${postId}`);
    
    return c.json({ success: true, comment: commentData });
  } catch (error) {
    console.log(`Generate AI comment error: ${error}`);
    return c.json({ error: "Failed to generate AI comment" }, 500);
  }
});

// Get user profile by userId
app.get("/make-server-58f75568/community/user-profile/:userId", async (c) => {
  try {
    const requestingUserId = await verifyAuth(c.req.header('Authorization'));
    if (!requestingUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const targetUserId = c.req.param('userId');
    if (!targetUserId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    // Get profile from KV store
    const profile = await kv.get(`profile:${targetUserId}`);
    
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    // Only show nickname, not real name
    const userProfile = {
      userId: targetUserId,
      nickname: profile.nickname,
      email: profile.email || null,
      greeting: profile.greeting || '인사말이 없습니다',
      bio: profile.bio || '',
    };

    return c.json({ profile: userProfile });
  } catch (error) {
    console.log(`Get user profile error: ${error}`);
    return c.json({ error: "Failed to get user profile" }, 500);
  }
});

// Get user's posts by userId
app.get("/make-server-58f75568/community/user-posts/:userId", async (c) => {
  try {
    const requestingUserId = await verifyAuth(c.req.header('Authorization'));
    if (!requestingUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const targetUserId = c.req.param('userId');
    if (!targetUserId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    // Get all community posts
    const allPosts = await kv.getByPrefix('communitypost:');
    
    // Filter posts by the target user
    const userPosts = allPosts.filter(post => post.userId === targetUserId);

    // Sort by creation date (most recent first)
    const sortedPosts = userPosts.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return c.json({ posts: sortedPosts });
  } catch (error) {
    console.log(`Get user posts error: ${error}`);
    return c.json({ error: "Failed to get user posts" }, 500);
  }
});

// ==================== Calendar Category Endpoints ====================

// Get user's categories
app.get("/make-server-58f75568/calendar/categories", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const categoriesData = await kv.get(`calendar_categories:${userId}`);
    const categories = categoriesData || [
      { id: 'work', name: '업무', color: '#3b82f6' },
      { id: 'personal', name: '개인', color: '#10b981' },
      { id: 'health', name: '건강', color: '#f59e0b' },
      { id: 'social', name: '모임', color: '#ec4899' },
    ];

    return c.json({ categories });
  } catch (error) {
    console.log(`Get categories error: ${error}`);
    return c.json({ error: "Failed to get categories" }, 500);
  }
});

// Add a new category
app.post("/make-server-58f75568/calendar/categories", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { name, color } = await c.req.json();

    if (!name || !color) {
      return c.json({ error: "Name and color are required" }, 400);
    }

    const categoriesData = await kv.get(`calendar_categories:${userId}`);
    const categories = categoriesData || [
      { id: 'work', name: '업무', color: '#3b82f6' },
      { id: 'personal', name: '개인', color: '#10b981' },
      { id: 'health', name: '건강', color: '#f59e0b' },
      { id: 'social', name: '모임', color: '#ec4899' },
    ];

    const newCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      color,
      createdAt: new Date().toISOString(),
    };

    categories.push(newCategory);
    await kv.set(`calendar_categories:${userId}`, categories);

    return c.json({ category: newCategory });
  } catch (error) {
    console.log(`Add category error: ${error}`);
    return c.json({ error: "Failed to add category" }, 500);
  }
});

// Update a category
app.put("/make-server-58f75568/calendar/categories/:categoryId", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const categoryId = c.req.param('categoryId');
    const { name, color } = await c.req.json();

    if (!name || !color) {
      return c.json({ error: "Name and color are required" }, 400);
    }

    const categoriesData = await kv.get(`calendar_categories:${userId}`);
    const categories = categoriesData || [
      { id: 'work', name: '업��', color: '#3b82f6' },
      { id: 'personal', name: '개인', color: '#10b981' },
      { id: 'health', name: '건강', color: '#f59e0b' },
      { id: 'social', name: '모임', color: '#ec4899' },
    ];

    const categoryIndex = categories.findIndex((c: any) => c.id === categoryId);
    if (categoryIndex === -1) {
      return c.json({ error: "Category not found" }, 404);
    }

    categories[categoryIndex] = {
      ...categories[categoryIndex],
      name,
      color,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`calendar_categories:${userId}`, categories);

    return c.json({ category: categories[categoryIndex] });
  } catch (error) {
    console.log(`Update category error: ${error}`);
    return c.json({ error: "Failed to update category" }, 500);
  }
});

// Delete a category
app.delete("/make-server-58f75568/calendar/categories/:categoryId", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const categoryId = c.req.param('categoryId');

    const categoriesData = await kv.get(`calendar_categories:${userId}`);
    const categories = categoriesData || [];

    const filteredCategories = categories.filter((c: any) => c.id !== categoryId);

    if (categories.length === filteredCategories.length) {
      return c.json({ error: "Category not found" }, 404);
    }

    await kv.set(`calendar_categories:${userId}`, filteredCategories);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete category error: ${error}`);
    return c.json({ error: "Failed to delete category" }, 500);
  }
});

// ==================== Calendar Events Endpoints ====================

// Get events for a specific month
app.get("/make-server-58f75568/calendar/events", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const year = c.req.query('year');
    const month = c.req.query('month');

    if (!year || !month) {
      return c.json({ error: "Year and month are required" }, 400);
    }

    // Get all events for the user
    const allEventsData = await kv.get(`calendar_events:${userId}`);
    const allEvents = allEventsData || [];

    // Filter events for the specific month
    const monthStr = `${year}-${month.padStart(2, '0')}`;
    const monthEvents = allEvents.filter((event: any) => 
      event.date.startsWith(monthStr)
    );

    return c.json({ events: monthEvents });
  } catch (error) {
    console.log(`Get calendar events error: ${error}`);
    return c.json({ error: "Failed to get calendar events" }, 500);
  }
});

// Add a new event
app.post("/make-server-58f75568/calendar/events", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { date, title, description, type } = await c.req.json();

    if (!date || !title || !type) {
      return c.json({ error: "Date, title, and type are required" }, 400);
    }

    if (type !== 'event' && type !== 'todo') {
      return c.json({ error: "Type must be 'event' or 'todo'" }, 400);
    }

    // Get existing events
    const eventsData = await kv.get(`calendar_events:${userId}`);
    const events = eventsData || [];

    // Create new event
    const newEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date,
      title,
      description: description || '',
      type,
      completed: type === 'todo' ? false : undefined,
      createdAt: new Date().toISOString(),
    };

    events.push(newEvent);
    await kv.set(`calendar_events:${userId}`, events);

    return c.json({ event: newEvent });
  } catch (error) {
    console.log(`Add calendar event error: ${error}`);
    return c.json({ error: "Failed to add calendar event" }, 500);
  }
});

// Update an event
app.put("/make-server-58f75568/calendar/events/:eventId", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const eventId = c.req.param('eventId');
    const updates = await c.req.json();

    // Get existing events
    const eventsData = await kv.get(`calendar_events:${userId}`);
    const events = eventsData || [];

    // Find and update the event
    const eventIndex = events.findIndex((e: any) => e.id === eventId);
    if (eventIndex === -1) {
      return c.json({ error: "Event not found" }, 404);
    }

    events[eventIndex] = {
      ...events[eventIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`calendar_events:${userId}`, events);

    return c.json({ event: events[eventIndex] });
  } catch (error) {
    console.log(`Update calendar event error: ${error}`);
    return c.json({ error: "Failed to update calendar event" }, 500);
  }
});

// Delete an event
app.delete("/make-server-58f75568/calendar/events/:eventId", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const eventId = c.req.param('eventId');

    // Get existing events
    const eventsData = await kv.get(`calendar_events:${userId}`);
    const events = eventsData || [];

    // Filter out the event to delete
    const filteredEvents = events.filter((e: any) => e.id !== eventId);

    if (events.length === filteredEvents.length) {
      return c.json({ error: "Event not found" }, 404);
    }

    await kv.set(`calendar_events:${userId}`, filteredEvents);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete calendar event error: ${error}`);
    return c.json({ error: "Failed to delete calendar event" }, 500);
  }
});

// Submit feedback
app.post("/make-server-58f75568/feedback/submit", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { content } = await c.req.json();

    if (!content || !content.trim()) {
      return c.json({ error: "Feedback content is required" }, 400);
    }

    // Get user email from Supabase Auth
    let userEmail = 'Unknown';
    try {
      const { data: { user } } = await supabase.auth.getUser(c.req.header('Authorization')?.split(' ')[1]);
      userEmail = user?.email || 'Unknown';
    } catch (authError) {
      console.log('Failed to get user email from auth:', authError);
    }

    // Get user profile for nickname
    const profile = await kv.get(`profile:${userId}`);
    const userNickname = profile?.nickname || 'Unknown';

    // Get existing feedback list
    const feedbackData = await kv.get(`feedback:${userId}`);
    const feedbackList = feedbackData || [];

    // Create new feedback entry
    const newFeedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userNickname,
      userEmail,
      message: content.trim(),
      timestamp: new Date().toISOString(),
      isRead: false, // 관리자 읽음 여부
    };

    feedbackList.push(newFeedback);
    await kv.set(`feedback:${userId}`, feedbackList);

    // Also store in global feedback list for admin review
    const globalFeedbackData = await kv.get('global_feedback_list');
    const globalFeedback = globalFeedbackData || [];
    globalFeedback.push(newFeedback);
    await kv.set('global_feedback_list', globalFeedback);

    console.log(`Feedback submitted by user ${userId} (${userNickname}, ${userEmail})`);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Submit feedback error: ${error}`);
    return c.json({ error: "Failed to submit feedback" }, 500);
  }
});

// Delete user account
app.delete("/make-server-58f75568/user/delete", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get deletion reason from request body
    let reason = 'Not specified';
    try {
      const body = await c.req.json();
      reason = body.reason || 'Not specified';
    } catch (e) {
      // Body might be empty, use default
    }

    console.log(`Deleting user account: ${userId}, reason: ${reason}`);

    // Get user profile and email before deletion for record keeping
    const profile = await kv.get(`profile:${userId}`);
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    const userEmail = user?.email || 'unknown';
    const warningCount = profile?.warningCount || 0;
    const suspensionHistory = profile?.suspensionHistory || [];
    
    // Calculate age group from birthDate
    let ageGroup = '미등록';
    if (profile?.birthDate) {
      try {
        const birthYear = parseInt(profile.birthDate.split('-')[0]);
        if (!isNaN(birthYear)) {
          const currentYear = new Date().getFullYear();
          const age = currentYear - birthYear;
          
          if (age < 20) ageGroup = '10대';
          else if (age < 30) ageGroup = '20대';
          else if (age < 40) ageGroup = '30대';
          else if (age < 50) ageGroup = '40대';
          else ageGroup = '50대 이상';
          
          console.log(`User ${userId}: age=${age}, ageGroup=${ageGroup}`);
        }
      } catch (error) {
        console.log('Error calculating age group:', error);
      }
    }

    // Count reports as reporter and as target
    const allReports = await kv.getByPrefix(`report:`);
    let reportedCount = 0;
    let reporterCount = 0;
    const reportHistory: any[] = [];
    
    for (const report of allReports) {
      if (report?.targetUserId === userId) {
        reportedCount++;
        // Save report details for verification purposes
        reportHistory.push({
          id: report.id,
          reporterId: report.reporterId,
          reporterNickname: report.reporterNickname,
          targetType: report.targetType,
          targetId: report.targetId,
          reason: report.reason,
          status: report.status,
          action: report.action,
          createdAt: report.createdAt,
          processedAt: report.processedAt,
          savedContent: report.savedContent,
        });
      }
      if (report?.reporterId === userId) {
        reporterCount++;
      }
    }

    // Store deletion reason and violation history for analytics and abuse prevention
    const deletionRecord = {
      userId,
      email: userEmail, // Store email to prevent abuse from repeat offenders
      reason,
      ageGroup,
      warningCount,
      suspensionHistory,
      reportedCount,
      reporterCount,
      reportHistory, // Save detailed report history
      deletedAt: new Date().toISOString(),
    };
    
    const deletionData = await kv.get('user_deletions');
    const deletions = deletionData || [];
    deletions.push(deletionRecord);
    await kv.set('user_deletions', deletions);
    
    // Store deleted user record separately for easy lookup by email
    await kv.set(`deleted_user:${userEmail}`, deletionRecord);

    // Delete all user data
    // Profile
    await kv.del(`profile:${userId}`);
    
    // Chat rooms - messages are now stored inside chatroom
    const chatRooms = await kv.getByPrefix(`chatroom:${userId}:`);
    for (const room of chatRooms) {
      if (room?.id) {
        // Delete the chat room (messages are inside)
        await kv.del(`chatroom:${userId}:${room.id}`);
      }
    }
    
    // Legacy chat messages (if any)
    const legacyChats = await kv.getByPrefix(`chat:${userId}:`);
    for (const chat of legacyChats) {
      if (chat?.timestamp && chat?.characterId && chat?.type) {
        await kv.del(`chat:${userId}:${chat.characterId}:${chat.timestamp}:${chat.type}`);
      }
    }
    
    // Legacy chatrooms structure (if any)
    await kv.del(`chatrooms:${userId}`);
    
    // Diary entries - getByPrefix returns values only, reconstruct keys
    const diaryEntries = await kv.getByPrefix(`diary:${userId}:`);
    for (const entry of diaryEntries) {
      if (entry?.date) {
        await kv.del(`diary:${userId}:${entry.date}`);
      }
    }
    
    // Emotions - getByPrefix returns values only, reconstruct keys
    const emotionEntries = await kv.getByPrefix(`emotion:${userId}:`);
    for (const entry of emotionEntries) {
      if (entry?.date) {
        await kv.del(`emotion:${userId}:${entry.date}`);
      }
    }
    
    // Calendar events
    await kv.del(`calendar_events:${userId}`);
    await kv.del(`calendar_categories:${userId}`);
    
    // Community posts - Delete user's own posts (getByPrefix returns values only)
    const userPosts = await kv.getByPrefix(`communitypost:`);
    for (const post of userPosts) {
      if (post?.userId === userId && post?.id) {
        // Delete comments for this post
        const commentsKey = `community:comments:${post.id}`;
        await kv.del(commentsKey);
        // Delete the post
        await kv.del(`communitypost:${post.id}`);
      }
    }
    
    // Community comments - Delete all user's comments (완전 삭제)
    const allComments = await kv.getByPrefix(`postcomment:`);
    let deletedCommentsCount = 0;
    for (const comment of allComments) {
      if (comment?.userId === userId && comment?.id && comment?.postId) {
        await kv.del(`postcomment:${comment.postId}:${comment.id}`);
        deletedCommentsCount++;
        
        // Update comment count on the post
        const postKey = `communitypost:${comment.postId}`;
        const post = await kv.get(postKey);
        if (post) {
          post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
          await kv.set(postKey, post);
        }
      }
    }
    console.log(`Deleted ${deletedCommentsCount} comments for user ${userId}`);
    
    // Community likes and keeps
    await kv.del(`community:likes:${userId}`);
    await kv.del(`community:keeps:${userId}`);
    
    // Feedback
    await kv.del(`feedback:${userId}`);
    
    // Notifications - Delete all user notifications (getByPrefix returns values only)
    const notificationEntries = await kv.getByPrefix(`notification:${userId}:`);
    for (const notif of notificationEntries) {
      if (notif?.id) {
        await kv.del(`notification:${userId}:${notif.id}`);
      }
    }
    
    // Activity logs - Delete user activity logs (getByPrefix returns values only)
    const activityEntries = await kv.getByPrefix(`activitylog:${userId}:`);
    for (const activity of activityEntries) {
      if (activity?.id) {
        await kv.del(`activitylog:${userId}:${activity.id}`);
      }
    }
    
    // Reports - 신고한 이력은 삭제, 신고 당한 이력은 1년 보관
    const reports = await kv.get('reports') || [];
    if (Array.isArray(reports)) {
      let reportsModified = false;
      const updatedReports = reports.filter((report: any) => {
        // 사용자가 신고한 이력 완전 삭제
        if (report.reporterId === userId) {
          console.log(`Deleting report ${report.id} - user was reporter`);
          return false; // 배열에서 제거
        }
        
        // 사용자가 신고 당한 경우 - 보관 (1년 후 자동 삭제 시스템에서 처리)
        if (report.targetUserId === userId) {
          report.targetUserNickname = '탈퇴한 사용자';
          report.targetUserEmail = userEmail; // 1년간 보관
          report.targetUserDeleted = true;
          reportsModified = true;
        }
        
        return true; // 배열에 유지
      });
      
      if (reportsModified || updatedReports.length !== reports.length) {
        await kv.set('reports', updatedReports);
        console.log(`Deleted ${reports.length - updatedReports.length} reports where user was reporter`);
      }
    }
    
    // Unban requests - Delete user's unban requests (getByPrefix returns values only)
    const unbanEntries = await kv.getByPrefix(`unban_request:`);
    for (const unbanReq of unbanEntries) {
      if (unbanReq?.userId === userId && unbanReq?.id) {
        await kv.del(`unban_request:${unbanReq.id}`);
      }
    }
    // Unlink Kakao OAuth connection if applicable
    try {
      // Get user's identities to check if they used Kakao login
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
      
      if (authUser?.identities && Array.isArray(authUser.identities)) {
        const kakaoIdentity = authUser.identities.find((identity: any) => identity.provider === 'kakao');
        
        if (kakaoIdentity && kakaoIdentity.id) {
          const kakaoAdminKey = process.env.KAKAO_ADMIN_KEY;
          if (kakaoAdminKey) {
            const kakaoUserId = kakaoIdentity.identity_data?.sub || kakaoIdentity.identity_data?.provider_id || kakaoIdentity.id;
            console.log(`Attempting to unlink Kakao account for user ${userId}...`);
            
            // Call Kakao API to unlink the user
            const unlinkResponse = await fetch('https://kapi.kakao.com/v1/user/unlink', {
              method: 'POST',
              headers: {
                'Authorization': `KakaoAK ${kakaoAdminKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `target_id_type=user_id&target_id=${kakaoUserId}`,
            });
            
            if (unlinkResponse.ok) {
              const unlinkData = await unlinkResponse.json();
              console.log(`✅ Kakao account unlinked successfully for user ${userId}:`, unlinkData);
            } else {
              const errorText = await unlinkResponse.text();
              console.error(`⚠️ Failed to unlink Kakao account (${unlinkResponse.status}):`, errorText);
              // Continue with deletion even if unlink fails
            }
          } else {
            console.log(`⚠️ KAKAO_ADMIN_KEY not configured - skipping Kakao unlink for user ${userId}`);
            console.log(`   User will need to manually revoke app permissions in Kakao settings to re-consent`);
          }
        }
      }
    } catch (kakaoError) {
      console.error(`Error during Kakao unlink process: ${kakaoError}`);
      // Continue with deletion even if Kakao unlink fails
    }
    // Delete the user from Supabase Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error(`Failed to delete user from auth: ${deleteError.message}`);
      return c.json({ error: "Failed to delete user account" }, 500);
    }

    console.log(`User account deleted successfully: ${userId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error(`Delete user account error: ${error}`);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json({ 
      error: "Failed to delete user account", 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});

// Admin endpoints
const ADMIN_EMAIL = 'khb1620@naver.com';
const ADMIN_DEFAULT_PASSWORD = 'admin123456'; // Default password for admin account

async function verifyAdmin(authHeader: string | undefined): Promise<string | null> {
  const userId = await verifyAuth(authHeader);
  if (!userId) return null;
  
  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !user || user.email !== ADMIN_EMAIL) {
    return null;
  }
  
  return userId;
}

// Setup admin account (one-time setup)
app.post("/make-server-58f75568/admin/setup", async (c) => {
  try {
    console.log('Setting up admin account...');
    
    // Check if admin already exists
    const { data: users } = await supabase.auth.admin.listUsers();
    const adminExists = users?.users?.some((user: { email: string }) => user.email === ADMIN_EMAIL);
    
    if (adminExists) {
      console.log('Admin account already exists');
      return c.json({ message: "Admin account already exists", email: ADMIN_EMAIL });
    }
    
    // Create admin account
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_DEFAULT_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: 'Admin',
        full_name: 'Administrator'
      }
    });
    
    if (error) {
      console.error('Failed to create admin account:', error);
      throw error;
    }
    
    console.log('Admin account created successfully');
    return c.json({ 
      message: "Admin account created successfully",
      email: ADMIN_EMAIL,
      defaultPassword: ADMIN_DEFAULT_PASSWORD,
      note: "Please change the password after first login"
    });
  } catch (error) {
    console.error('Admin setup error:', error);
    return c.json({ error: "Failed to setup admin account", details: String(error) }, 500);
  }
});

// Get admin statistics
app.get("/make-server-58f75568/admin/stats", async (c) => {
  try {
    const adminId = await verifyAdmin(c.req.header('Authorization'));
    if (!adminId) {
      return c.json({ error: "Unauthorized - Admin access required" }, 403);
    }

    console.log('Fetching admin statistics...');

    // Get deletion reasons
    let deletions: any[] = [];
    try {
      const deletionData = await kv.get('user_deletions');
      deletions = deletionData || [];
      console.log(`Found ${deletions.length} deletions`);
    } catch (error) {
      console.log('Error fetching deletion data:', error);
    }
    
    // Calculate deletion reason statistics
    const reasonStats: Record<string, number> = {};
    if (Array.isArray(deletions)) {
      deletions.forEach((deletion: any) => {
        const reason = deletion?.reason || 'Not specified';
        reasonStats[reason] = (reasonStats[reason] || 0) + 1;
      });
    }

    // Calculate age demographics of DELETED users
    const deletedAgeGroups: Record<string, number> = {
      '10대': 0,
      '20대': 0,
      '30대': 0,
      '40대': 0,
      '50대 이상': 0,
      '미등록': 0,
    };
    
    if (Array.isArray(deletions)) {
      deletions.forEach((deletion: any) => {
        const ageGroup = deletion?.ageGroup || '미등록';
        if (deletedAgeGroups.hasOwnProperty(ageGroup)) {
          deletedAgeGroups[ageGroup]++;
        } else {
          deletedAgeGroups['미등록']++;
        }
      });
      console.log(`📊 Deleted users age groups:`, deletedAgeGroups);
    }

    // Get all users from Supabase Auth
    let allUsers: any[] = [];
    let page = 1;
    let hasMore = true;
    
    try {
      while (hasMore) {
        const { data, error } = await supabase.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        
        if (error) {
          console.error('Error fetching users:', error);
          break;
        }
        
        if (data.users.length > 0) {
          allUsers = [...allUsers, ...data.users];
          page++;
        } else {
          hasMore = false;
        }
      }
      console.log(`Found ${allUsers.length} total users`);
    } catch (error) {
      console.log('Error fetching users from auth:', error);
    }

    // Get all profiles to calculate age demographics
    const ageGroups: Record<string, number> = {
      '10대': 0,
      '20대': 0,
      '30대': 0,
      '40대': 0,
      '50대 이상': 0,
      '미등록': 0,
    };

    try {
      const profiles = await kv.getByPrefix('profile:');
      console.log(`📊 Found ${profiles?.length || 0} profiles from KV store`);
      
      // Log sample profile to check structure
      if (profiles && profiles.length > 0) {
        console.log(`📋 Sample profile structure:`, JSON.stringify(profiles[0], null, 2));
      }
      
      // Create a map to deduplicate by userId (since key already contains userId)
      const uniqueProfiles = new Map<string, any>();
      if (profiles && Array.isArray(profiles)) {
        profiles.forEach((entry: any) => {
          // Handle different possible structures
          const profile = entry.value || entry;
          const userId = entry.key?.replace('profile:', '') || profile.userId;
          
          if (userId && profile) {
            uniqueProfiles.set(userId, profile);
          }
        });
      }
      
      console.log(`✅ Found ${uniqueProfiles.size} unique profiles after deduplication`);
      
      const currentYear = new Date().getFullYear();
      let processedWithBirthDate = 0;
      
      uniqueProfiles.forEach((profile: any, userId: string) => {
        if (profile?.birthDate) {
          try {
            const birthYear = parseInt(profile.birthDate.split('-')[0]);
            if (isNaN(birthYear)) {
              console.log(`❌ Invalid birth year for user ${userId}: ${profile.birthDate}`);
              return;
            }
            
            const age = currentYear - birthYear;
            console.log(`👤 User ${userId}: birthDate=${profile.birthDate}, age=${age}`);
            
            if (age < 20) ageGroups['10대']++;
            else if (age < 30) ageGroups['20대']++;
            else if (age < 40) ageGroups['30대']++;
            else if (age < 50) ageGroups['40대']++;
            else ageGroups['50대 이상']++;
            
            processedWithBirthDate++;
          } catch (parseError) {
            console.log('❌ Error parsing birth date:', parseError);
          }
        } else {
          console.log(`⚠️ User ${userId}: No birthDate in profile`);
        }
      });
      
      // Users without birthDate
      const usersWithoutBirthDate = uniqueProfiles.size - processedWithBirthDate;
      ageGroups['미등록'] = usersWithoutBirthDate;
      
      console.log(`📊 Age distribution summary: ${processedWithBirthDate} with birthDate, ${usersWithoutBirthDate} without`);
      console.log(`📊 Age groups:`, ageGroups);
    } catch (error) {
      console.log('Error fetching profiles:', error);
    }

    return c.json({
      userCount: allUsers.length,
      deletionCount: Array.isArray(deletions) ? deletions.length : 0,
      deletionReasons: reasonStats,
      ageGroups,
    });
  } catch (error) {
    console.log(`Admin stats error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to fetch admin stats", details: String(error) }, 500);
  }
});

// Get all feedback
app.get("/make-server-58f75568/admin/feedback", async (c) => {
  try {
    const adminId = await verifyAdmin(c.req.header('Authorization'));
    if (!adminId) {
      return c.json({ error: "Unauthorized - Admin access required" }, 403);
    }

    console.log('Fetching global feedback list...');
    const globalFeedbackData = await kv.get('global_feedback_list');
    const allFeedback = globalFeedbackData || [];
    console.log(`Found ${allFeedback?.length || 0} feedback entries`);

    // Ensure all feedback items have isRead field (for backwards compatibility)
    if (Array.isArray(allFeedback)) {
      allFeedback.forEach((fb: any) => {
        if (fb.isRead === undefined) {
          fb.isRead = false;
        }
      });
      
      // Sort by timestamp, newest first
      allFeedback.sort((a, b) => {
        try {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        } catch {
          return 0;
        }
      });
    }

    console.log(`Returning ${allFeedback.length} feedback items`);
    return c.json({ feedback: allFeedback });
  } catch (error) {
    console.log(`Admin feedback error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to fetch feedback", details: String(error) }, 500);
  }
});

// Mark all unread feedback as read (Admin only)
app.post("/make-server-58f75568/admin/feedback/mark-all-read", async (c) => {
  try {
    const adminId = await verifyAdmin(c.req.header('Authorization'));
    if (!adminId) {
      return c.json({ error: "Unauthorized - Admin access required" }, 403);
    }
    
    // Get global feedback list
    const globalFeedbackData = await kv.get('global_feedback_list');
    const allFeedback = globalFeedbackData || [];
    
    // Count unread feedback
    let unreadCount = 0;
    
    // Mark all as read
    allFeedback.forEach((fb: any) => {
      if (!fb.isRead) {
        fb.isRead = true;
        unreadCount++;
      }
    });
    
    // Save updated list
    await kv.set('global_feedback_list', allFeedback);
    
    console.log(`Marked ${unreadCount} feedback items as read by admin ${adminId}`);
    return c.json({ success: true, markedCount: unreadCount });
  } catch (error) {
    console.log(`Mark all feedback as read error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to mark feedback as read" }, 500);
  }
});

// ========== REPORT & MODERATION SYSTEM ==========

// Create a report (게시���/댓글 신고)
app.post("/make-server-58f75568/community/report", async (c) => {
  try {
    const reporterId = await verifyAuth(c.req.header('Authorization'));
    if (!reporterId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { targetType, targetId, reason } = await c.req.json();
    
    // Validate input
    if (!targetType || !targetId || !reason) {
      return c.json({ error: "targetType, targetId, reason이 필요합니다" }, 400);
    }
    
    if (!['post', 'comment'].includes(targetType)) {
      return c.json({ error: "targetType은 'post' 또는 'comment'여야 합니다" }, 400);
    }
    
    const validReasons = ['스팸/광고', '욕설/비방', '개인정보 노출', '음란물', '기타'];
    if (!validReasons.includes(reason)) {
      return c.json({ error: "유효하지 않은 신고 사유입니다" }, 400);
    }
    
    // Get target content and its author
    let targetUserId: string;
    let targetContent: any;
    
    if (targetType === 'post') {
      targetContent = await kv.get(`communitypost:${targetId}`);
      if (!targetContent) {
        return c.json({ error: "신고하려는 게시글을 찾을 수 없습니다" }, 404);
      }
      targetUserId = targetContent.userId;
    } else {
      // comment
      targetContent = await kv.get(`communitycomment:${targetId}`);
      if (!targetContent) {
        return c.json({ error: "신고하려는 댓글을 찾을 수 없습니다" }, 404);
      }
      targetUserId = targetContent.userId;
    }
    
    // Prevent self-reporting
    if (reporterId === targetUserId) {
      return c.json({ error: "자신의 콘텐츠는 신고할 수 없습니다" }, 400);
    }
    
    // Get reporter profile for nickname
    const reporterProfile = await kv.get(`profile:${reporterId}`);
    const reporterNickname = reporterProfile?.nickname || '알 수 없음';
    
    // Get target user profile
    const targetUserProfile = await kv.get(`profile:${targetUserId}`);
    const targetUserNickname = targetUserProfile?.nickname || '알 수 없음';
    
    // Get IP addresses
    const reporterIp = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';
    const authorIp = targetContent.authorIp || 'unknown';  // Get original author's IP if stored
    
    // Store the target content at the time of reporting (for later reference even if deleted)
    const savedContent = targetType === 'post' 
      ? { title: targetContent.title, content: targetContent.content, emotion: targetContent.emotion, createdAt: targetContent.createdAt, authorIp }
      : { content: targetContent.content, createdAt: targetContent.createdAt, authorIp };
    
    // Create report
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reportData = {
      id: reportId,
      reporterId,
      reporterNickname,
      reporterIp,  // Store reporter IP
      targetType,
      targetId,
      targetUserId,
      targetUserNickname,
      reason,
      status: 'pending', // pending, processed, rejected
      createdAt: new Date().toISOString(),
      processedAt: null,
      processedBy: null,
      action: null, // null, warning, suspended, banned
      savedContent, // Save content snapshot with author IP at reporting time
    };
    
    await kv.set(`report:${reportId}`, reportData);
    
    // Log activity
    await logActivity(reporterId, 'create_report', { 
      reportId, 
      targetType, 
      targetId, 
      targetUserId, 
      reason 
    }, c.req.header('x-forwarded-for') || 'unknown');
    
    // Increment report count for target user
    const countKey = `reportcount:${targetUserId}`;
    const currentCount = await kv.get(countKey) || 0;
    const newCount = currentCount + 1;
    await kv.set(countKey, newCount);
    
    console.log(`Report created: ${reportId}, target user ${targetUserId} now has ${newCount} reports`);
    
    // Auto-suspend if 10 or more reports
    if (newCount >= 10) {
      const targetProfile = await kv.get(`profile:${targetUserId}`);
      if (targetProfile && targetProfile.status !== 'banned' && targetProfile.status !== 'suspended') {
        targetProfile.status = 'suspended';
        targetProfile.suspendedAt = new Date().toISOString();
        targetProfile.suspendReason = '신고 누적 (10회 이상)';
        await kv.set(`profile:${targetUserId}`, targetProfile);
        console.log(`User ${targetUserId} auto-suspended due to 10+ reports`);
      }
    }
    
    return c.json({ 
      success: true, 
      reportId,
      message: "신고가 접수되었습니다"
    });
  } catch (error) {
    console.log(`Create report error: ${error}`);
    console.error(error);
    return c.json({ error: "신고 접수 실패" }, 500);
  }
});

// Get all reports (Admin only)
app.get("/make-server-58f75568/admin/reports", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const profile = await kv.get(`profile:${userId}`);
    if (!profile || profile.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    // Get all reports
    const allReports = await kv.getByPrefix('report:');
    
    // Fetch content and user emails for each report
    const reportsWithContent = await Promise.all(allReports.map(async (report) => {
      let targetContent = null;
      let targetDeleted = false;
      
      try {
        if (report.targetType === 'post') {
          const post = await kv.get(`communitypost:${report.targetId}`);
          if (post) {
            targetContent = {
              title: post.title,
              content: post.content,
              emotion: post.emotion,
              createdAt: post.createdAt
            };
          } else {
            targetDeleted = true;
            // Use savedContent if post is deleted
            if (report.savedContent) {
              targetContent = report.savedContent;
            }
          }
        } else if (report.targetType === 'comment') {
          const comment = await kv.get(`communitycomment:${report.targetId}`);
          if (comment) {
            targetContent = {
              content: comment.content,
              createdAt: comment.createdAt
            };
          } else {
            targetDeleted = true;
            // Use savedContent if comment is deleted
            if (report.savedContent) {
              targetContent = report.savedContent;
            }
          }
        }
      } catch (error) {
        console.log(`Error fetching content for report ${report.id}:`, error);
        // Use savedContent as fallback
        if (report.savedContent) {
          targetContent = report.savedContent;
          targetDeleted = true;
        }
      }
      
      // Get reporter and target user emails
      let reporterEmail = 'Unknown';
      let targetUserEmail = 'Unknown';
      let reporterDeleted = false;
      let targetUserDeleted = false;
      let targetUserDeletedRecord = null;
      let reporterDeletedRecord = null;
      
      try {
        const { data: { user: reporterUser } } = await supabase.auth.admin.getUserById(report.reporterId);
        if (reporterUser?.email) {
          reporterEmail = reporterUser.email;
        }
      } catch (error) {
        console.log(`Error fetching reporter email for ${report.reporterId}:`, error);
        // Check if user is deleted
        const deletions = await kv.get('user_deletions') || [];
        const deletedUser = deletions.find((d: any) => d.userId === report.reporterId);
        if (deletedUser) {
          reporterEmail = deletedUser.email;
          reporterDeleted = true;
          reporterDeletedRecord = deletedUser;
        }
      }
      
      try {
        const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(report.targetUserId);
        if (targetUser?.email) {
          targetUserEmail = targetUser.email;
        }
      } catch (error) {
        console.log(`Error fetching target user email for ${report.targetUserId}:`, error);
        // Check if user is deleted
        const deletions = await kv.get('user_deletions') || [];
        const deletedUser = deletions.find((d: any) => d.userId === report.targetUserId);
        if (deletedUser) {
          targetUserEmail = deletedUser.email;
          targetUserDeleted = true;
          targetUserDeletedRecord = deletedUser;
        }
      }
      
      return {
        ...report,
        targetContent,
        targetDeleted,
        reporterEmail,
        targetUserEmail,
        reporterDeleted,
        targetUserDeleted,
        reporterDeletedRecord,
        targetUserDeletedRecord
      };
    }));
    
    // Sort by createdAt, newest first
    const sortedReports = reportsWithContent.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    console.log(`Returning ${sortedReports.length} reports with content`);
    return c.json({ reports: sortedReports });
  } catch (error) {
    console.log(`Get reports error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to fetch reports" }, 500);
  }
});

// Process report (Admin only)
app.post("/make-server-58f75568/admin/reports/:reportId/process", async (c) => {
  try {
    const adminUserId = await verifyAuth(c.req.header('Authorization'));
    if (!adminUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const adminProfile = await kv.get(`profile:${adminUserId}`);
    if (!adminProfile || adminProfile.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    const reportId = c.req.param('reportId');
    const { action } = await c.req.json();
    
    console.log(`🔍 Processing report ${reportId} with action: ${action}`);
    
    const report = await kv.get(`report:${reportId}`);
    if (!report) {
      console.log(`❌ Report ${reportId} not found`);
      return c.json({ error: "Report not found" }, 404);
    }
    
    const targetProfile = await kv.get(`profile:${report.targetUserId}`);
    
    // If the user has been deleted, we can still process the report (mark as processed)
    // but we can't take action on the account
    if (!targetProfile) {
      console.log(`⚠️ User profile not found for ${report.targetUserId} - user may have been deleted`);
      
      // Just mark the report as processed with the requested action
      report.status = 'processed';
      report.processedAt = new Date().toISOString();
      report.processedBy = adminUserId;
      report.action = action;
      await kv.set(`report:${reportId}`, report);
      
      console.log(`✅ Report ${reportId} marked as processed (user deleted)`);
      return c.json({ 
        success: true, 
        report,
        message: "Report processed. Note: The reported user account no longer exists."
      });
    }
    
    const previousAction = report.action;
    console.log(`📋 Previous action: ${previousAction || 'none'}, New action: ${action}`);
    
    // Get content preview once
    let contentPreview = '내용 없음';
    if (report.targetType === 'post') {
      if (report.savedContent?.title) {
        contentPreview = `"${report.savedContent.title}"`;
      } else {
        const post = await kv.get(`communitypost:${report.targetId}`);
        if (post?.title) {
          contentPreview = `"${post.title}"`;
        }
      }
    } else if (report.targetType === 'comment') {
      if (report.savedContent?.content) {
        contentPreview = `"${report.savedContent.content.substring(0, 50)}..."`;
      } else {
        const comment = await kv.get(`communitycomment:${report.targetId}`);
        if (comment?.content) {
          contentPreview = `"${comment.content.substring(0, 50)}..."`;
        }
      }
    }
    
    // STEP 1: Undo previous action
    if (previousAction === 'warning') {
      if (targetProfile.warningCount > 0) {
        targetProfile.warningCount = targetProfile.warningCount - 1;
        console.log(`⏪ Decreased warning count to: ${targetProfile.warningCount}`);
        // Save the decreased warning count immediately
        await kv.set(`profile:${report.targetUserId}`, targetProfile);
        console.log(`💾 Profile saved with decreased warning count`);
      }
    } else if (previousAction === 'suspend') {
      if (targetProfile.suspendReportId === reportId) {
        console.log(`⏪ User was suspended by this report`);
      }
    }
    
    // STEP 2: Apply new action
    if (action === 'suspend') {
      if (targetProfile) {
        // Get content info for suspension reason
        let contentPreview = '내용 없음';
        
        // Try to get content from savedContent first, then from actual post/comment
        if (report.targetType === 'post') {
          if (report.savedContent?.title) {
            contentPreview = `"${report.savedContent.title}"`;
          } else {
            const post = await kv.get(`communitypost:${report.targetId}`);
            if (post?.title) {
              contentPreview = `"${post.title}"`;
            }
          }
        } else if (report.targetType === 'comment') {
          if (report.savedContent?.content) {
            contentPreview = `"${report.savedContent.content.substring(0, 50)}..."`;
          } else {
            const comment = await kv.get(`communitycomment:${report.targetId}`);
            if (comment?.content) {
              contentPreview = `"${comment.content.substring(0, 50)}..."`;
            }
          }
        }
        
        targetProfile.status = 'suspended';
        targetProfile.suspendedAt = new Date().toISOString();
        targetProfile.suspendReason = `신고 접수 - ${report.reason}\n${report.targetType === 'post' ? '��시글' : '댓글'}: ${contentPreview}`;
        targetProfile.suspendReportId = reportId; // Store report ID for reference
        await kv.set(`profile:${report.targetUserId}`, targetProfile);
        console.log(`✅ User ${report.targetUserId} suspended, reason saved: ${contentPreview}`);
        
        // Send notification about suspension
        const suspendNotificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const suspendNotification = {
          id: suspendNotificationId,
          userId: report.targetUserId,
          type: 'suspended',
          title: '계정 정지',
          message: `회원님의 ${report.targetType === 'post' ? '게시글' : '댓글'} ${contentPreview}이(가) 신고되어 계정이 정지되었습니다.\n사유: ${report.reason}`,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: report.targetId,
          relatedType: report.targetType
        };
        await kv.set(`notification:${report.targetUserId}:${suspendNotificationId}`, suspendNotification);
      }
    } else if (action === 'warning') {
      // Increment warning count
      targetProfile.warningCount = (targetProfile.warningCount || 0) + 1;
      console.log(`⚠️ User ${report.targetUserId} warning count increased to: ${targetProfile.warningCount}`);
      

      
      // Check if auto-suspend needed
      /*const oldCode = {
        notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        oldTitle: '경고',
        message: `회원님의 ${report.targetType === 'post' ? '게���글' : '댓글'} ${contentPreview}이(가) 신고되어 경고 조치되었습니다.\n사유: ${report.reason}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedId: report.targetId,
        relatedType: report.targetType
      };*/
      if (targetProfile.warningCount >= 5) {
        // Auto-suspend
        targetProfile.status = 'suspended';
        targetProfile.suspendedAt = new Date().toISOString();
        targetProfile.suspendReason = `누적 경고 5회 - 최근 사유: ${report.reason}\n${report.targetType === 'post' ? '게시글' : '댓글'}: ${contentPreview}`;
        targetProfile.suspendReportId = reportId;
        await kv.set(`profile:${report.targetUserId}`, targetProfile);
        console.log(`🚫 User ${report.targetUserId} auto-suspended due to 5 warnings`);
        
        // Send suspension notification
        const suspendNotificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const suspendNotification = {
          id: suspendNotificationId,
          userId: report.targetUserId,
          type: 'suspended',
          title: '계정 정지 (누적 경고 5회)',
          message: `누적 경고 횟수 5회 도달로 계정이 정지되었습니다.\n최근 위반 내용: ${report.targetType === 'post' ? '게시글' : '댓글'} ${contentPreview}\n사유: ${report.reason}`,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: report.targetId,
          relatedType: report.targetType
        };
        await kv.set(`notification:${report.targetUserId}:${suspendNotificationId}`, suspendNotification);
        console.log(`📬 Suspension notification saved: notification:${report.targetUserId}:${suspendNotificationId}`);
      } else {
        // Send warning notification with count
        await kv.set(`profile:${report.targetUserId}`, targetProfile);
        
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notification = {
          id: notificationId,
          userId: report.targetUserId,
          type: 'warning',
          title: `경고 (${targetProfile.warningCount}/5)`,
          message: `회원님의 ${report.targetType === 'post' ? '게시글' : '댓글'} ${contentPreview}이(가) 신고되어 경고 조치되었습니다.\n사유: ${report.reason}\n누적 경고: ${targetProfile.warningCount}회 (5회 시 계정 정지)`,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: report.targetId,
          relatedType: report.targetType
        };
        await kv.set(`notification:${report.targetUserId}:${notificationId}`, notification);
        console.log(`📬 Warning notification saved: notification:${report.targetUserId}:${notificationId}`);
        console.log(`⚠️ Warning notification sent to user ${report.targetUserId} (${targetProfile.warningCount}/5)`);
      }
    } else if (action === 'ignore') {
      // Use the targetProfile we already have from the top
      if (targetProfile && targetProfile.suspendReportId === reportId) {
        targetProfile.status = 'active';
        targetProfile.suspendReason = null;
        targetProfile.suspendedAt = null;
        targetProfile.suspendReportId = null;
        targetProfile.activatedAt = new Date().toISOString();
        await kv.set(`profile:${report.targetUserId}`, targetProfile);
        console.log(`✅ User ${report.targetUserId} reactivated because report ${reportId} was ignored`);
        
        // Send notification about reactivation
        const reactivateNotificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const reactivateNotification = {
          id: reactivateNotificationId,
          userId: report.targetUserId,
          type: 'reactivated',
          title: '계정 활성화',
          message: '신고가 무시 처리되어 계정이 다시 활성화되었습니다.',
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: report.targetId,
          relatedType: report.targetType
        };
        await kv.set(`notification:${report.targetUserId}:${reactivateNotificationId}`, reactivateNotification);
      }
      
      await kv.set(`profile:${report.targetUserId}`, targetProfile);
      console.log(`✅ Report ignored, profile updated`);
    }
    
    // STEP 3: Update report status
    report.status = 'processed';
    report.processedAt = new Date().toISOString();
    report.processedBy = adminUserId;
    report.action = action;
    await kv.set(`report:${reportId}`, report);
    console.log(`✅ Report ${reportId} updated with action: ${action}`);
    
    return c.json({ success: true, report });
  } catch (error) {
    console.log(`Process report error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to process report" }, 500);
  }
});

// Suspend user (Admin only)
app.post("/make-server-58f75568/admin/users/:userId/suspend", async (c) => {
  try {
    const adminUserId = await verifyAuth(c.req.header('Authorization'));
    if (!adminUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const adminProfile = await kv.get(`profile:${adminUserId}`);
    if (!adminProfile || adminProfile.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    const targetUserId = c.req.param('userId');
    const { reason } = await c.req.json();
    
    const profile = await kv.get(`profile:${targetUserId}`);
    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Check if target is admin - cannot suspend admin
    if (profile.email === 'khb1620@naver.com') {
      return c.json({ error: "관리자 계정은 정지할 수 없습니다" }, 403);
    }
    
    profile.status = 'suspended';
    profile.suspendedAt = new Date().toISOString();
    profile.suspendReason = reason || '관리자 조치';
    
    await kv.set(`profile:${targetUserId}`, profile);
    
    console.log(`User ${targetUserId} suspended by admin`);
    return c.json({ success: true, message: "사용자가 정지되��습니다" });
  } catch (error) {
    console.log(`Suspend user error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to suspend user" }, 500);
  }
});

// Ban user (Admin only)
app.post("/make-server-58f75568/admin/users/:userId/ban", async (c) => {
  try {
    const adminUserId = await verifyAuth(c.req.header('Authorization'));
    if (!adminUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const adminProfile = await kv.get(`profile:${adminUserId}`);
    if (!adminProfile || adminProfile.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    const targetUserId = c.req.param('userId');
    const { reason } = await c.req.json();
    
    const profile = await kv.get(`profile:${targetUserId}`);
    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Check if target is admin - cannot ban admin
    if (profile.email === 'khb1620@naver.com') {
      return c.json({ error: "관리자 계정은 차단할 수 없습니다" }, 403);
    }
    
    profile.status = 'banned';
    profile.bannedAt = new Date().toISOString();
    profile.banReason = reason || '관리자 조치';
    
    await kv.set(`profile:${targetUserId}`, profile);
    
    console.log(`User ${targetUserId} banned by admin`);
    return c.json({ success: true, message: "사용자가 차단되었��니다" });
  } catch (error) {
    console.log(`Ban user error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to ban user" }, 500);
  }
});

// Activate user (Admin only - 정지/차단 해제)
app.post("/make-server-58f75568/admin/users/:userId/activate", async (c) => {
  try {
    const adminUserId = await verifyAuth(c.req.header('Authorization'));
    if (!adminUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const adminProfile = await kv.get(`profile:${adminUserId}`);
    if (!adminProfile || adminProfile.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    const targetUserId = c.req.param('userId');
    
    const profile = await kv.get(`profile:${targetUserId}`);
    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }
    
    const previousStatus = profile.status;
    profile.status = 'active';
    profile.activatedAt = new Date().toISOString();
    // Keep history fields for reference
    
    await kv.set(`profile:${targetUserId}`, profile);
    
    // Log activation activity
    await logActivity(targetUserId, 'account_activated', {
      previousStatus,
      activatedBy: 'admin',
      activatedAt: profile.activatedAt
    }, c.req.header('x-forwarded-for') || 'unknown');
    
    console.log(`User ${targetUserId} activated by admin`);
    return c.json({ success: true, message: "사용자 정지/차단이 해제되었습니다" });
  } catch (error) {
    console.log(`Activate user error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to activate user" }, 500);
  }
});

// Restore admin account (Emergency endpoint - No auth required!)
app.post("/make-server-58f75568/admin/restore-admin", async (c) => {
  console.log('🚨🚨🚨 EMERGENCY RESTORE ENDPOINT CALLED 🚨🚨🚨');
  
  try {
    console.log('Step 1: Checking Supabase connection...');
    if (!supabase) {
      console.error('❌ Supabase client not initialized');
      return c.json({ 
        error: "Supabase client not initialized",
        details: "Server configuration error"
      }, 500);
    }
    console.log('✅ Supabase client OK');
    
    console.log('Step 2: Listing users from auth...');
    let users;
    let listError;
    
    try {
      const result = await supabase.auth.admin.listUsers();
      users = result.data?.users;
      listError = result.error;
      console.log(`Found ${users?.length || 0} users in auth system`);
    } catch (authError) {
      console.error('❌ Exception while listing users:', authError);
      return c.json({ 
        error: "Failed to access auth system",
        details: String(authError)
      }, 500);
    }
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return c.json({ 
        error: `Failed to list users: ${listError.message}`,
        details: JSON.stringify(listError)
      }, 500);
    }
    
    console.log('Step 3: Finding admin user...');
    let adminUser = users?.find(u => u.email === 'khb1620@naver.com');
    
    let adminUserId;
    
    if (!adminUser) {
      console.log('⚠️ Admin user not found in auth system. Creating new admin account...');
      console.log('Available emails:', users?.map(u => u.email).join(', '));
      
      // Create admin user
      try {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: 'khb1620@naver.com',
          password: 'admin123456', // Default password - MUST CHANGE AFTER FIRST LOGIN
          email_confirm: true,
          user_metadata: { 
            name: '관리자',
            full_name: '관리자',
            is_admin: true
          }
        });
        
        if (createError) {
          console.error('❌ Failed to create admin user:', createError);
          return c.json({ 
            error: "Failed to create admin user",
            details: createError.message
          }, 500);
        }
        
        if (!newUser.user) {
          console.error('❌ No user returned after creation');
          return c.json({ 
            error: "No user returned after creation"
          }, 500);
        }
        
        adminUserId = newUser.user.id;
        console.log(`✅ Created new admin user with ID: ${adminUserId}`);
        console.log('⚠️ Default password: admin123456 - Please change this after first login!');
      } catch (createException) {
        console.error('❌ Exception while creating admin user:', createException);
        return c.json({ 
          error: "Exception while creating admin user",
          details: String(createException)
        }, 500);
      }
    } else {
      adminUserId = adminUser.id;
      console.log(`✅ Found existing admin user with ID: ${adminUserId}`);
    }
    
    console.log('Step 4: Checking/Creating profile...');
    let profile;
    
    try {
      profile = await kv.get(`profile:${adminUserId}`);
      
      if (!profile) {
        console.log('⚠️ Admin profile not found. Creating new profile...');
        profile = {
          userId: adminUserId,
          email: 'khb1620@naver.com',
          nickname: '관리자',
          birthDate: '1990-01-01',
          characterInfo: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active'
        };
        console.log('Created new profile object:', JSON.stringify(profile));
      } else {
        console.log(`Found existing profile with status: ${profile.status || 'none'}`);
        console.log('Profile data:', JSON.stringify(profile));
        // Ensure email is set in profile
        if (!profile.email) {
          profile.email = 'khb1620@naver.com';
        }
        if (!profile.userId) {
          profile.userId = adminUserId;
        }
      }
    } catch (kvError) {
      console.error('❌ Error accessing KV store:', kvError);
      return c.json({ 
        error: "Failed to access profile storage",
        details: String(kvError)
      }, 500);
    }
    
    console.log('Step 5: Restoring profile to active status...');
    
    // Restore admin account to active status - FORCE RESET ALL RESTRICTIONS
    profile.status = 'active';
    profile.activatedAt = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();
    
    // Remove ALL suspension/ban related fields
    const restrictionFields = [
      'suspendedAt', 'bannedAt', 'suspendReason', 'banReason',
      'suspendedBy', 'bannedBy', 'suspended', 'banned'
    ];
    
    for (const field of restrictionFields) {
      if (profile[field]) {
        console.log(`Removing restriction field: ${field}`);
        delete profile[field];
      }
    }
    
    console.log('Step 6: Saving restored profile...');
    try {
      await kv.set(`profile:${adminUserId}`, profile);
      console.log('✅ Profile saved successfully');
    } catch (saveError) {
      console.error('❌ Error saving profile:', saveError);
      return c.json({ 
        error: "Failed to save restored profile",
        details: String(saveError)
      }, 500);
    }
    
    // Verify the save
    console.log('Step 7: Verifying saved profile...');
    try {
      const verifyProfile = await kv.get(`profile:${adminUserId}`);
      console.log('Verified profile status:', verifyProfile?.status);
      
      if (verifyProfile?.status !== 'active') {
        console.error('⚠️ Warning: Profile status not active after save!');
      }
    } catch (verifyError) {
      console.error('⚠️ Warning: Could not verify saved profile:', verifyError);
    }
    
    console.log('✅✅✅ ADMIN ACCOUNT RESTORED SUCCESSFULLY ✅✅✅');
    console.log(`Admin user ID: ${adminUserId}`);
    console.log(`Profile status: ${profile.status}`);
    
    return c.json({ 
      success: true, 
      message: "관리자 계정이 복구되었습니다. 이제 로그인할 수 있습니다.",
      userId: adminUserId,
      status: profile.status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌❌❌ CRITICAL ERROR IN RESTORE ADMIN ❌❌❌');
    console.error('Error type:', error instanceof Error ? error.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return c.json({ 
      error: "Failed to restore admin account", 
      message: error instanceof Error ? error.message : String(error),
      details: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Submit unban request from suspended/banned user
app.post("/make-server-58f75568/user/unban-request", async (c) => {
  try {
    console.log('📝📝📝 UNBAN REQUEST SUBMISSION STARTED 📝📝📝');
    const body = await c.req.json();
    console.log('📋 Request body:', JSON.stringify(body, null, 2));
    const { userId, email, reason } = body;
    console.log(`👤 Request from userId: ${userId}, email: ${email}, reason: ${reason}`);
    
    if (!userId || !email || !reason) {
      console.log('Missing required fields');
      return c.json({ error: "모든 필드를 입력해주세요" }, 400);
    }
    
    const requestId = `unbanreq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const requestKey = `unban_request:${requestId}`;
    
    const requestData = {
      id: requestId,
      userId,
      email,
      reason: reason.trim(),
      status: 'pending', // pending, approved, rejected
      createdAt: new Date().toISOString(),
      processedAt: null,
      processedBy: null,
    };
    
    console.log(`💾 Saving to key: ${requestKey}`);
    console.log(`💾 Data to save:`, JSON.stringify(requestData, null, 2));
    await kv.set(requestKey, requestData);
    
    // Verify the save
    const verified = await kv.get(requestKey);
    console.log(`✅✅✅ UNBAN REQUEST CREATED AND VERIFIED ✅✅✅`);
    console.log(`Request ID: ${requestId}`);
    console.log(`User ID: ${userId}`);
    console.log(`Email: ${email}`);
    console.log(`Verified data:`, JSON.stringify(verified, null, 2));
    
    // Also fetch and log all unban requests
    const allRequests = await kv.getByPrefix('unban_request:');
    console.log(`📊 Total unban requests in DB: ${allRequests?.length || 0}`);
    
    return c.json({ success: true, message: "차단 해제 요청이 제출되었습니다" });
  } catch (error) {
    console.log(`❌ Submit unban request error: ${error}`);
    console.error(error);
    return c.json({ error: "차단 해제 요청 제출에 실패했습니다" }, 500);
  }
});

// Get all unban requests (Admin only)
app.get("/make-server-58f75568/admin/unban-requests", async (c) => {
  try {
    console.log('🔍 Admin unban requests endpoint called');
    
    const authHeader = c.req.header('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    const adminUserId = await verifyAuth(authHeader);
    console.log('Admin user ID from verifyAuth:', adminUserId);
    
    if (!adminUserId) {
      console.log('❌ No admin user ID, returning 401');
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const adminProfile = await kv.get(`profile:${adminUserId}`);
    console.log('Admin profile email:', adminProfile?.email);
    
    if (!adminProfile || adminProfile.email !== 'khb1620@naver.com') {
      console.log('❌ Not admin user, returning 403');
      return c.json({ error: "Admin access required" }, 403);
    }
    
    // Get all unban requests
    console.log('🔍 Fetching unban requests with prefix: unban_request:');
    const allRequestsData = await kv.getByPrefix('unban_request:');
    console.log(`Found ${allRequestsData?.length || 0} unban request entries`);
    console.log('Type of allRequestsData:', typeof allRequestsData, Array.isArray(allRequestsData));
    
    if (allRequestsData && allRequestsData.length > 0) {
      console.log('Sample data:', JSON.stringify(allRequestsData.slice(0, 2), null, 2));
    }
    
    // Filter out undefined/null values
    // Note: getByPrefix already returns just the values, not key-value pairs
    const allRequests = allRequestsData
      .filter(value => value !== null && value !== undefined && value.userId);
    
    console.log(`Found ${allRequests.length} valid unban requests`);
    
    if (allRequests.length === 0) {
      console.log('No valid unban requests found');
      return c.json({ requests: [] });
    }
    
    // Sort by creation date, newest first
    const sortedRequests = allRequests.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    // Get user details for each request
    const requestsWithDetails = await Promise.all(sortedRequests.map(async (req) => {
      const profile = await kv.get(`profile:${req.userId}`);
      return {
        ...req,
        nickname: profile?.nickname || 'Unknown',
        currentStatus: profile?.status || 'unknown',
      };
    }));
    
    console.log(`✅ Returning ${requestsWithDetails.length} unban requests`);
    return c.json({ requests: requestsWithDetails });
  } catch (error) {
    console.log(`❌❌❌ Get unban requests error: ${error}`);
    console.error('Full error object:', error);
    console.error('Error name:', error instanceof Error ? error.name : 'unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'no stack');
    return c.json({ 
      error: "Failed to get unban requests",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Process unban request (Admin only)
app.post("/make-server-58f75568/admin/unban-requests/:requestId/process", async (c) => {
  try {
    const adminUserId = await verifyAuth(c.req.header('Authorization'));
    if (!adminUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const adminProfile = await kv.get(`profile:${adminUserId}`);
    if (!adminProfile || adminProfile.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    const requestId = c.req.param('requestId');
    const { action } = await c.req.json(); // 'approve' or 'reject'
    
    const requestKey = `unban_request:${requestId}`;
    const request = await kv.get(requestKey);
    
    if (!request) {
      return c.json({ error: "Request not found" }, 404);
    }
    
    // Update request status
    request.status = action === 'approve' ? 'approved' : 'rejected';
    request.processedAt = new Date().toISOString();
    request.processedBy = adminUserId;
    
    await kv.set(requestKey, request);
    
    // If approved, activate the user
    if (action === 'approve') {
      const profile = await kv.get(`profile:${request.userId}`);
      if (profile) {
        const previousStatus = profile.status;
        profile.status = 'active';
        profile.activatedAt = new Date().toISOString();
        await kv.set(`profile:${request.userId}`, profile);
        
        // Log activation activity
        await logActivity(request.userId, 'account_activated', {
          previousStatus,
          activatedBy: 'unban_request_approval',
          requestId,
          activatedAt: profile.activatedAt
        }, c.req.header('x-forwarded-for') || 'unknown');
        
        console.log(`User ${request.userId} activated via unban request`);
      }
    }
    
    console.log(`Unban request ${requestId} processed with action: ${action}`);
    return c.json({ success: true, message: action === 'approve' ? '차단 해제 승인' : '차단 해제 거부' });
  } catch (error) {
    console.log(`Process unban request error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to process unban request" }, 500);
  }
});

// Get account verification requests (Admin only)
app.get("/make-server-58f75568/admin/verifications", async (c) => {
  try {
    console.log('🔍 Admin verification requests endpoint called');
    
    const authHeader = c.req.header('Authorization');
    const adminUserId = await verifyAuth(authHeader);
    
    if (!adminUserId) {
      console.log('❌ No admin user ID, returning 401');
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const adminProfile = await kv.get(`profile:${adminUserId}`);
    
    if (!adminProfile || adminProfile.email !== 'khb1620@naver.com') {
      console.log('❌ Not admin user, returning 403');
      return c.json({ error: "Admin access required" }, 403);
    }
    
    // Get all verification requests
    console.log('🔍 Fetching verification requests with prefix: verification:');
    const allVerificationsData = await kv.getByPrefix('verification:');
    console.log(`Found ${allVerificationsData?.length || 0} verification entries`);
    
    // Filter out undefined/null values
    const allVerifications = allVerificationsData
      .filter(value => value !== null && value !== undefined && value.userId);
    
    console.log(`Found ${allVerifications.length} valid verification requests`);
    
    if (allVerifications.length === 0) {
      console.log('No valid verification requests found');
      return c.json({ verifications: [] });
    }
    
    // Sort by creation date, newest first
    const sortedVerifications = allVerifications.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    console.log(`✅ Returning ${sortedVerifications.length} verification requests`);
    return c.json({ verifications: sortedVerifications });
  } catch (error) {
    console.log(`❌ Get verification requests error: ${error}`);
    console.error('Full error object:', error);
    return c.json({ 
      error: "Failed to get verification requests",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Process verification request (Admin only)
app.post("/make-server-58f75568/admin/verifications/:verificationId/process", async (c) => {
  try {
    const adminUserId = await verifyAuth(c.req.header('Authorization'));
    if (!adminUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const adminProfile = await kv.get(`profile:${adminUserId}`);
    if (!adminProfile || adminProfile.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    const verificationId = c.req.param('verificationId');
    const { action } = await c.req.json(); // 'approve' or 'reject'
    
    console.log(`Processing verification ${verificationId} with action: ${action}`);
    
    // Get verification request
    const verification = await kv.get(`verification:${verificationId}`);
    if (!verification) {
      console.log(`Verification ${verificationId} not found`);
      return c.json({ error: "Verification request not found" }, 404);
    }
    
    // Update verification status
    verification.status = action === 'approve' ? 'approved' : 'rejected';
    verification.processedAt = new Date().toISOString();
    verification.processedBy = adminUserId;
    await kv.set(`verification:${verificationId}`, verification);
    
    // Update user profile
    if (action === 'approve') {
      const profile = await kv.get(`profile:${verification.userId}`);
      if (profile) {
        profile.status = 'active';
        profile.needsVerification = false;
        profile.verifiedAt = new Date().toISOString();
        await kv.set(`profile:${verification.userId}`, profile);
        console.log(`User ${verification.userId} verification approved and activated`);
        
        // Send approval notification
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notification = {
          id: notificationId,
          userId: verification.userId,
          type: 'verification_approved',
          title: '계정 인증 완료',
          message: '관리자 검증이 완료되어 계정이 활성화되었습니다.',
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        await kv.set(`notification:${verification.userId}:${notificationId}`, notification);
      }
    } else {
      // Rejection - ban the user
      const profile = await kv.get(`profile:${verification.userId}`);
      if (profile) {
        profile.status = 'banned';
        profile.bannedAt = new Date().toISOString();
        profile.banReason = '이전 계정 신고 이력으로 인한 재가입 거부';
        await kv.set(`profile:${verification.userId}`, profile);
        console.log(`User ${verification.userId} verification rejected and banned`);
        
        // Send rejection notification
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notification = {
          id: notificationId,
          userId: verification.userId,
          type: 'verification_rejected',
          title: '계정 인증 거부',
          message: '이전 계정의 신고 이력으로 인해 재가입이 거부되었습니다.',
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        await kv.set(`notification:${verification.userId}:${notificationId}`, notification);
      }
    }
    
    console.log(`Verification ${verificationId} processed with action: ${action}`);
    return c.json({ success: true, message: action === 'approve' ? '계정 인증 승인' : '계정 인증 거부' });
  } catch (error) {
    console.log(`Process verification request error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to process verification request" }, 500);
  }
});

// Get activity logs for a specific user (Admin only)
app.get("/make-server-58f75568/admin/users/:userId/activity-logs", async (c) => {
  try {
    const adminUserId = await verifyAuth(c.req.header('Authorization'));
    if (!adminUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const adminProfile = await kv.get(`profile:${adminUserId}`);
    if (!adminProfile || adminProfile.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    const targetUserId = c.req.param('userId');
    
    // Get all activity logs for this user
    const logsPrefix = `activitylog:${targetUserId}:`;
    const logs = await kv.getByPrefix(logsPrefix);
    
    // Sort by timestamp, newest first
    const sortedLogs = logs.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    // Limit to most recent 100 logs
    const recentLogs = sortedLogs.slice(0, 100);
    
    console.log(`Returning ${recentLogs.length} activity logs for user ${targetUserId}`);
    return c.json({ logs: recentLogs });
  } catch (error) {
    console.log(`Get activity logs error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to fetch activity logs" }, 500);
  }
});

// Get all activity logs (Admin only - for dashboard)
app.get("/make-server-58f75568/admin/activity-logs", async (c) => {
  try {
    const adminUserId = await verifyAuth(c.req.header('Authorization'));
    if (!adminUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const adminProfile = await kv.get(`profile:${adminUserId}`);
    if (!adminProfile || adminProfile.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    const limit = parseInt(c.req.query('limit') || '100');
    const action = c.req.query('action'); // Optional filter by action type
    
    console.log(`⚡ Optimized /admin/activity-logs: limit=${limit}, action=${action || 'all'}`);
    const startTime = Date.now();
    
    // Get all activity logs
    const allLogs = await kv.getByPrefix('activitylog:');
    console.log(`📊 Loaded ${allLogs.length} activity logs`);
    
    // Filter by action if specified
    let filteredLogs = allLogs;
    if (action) {
      filteredLogs = allLogs.filter(log => log.action === action);
    }
    
    // Sort by timestamp, newest first
    const sortedLogs = filteredLogs.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    // Limit results
    const recentLogs = sortedLogs.slice(0, limit);
    
    // ⚡ OPTIMIZATION: Collect unique user IDs first, then batch load profiles
    const uniqueUserIds = [...new Set(recentLogs.map(log => log.userId))];
    console.log(`👥 Loading profiles for ${uniqueUserIds.length} unique users`);
    
    // Load all profiles in parallel
    const profilesMap = new Map();
    await Promise.all(uniqueUserIds.map(async (userId) => {
      try {
        const profile = await kv.get(`profile:${userId}`);
        profilesMap.set(userId, profile?.nickname || '알 수 없음');
      } catch (error) {
        console.log(`Error fetching profile for user ${userId}:`, error);
        profilesMap.set(userId, '알 수 없음');
      }
    }));
    
    // Enrich logs with user nicknames from map (no additional queries)
    const logsWithNicknames = recentLogs.map(log => ({
      ...log,
      userNickname: profilesMap.get(log.userId) || '알 수 없음'
    }));
    
    const endTime = Date.now();
    console.log(`⚡ /admin/activity-logs completed in ${endTime - startTime}ms`);
    console.log(`Returning ${logsWithNicknames.length} activity logs`);
    return c.json({ 
      logs: logsWithNicknames,
      total: filteredLogs.length
    });
  } catch (error) {
    console.log(`Get all activity logs error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to fetch activity logs" }, 500);
  }
});

// Get all users list (Admin only)
app.get("/make-server-58f75568/admin/users", async (c) => {
  try {
    const adminUserId = await verifyAuth(c.req.header('Authorization'));
    if (!adminUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin by checking profile
    const adminProfile = await kv.get(`profile:${adminUserId}`);
    if (!adminProfile || adminProfile.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    // Get user auth info first (email is the unique identifier)
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUsers = authData?.users || [];
    
    console.log(`⚡ Optimized /admin/users: Processing ${authUsers.length} users`);
    const startTime = Date.now();
    
    // ⚡ OPTIMIZATION: Load all reports ONCE instead of for each user
    const allReports = await kv.getByPrefix('report:');
    console.log(`📊 Loaded ${allReports.length} reports once`);
    
    // Create user map by userId from auth
    const userMap = new Map();
    
    for (const authUser of authUsers) {
      const userId = authUser.id;
      const profile = await kv.get(`profile:${userId}`);
      
      // Skip if already added (shouldn't happen with userId as key)
      if (userMap.has(userId)) {
        console.log(`Duplicate userId found: ${userId}`);
        continue;
      }
      
      // Get activity count
      const activityLogs = await kv.getByPrefix(`activitylog:${userId}:`);
      
      // ⚡ OPTIMIZATION: Use pre-loaded reports instead of fetching each time
      const reportedCount = allReports.filter(r => r.targetUserId === userId).length;
      const reporterCount = allReports.filter(r => r.reporterId === userId).length;
      
      // Calculate warnings count from processed reports (신고 처리 완료된 경고 수를 실제 데이터에서 계산)
      // 현재 최종 action이 'warning'인 것만 카운트 (경고였다가 무시로 변경된 경우는 제외됨)
      const warningCount = allReports.filter(r => 
        r.targetUserId === userId && 
        r.status === 'processed' && 
        r.action === 'warning'  // 최종 action이 warning인 것만 카운트
      ).length;
      
      // Calculate account age in days
      const createdDate = new Date(profile?.createdAt || authUser.created_at);
      const accountAgeDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate last activity in days
      const lastActivityDate = activityLogs.length > 0 
        ? new Date(activityLogs[activityLogs.length - 1]?.timestamp)
        : createdDate;
      const daysSinceLastActivity = Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      userMap.set(userId, {
        userId,
        email: authUser.email,
        nickname: profile?.nickname || authUser.user_metadata?.name || 'Unknown',
        birthDate: profile?.birthDate || '',
        status: profile?.status || 'active',
        createdAt: profile?.createdAt || authUser.created_at,
        lastActive: activityLogs.length > 0 ? activityLogs[activityLogs.length - 1]?.timestamp : (profile?.createdAt || authUser.created_at),
        activityCount: activityLogs.length,
        reportedCount,
        reporterCount,
        warningCount,
        accountAgeDays,
        daysSinceLastActivity,
        suspendedAt: profile?.suspendedAt,
        bannedAt: profile?.bannedAt,
        suspendReason: profile?.suspendReason,
        banReason: profile?.banReason
      });
    }
    
    const endTime = Date.now();
    console.log(`⚡ /admin/users completed in ${endTime - startTime}ms`)
    
    // Convert map to array
    const users = Array.from(userMap.values());
    
    // Sort by creation date, newest first
    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log(`Returning ${users.length} users for admin`);
    return c.json({ users });
  } catch (error) {
    console.log(`Get users list error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to fetch users list" }, 500);
  }
});

// ========== NOTIFICATION SYSTEM ==========

// Get user notifications
app.get("/make-server-58f75568/notifications", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Get all notifications for this user
    const notificationsPrefix = `notification:${userId}:`;
    const notificationsData = await kv.getByPrefix(notificationsPrefix);
    
    // getByPrefix returns values directly, not key-value pairs
    const notifications = notificationsData
      .filter(value => value !== null && value !== undefined);
    
    // Sort by creation date, newest first
    const sortedNotifications = notifications.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    console.log(`Returning ${sortedNotifications.length} notifications for user ${userId}`);
    return c.json({ notifications: sortedNotifications });
  } catch (error) {
    console.log(`Get notifications error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to get notifications" }, 500);
  }
});

// Mark notification as read
app.post("/make-server-58f75568/notifications/:notificationId/read", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const notificationId = c.req.param('notificationId');
    const notificationKey = `notification:${userId}:${notificationId}`;
    
    const notification = await kv.get(notificationKey);
    if (!notification) {
      return c.json({ error: "Notification not found" }, 404);
    }
    
    notification.isRead = true;
    notification.readAt = new Date().toISOString();
    
    await kv.set(notificationKey, notification);
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Mark notification as read error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to mark notification as read" }, 500);
  }
});

// Mark all notifications as read
app.post("/make-server-58f75568/notifications/read-all", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const notificationsPrefix = `notification:${userId}:`;
    const notifications = await kv.getByPrefix(notificationsPrefix);
    
    for (const notification of notifications) {
      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
        await kv.set(`notification:${userId}:${notification.id}`, notification);
      }
    }
    
    console.log(`Marked ${notifications.length} notifications as read for user ${userId}`);
    return c.json({ success: true, count: notifications.length });
  } catch (error) {
    console.log(`Mark all notifications as read error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to mark all notifications as read" }, 500);
  }
});

// Delete notification
app.delete("/make-server-58f75568/notifications/:notificationId", async (c) => {
  try {
    const userId = await verifyAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const notificationId = c.req.param('notificationId');
    const notificationKey = `notification:${userId}:${notificationId}`;
    
    await kv.del(notificationKey);
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete notification error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to delete notification" }, 500);
  }
});

// Admin: Send notification to multiple users
app.post("/make-server-58f75568/admin/send-notification", async (c) => {
  try {
    const adminId = await verifyAuth(c.req.header('Authorization'));
    if (!adminId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser(c.req.header('Authorization')?.split(' ')[1]);
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }

    const body = await c.req.json();
    const { userIds, message } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return c.json({ error: "userIds array is required" }, 400);
    }

    if (!message || !message.trim()) {
      return c.json({ error: "message is required" }, 400);
    }

    let successCount = 0;
    let failedCount = 0;

    // Send notification to each user
    for (const userId of userIds) {
      try {
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notification = {
          id: notificationId,
          userId: userId,
          type: 'admin',
          title: '관리자 알림',
          message: message.trim(),
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        await kv.set(`notification:${userId}:${notificationId}`, notification);
        successCount++;
        console.log(`✅ Admin notification sent to user ${userId}`);
      } catch (error) {
        console.error(`❌ Failed to send notification to user ${userId}:`, error);
        failedCount++;
      }
    }

    console.log(`📬 Admin notifications sent: ${successCount} success, ${failedCount} failed`);
    return c.json({ 
      success: true, 
      successCount, 
      failedCount,
      totalCount: userIds.length 
    });
  } catch (error) {
    console.error('Send admin notification error:', error);
    return c.json({ error: "Failed to send notifications" }, 500);
  }
});

// Get specific user details (Admin only)
app.get("/make-server-58f75568/admin/users/:userId/details", async (c) => {
  try {
    const adminUserId = await verifyAuth(c.req.header('Authorization'));
    if (!adminUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin
    const { data: { user } } = await supabase.auth.getUser(c.req.header('Authorization')?.split(' ')[1]);
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    const targetUserId = c.req.param('userId');
    
    // Get profile
    const profile = await kv.get(`profile:${targetUserId}`);
    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Get auth info
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(targetUserId);
    
    // Get activity logs
    const activityLogs = await kv.getByPrefix(`activitylog:${targetUserId}:`);
    const sortedLogs = activityLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Get reports (both as reporter and target)
    const allReports = await kv.getByPrefix('report:');
    const asTarget = allReports.filter(r => r.targetUserId === targetUserId);
    const asReporter = allReports.filter(r => r.reporterId === targetUserId);
    
    // Enrich reports with target content
    const enrichedAsTarget = await Promise.all(asTarget.map(async (report) => {
      let targetContent = null;
      
      // First try to get from saved content (in case content was deleted)
      if (report.savedContent) {
        targetContent = report.savedContent;
      } else if (report.targetType === 'post') {
        // Try to get actual post
        const post = await kv.get(`communitypost:${report.targetId}`);
        if (post) {
          targetContent = {
            title: post.title,
            content: post.content,
            emotion: post.emotion,
            createdAt: post.createdAt
          };
        }
      } else if (report.targetType === 'comment') {
        // Try to get actual comment
        const comment = await kv.get(`communitycomment:${report.targetId}`);
        if (comment) {
          targetContent = {
            content: comment.content,
            createdAt: comment.createdAt
          };
        }
      }
      
      return {
        ...report,
        targetContent,
        targetDeleted: !targetContent && !report.savedContent
      };
    }));
    
    // Get posts and comments
    const allPosts = await kv.getByPrefix('communitypost:');
    const userPosts = allPosts.filter(p => p.userId === targetUserId);
    
    const allComments = await kv.getByPrefix('comment:');
    const userComments = allComments.filter(c => c.userId === targetUserId);
    
    // Get diaries
    const userDiaries = await kv.getByPrefix(`diary:${targetUserId}:`);
    
    // Get chat rooms
    const userChatRooms = await kv.getByPrefix(`chatroom:${targetUserId}:`);
    
    return c.json({
      profile: {
        ...profile,
        userId: targetUserId,
        email: authUser?.email || '알 수 없음',
        emailConfirmed: authUser?.email_confirmed_at ? true : false,
        lastSignIn: authUser?.last_sign_in_at,
        warningCount: profile?.warningCount || 0
      },
      stats: {
        activityCount: activityLogs.length,
        postCount: userPosts.length,
        commentCount: userComments.length,
        diaryCount: userDiaries.length,
        chatRoomCount: userChatRooms.length,
        reportedCount: asTarget.length,
        reporterCount: asReporter.length
      },
      recentActivity: sortedLogs.slice(0, 20),
      reports: {
        asTarget: enrichedAsTarget.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        asReporter: asReporter.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
    });
  } catch (error) {
    console.log(`Get user details error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to fetch user details" }, 500);
  }
});

// Beta feedback endpoint
app.post("/make-server-58f75568/beta-feedback", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, feedback, userAgent, timestamp } = body;
    
    if (!feedback || typeof feedback !== 'string') {
      return c.json({ error: "Invalid feedback" }, 400);
    }
    
    // Get existing feedbacks
    const feedbacks = await kv.get('beta_feedbacks') || [];
    
    // Add new feedback
    const newFeedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId || 'anonymous',
      feedback: feedback.trim(),
      userAgent: userAgent || 'Unknown',
      timestamp: timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    feedbacks.push(newFeedback);
    await kv.set('beta_feedbacks', feedbacks);
    
    console.log(`✅ New beta feedback from ${userId}: ${feedback.substring(0, 50)}...`);
    
    return c.json({ success: true, feedbackId: newFeedback.id });
  } catch (error) {
    console.error(`Beta feedback error: ${error}`);
    return c.json({ error: "Failed to submit feedback" }, 500);
  }
});

// Get beta feedbacks (admin only)
app.get("/make-server-58f75568/admin/beta-feedbacks", async (c) => {
  try {
    const adminId = await verifyAdmin(c.req.header('Authorization'));
    if (!adminId) {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    const feedbacks = await kv.get('beta_feedbacks') || [];
    
    // Sort by timestamp (newest first)
    const sortedFeedbacks = Array.isArray(feedbacks) 
      ? feedbacks.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      : [];
    
    return c.json({ feedbacks: sortedFeedbacks });
  } catch (error) {
    console.error(`Get beta feedbacks error: ${error}`);
    return c.json({ error: "Failed to get feedbacks" }, 500);
  }
});

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000,
});

export default app;