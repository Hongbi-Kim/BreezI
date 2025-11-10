import { useState, useEffect, useRef } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { ProfileSetup } from './components/ProfileSetup';
import { HomeTab } from './components/HomeTab';
import { WaveTab } from './components/WaveTab';
import { ChatTab } from './components/ChatTab';
import { DiaryTab } from './components/DiaryTab';
import { ReportTab } from './components/ReportTab';
import { ProfileTab } from './components/ProfileTab';
import { AdminTab } from './components/AdminTab';
import { FeedbackDialog } from './components/FeedbackDialog';
import { NotificationDialog } from './components/NotificationDialog';
import { WaveLogoFull } from './components/WaveLogoFull';
import { OnboardingTour } from './components/OnboardingTour';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { MessageSquare, BookOpen, BarChart3, User, Shield, Bell, Waves } from 'lucide-react';
import { Button } from './components/ui/button';
import { createClient } from './utils/supabase/client';
import { apiCall } from './utils/api';
import { DataCacheProvider } from './utils/dataCache';
import { logUserAction } from './utils/logUserAction';
import { toast } from 'sonner';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [reportKey, setReportKey] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkAuth();

    // Supabase 세션 상태 변경 리스너 설정
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[App] Auth state changed:', event);

      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        // Profile setup check will be done by checkAuth or subsequent calls
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setNeedsProfileSetup(false);
        setIsAdmin(false);
        setHasEnteredApp(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('[App] Token refreshed successfully');
        // Session is automatically updated, no action needed
      } else if (event === 'USER_UPDATED' && session) {
        console.log('[App] User updated');
      }
    });

    // Cleanup listener on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && !needsProfileSetup && hasEnteredApp) {
      loadUnreadCount();
      loadNotifications();
      
      // Refresh unread count and notifications every 60 seconds (increased from 30s)
      const interval = setInterval(() => {
        // Only refresh if page is visible (user is actively using the app)
        if (document.visibilityState === 'visible') {
          loadUnreadCount();
          loadNotifications();
        }
      }, 60000); // Changed to 60 seconds
      
      // Also refresh when user returns to the tab
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isAuthenticated) {
          console.log('[App] Page became visible, refreshing data...');
          loadUnreadCount();
          loadNotifications();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isAuthenticated, needsProfileSetup, hasEnteredApp]);

  // Initialize audio for notification sound
  useEffect(() => {
    // Create a simple notification sound using Web Audio API
    audioRef.current = new Audio();
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKzn77FgGwU7k9n0y3krBSh+zPLaizsKGGS56+ibUBELTKXh8LhjHAU2jdXzzn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBSh7yfDdkT0KGWW76+mYThEKTKPh8LdjHAU3jtb0zn0vBQ==';
  }, []);

  const loadUnreadCount = async () => {
    try {
      const data = await apiCall('/chat/unread-count');
      setUnreadCount(data.unreadCount || 0);
    } catch (error: any) {
      // Silently handle network errors and session issues
      if (error.message?.includes('Failed to fetch')) {
        console.log('[App] Network error loading unread count, will retry later');
        return;
      }
      
      if (error.message?.includes('No valid session')) {
        console.log('[App] No valid session, checking auth state...');
        // Don't immediately logout, verify session first
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[App] Session truly invalid, logging out');
          handleAuthError();
        }
        return;
      }
      
      // Session expired error from API
      if (error.message?.includes('Session expired')) {
        console.log('[App] Session expired, logging out');
        handleAuthError();
        return;
      }
      
      console.error('Failed to load unread count:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await apiCall('/notifications');
      const newNotifications = data.notifications || [];
      
      // If there are new notifications and we haven't played sound yet
      if (newNotifications.length > 0 && notifications.length === 0 && !hasPlayedSound) {
        playNotificationSound();
        setHasPlayedSound(true);
      } else if (newNotifications.length > notifications.length && notifications.length > 0) {
        // New notification arrived
        playNotificationSound();
      }
      
      setNotifications(newNotifications);
    } catch (error: any) {
      // Silently handle network errors and session issues
      if (error.message?.includes('Failed to fetch')) {
        console.log('[App] Network error loading notifications, will retry later');
        return;
      }
      
      if (error.message?.includes('No valid session')) {
        console.log('[App] No valid session for notifications, checking auth state...');
        // Don't immediately logout, verify session first
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[App] Session truly invalid, logging out');
          handleAuthError();
        }
        return;
      }
      
      // Session expired error from API
      if (error.message?.includes('Session expired')) {
        console.log('[App] Session expired, logging out');
        handleAuthError();
        return;
      }
      
      console.error('Failed to load notifications:', error);
    }
  };

  const handleAuthError = async () => {
    console.log('Authentication error detected, clearing session...');
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setNeedsProfileSetup(false);
    setIsAdmin(false);
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    }
  };

  const handleNotificationsRead = () => {
    setNotifications([]);
    setHasPlayedSound(false);
  };

  const checkAuth = async () => {
    try {
      // Check if user has existing session
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[App] Error getting session:', sessionError);
        setIsLoading(false);
        return;
      }

      if (session?.access_token) {
        console.log('[App] Active session found, expires at:', new Date(session.expires_at! * 1000).toLocaleString());
        
        // Verify profile exists
        try {
          const profileData = await apiCall('/profile');
          if (!profileData.profile || !profileData.profile.nickname) {
            setNeedsProfileSetup(true);
          } else {
            // Check if admin
            if (profileData.email === 'khb1620@naver.com') {
              setIsAdmin(true);
            }
          }
        } catch (error: any) {
          // Handle different error types more carefully
          if (error.message?.includes('Failed to fetch')) {
            console.log('[App] Network error during profile check, continuing with session');
            // Continue with authenticated state - network issues shouldn't log user out
          } else if (error.message?.includes('No valid session')) {
            // Verify again if session is truly invalid
            console.log('[App] Session might be invalid, verifying...');
            const { data: { session: recheck } } = await supabase.auth.getSession();
            if (!recheck) {
              console.log('[App] Session confirmed invalid, signing out...');
              await handleAuthError();
              setIsLoading(false);
              return;
            }
          } else if (error.message?.includes('Session expired')) {
            // Session definitely expired
            console.log('[App] Session expired, signing out...');
            await handleAuthError();
            setIsLoading(false);
            return;
          } else {
            console.error('[App] Profile check error:', error);
            // Don't logout on unknown errors during initial load
          }
        }

        setIsAuthenticated(true);
      } else {
        console.log('[App] No active session found');
      }
    } catch (error: any) {
      console.error('[App] Auth check error:', error);
      // Don't logout on unexpected errors
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (accessToken: string) => {
    setIsAuthenticated(true);
    
    // Check if profile setup is needed
    const needsSetup = localStorage.getItem('needs_profile_setup') === 'true';
    setNeedsProfileSetup(needsSetup);
    
    if (!needsSetup) {
      // Check if admin
      try {
        const profileData = await apiCall('/profile');
        if (profileData.email === 'khb1620@naver.com') {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Profile check error:', error);
      }
    }
  };

  const handleProfileSetupComplete = async () => {
    setNeedsProfileSetup(false);
    
    // Check if admin
    try {
      const profileData = await apiCall('/profile');
      if (profileData.email === 'khb1620@naver.com') {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Profile check error:', error);
    }

    // Show onboarding for new users
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setNeedsProfileSetup(false);
    setIsAdmin(false);
    setHasEnteredApp(false);
    setActiveTab('chat');
  };

  const handleEnterApp = () => {
    setHasEnteredApp(true);
    setActiveTab('wave');
    
    // Show onboarding for new users after entering app
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding && !needsProfileSetup) {
      setTimeout(() => setShowOnboarding(true), 500);
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
    toast.success('환영합니다! Wave I와 함께 여정을 시작해보세요 🌊');
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <WaveLogoFull size="large" animated />
          <p className="text-gray-600 mt-4">Ride your inner wave</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  if (needsProfileSetup) {
    return <ProfileSetup onComplete={handleProfileSetupComplete} />;
  }

  // Show landing page if user hasn't entered app yet
  if (!hasEnteredApp) {
    return <HomeTab onEnterApp={handleEnterApp} />;
  }

  const tabs = [
    { id: 'wave', label: 'Wave', icon: Waves },
    { id: 'chat', label: '채팅', icon: MessageSquare },
    { id: 'diary', label: '일기', icon: BookOpen },
    { id: 'report', label: '리포트', icon: BarChart3 },
    { id: 'profile', label: '프로필', icon: User },
    ...(isAdmin ? [{ id: 'admin', label: '관리자', icon: Shield }] : []),
  ];

  return (
    <ErrorBoundary>
      <DataCacheProvider>
      <div className="fixed inset-0 flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b flex-shrink-0">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <button 
              onClick={() => setHasEnteredApp(false)}
              className="hover:opacity-70 transition-opacity"
            >
              <WaveLogoFull size="small" />
            </button>
            <div className="flex items-center gap-2">
              <FeedbackDialog
                trigger={
                  <Button variant="ghost" size="icon" className="relative">
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                }
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-hidden">
            {activeTab === 'wave' && <WaveTab />}
            {activeTab === 'chat' && <ChatTab />}
            {activeTab === 'diary' && <DiaryTab />}
            {activeTab === 'report' && <ReportTab key={reportKey} />}
            {activeTab === 'profile' && <ProfileTab onSignOut={handleSignOut} />}
            {activeTab === 'admin' && isAdmin && <AdminTab />}
          </div>
        </main>

        {/* Notification Dialog */}
        <NotificationDialog
          open={showNotifications}
          onOpenChange={setShowNotifications}
          notifications={notifications}
          onNotificationsRead={handleNotificationsRead}
        />

        {/* Bottom Navigation */}
        <nav className="bg-white border-t flex-shrink-0 safe-area-bottom">
          <div className="flex justify-around items-center h-16">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    // Log tab view
                    if (tab.id !== 'admin') {
                      logUserAction('view', tab.id);
                    }
                    // Refresh report when switching to report tab
                    if (tab.id === 'report') {
                      setReportKey(prev => prev + 1);
                    }
                    // Refresh unread count when switching to chat tab
                    if (tab.id === 'chat') {
                      loadUnreadCount();
                    }
                  }}
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
        
        {/* Toast Notifications */}
        <Toaster />

        {/* Onboarding Tour */}
        {showOnboarding && (
          <OnboardingTour
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        )}
      </div>
    </DataCacheProvider>
    </ErrorBoundary>
  );
}
