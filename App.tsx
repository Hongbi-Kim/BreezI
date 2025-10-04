import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { ProfileSetupPage } from './components/ProfileSetupPage';
import { ProfilePage } from './components/ProfilePage';
import { CharacterSelectionPage } from './components/CharacterSelectionPage';
import { ChatPage } from './components/ChatPage';
import { DiaryPage } from './components/DiaryPage';
import { ReportPage } from './components/ReportPage';
import { EmotionCarePage } from './components/EmotionCarePage';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { User } from 'lucide-react';
import { Button } from './components/ui/button';
import { supabase } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info';

type Page = 'chat' | 'diary' | 'report' | 'emotion-care';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      checkProfile();
    }
  }, [isAuthenticated, accessToken]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkProfile = async () => {
    if (!accessToken) return;

    setProfileLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/profile/check`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHasProfile(data.hasProfile);
        if (!data.hasProfile) {
          setShowProfileSetup(true);
        }
      }
    } catch (error) {
      console.error('Profile check error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogin = (token: string) => {
    setAccessToken(token);
    setIsAuthenticated(true);
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

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show profile setup if user hasn't completed it
  if (showProfileSetup && !hasProfile) {
    return (
      <ProfileSetupPage
        accessToken={accessToken!}
        onComplete={handleProfileSetupComplete}
      />
    );
  }

  // Show profile page if requested
  if (showProfile) {
    return (
      <ProfilePage
        accessToken={accessToken!}
        onClose={() => setShowProfile(false)}
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        if (!selectedCharacter) {
          return (
            <CharacterSelectionPage
              accessToken={accessToken!}
              onCharacterSelect={handleCharacterSelect}
            />
          );
        }
        return (
          <ChatPage
            accessToken={accessToken!}
            characterId={selectedCharacter}
            chatRoomId={selectedChatRoomId}
            onBackToSelection={handleBackToCharacterSelection}
          />
        );
      case 'diary':
        return <DiaryPage accessToken={accessToken!} />;
      case 'report':
        return <ReportPage accessToken={accessToken!} />;
      case 'emotion-care':
        return <EmotionCarePage accessToken={accessToken!} />;
      default:
        return (
          <CharacterSelectionPage
            accessToken={accessToken!}
            onCharacterSelect={handleCharacterSelect}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-purple-800">BreezI</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfile(true)}
              className="text-gray-600 hover:text-purple-600"
            >
              <User className="w-4 h-4" />
            </Button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-20">
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
        }} 
      />
      
      <Footer />
    </div>
  );
}