import React, { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { SuspendedAccountDialog } from './SuspendedAccountDialog';
import { TermsAgreementDialog } from './TermsAgreementDialog';

interface LoginPageProps {
  onLogin: (token: string) => void;
  onShowPrivacyPolicy?: () => void;
  onShowTerms?: () => void;
}

export function LoginPage({ onLogin, onShowPrivacyPolicy, onShowTerms }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [restoringAdmin, setRestoringAdmin] = useState(false);
  
  // Terms agreement dialog
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  
  // Suspended/Banned account dialog states
  const [suspendedDialogOpen, setSuspendedDialogOpen] = useState(false);
  const [suspendedInfo, setSuspendedInfo] = useState<{
    status: 'suspended' | 'banned';
    reason: string;
    userId: string;
    email: string;
    accessToken: string;
  } | null>(null);

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

    if (!isLogin && !isResetPassword && (!name || name.trim().length < 2)) {
      setError('이름은 최소 2자 이상이어야 합니다.');
      setLoading(false);
      return;
    }
    
    // 회원가입 시 약관 동의 확인
    if (!isLogin && !isResetPassword && !termsAgreed) {
      setShowTermsDialog(true);
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

        // Successfully logged in
        if (data.session?.access_token) {
          console.log('Login successful, session established');
          
          // Verify session was persisted
          const { data: { session: persistedSession }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session verification error:', sessionError);
            setError('세션 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
            setLoading(false);
            return;
          }
          
          if (!persistedSession) {
            console.error('Session was not persisted to storage');
            setError('로그인 세션이 저장되지 않았습니다. 브라우저 설정을 확인하거나 다시 시도해주세요.');
            setLoading(false);
            return;
          }
          
          console.log('Session verified in storage');
          
          // Check if user is suspended or banned
          const { data: { user } } = await supabase.auth.getUser(data.session.access_token);
          if (user?.id) {
            try {
              const profileResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/profile/get`,
                {
                  headers: {
                    'Authorization': `Bearer ${data.session.access_token}`,
                  },
                }
              );
              
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                
                // If user is suspended or banned, show unban request dialog
                if (profileData.profile?.status === 'suspended' || profileData.profile?.status === 'banned') {
                  const statusText = profileData.profile.status === 'suspended' ? '정지' : '차단';
                  const reason = profileData.profile.suspendReason || profileData.profile.banReason || '사유 미제공';
                  
                  console.log('🚫 Account suspended/banned:', {
                    status: profileData.profile.status,
                    suspendReason: profileData.profile.suspendReason,
                    banReason: profileData.profile.banReason,
                    reasonDisplayed: reason
                  });
                  
                  // Set suspended info and show dialog
                  setSuspendedInfo({
                    status: profileData.profile.status,
                    reason: reason,
                    userId: user.id,
                    email: user.email || '',
                    accessToken: data.session.access_token
                  });
                  setSuspendedDialogOpen(true);
                  setLoading(false);
                  return;
                }
              }
            } catch (err) {
              console.error('Profile check error:', err);
              // Continue with login even if profile check fails
            }
          }
          
          // Pass the token to trigger app state update
          console.log('Calling onLogin with token');
          onLogin(data.session.access_token);
        }
      } else {
        // Signup - use Supabase client directly to trigger email confirmation
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim(),
              full_name: name.trim()
            },
            emailRedirectTo: window.location.origin
          }
        });

        if (signUpError) {
          // Check for user already exists error
          if (signUpError.message?.includes('already been registered') || signUpError.message?.includes('User already registered')) {
            setIsLogin(true);
            setEmail('');
            setPassword('');
            setName('');
            setSuccess('이미 가입된 이메일입니다. 로그인해주세요.');
            setLoading(false);
            return;
          }
          
          // Check for email rate limit error
          if (signUpError.message?.toLowerCase().includes('email rate limit')) {
            setSuccess('이미 회원가입 이메일을 발송했을 수 있습니다. 이메일함과 스팸 메일함을 확인해주세요. (1시간 후 재시도 가능)');
            setEmailSent(true);
            setEmail('');
            setPassword('');
            setName('');
            setLoading(false);
            
            // Switch to login mode after a delay
            setTimeout(() => {
              setIsLogin(true);
              setEmailSent(false);
            }, 8000);
            return;
          }
          
          // Check for SMTP/email sending error - still create account but skip email
          if (signUpError.message?.toLowerCase().includes('error sending confirmation email') || 
              signUpError.message?.toLowerCase().includes('error sending email') ||
              signUpError.message?.toLowerCase().includes('email')) {
            console.log('Email sending failed but account may be created:', signUpError);
            setSuccess('✅ 회원가입이 완료되었습니다!\n\n바로 로그인해주세요.');
            setEmail('');
            setPassword('');
            setName('');
            setLoading(false);
            
            setTimeout(() => {
              setIsLogin(true);
            }, 2000);
            return;
          }
          
          throw signUpError;
        }

        // Show email verification message
        setEmailSent(true);
        setSuccess('✅ 회원가입 완료!\n\n인증 이메일을 발송했습니다.\n이메일을 확인하여 인증 링크를 클릭해주세요.\n\n인증 완료 후 로그인할 수 있습니다.');
        setEmail('');
        setPassword('');
        setName('');
        
        // Switch to login mode after a delay
        setTimeout(() => {
          setIsLogin(true);
          setEmailSent(false);
        }, 5000);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message || '처리에 실패했습니다.';
      
      if (error.message?.includes('Invalid login credentials')) {
        if (isLogin) {
          if (email === 'khb1620@naver.com') {
            errorMessage = '❌ 관리자 계정 로그인 실패\n\n계정이 아직 생성되지 않았거나 비밀번호가 틀렸습니다.\n\n💡 아래 "관리자 계정 긴급 복구" 버튼을 먼저 클릭하세요!\n복구 후 기본 비밀번호(admin123456)로 로그인할 수 있습니다.';
          } else {
            errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다. 계정이 없다면 회원가입을 해주세요.';
          }
        } else {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
        }
      } else if (error.message?.includes('already been registered') || error.message?.includes('User already registered')) {
        errorMessage = '';
        setIsLogin(true);
        setEmail('');
        setPassword('');
        setName('');
        setSuccess('이미 가입된 이메일입니다. 로그인해주세요.');
        setLoading(false);
        return;
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = '비밀번호는 최소 6자 이상이어야 합니다.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = '❌ 이메일 인증이 필요합니다.\n\n회원가입 시 받은 인증 이메일을 확인하여 인증 링크를 클릭해주세요.\n\n💡 이메일을 못 받으셨나요?\n스팸 메일함을 확인하거나, 새로 회원가입을 시도해주세요.';
      } else if (error.message?.toLowerCase().includes('error sending confirmation email') || 
                 error.message?.toLowerCase().includes('error sending email')) {
        // SMTP error in catch block
        errorMessage = '';
        setSuccess('✅ 회원가입이 완료되었습니다!\n\n바로 로그인해주세요.');
        setEmail('');
        setPassword('');
        setName('');
        setLoading(false);
        
        setTimeout(() => {
          setIsLogin(true);
        }, 2000);
        return;
      } else if (error.message?.toLowerCase().includes('email rate limit')) {
        errorMessage = '이메일 발송 한도를 초과했습니다.';
        if (!isLogin && !isResetPassword) {
          setSuccess('이미 회원가입 이메일을 발송했을 수 있습니다. 이메일함과 스팸 메일함을 확인해주세요. (1시간 후 재시도 가능)');
          setLoading(false);
          return;
        } else {
          errorMessage += ' 1시간 후 다시 시도하거나, 이미 발송된 이메일을 확인해주세요.';
        }
      } else if (error.message?.includes('rate limit')) {
        errorMessage = '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message?.includes('For security purposes')) {
        errorMessage = '보안을 위해 잠시 후 다시 시도해주세요.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUnbanRequest = async (reason: string) => {
    if (!suspendedInfo) return;
    
    try {
      console.log('📝 SUBMITTING UNBAN REQUEST');
      console.log('User ID:', suspendedInfo.userId);
      console.log('Email:', suspendedInfo.email);
      console.log('Reason:', reason);
      
      const requestResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/user/unban-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${suspendedInfo.accessToken}`,
          },
          body: JSON.stringify({
            userId: suspendedInfo.userId,
            email: suspendedInfo.email,
            reason: reason,
          }),
        }
      );
      
      console.log('Response status:', requestResponse.status);
      
      if (!requestResponse.ok) {
        const errorText = await requestResponse.text();
        console.error('❌ UNBAN REQUEST FAILED:', errorText);
        throw new Error(errorText || '요청 제출에 실패했습니다');
      }
      
      const responseData = await requestResponse.json();
      console.log('✅ UNBAN REQUEST SUCCESS!', responseData);
      
      // Sign out after successful submission
      await supabase.auth.signOut();
    } catch (err) {
      console.error('❌ UNBAN REQUEST EXCEPTION:', err);
      throw err;
    }
  };

  const handleRestoreAdmin = async () => {
    if (!confirm('관리자 계정을 복구하시겠습니까?')) {
      return;
    }

    setRestoringAdmin(true);
    setError('');
    setSuccess('');

    try {
      console.log('🚨 EMERGENCY: Restoring admin account...');
      console.log('Target URL:', `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/restore-admin`);
      console.log('Using publicAnonKey for authorization');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/restore-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);

      // Try to parse response body
      let data;
      const responseText = await response.text();
      console.log('Response body (text):', responseText);
      
      try {
        data = JSON.parse(responseText);
        console.log('Response body (parsed):', data);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`서버 응답 파싱 실패: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        console.error('Restore failed with error:', data);
        throw new Error(data.error || data.details || '관리자 계정 복구 실패');
      }

      console.log('✅ Admin account restored successfully:', data);
      setSuccess('✅ 관리자 계정이 복구되었습니다!\n\n📧 이메일: khb1620@naver.com\n🔑 비밀번호: admin123456\n\n위 정보로 로그인하세요.');
    } catch (err: any) {
      console.error('❌ Restore admin error:', err);
      console.error('Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });
      
      // Show detailed error message
      const errorMessage = err.message || '관리자 계정 복구 중 오류가 발생했습니다.';
      setError(`복구 실패: ${errorMessage}`);
    } finally {
      setRestoringAdmin(false);
    }
  };

  const handleKakaoLogin = async () => {
    // 회원가입 모드일 때만 약관 동의 필요
    if (!isLogin && !termsAgreed) {
      setShowTermsDialog(true);
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Starting Kakao OAuth login...');
      console.log('Current origin:', window.location.origin);
      
      // Use Supabase OAuth for Kakao login
      // IMPORTANT: You must configure Kakao as a provider in your Supabase dashboard
      // Follow instructions at: https://supabase.com/docs/guides/auth/social-login/auth-kakao
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        console.error('OAuth signInWithOAuth error:', error);
        throw error;
      }

      console.log('OAuth initiated successfully:', data);
      console.log('OAuth URL:', data.url);
      
      // If we have a URL, force a full page redirect
      if (data?.url) {
        console.log('Redirecting to Kakao login page...');
        window.location.href = data.url;
        return;
      }
      
      // The browser should automatically redirect to Kakao
      // After successful login, user will be redirected back and auth state will update
      
    } catch (error: any) {
      console.error('Kakao login error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      
      let errorMessage = error.message || '카카오 로그인에 실패했습니다.';
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md sm:max-w-lg shadow-xl">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-3 rounded-2xl">
              <Heart className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            BreezI
          </CardTitle>
          <p className="text-sm text-gray-600">
            {isResetPassword 
              ? '비밀번호 재설정' 
              : isLogin 
                ? 'AI와 함께하는 마음 케어' 
                : '새로운 마음의 여정을 시작해보세요'}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 whitespace-pre-line">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg whitespace-pre-line">
              {success}
              {success.includes('바로 로그인') && (
                <div className="mt-3 text-xs text-gray-500 border-t border-green-200 pt-3">
                  <p>💡 이메일 인증 없이 바로 로그인할 수 있습니다.</p>
                  <p className="mt-1 text-purple-600">2초 후 로그인 화면으로 이동합니다...</p>
                </div>
              )}
              {emailSent && !success.includes('바로 로그인') && (
                <div className="mt-3 text-xs text-gray-600 border-t border-green-200 pt-3">
                  <p className="font-medium">💡 이메일이 오지 않나요?</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>스팸 메일함을 확인해주세요</li>
                    <li>이메일 주소가 정확한지 확인해주세요</li>
                    <li>Supabase에서 SMTP 설정이 완료되었는지 확인해주세요</li>
                  </ul>
                  <p className="mt-2 text-purple-600">5초 후 로그인 화면으로 이동합니다...</p>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isResetPassword && (
              <div>
                <label className="block text-sm mb-2 text-gray-700">이름</label>
                <Input
                  type="text"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin && !isResetPassword}
                  className="w-full"
                  disabled={loading}
                />
              </div>
            )}
{/* 
            <div>
              <label className="block text-sm mb-2 text-gray-700">이메일</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                disabled={loading}
              />
            </div>

            {!isResetPassword && (
              <div>
                <label className="block text-sm mb-2 text-gray-700">비밀번호</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full"
                  disabled={loading}
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={loading}
            >
              {loading ? '처리중...' : isResetPassword ? '재설정 링크 보내기' : isLogin ? '로그인' : '회원가입'}
            </Button> */}
          </form>

          {!isResetPassword && (
            <>
              {/* <div className="relative"> */}
                {/* <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div> */}
                {/* <div className="relative flex justify-center text-xs"> */}
                  {/* <span className="px-2 bg-white text-gray-500">또는</span> */}
                {/* </div> */}
              {/* </div> */}

              <Button
                type="button"
                onClick={handleKakaoLogin}
                className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] flex items-center justify-center gap-2"
                disabled={loading}
              >
                <MessageCircle className="w-5 h-5" />
                카카오로 {isLogin ? '로그인' : '3초 만에 시작하기'}
              </Button>
              
              <p></p>
{/*               
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                <p className="mb-1">
                  <strong>⚠️ 카카오 로그인 설정 필요</strong>
                </p>
                <p className="leading-relaxed">
                  카카오 로그인을 사용하려면 Supabase 대시보드에서 
                  카카오를 OAuth 제공자로 설정해야 합니다.
                </p>
                <a 
                  href="https://supabase.com/docs/guides/auth/social-login/auth-kakao"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:text-amber-800 underline mt-1 inline-block"
                >
                  설정 가이드 보기 →
                </a>
              </div> */}
            </>
          )}
{/* 
          <div className="text-center space-y-2 pt-2">
            {!isResetPassword && (
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-purple-600 hover:text-purple-700 hover:underline"
                disabled={loading}
              >
                {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
              </button>
            )}
            
            {isLogin && !isResetPassword && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsResetPassword(true)}
                  className="text-sm text-gray-600 hover:text-gray-700 hover:underline"
                  disabled={loading}
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            )}

            {isResetPassword && (
              <button
                type="button"
                onClick={() => setIsResetPassword(false)}
                className="text-sm text-gray-600 hover:text-gray-700 hover:underline"
                disabled={loading}
              >
                로그인으로 돌아가기
              </button>
            )}

            {isLogin && !isResetPassword && email === 'khb1620@naver.com' && (
              <div className="pt-3 border-t border-red-200 mt-3">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-3">
                  <p className="text-xs text-blue-800">
                    <strong>💡 관리자 계정 안내</strong>
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    처음 사용하시나요? 아래 복구 버튼을 클릭하여 계정을 생성하세요.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    기본 비밀번호: <code className="bg-blue-100 px-1 rounded">admin123456</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRestoreAdmin}
                  className="w-full text-sm bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 p-3 rounded-lg transition-colors"
                  disabled={loading || restoringAdmin}
                >
                  {restoringAdmin ? '⏳ 복구 중...' : '🚨 관리자 계정 생성/복구'}
                </button>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  계정 생성, 차단 해제, 비밀번호 초기화
                </p>
              </div>
            )}
          </div> */}
        </CardContent>
      </Card>

      {/* Terms Agreement Dialog */}
      <TermsAgreementDialog
        open={showTermsDialog}
        onAgree={() => {
          setTermsAgreed(true);
          setShowTermsDialog(false);
          // 약관 동의 후 자동으로 회원가입 진행
          setTimeout(() => {
            if (loading) {
              // 이미 카카오 로그인 프로세스가 시작된 경우 재시작
              handleKakaoLogin();
            } else {
              // 일반 회원가입인 경우
              const form = document.querySelector('form');
              if (form) {
                form.requestSubmit();
              }
            }
          }, 100);
        }}
        onDisagree={() => {
          setShowTermsDialog(false);
          setTermsAgreed(false);
          setLoading(false); // 로딩 상태 초기화
        }}
        onViewTerms={() => {
          setShowTermsDialog(false);
          if (onShowTerms) {
            onShowTerms();
          }
        }}
        onViewPrivacy={() => {
          setShowTermsDialog(false);
          if (onShowPrivacyPolicy) {
            onShowPrivacyPolicy();
          }
        }}
      />

      {/* Suspended Account Dialog */}
      <SuspendedAccountDialog
        open={suspendedDialogOpen}
        onOpenChange={(open) => {
          setSuspendedDialogOpen(open);
          if (!open) {
            // Reset state when dialog closes
            setSuspendedInfo(null);
          }
        }}
        suspendedInfo={suspendedInfo}
        onSubmitUnbanRequest={handleSubmitUnbanRequest}
      />
    </div>
  );
}
