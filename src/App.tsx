import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { ChatPage } from './components/ChatPage';
import { DiaryPage } from './components/DiaryPage';
import { ReportPage } from './components/ReportPage';
import { Navigation } from './components/Navigation';
import { supabase } from './utils/supabase/client';

type Page = 'chat' | 'diary' | 'report';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

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

  const handleLogin = (token: string) => {
    setAccessToken(token);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setAccessToken(null);
      setIsAuthenticated(false);
      setCurrentPage('chat');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
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

  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        return <ChatPage accessToken={accessToken!} />;
      case 'diary':
        return <DiaryPage accessToken={accessToken!} />;
      case 'report':
        return <ReportPage accessToken={accessToken!} />;
      default:
        return <ChatPage accessToken={accessToken!} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-purple-800">마음돌봄</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-20">
        {renderPage()}
      </main>

      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}