import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { ProfileSetupPage } from './components/ProfileSetupPage';
import { ProfilePage } from './components/ProfilePage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/TermsOfServicePage';
import { CharacterSelectionPage } from './components/CharacterSelectionPage';
import { ChatPage } from './components/ChatPage';
import { DiaryPage } from './components/DiaryPage';
import { ReportPage } from './components/ReportPage';
import { CommunityPage } from './components/CommunityPage';
import { CommunityPostDetailPage } from './components/CommunityPostDetailPage';
import { UserProfilePage } from './components/UserProfilePage';
import { CalendarPage } from './components/CalendarPage';
import { AdminPage } from './components/AdminPage';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { NotificationBell } from './components/NotificationBell';
import { SuspendedAccountDialog } from './components/SuspendedAccountDialog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { FeedbackButton } from './components/BetaFeedbackButton';
import { SplashScreen } from './components/SplashScreen';
import { Toaster } from './components/ui/sonner';
import { User, Calendar, WifiOff } from 'lucide-react';
import { Button } from './components/ui/button';
import { supabase } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { toast } from 'sonner';
import { addNetworkListener } from './utils/network';

export type Page = 'chat' | 'diary' | 'report' | 'community' | 'calendar' | 'admin';

const ADMIN_EMAIL = 'khb1620@naver.com';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string>('');
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [suspendedInfo, setSuspendedInfo] = useState<{
    status: 'suspended' | 'banned';
    reason: string;
    userId: string;
    email: string;
    accessToken: string;
  } | null>(null);
  const [showSuspendedDialog, setShowSuspendedDialog] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Network status listener
  useEffect(() => {
    const cleanup = addNetworkListener((online) => {
      setIsOnline(online);
      if (online) {
        toast.success('인터넷 연결이 복구되었습니다');
      } else {
        toast.error('인터넷 연결이 끊어졌습니다', {
          icon: <WifiOff className="w-4 h-4" />,
          duration: Infinity,
        });
      }
    });
    return cleanup;
  }, []);

  useEffect(() => {
    checkAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.access_token) {
            console.log('Updating token from auth state change:', event);
            setAccessToken(session.access_token);
            setIsAuthenticated(true);
            
            // Update admin status if user info is available
            const { data: { user } } = await supabase.auth.getUser(session.access_token);
            if (user?.email) {
              setUserEmail(user.email);
              setIsAdmin(user.email === ADMIN_EMAIL);
              setCurrentUserId(user.id);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state');
          setAccessToken(null);
          setIsAuthenticated(false);
          setHasProfile(false);
          setShowProfileSetup(false);
          setShowProfile(false);
          setSelectedCharacter('');
          setCurrentPage('chat');
          setIsAdmin(false);
          setUserEmail('');
          setCurrentUserId('');
        if (!session) {
          console.log('Session expired or invalid, attempting token refresh...');
          await refreshToken();
        }
      }
    }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      checkProfile();
    }
  }, [isAuthenticated, accessToken]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error.message);
        setIsAuthenticated(false);
        setAccessToken(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      
      if (session?.access_token) {
        console.log('Valid session found, setting token');
        setAccessToken(session.access_token);
        setIsAuthenticated(true);
        
        // Check if admin - use the token from the session
        const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
        if (userError) {
          console.error('Get user error:', userError.message);
          // If we can't get the user, the token might be invalid
          if (userError.message.includes('JWT') || userError.message.includes('invalid') || userError.message.includes('expired')) {
            console.log('Token appears invalid, clearing session');
            await supabase.auth.signOut();
            setIsAuthenticated(false);
            setAccessToken(null);
            setIsAdmin(false);
          }
        } else if (user?.email) {
          setUserEmail(user.email);
          setIsAdmin(user.email === ADMIN_EMAIL);
          setCurrentUserId(user.id);
        }
      } else {
        console.log('No valid session found');
        setIsAuthenticated(false);
        setAccessToken(null);
        setIsAdmin(false);
      }
    } catch (error: any) {
      console.error('Auth check error:', error?.message || error);
      setIsAuthenticated(false);
      setAccessToken(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      console.log('Attempting to refresh token...');
      
      // First check if we have an active session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.log('Session error during refresh:', sessionError.message);
        handleLogout();
        return null;
      }
      
      if (!currentSession) {
        console.log('No active session found - redirecting to login');
        handleLogout();
        return null;
      }
      
      console.log('Current session exists, attempting refresh...');
      
      // Try to refresh the session
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.log('Token refresh error:', error.message);
        // If it's a session missing error, logout gracefully
        if (error.message.includes('session') || error.message.includes('refresh_token') || error.message.includes('Auth session missing')) {
          console.log('Session expired or invalid, logging out');
          handleLogout();
        }
        return null;
      }
      
      if (session?.access_token) {
        console.log('Token refreshed successfully');
        setAccessToken(session.access_token);
        return session.access_token;
      }
      
      console.log('No access token in refreshed session');
      handleLogout();
      return null;
    } catch (error: any) {
      console.log('Token refresh failed:', error?.message || error);
      // Only logout on specific auth errors, not network errors
      if (error?.message?.includes('session') || error?.message?.includes('Auth') || error?.message?.includes('refresh')) {
        handleLogout();
      }
      return null;
    }
  };

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    let token = accessToken;
    
    if (!token) {
      console.log('No access token available for request');
      return new Response(JSON.stringify({ error: 'No access token' }), { status: 401 });
    }
    
    // First try with current token
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
    
    // If 401, try to refresh token and retry once
    if (response.status === 401) {
      console.log('Request returned 401, attempting token refresh...');
      const newToken = await refreshToken();
      
      if (newToken) {
        console.log('Retrying request with refreshed token...');
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
          },
        });
      } else {
        console.log('Token refresh unsuccessful, user will be logged out');
      }
    }
    
    return response;
  };

  const checkProfile = async () => {
    if (!accessToken) {
      console.log('No access token, skipping profile check');
      return;
    }

    setProfileLoading(true);
    try {
      const response = await makeAuthenticatedRequest(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/profile/check`
      );

      if (response.ok) {
        const data = await response.json();
        
        // Check if user is suspended or banned
        if (data.profile && (data.profile.status === 'suspended' || data.profile.status === 'banned')) {
          const reason = data.profile.status === 'suspended' 
            ? (data.profile.suspendReason || '관리자 조치')
            : (data.profile.banReason || '관리자 조치');
          
          // Get current user info
          const { data: { user } } = await supabase.auth.getUser(accessToken);
          
          setSuspendedInfo({
            status: data.profile.status,
            reason: reason,
            userId: user?.id || '',
            email: user?.email || '',
            accessToken: accessToken,
          });
          setShowSuspendedDialog(true);
          return;
        }
        
        setHasProfile(data.hasProfile);
        // Admin users can skip profile setup
        if (!data.hasProfile && !isAdmin) {
          setShowProfileSetup(true);
        } else if (!data.hasProfile && isAdmin) {
          // Admin has profile from restore, just mark as complete
          setHasProfile(true);
        }
      } else if (response.status === 401) {
        console.log('Authentication failed during profile check - session expired');
        // Token refresh already attempted in makeAuthenticatedRequest
        // Just logout if still getting 401
        handleLogout();
      } else {
        console.error('Profile check failed:', response.status, response.statusText);
        // Don't logout on non-auth errors
      }
    } catch (error: any) {
      console.error('Profile check error:', error?.message || error);
      // Don't logout on network errors, only on auth errors
      if (error?.message?.includes('token') || error?.message?.includes('auth')) {
        handleLogout();
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogin = async (token: string) => {
    console.log('handleLogin called with token');
    
    // First, verify the token is valid
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError) {
        console.error('Token validation error:', userError.message);
        toast.error('로그인 토큰이 유효하지 않습니다. 다시 로그인해주세요.');
        await supabase.auth.signOut();
        return;
      }
      
      if (!user) {
        console.error('No user data for token');
        toast.error('사용자 정보를 가져올 수 없습니다.');
        await supabase.auth.signOut();
        return;
      }
      
      console.log('Token is valid for user:', user.email);
      
      // Verify the session is actually stored
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session retrieval error:', sessionError.message);
        toast.error('세션을 가져오는 중 오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }
      
      if (!session) {
        console.error('No session found in storage after login');
        // This shouldn't happen since we just logged in, but handle it gracefully
        toast.error('로그인 세션이 저장되지 않았습니다. 브라우저의 쿠키 설정을 확인해주세요.');
        return;
      }
      
      console.log('Session confirmed in storage');
      
      // Use the session token (should match the passed token)
      setAccessToken(session.access_token);
      setIsAuthenticated(true);
      setUserEmail(user.email || '');
      setIsAdmin(user.email === ADMIN_EMAIL);
      setCurrentUserId(user.id);
      
      console.log('User authenticated successfully:', user.email);
    } catch (error: any) {
      console.error('Unexpected error during login:', error);
      toast.error('로그인 처리 중 오류가 발생했습니다.');
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setAccessToken(null);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setAccessToken(null);
      setIsAuthenticated(false);
      setHasProfile(false);
      setShowProfileSetup(false);
      setShowProfile(false);
      setSelectedCharacter('');
      setCurrentPage('chat');
      setIsAdmin(false);
      setUserEmail('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleProfileSetupComplete = () => {
    setHasProfile(true);
    setShowProfileSetup(false);
  };

  const handleCharacterSelect = (characterId: string, chatRoomId?: string) => {
    setSelectedCharacter(characterId);
    setSelectedChatRoomId(chatRoomId || '');
  };

  const handleBackToCharacterSelection = () => {
    setSelectedCharacter('');
    setSelectedChatRoomId('');
  };

  const handlePostClick = (postId: string) => {
    setSelectedPostId(postId);
    setSelectedUserId(''); // Reset selectedUserId when viewing a post
  };

  const handleBackToCommunity = () => {
    setSelectedPostId('');
    setSelectedUserId('');
  };

  const handleLogoClick = () => {
    setCurrentPage('chat');
    setSelectedCharacter('');
    setSelectedChatRoomId('');
    setSelectedPostId('');
    setSelectedUserId('');
  };

  const handleSubmitUnbanRequest = async (reason: string) => {
    if (!suspendedInfo) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/user/unban-request`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${suspendedInfo.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: suspendedInfo.userId,
            email: suspendedInfo.email,
            reason: reason,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to submit unban request');
      }

      console.log('Unban request submitted successfully');
    } catch (error) {
      console.error('Error submitting unban request:', error);
      throw error;
    }
  };

  const handleSuspendedDialogClose = async () => {
    setShowSuspendedDialog(false);
    // Clear suspended info after dialog animation
    setTimeout(() => {
      setSuspendedInfo(null);
    }, 300);
    // Logout is handled by the dialog itself after successful submission
  };

  // 스플래시 스크린 표시
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) {
    return (
      <>
        {!showPrivacyPolicy && !showTermsOfService && (
          <LoginPage 
            onLogin={handleLogin}
            onShowPrivacyPolicy={() => setShowPrivacyPolicy(true)}
            onShowTerms={() => setShowTermsOfService(true)}
          />
        )}
        
        {showPrivacyPolicy && (
          <PrivacyPolicyPage
            onBack={() => setShowPrivacyPolicy(false)}
          />
        )}
        
        {showTermsOfService && (
          <TermsOfServicePage
            onBack={() => setShowTermsOfService(false)}
          />
        )}
      </>
    );
  }

  // Show profile setup if user hasn't completed it
  if (showProfileSetup && !hasProfile) {
    return (
      <ProfileSetupPage
        accessToken={accessToken}
        onComplete={handleProfileSetupComplete}
      />
    );
  }

  // Show profile page if requested
  if (showProfile) {
    return (
      <>
        <ProfilePage
          accessToken={accessToken}
          onClose={() => setShowProfile(false)}
          onShowPrivacyPolicy={() => {
            setShowProfile(false);
            setShowPrivacyPolicy(true);
          }}
          onShowTutorial={() => {
            setShowTutorial(true);
          }}
        />
        {/* 튜토리얼 다이얼로그 */}
        <OnboardingTutorial 
          open={showTutorial} 
          onOpenChange={setShowTutorial} 
        />
      </>
    );
  }

  // Show privacy policy or terms page if requested
  if (showPrivacyPolicy) {
    return (
      <PrivacyPolicyPage
        onBack={() => {
          setShowPrivacyPolicy(false);
          setShowProfile(true);
        }}
      />
    );
  }
  
  if (showTermsOfService) {
    return (
      <TermsOfServicePage
        onBack={() => {
          setShowTermsOfService(false);
          setShowProfile(true);
        }}
      />
    );
  }

  // Show calendar page if requested
  if (showCalendar) {
    return (
      <div className="min-h-screen bg-white" style={{ minHeight: '100dvh' }}>
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-top shadow-sm">
          <div className="px-2 sm:px-4 py-2 flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCalendar(false);
                  setCalendarKey(prev => prev + 1); // Force reload next time
                }}
                className="text-gray-600 hover:text-sky-600 active:bg-sky-50 h-9 px-2"
                style={{ touchAction: 'manipulation' }}
              >
                ← 뒤로
              </Button>
              <h1 className="text-base font-bold text-sky-800">캘린더</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCalendar(false);
                  setShowProfile(true);
                  setCalendarKey(prev => prev + 1); // Force reload next time
                }}
                className="text-gray-600 hover:text-sky-600 active:bg-sky-50 h-9 w-9"
                style={{ touchAction: 'manipulation' }}
              >
                <User className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="safe-bottom">
          <CalendarPage accessToken={accessToken!} />
        </main>
        <Footer />
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'admin':
        return <AdminPage accessToken={accessToken} />;
      case 'chat':
        if (!selectedCharacter) {
          return (
            <CharacterSelectionPage
              accessToken={accessToken}
              onCharacterSelect={handleCharacterSelect}
              onTokenRefresh={refreshToken}
            />
          );
        }
        return (
          <ChatPage
            accessToken={accessToken}
            characterId={selectedCharacter}
            chatRoomId={selectedChatRoomId}
            onBackToSelection={handleBackToCharacterSelection}
            onTokenRefresh={refreshToken}
          />
        );
      case 'diary':
        return <DiaryPage accessToken={accessToken} onEmotionUpdate={() => setCalendarKey(prev => prev + 1)} />;
      case 'report':
        return <ReportPage accessToken={accessToken} onEmotionUpdate={() => setCalendarKey(prev => prev + 1)} />;
      case 'community':
        // Show user profile page
        if (selectedUserId) {
          return (
            <UserProfilePage
              accessToken={accessToken!}
              userId={selectedUserId}
              onBack={() => setSelectedUserId('')}
              onPostClick={handlePostClick}
            />
          );
        }
        // Show post detail page
        if (selectedPostId) {
          return (
            <CommunityPostDetailPage
              accessToken={accessToken!}
              postId={selectedPostId}
              currentUserId={currentUserId}
              onBack={handleBackToCommunity}
              onUserClick={(userId) => setSelectedUserId(userId)}
            />
          );
        }
        // Show community list
        return (
        <CommunityPage
          accessToken={accessToken || ""}
          onPostClick={handlePostClick}
          onUserClick={(userId) => setSelectedUserId?.(userId)} // Optional chaining
        />
        );
      default:
        return (
          <CharacterSelectionPage
          accessToken={accessToken || ""}
          onCharacterSelect={handleCharacterSelect}
          onTokenRefresh={refreshToken}
        />
        );
    }
  };

  return (
    <ErrorBoundary>
      <div
        className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50"
        style={{ minHeight: "100dvh" }}
      >
        <header className="bg-white/90 backdrop-blur-sm border-b border-sky-100 sticky top-0 z-10 safe-top">
          <div className="max-w-3xl mx-auto px-3 py-2.5 flex items-center justify-between">
            <h1
              className="text-lg font-semibold text-sky-800 cursor-pointer hover:text-sky-600 transition-colors"
              onClick={handleLogoClick}
            >
              BreezI
            </h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCalendar?.(true)} // Optional chaining
                className="text-gray-600 hover:text-sky-600 active:bg-sky-50 h-9 w-9"
                style={{ touchAction: "manipulation" }}
              >
              <Calendar className="w-4 h-4" />
            </Button>
            {accessToken && (
              <NotificationBell 
                accessToken={accessToken} 
                onNavigateToPost={(postId) => {
                  setSelectedPostId(postId);
                  setCurrentPage('community');
                }}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfile(true)}
              className="text-gray-600 hover:text-sky-600 active:bg-sky-50 h-9 w-9"
              style={{ touchAction: 'manipulation' }}
            >
              <User className="w-4 h-4" />
            </Button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-sky-600 active:text-sky-700 transition-colors px-2 py-1"
              style={{ touchAction: 'manipulation' }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto safe-bottom px-2 sm:px-4 pb-24">
        {renderPage()}
      </main>

      <Navigation 
        currentPage={currentPage} 
        onPageChange={(page) => {
          setCurrentPage(page);
          if (page === 'chat') {
            setSelectedCharacter('');
            setSelectedChatRoomId('');
          }
          if (page === 'community') {
            setSelectedPostId('');
          }
        }}
        isAdmin={isAdmin}
      />
      
      <Footer />

      {/* Suspended Account Dialog */}
      <SuspendedAccountDialog
        open={showSuspendedDialog}
        onOpenChange={handleSuspendedDialogClose}
        suspendedInfo={suspendedInfo}
        onSubmitUnbanRequest={handleSubmitUnbanRequest}
      />
      
      {/* Toast Notifications */}
      <Toaster position="top-center" richColors />
      
      {/* Feedback Button */}
      {isAuthenticated && hasProfile && <FeedbackButton accessToken={accessToken} />}
    </div>
    
    </ErrorBoundary>
  );
}
