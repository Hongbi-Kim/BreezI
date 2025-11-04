import { useState } from 'react';
import { motion } from 'motion/react';
import { createClient } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { apiCall } from '../utils/api';
import { WaveLogoFull } from './WaveLogoFull';
import { toast } from 'sonner';

interface AuthScreenProps {
  onAuth: (accessToken: string) => void;
}

type ViewMode = 'signin' | 'signup' | 'reset';

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Create user via backend
      const signupResult = await apiCall('/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          name
        })
      }, false);

      console.log('Signup successful:', signupResult);

      // Wait a moment for the user to be fully created
      await new Promise(resolve => setTimeout(resolve, 500));

      // Sign in automatically
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error('Auto sign-in error after signup:', signInError);
        // If auto sign-in fails, show success message and redirect to login
        setSuccessMessage('회원가입이 완료되었습니다. 로그인해주세요.');
        toast.success('회원가입이 완료되었습니다. 로그인해주세요.');
        setTimeout(() => switchView('signin'), 2000);
        return;
      }

      if (data.session?.access_token) {
        console.log('[Auth] Sign up successful, session created');
        toast.success('회원가입이 완료되었습니다!');
        onAuth(data.session.access_token);
      } else {
        throw new Error('세션을 생성할 수 없습니다.');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      let errorMessage = '회원가입에 실패했습니다.';
      
      if (err.message?.includes('already registered')) {
        errorMessage = '이미 가입된 이메일입니다.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error('Signin error details:', {
          message: signInError.message,
          status: signInError.status,
          name: signInError.name
        });
        throw signInError;
      }

      if (data.session?.access_token) {
        console.log('[Auth] Sign in successful, session created');
        onAuth(data.session.access_token);
      } else {
        throw new Error('세션을 생성할 수 없습니다.');
      }
    } catch (err: any) {
      console.error('Signin error:', err);
      let errorMessage = '로그인에 실패했습니다.';
      
      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요.';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 완료되지 않았습니다.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      const successMessage = '비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.';
      setSuccessMessage(successMessage);
      toast.success(successMessage);
      setEmail('');
    } catch (err: any) {
      console.error('Reset password error:', err);
      const errorMessage = err.message || '비밀번호 재설정에 실패했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        }
      });

      if (oauthError) throw oauthError;

      // OAuth will redirect, so we don't need to handle the response here
    } catch (err: any) {
      console.error('Google login error:', err);
      const errorMessage = '구글 로그인에 실패했습니다. Supabase에서 Google OAuth를 설정해주세요.';
      setError(errorMessage);
      toast.error(errorMessage, {
        description: 'https://supabase.com/docs/guides/auth/social-login/auth-google',
        duration: 5000
      });
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}`,
        }
      });

      if (oauthError) throw oauthError;

      // OAuth will redirect, so we don't need to handle the response here
    } catch (err: any) {
      console.error('Kakao login error:', err);
      const errorMessage = '카카오 로그인에 실패했습니다. Supabase에서 Kakao OAuth를 설정해주세요.';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError('');
    setSuccessMessage('');
  };

  const switchView = (mode: ViewMode) => {
    resetForm();
    setViewMode(mode);
  };

  return (
    <div className="h-screen relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-purple-50">
      {/* Animated Wave Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-full"
            style={{
              top: `${15 + i * 15}%`,
              opacity: 0.04 - i * 0.005,
            }}
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 30 + i * 5,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <svg
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
              className="w-full h-28"
            >
              <path
                d="M0,60 Q360,10 720,60 T1440,60 L1440,120 L0,120 Z"
                fill={i % 2 === 0 ? '#3b82f6' : '#a855f7'}
              />
            </svg>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Logo and Brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="mb-4 flex justify-center">
              <WaveLogoFull size="large" animated />
            </div>
            <p className="text-lg text-gray-600 italic">Ride your inner wave</p>
          </motion.div>

          {/* Auth Form Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-100"
          >
            {viewMode === 'signin' && (
              <>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">비밀번호</Label>
                      <button
                        type="button"
                        onClick={() => switchView('reset')}
                        className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        비밀번호 찾기
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white border-gray-300"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full px-6 py-3 bg-black text-white border-2 border-black transition-all duration-200"
                    disabled={isLoading}
                    style={{
                      fontFamily: '"Arial Black", "Helvetica Bold", sans-serif',
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {isLoading ? '로그인 중...' : '로그인'}
                  </motion.button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">또는</span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="flex items-center justify-center gap-4">
                  {/* Kakao Login */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="w-12 h-12 rounded-full bg-[#FEE500] hover:bg-[#FFEB3B] flex items-center justify-center transition-all duration-200 shadow-md"
                    onClick={handleKakaoLogin}
                    disabled={isLoading}
                    title="카카오 로그인"
                  >
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 3C6.477 3 2 6.477 2 10.8c0 2.806 1.847 5.266 4.632 6.698-.194.715-.634 2.363-.73 2.746-.115.458.168.452.354.328.154-.103 2.447-1.671 3.41-2.332C10.433 18.49 11.203 18.6 12 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"
                        fill="#000000"
                      />
                    </svg>
                  </motion.button>

                  {/* Google Login */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="w-12 h-12 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center transition-all duration-200 shadow-md border border-gray-200"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    title="구글 로그인"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </motion.button>
                </div>

                <div className="mt-6 text-center text-sm text-gray-600">
                  계정이 없으신가요?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('signup')}
                    className="text-gray-900 hover:underline"
                    style={{ fontWeight: 600 }}
                  >
                    회원가입하기
                  </button>
                </div>
              </>
            )}

            {viewMode === 'signup' && (
              <>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="홍길동"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-white border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">비밀번호</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="최소 6자 이상"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-white border-gray-300"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full px-6 py-3 bg-black text-white border-2 border-black transition-all duration-200"
                    disabled={isLoading}
                    style={{
                      fontFamily: '"Arial Black", "Helvetica Bold", sans-serif',
                      fontWeight: 900,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {isLoading ? '가입 중...' : '회원가입'}
                  </motion.button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                  이미 계정이 있으신가요?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('signin')}
                    className="text-gray-900 hover:underline"
                    style={{ fontWeight: 600 }}
                  >
                    로그인하기
                  </button>
                </div>
              </>
            )}

            {viewMode === 'reset' && (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white border-gray-300"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full px-6 py-3 bg-black text-white border-2 border-black transition-all duration-200"
                    disabled={isLoading}
                    style={{
                      fontFamily: '"Arial Black", "Helvetica Bold", sans-serif',
                      fontWeight: 900,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {isLoading ? '전송 중...' : '재설정 링크 전송'}
                  </motion.button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                  <button
                    type="button"
                    onClick={() => switchView('signin')}
                    className="text-gray-900 hover:underline"
                    style={{ fontWeight: 600 }}
                  >
                    ← 로그인으로 돌아가기
                  </button>
                </div>
              </>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200"
              >
                {error}
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200"
              >
                {successMessage}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
