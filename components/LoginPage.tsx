import React, { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Basic validation
    if (!email || !email.includes('@')) {
      setError('올바른 이메일 주소를 입력해주세요.');
      setLoading(false);
      return;
    }

    if (!isResetPassword && (!password || password.length < 6)) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      setLoading(false);
      return;
    }



    try {
      if (isResetPassword) {
        // Password reset
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });

        if (error) {
          throw error;
        }

        setSuccess('비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.');
        setIsResetPassword(false);
      } else if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (data.session?.access_token) {
          onLogin(data.session.access_token);
        }
      } else {
        // Signup
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-58f75568/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '회원가입에 실패했습니다.');
        }

        // Show success message and switch to login mode
        setSuccess('회원가입이 완료되었습니다. 로그인해주세요.');
        setIsLogin(true);
        setPassword(''); // Clear password for security
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message || '처리에 실패했습니다.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (error.message?.includes('User already registered')) {
        errorMessage = '이미 있는 계정입니다. 같은 이메일로는 회원가입할 수 없습니다.';
        setIsLogin(true);
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = '비밀번호는 최소 6자 이상이어야 합니다.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message?.includes('For security purposes')) {
        errorMessage = '보안을 위해 잠시 후 다시 시도해주세요.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-purple-800">BreezI</h1>
          </div>
          <CardTitle className="text-lg text-gray-700">
            AI와 함께하는 마음 관리
          </CardTitle>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-2">
            <MessageCircle className="w-4 h-4" />
            <span>감정을 나누고 마음을 돌보세요</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                required
              />
            </div>

            {!isResetPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                {success}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? '처리 중...' : 
                isResetPassword ? '비밀번호 재설정 이메일 보내기' : 
                isLogin ? '로그인' : '회원가입'}
            </Button>
          </form>

          <div className="text-center space-y-2">
            
            {!isResetPassword && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 block"
                >
                  {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                </button>
                
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassword(true);
                      setError('');
                      setSuccess('');
                    }}
                    className="text-sm text-gray-600 hover:text-purple-600"
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                )}
              </>
            )}
            
            {isResetPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsResetPassword(false);
                  setError('');
                  setSuccess('');
                }}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                로그인으로 돌아가기
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}