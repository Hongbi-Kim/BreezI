import React, { useState, useEffect } from 'react';
import { User, Calendar, MessageCircle, Heart, Edit, Save, X, AlertCircle, Info, MessageSquare, UserX, ExternalLink, Crown, Sparkles, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { ProCard } from './ProCard';

interface ProfilePageProps {
  accessToken: string;
  onClose: () => void;
  onShowPrivacyPolicy: () => void;
  onShowTutorial: () => void;
}

interface UserProfile {
  nickname: string;
  birthDate: string;
  characterInfo: string;
  greeting?: string;
  name?: string;
  email?: string;
  isPro?: boolean;
  proExpireDate?: string;
}

export function ProfilePage({ accessToken, onClose, onShowPrivacyPolicy, onShowTutorial }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState({
    nickname: '',
    characterInfo: '',
    greeting: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteReasonOther, setDeleteReasonOther] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showGoodbyeDialog, setShowGoodbyeDialog] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/profile/get`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setEditData({
          nickname: data.profile.nickname,
          characterInfo: data.profile.characterInfo || '',
          greeting: data.profile.greeting || '',
        });
      } else {
        setError('프로필을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setError('프로필 로딩 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/profile/update`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(editData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setEditing(false);
        setSuccess('프로필이 성공적으로 업데이트되었습니다.');
      } else {
        const data = await response.json();
        setError(data.error || '프로필 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setError('프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditData({
        nickname: profile.nickname,
        characterInfo: profile.characterInfo || '',
        greeting: profile.greeting || '',
      });
    }
    setEditing(false);
    setError('');
    setSuccess('');
    setNicknameAvailable(null);
  };

  const checkNickname = async (nickname: string) => {
    if (!nickname.trim()) {
      setNicknameAvailable(null);
      return;
    }

    // If nickname hasn't changed, don't check
    if (profile && nickname === profile.nickname) {
      setNicknameAvailable(null);
      return;
    }

    setNicknameChecking(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/profile/check-nickname`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ nickname }),
        }
      );

      if (response.status === 401) {
        // Unauthorized - silently fail
        console.log('Authentication required for nickname check');
        setNicknameAvailable(null);
        return;
      }

      const data = await response.json();
      setNicknameAvailable(data.available);
    } catch (error) {
      console.error('Nickname check error:', error);
      setNicknameAvailable(null);
    } finally {
      setNicknameChecking(false);
    }
  };

  // Debounce nickname check
  useEffect(() => {
    if (editing) {
      const timer = setTimeout(() => {
        if (editData.nickname) {
          checkNickname(editData.nickname);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [editData.nickname, editing]);

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error('피드백 내용을 입력해주세요');
      return;
    }

    setFeedbackSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/feedback/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            content: feedbackText.trim(),
          }),
        }
      );

      if (response.ok) {
        toast.success('✨ 소중한 피드백 감사합니다!\n더 나은 서비스를 만들겠습니다.');
        setFeedbackText('');
        setShowFeedbackDialog(false);
      } else {
        toast.error('피드백 전송에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('피드백 전송 중 오류가 발생했습니다. 네트워크를 확인해주세요.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteReason) {
      toast.error('탈퇴 이유를 선택해주세요.');
      return;
    }

    if (deleteReason === 'other' && !deleteReasonOther.trim()) {
      toast.error('���타 이유를 입력해주세요.');
      return;
    }

    setDeletingAccount(true);

    try {
      const finalReason = deleteReason === 'other' ? deleteReasonOther.trim() : deleteReason;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/user/delete`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            reason: finalReason,
          }),
        }
      );

      if (response.ok) {
        await supabase.auth.signOut();
        setShowDeleteDialog(false);
        setShowGoodbyeDialog(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Account deletion failed:', errorData);
        toast.error(`회원탈퇴에 실패했습니다.\n${errorData.details || ''}\n다시 시도해주세요.`);
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('회원탈퇴 중 오류가 발생했습니다. 네트워크를 확인해주세요.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">프로필을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">프로필을 찾을 수 없습니다.</p>
          <Button onClick={onClose} className="mt-4">돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">내 프로필</h1>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* 프로필 정보 카드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  프로필 정보
                </div>
                {!editing && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit className="w-4 h-4 mr-1" />
                    수정
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 이름 (읽기 전용) */}
              {profile.name && (
                <div className="space-y-2">
                  <Label>이름</Label>
                  <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                    <p className="font-medium">{profile.name}</p>
                  </div>
                </div>
              )}

              {/* 이메일 (읽기 전용) */}
              {profile.email && (
                <div className="space-y-2">
                  <Label>이메일</Label>
                  <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                    <p className="text-gray-700">{profile.email}</p>
                  </div>
                </div>
              )}

              {/* 닉네임 */}
              <div className="space-y-2">
                <Label>닉네임</Label>
                {editing ? (
                  <>
                    <div className="relative">
                      <Input
                        value={editData.nickname}
                        onChange={(e) => {
                          setEditData(prev => ({ ...prev, nickname: e.target.value }));
                          setNicknameAvailable(null);
                        }}
                        placeholder="닉네임을 입력해주세요"
                        className={
                          nicknameAvailable === false 
                            ? 'border-red-500' 
                            : nicknameAvailable === true 
                            ? 'border-green-500' 
                            : ''
                        }
                      />
                      {nicknameChecking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                        </div>
                      )}
                    </div>
                    {nicknameAvailable === false && (
                      <p className="text-sm text-red-600">이미 사용 중인 닉네임입니다</p>
                    )}
                    {nicknameAvailable === true && (
                      <p className="text-sm text-green-600">사용 가능한 닉네임입니다</p>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{profile.nickname}</p>
                  </div>
                )}
              </div>

              {/* 생년월일 (수정 불가) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  생년월일
                </Label>
                <div className="p-3 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">{formatDate(profile.birthDate)}</p>
                    <p className="text-xs text-gray-500">생년월일은 수정할 수 없습니다</p>
                  </div>
                </div>
              </div>

              {/* 인사말 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  인사말 (커뮤니티에 표시)
                </Label>
                {editing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editData.greeting}
                      onChange={(e) => {
                        if (e.target.value.length <= 100) {
                          setEditData(prev => ({ ...prev, greeting: e.target.value }));
                        }
                      }}
                      placeholder="다른 사용자에게 보여질 인사말을 입력하세요."
                      className="min-h-[80px] resize-none"
                      maxLength={100}
                    />
                    <div className="text-xs text-gray-500 text-right">
                      {editData.greeting.length}/100글자
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {profile.greeting || '인사말이 없습니다'}
                    </p>
                  </div>
                )}
              </div>

              {/* 캐릭터가 알면 좋은 정보 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  캐릭터가 알면 좋은 정보
                </Label>
                {editing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editData.characterInfo}
                      onChange={(e) => {
                        if (e.target.value.length <= 200) {
                          setEditData(prev => ({ ...prev, characterInfo: e.target.value }));
                        }
                      }}
                      placeholder="캐릭터가 더 나은 대화를 위해 알면 좋을 정보를 적어주세요. (예: 취미, 관심사, 성격 등)"
                      className="min-h-[100px] resize-none"
                      maxLength={200}
                    />
                    <div className="text-xs text-gray-500 text-right">
                      {editData.characterInfo.length}/200글자
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {profile.characterInfo || '입력된 정보가 없습니다.'}
                    </p>
                  </div>
                )}
              </div>

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

              {editing && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving || nicknameChecking || nicknameAvailable === false}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {saving ? '저장 중...' : '저장'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="flex-1">
                    취소
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pro 요금제 카드 */}
          <ProCard isPro={profile.isPro} proExpireDate={profile.proExpireDate} />

          {/* 서비스 정보 카드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-600" />
                서비스 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 서비스 소개 */}
              <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Info className="w-4 h-4 mr-2" />
                    BreezI 소개
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>BreezI 소개</DialogTitle>
                    <DialogDescription>
                      마음을 위한 따뜻한 AI 심리 케어 서비스입니다.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="pt-4 space-y-4 text-left">
                    <div>
                      <h3 className="font-semibold text-purple-700 mb-2">마음을 위한 따뜻한 공간</h3>
                      <p className="text-sm text-gray-700">
                        BreezI는 AI 캐릭터와의 대화를 통해 감정을 털어놓고, 일기와 리포트로 마음을 관리할 수 있는 심리 케어 서비스입니다.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-purple-700 mb-2">주요 기능</h3>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>AI 캐릭터와의 따뜻한 대화 (최대 3개 채팅방)</li>
                        <li>감정 기록과 한 줄 일기</li>
                        <li>주간·월��� 감정 패턴 분석 리포트</li>
                        <li>마음을 공유하는 커뮤니티</li>
                        <li>일정과 할 일 관리</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-purple-700 mb-2">기본 감정</h3>
                      <p className="text-sm text-gray-700">
                        기쁨, 슬픔, 화남, 불안 4가지 감정으로 하루를 기록하고 패턴을 분석합니다.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* 피드백 보내기 */}
              <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    피드백 보내기
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>피드백 보내기</DialogTitle>
                    <DialogDescription>
                      BreezI를 더 좋게 만들기 위한 여러분의 의견을 들려주세요.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="개선 아이디어, 불편한 점, 칭찬 등 무엇이든 좋습니다!"
                      className="min-h-[150px] resize-none"
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 text-right">
                      {feedbackText.length}/500글자
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSubmitFeedback}
                        disabled={feedbackSubmitting || !feedbackText.trim()}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        {feedbackSubmitting ? '전송 중...' : '전송'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowFeedbackDialog(false);
                          setFeedbackText('');
                        }}
                        className="flex-1"
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* 개인정보처리방침 및 튜토리얼 카드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <Info className="w-5 h-5" />
                도움말 및 정책
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={onShowTutorial}
              >
                <span>튜토리얼 보기</span>
                <span className="text-xl">📖</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={onShowPrivacyPolicy}
              >
                <span>개인정보처리방침</span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* 계정 관리 카드 */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <UserX className="w-5 h-5" />
                계정 관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <UserX className="w-4 h-4 mr-2" />
                    회원탈퇴
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-red-600">정말 탈퇴하시겠습니까?</DialogTitle>
                    <DialogDescription>
                      탈퇴하시기 전에 아래 내용을 확인해주세요.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* 데이터 삭제 안내 */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm text-gray-700 mb-2">회원탈퇴 시 다음 데이터가 <span className="font-semibold text-red-600">영구적으로 삭제</span>됩니다:</p>
                        <ul className="list-disc list-inside text-sm space-y-1 text-red-600 ml-2">
                          <li>프로필 정보 (닉네임, 생년월일 등)</li>
                          <li>모든 채팅 내역</li>
                          <li>일기 및 감정 기록</li>
                          <li>작성한 커뮤니티 게시글</li>
                          <li>캘린더 일정 및 할 일</li>
                          <li>알림 및 활동 기록</li>
                        </ul>
                      </div>
                      
                      <div className="pt-2 border-t border-red-200">
                        <p className="text-sm text-gray-700 mb-2">다음 데이터는 <span className="font-semibold text-blue-600">악용 방지를 위해 1년간 보관</span>됩니다:</p>
                        <ul className="list-disc list-inside text-sm space-y-1 text-blue-600 ml-2">
                          <li>이메일 주소</li>
                          <li>신고 당한 이력 (신고한 이력은 즉시 삭제)</li>
                          <li>경고 및 정지 이력</li>
                          <li>IP 주소</li>
                        </ul>
                        <p className="text-xs text-gray-600 mt-2">
                          ※ 위 정보는 1년 경과 후 자동으로 영구 삭제됩니다. (개인정보처리방침 참조)
                        </p>
                      </div>
                      
                      <div className="pt-2 border-t border-red-200">
                        <p className="text-sm text-gray-700 mb-2">작성한 <span className="font-semibold text-red-600">댓글은 즉시 완전 삭제</span>됩니다.</p>
                      </div>
                      
                      <p className="text-xs text-gray-600 pt-2 border-t border-red-200">
                        ⚠️ 이 작업은 되돌릴 수 없습니다.<br/>
                        ℹ️ 심각한 위반 이력이 있는 경우 동일 이메일로 재가입 시 제한이 있을 수 있습니다.
                      </p>
                    </div>

                    {/* 탈퇴 이유 선택 */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">탈퇴 이유를 선택해주세요</Label>
                      <RadioGroup value={deleteReason} onValueChange={setDeleteReason}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="not_satisfied" id="not_satisfied" />
                          <Label htmlFor="not_satisfied" className="cursor-pointer font-normal">
                            서비스가 만족스럽지 않아요
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="low_usage" id="low_usage" />
                          <Label htmlFor="low_usage" className="cursor-pointer font-normal">
                            사용 빈도가 낮아요
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="privacy_concern" id="privacy_concern" />
                          <Label htmlFor="privacy_concern" className="cursor-pointer font-normal">
                            개인정보 보호가 걱정돼요
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="switching_service" id="switching_service" />
                          <Label htmlFor="switching_service" className="cursor-pointer font-normal">
                            다른 서비스를 사용할 예정이에요
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="other" id="other" />
                          <Label htmlFor="other" className="cursor-pointer font-normal">
                            기타
                          </Label>
                        </div>
                      </RadioGroup>

                      {/* 기타 이유 입력 */}
                      {deleteReason === 'other' && (
                        <div className="mt-3">
                          <Textarea
                            value={deleteReasonOther}
                            onChange={(e) => setDeleteReasonOther(e.target.value)}
                            placeholder="탈퇴 이유를 입력해주세요"
                            className="min-h-[80px] resize-none"
                            maxLength={200}
                          />
                          <div className="text-xs text-gray-500 text-right mt-1">
                            {deleteReasonOther.length}/200글자
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDeleteDialog(false);
                          setDeleteReason('');
                          setDeleteReasonOther('');
                        }}
                        className="flex-1"
                        disabled={deletingAccount}
                      >
                        취소
                      </Button>
                      <Button
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount || !deleteReason || (deleteReason === 'other' && !deleteReasonOther.trim())}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        {deletingAccount ? '탈퇴 중...' : '탈퇴하기'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Goodbye Dialog */}
      <Dialog open={showGoodbyeDialog} onOpenChange={(open) => {
        if (!open) {
          window.location.reload();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">🌸 감사합니다 🌸</DialogTitle>
            <DialogDescription className="sr-only">
              계정 탈퇴가 완료되었습니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-center text-lg">
              그동안 <span className="font-semibold text-purple-600">BreezI</span>를 이용해주셔서 감사합니다.
            </p>
            <p className="text-center text-gray-600">
              언젠가 다시 만날 수 있기를 바랍니��. 💜
            </p>
            <p className="text-center text-sm text-gray-500">
              행복한 일들만 가득하시길 응원합니다!
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-700 px-8"
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
