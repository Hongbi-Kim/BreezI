import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { User, Mail, Calendar, Info, LogOut, Save, MessageSquare, Crown, Sparkles, Brain, Trash2, ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, UserX, FileText, Shield } from 'lucide-react';
import { FeedbackDialog } from './FeedbackDialog';
import { SubscriptionDialog } from './SubscriptionDialog';
import { ProCancellationDialog } from './ProCancellationDialog';
import { WithdrawDialog } from './WithdrawDialog';
import { apiCall } from '../utils/api';
import { createClient } from '../utils/supabase/client';
import { useDataCache } from '../utils/dataCache';
import { toast } from 'sonner';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

// Country list with flag emojis
const COUNTRIES = [
  { code: 'KR', name: '대한민국', flag: '🇰🇷' },
  { code: 'US', name: '미국', flag: '🇺🇸' },
  { code: 'JP', name: '일본', flag: '🇯🇵' },
  { code: 'CN', name: '중국', flag: '🇨🇳' },
  { code: 'GB', name: '영국', flag: '🇬🇧' },
  { code: 'FR', name: '프랑스', flag: '🇫🇷' },
  { code: 'DE', name: '독일', flag: '🇩🇪' },
  { code: 'CA', name: '캐나다', flag: '🇨🇦' },
  { code: 'AU', name: '호주', flag: '🇦🇺' },
  { code: 'SG', name: '싱가포르', flag: '🇸🇬' },
  { code: 'HK', name: '홍콩', flag: '🇭🇰' },
  { code: 'TW', name: '대만', flag: '🇹🇼' },
  { code: 'VN', name: '베트남', flag: '🇻🇳' },
  { code: 'TH', name: '태국', flag: '🇹🇭' },
  { code: 'PH', name: '필리핀', flag: '🇵🇭' },
  { code: 'ID', name: '인도네시아', flag: '🇮🇩' },
  { code: 'MY', name: '말레이시아', flag: '🇲🇾' },
  { code: 'IN', name: '인도', flag: '🇮🇳' },
  { code: 'NZ', name: '뉴질랜드', flag: '🇳🇿' },
  { code: 'IT', name: '이탈리아', flag: '🇮🇹' },
  { code: 'ES', name: '스페인', flag: '🇪🇸' },
  { code: 'BR', name: '브라질', flag: '🇧🇷' },
  { code: 'MX', name: '멕시코', flag: '🇲🇽' },
  { code: 'RU', name: '러시아', flag: '🇷🇺' },
  { code: 'NL', name: '네덜란드', flag: '🇳🇱' },
  { code: 'SE', name: '스웨덴', flag: '🇸🇪' },
  { code: 'CH', name: '스위스', flag: '🇨🇭' },
  { code: 'ZZ', name: '기타', flag: '����' },
];

interface Profile {
  nickname: string;
  birthDate: string;
  aiInfo: string;
  countryCode?: string;
  name?: string;
  isPro?: boolean;
  proStartDate?: string;
  proEndDate?: string;
  hasItemPackage?: boolean;
  itemPackagePurchasedAt?: string;
}

interface AIMemory {
  id: string;
  content: string;
  createdAt: string;
}

interface ProfileTabProps {
  onSignOut: () => void;
}

export function ProfileTab({ onSignOut }: ProfileTabProps) {
  const { loadProfile, loadAIMemories, aiMemoriesData, refreshAIMemories } = useDataCache();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showProCancellationDialog, setShowProCancellationDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [aiMemories, setAiMemories] = useState<AIMemory[]>([]);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);
  const [memoriesLoaded, setMemoriesLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const memoriesPerPage = 10;

  // Edit form state
  const [nickname, setNickname] = useState('');
  const [aiInfo, setAiInfo] = useState('');
  const [countryCode, setCountryCode] = useState('KR');
  
  // Nickname validation states
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameCheckTimeout, setNicknameCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [originalNickname, setOriginalNickname] = useState('');
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);

  useEffect(() => {
    console.log('[ProfileTab] 🟢 Component MOUNTED');
    
    loadProfileData();
    // Don't load memories on mount - load them lazily when user expands the section
    
    return () => {
      console.log('[ProfileTab] 🔴 Component UNMOUNTED');
    };
  }, []);

  // Load memories only when the section is opened
  useEffect(() => {
    if (isMemoriesOpen && !memoriesLoaded) {
      console.log('[ProfileTab] Loading AI memories lazily...');
      loadMemoriesData();
      setMemoriesLoaded(true);
    }
  }, [isMemoriesOpen, memoriesLoaded]);

  // Check nickname availability with debounce
  useEffect(() => {
    // Clear previous timeout
    if (nicknameCheckTimeout) {
      clearTimeout(nicknameCheckTimeout);
    }

    // Reset state if nickname is empty or same as original
    if (!nickname || nickname.trim().length === 0 || nickname === originalNickname) {
      setNicknameAvailable(null);
      setNicknameChecking(false);
      return;
    }

    // Debounce nickname check (wait 1 second after user stops typing to reduce API calls)
    setNicknameChecking(true);
    const timeout = setTimeout(async () => {
      try {
        const result = await apiCall(`/profile/check-nickname/${encodeURIComponent(nickname.trim())}`);
        setNicknameAvailable(result.available);
      } catch (error) {
        console.error('Nickname check error:', error);
        setNicknameAvailable(null);
      } finally {
        setNicknameChecking(false);
      }
    }, 1000); // Increased from 500ms to 1000ms

    setNicknameCheckTimeout(timeout);

    // Cleanup
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [nickname, originalNickname]);

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const data = await loadProfile();
      if (data && data.profile) {
        console.log('[ProfileTab] Profile data loaded:', data.profile.nickname);
        setProfile(data.profile);
        setEmail(data.email);
        
        setNickname(data.profile.nickname || '');
        setOriginalNickname(data.profile.nickname || '');
        setAiInfo(data.profile.aiInfo || '');
        setCountryCode(data.profile.countryCode || 'KR');
      } else {
        console.warn('[ProfileTab] No profile data received');
      }
    } catch (error: any) {
      console.error('[ProfileTab] Failed to load profile:', error);
      // Don't clear existing profile data on error
      // toast.error('프로필을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMemoriesData = async () => {
    try {
      const memories = await loadAIMemories();
      setAiMemories(memories || []);
      
      // If no memories exist, add sample memories
      if (!memories || memories.length === 0) {
        await addSampleMemories();
      }
    } catch (error) {
      console.error('Failed to load AI memories:', error);
    }
  };

  const addSampleMemories = async () => {
    const sampleMemories = [
      '좋아하는 취미: 독서와 영화 감상',
      '직업: IT 회사에서 프론트엔드 개발자로 근무 중',
      '목표: 매일 30분씩 운동하고 건강한 생활 습관 만들기'
    ];

    try {
      for (const content of sampleMemories) {
        await apiCall('/ai-memories', {
          method: 'POST',
          body: JSON.stringify({ content })
        });
      }
      
      // Reload memories after adding samples
      const updatedMemories = await loadAIMemories();
      setAiMemories(updatedMemories || []);
    } catch (error) {
      console.error('Failed to add sample memories:', error);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    try {
      await apiCall(`/ai-memories/${memoryId}`, { method: 'DELETE' });
      // Update local state immediately
      const filteredMemories = aiMemories.filter(m => m.id !== memoryId);
      setAiMemories(filteredMemories);
      
      // Adjust current page if needed
      const totalPages = Math.ceil(filteredMemories.length / memoriesPerPage);
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
      }
      
      // Refresh cache
      await refreshAIMemories();
      toast.success('기록이 삭제되었습니다');
    } catch (error) {
      console.error('Failed to delete memory:', error);
      toast.error('기록 삭제에 실패했습니다.');
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(aiMemories.length / memoriesPerPage);
  const startIndex = (currentPage - 1) * memoriesPerPage;
  const endIndex = startIndex + memoriesPerPage;
  const currentMemories = aiMemories.slice(startIndex, endIndex);

  const handleSave = async () => {
    if (!nickname.trim()) {
      toast.error('닉네임을 입력해주세요.');
      return;
    }

    // Check if nickname is available (if changed)
    if (nickname !== originalNickname) {
      if (nicknameAvailable === false) {
        toast.error('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
        return;
      }

      if (nicknameChecking) {
        toast.warning('닉네임 확인 중입니다. 잠시만 기다려주세요.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
      
      await apiCall('/profile', {
        method: 'POST',
        body: JSON.stringify({
          nickname: nickname.trim(),
          aiInfo,
          countryCode,
          birthDate: profile?.birthDate, // Keep existing birth date
          timezone
        })
      });

      // Force refresh profile data from server
      const data = await loadProfile(true);
      if (data) {
        setProfile(data.profile);
        setEmail(data.email);
        if (data.profile) {
          setNickname(data.profile.nickname);
          setOriginalNickname(data.profile.nickname);
          setAiInfo(data.profile.aiInfo || '');
          setCountryCode(data.profile.countryCode || 'KR');
        }
      }
      
      setIsEditing(false);
      toast.success('프로필이 저장되었습니다');
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      if (error.duplicateNickname || error.message?.includes('닉네임')) {
        toast.error('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
      } else {
        toast.error('프로필 저장에 실패했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setShowLogoutDialog(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      localStorage.removeItem('access_token');
      toast.success('로그아웃되었습니다');
      onSignOut();
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('로그아웃 중 오류가 발생했습니다');
    }
  };

  const handleWithdraw = async (reason: string, customReason?: string) => {
    setIsWithdrawing(true);
    try {
      const result = await apiCall('/withdraw', {
        method: 'POST',
        body: JSON.stringify({ reason, customReason })
      });

      // Show note about OAuth if applicable
      if (result.note) {
        toast.info(result.note, { duration: 5000 });
      }

      // Sign out and redirect
      const supabase = createClient();
      await supabase.auth.signOut();
      localStorage.removeItem('access_token');
      
      toast.success('회원 탈퇴가 완료되었습니다. 그동안 Wave I를 이용해 주셔서 감사합니다.', { duration: 5000 });
      setTimeout(() => onSignOut(), 2000);
    } catch (error: any) {
      console.error('Withdraw error:', error);
      toast.error('탈퇴 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsWithdrawing(false);
      setShowWithdrawDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500">프로필을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="p-3 sm:p-6 pb-24 max-w-2xl mx-auto min-h-full">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl mb-1 sm:mb-2">프로필</h2>
        <p className="text-gray-600 text-xs sm:text-sm">내 정보를 관리하세요</p>
      </div>

      <div className="space-y-6">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>계정 정보를 확인하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">이메일</p>
                <p>{email}</p>
              </div>
            </div>

            {profile?.birthDate && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">생년월일</p>
                  <p>{new Date(profile.birthDate).toLocaleDateString('ko-KR')}</p>
                  <p className="text-xs text-gray-400 mt-1">* 생년월일은 수정할 수 없습니다</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Memories Card */}
        <Card>
          <Collapsible open={isMemoriesOpen} onOpenChange={setIsMemoriesOpen}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <div className="text-left">
                      <CardTitle className="flex items-center gap-2">
                        나에 대한 기록
                        <span className="text-sm font-normal text-gray-500">
                          ({aiMemories.length})
                        </span>
                      </CardTitle>
                      <CardDescription>AI가 대화를 통해 학습한 정보</CardDescription>
                    </div>
                  </div>
                  {isMemoriesOpen ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                {aiMemoriesData.loading && aiMemories.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-sm">기록을 불러오는 중...</p>
                  </div>
                ) : aiMemories.length === 0 ? (
                  <div className="text-center py-6">
                    <Brain className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600 mb-1 text-sm">아직 기록이 없어요</p>
                    <p className="text-xs text-gray-500">
                      AI와 대화하면서 중요한 정보�� 공유하면<br />
                      여기에 자동으로 기록됩니다
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentMemories.map((memory) => (
                      <div
                        key={memory.id}
                        className="flex items-center justify-between gap-2 p-2.5 bg-gradient-to-r from-purple-50 to-blue-50 rounded-md border border-purple-100"
                      >
                        <p className="text-sm flex-1 break-words">{memory.content}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMemory(memory.id)}
                          className="text-gray-400 hover:text-red-600 h-7 w-7 p-0 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    
                    {totalPages > 1 && (
                      <Pagination className="mt-4">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          
                          {[...Array(totalPages)].map((_, i) => (
                            <PaginationItem key={i + 1}>
                              <PaginationLink
                                onClick={() => setCurrentPage(i + 1)}
                                isActive={currentPage === i + 1}
                                className="cursor-pointer"
                              >
                                {i + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                    
                    <p className="text-xs text-gray-500 text-center mt-3">
                      💡 기록은 직접 삭제할 수 있지만, 추가는 AI만 할 수 있어요
                    </p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>프로필 정보</CardTitle>
                <CardDescription>AI 캐릭터와의 대화에 사용되는 정보</CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  수정
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-nickname">
                    <User className="w-4 h-4 inline mr-2" />
                    닉네임
                  </Label>
                  <div className="relative">
                    <Input
                      id="edit-nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="닉네임을 입력하세요"
                      className={
                        nickname && nickname !== originalNickname && nicknameAvailable === false
                          ? 'border-red-500 pr-10'
                          : nickname && nickname !== originalNickname && nicknameAvailable === true
                          ? 'border-green-500 pr-10'
                          : 'pr-10'
                      }
                    />
                    {nickname && nickname !== originalNickname && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {nicknameChecking ? (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        ) : nicknameAvailable === true ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : nicknameAvailable === false ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {nickname && nickname !== originalNickname && nicknameAvailable === false && (
                    <p className="text-xs text-red-500">
                      이미 사용 중인 닉네임입니다.
                    </p>
                  )}
                  {nickname && nickname !== originalNickname && nicknameAvailable === true && (
                    <p className="text-xs text-green-500">
                      사용 가능한 닉네임입니다.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-country">
                    <User className="w-4 h-4 inline mr-2" />
                    국적
                  </Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger>
                      <SelectValue>
                        {COUNTRIES.find(c => c.code === countryCode) && (
                          <span className="flex items-center gap-2">
                            <span>{COUNTRIES.find(c => c.code === countryCode)?.flag}</span>
                            <span>{COUNTRIES.find(c => c.code === countryCode)?.name}</span>
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-aiInfo">
                    <Info className="w-4 h-4 inline mr-2" />
                    AI가 알면 좋은 정보
                  </Label>
                  <Textarea
                    id="edit-aiInfo"
                    value={aiInfo}
                    onChange={(e) => setAiInfo(e.target.value)}
                    placeholder="직업, 취미, 관심사 등을 자유롭게 작성해주세요"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500">
                    이 정보는 AI 캐릭터가 더 맞춤형 대화를 하는 데 도움이 됩니다.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? '저장 중...' : '��장'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setNickname(profile?.nickname || '');
                      setAiInfo(profile?.aiInfo || '');
                      setCountryCode(profile?.countryCode || 'KR');
                    }}
                    className="flex-1"
                  >
                    취소
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">닉네임</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p>{profile?.nickname || '설정되지 않음'}</p>
                      {profile?.isPro && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs rounded-full">
                          <Crown className="w-3 h-3" />
                          {/* Pro */}
                        </span>
                      )}
                      {profile?.hasItemPackage && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-400 to-pink-500 text-white text-xs rounded-full">
                          <Sparkles className="w-3 h-3" />
                          {/* 아이템 */}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">국적</p>
                    <div className="flex items-center gap-2">
                      {profile?.countryCode ? (
                        <>
                          <span className="text-lg">
                            {COUNTRIES.find(c => c.code === profile.countryCode)?.flag}
                          </span>
                          <span>
                            {COUNTRIES.find(c => c.code === profile.countryCode)?.name || profile.countryCode}
                          </span>
                        </>
                      ) : (
                        <span>설정되지 않음</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Info className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">AI가 알면 좋은 정보</p>
                    <p className="whitespace-pre-wrap">{profile?.aiInfo || '설정되지 않음'}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        {/* <Card>
          <CardHeader>
            <CardTitle>활동 통계</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-1">🌙</div>
                <p className="text-sm text-gray-600">루나와 대화</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl mb-1">☀️</div>
                <p className="text-sm text-gray-600">솔라와 대화</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl mb-1">⭐</div>
                <p className="text-sm text-gray-600">노바와 대화</p>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Wave Pro Subscription */}
        <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-600" />
              Wave Pro
            </CardTitle>
            <CardDescription>
              {profile?.isPro 
                ? '프리미엄 구독을 이용 중입니다'
                : '더 많은 기능을 이용해보세요'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.isPro ? (
              <>
                <div className="flex items-center justify-center p-4 bg-white rounded-lg border border-yellow-200">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full mb-3">
                      <Crown className="w-4 h-4" />
                      <span>Pro 구독 중</span>
                    </div>
                    {profile.proEndDate && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          구독 만료일
                        </p>
                        <p className="font-medium text-gray-800">
                          {new Date(profile.proEndDate).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-gray-700">Pro 혜택</p>
                  <ul className="space-y-1 text-gray-600">
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-600">✓</span>
                      다양한 AI 캐릭터와 대화
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-600">✓</span>
                      무제한 일기 작성
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-600">✓</span>
                      고급 감정 분석 리포트
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-600">✓</span>
                      프로필에 Pro 뱃지 표시
                    </li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setShowProCancellationDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  구독 해제 신청
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-gray-700">Pro로 업그레이드하면</p>
                  <ul className="space-y-1 text-gray-600">
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-600">✓</span>
                      다양한 AI 캐릭터와 대화
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-600">✓</span>
                      무제한 일기 작성
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-600">✓</span>
                      고급 감정 분석 리포트
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-600">✓</span>
                      프로필에 Pro 뱃지 표시
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={() => setShowSubscriptionDialog(true)}
                    className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    월 4,900원으로 시작하기
                  </Button>
                  
                  <p className="text-xs text-center text-gray-500">
                    언제든지 해지 가능 · 첫 달 무료 체험
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>의견 보내기</CardTitle>
            <CardDescription>서비스 개선을 위한 소중한 의견을 들려주세요</CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackDialog
              trigger={
                <Button variant="outline" className="w-full gap-2">
                  <MessageSquare className="w-4 h-4" />
                  피드백 보내기
                </Button>
              }
            />
          </CardContent>
        </Card>

        {/* Legal Documents */}
        <Card>
          <CardHeader>
            <CardTitle>약관 및 정책</CardTitle>
            <CardDescription>Wave I 서비스 이용에 관한 정보</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full gap-2 justify-start"
              onClick={() => setShowTermsDialog(true)}
            >
              <FileText className="w-4 h-4" />
              이용약관
            </Button>
            <Button 
              variant="outline" 
              className="w-full gap-2 justify-start"
              onClick={() => setShowPrivacyDialog(true)}
            >
              <Shield className="w-4 h-4" />
              개인정보 처리방침
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              onClick={() => setShowLogoutDialog(true)}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </CardContent>
        </Card>
        <div className="flex justify-end mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWithdrawDialog(true)}
            className="text-xs text-gray-500 hover:text-red-600"
          >
            <UserX className="w-3 h-3 mr-1" />
            탈퇴하기
          </Button>
        </div>
      </div>

      {/* Subscription Dialog */}
      <SubscriptionDialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
        onSuccess={loadProfile}
      />

      {/* Withdraw Dialog */}
      <WithdrawDialog
        open={showWithdrawDialog}
        onOpenChange={setShowWithdrawDialog}
        onConfirm={handleWithdraw}
        isLoading={isWithdrawing}
      />

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>로그아웃</AlertDialogTitle>
            <AlertDialogDescription>
              정말 로그아웃하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>로그아웃</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terms of Service Dialog */}
      <AlertDialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              이용약관
            </AlertDialogTitle>
            <AlertDialogDescription>
              Wave I 서비스 이용약관
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="overflow-y-auto max-h-[60vh] px-1">
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold text-base mb-2">제1조 (목적)</h3>
                <p className="text-gray-700 leading-relaxed">
                  본 약관은 Wave I (이하 "서비스")가 제공하는 AI 심리 케어 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">제2조 (용어의 정의)</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>1. "서비스"란 Wave I가 제공하는 AI 캐릭터 대화, 일기 작성, 감정 분석 등 심리 케어 관련 서비스를 의미합니다.</p>
                  <p>2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</p>
                  <p>3. "회원"이란 서비스에 가입하여 지속적으로 서비스를 이용할 수 있는 자를 말합니다.</p>
                  <p>4. "AI 캐릭터"란 서비스 내에서 이용자와 대화할 수 있는 인공지능 기반 대화 파트너를 의미합니다.</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">제3조 (서비스의 제공)</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>1. 회사는 다음과 같은 서비스를 제공합니다:</p>
                  <p className="pl-4">- AI 캐릭터와의 대화 서비스</p>
                  <p className="pl-4">- 한 줄 일기 작성 및 관리 서비스</p>
                  <p className="pl-4">- 감정 분석 및 리포트 제공 서비스</p>
                  <p className="pl-4">- 감정 정원, 감정 파도 등 시각화 서비스</p>
                  <p className="pl-4">- 기타 회사가 추가 개발하거나 제휴 계약을 통해 제공하는 서비스</p>
                  <p>2. 서비스는 연중무휴 1일 24시간 제공함을 원칙으로 합니다. 다만, 시스템 점검 등 운영상 필요한 경우 일시적으로 서비스 제공이 중단될 수 있습니다.</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">제4조 (회원가입)</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>1. 이용자는 회사가 정한 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</p>
                  <p>2. 회사는 제1항과 같이 회원가입을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:</p>
                  <p className="pl-4">- 등록 내용에 허위, 기재누락, 오기가 있는 경우</p>
                  <p className="pl-4">- 이전에 회원자격을 상실한 적이 있는 경우</p>
                  <p className="pl-4">- 기타 회원으로 등록하는 것이 서비스 운영에 현저히 지장이 있다고 판단되는 경우</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">제5조 (개인정보 보호)</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>1. 회사는 이용자의 개인정보를 보호하기 위하여 개인정보보호법 등 관련 법령을 준수합니다.</p>
                  <p>2. 개인정보의 보호 및 이용에 대해서는 관련 법령 및 회사의 개인정보 처리방침이 적용됩니다.</p>
                  <p>3. 회사는 이용자의 대화 내용, 일기 등 민감한 정보를 암호화하여 안전하게 보관합니다.</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">제6조 (유료 서비스)</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>1. 회사는 기본 무료 서비스 외에 Wave Pro 등 유료 서비스를 제공할 수 있습니다.</p>
                  <p>2. 유료 서비스 이용을 위해서는 회사가 정한 요금을 지불해야 하며, 결제 방법은 회사가 제공하는 수단을 이용합니다.</p>
                  <p>3. 유료 서비스는 구독 기간 동안 이용 가능하며, 자동 갱신될 수 있습니다.</p>
                  <p>4. 이용자는 언제든지 유료 서비스 구독을 해지할 수 있습니다.</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">제7조 (서비스 이용의 제한)</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>1. 회사는 다음 각 호에 해당하는 경우 서비스 이용을 제한할 수 있습니다:</p>
                  <p className="pl-4">- 타인의 명의를 도용한 경우</p>
                  <p className="pl-4">- 서비스 운영을 고의로 방해한 경우</p>
                  <p className="pl-4">- 공공질서 및 미풍양속에 저해되는 내용을 고의로 유포한 경우</p>
                  <p className="pl-4">- 타인의 명예를 손상시키거나 불이익을 주는 행위를 한 경우</p>
                  <p className="pl-4">- 기타 관련 법령이나 회사가 정한 이용조건에 위배되는 경우</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">제8조 (면책 조항)</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>1. 본 서비스는 심리 상담이나 의료 서비스를 대체하지 않으며, AI 캐릭터의 응답은 참고용으로만 사용되어야 합니다.</p>
                  <p>2. 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적인 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</p>
                  <p>3. 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</p>
                  <p>4. 회사는 이용자가 서비스를 이용하여 기대하는 정신적, 심리적 효과를 보장하지 않습니다.</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">제9조 (분쟁 해결)</h3>
                <p className="text-gray-700 leading-relaxed">
                  본 약관과 관련하여 발생한 분쟁에 대해서는 대한민국 법을 적용하며, 소송이 필요한 경우 회사의 본사 소재지를 관할하는 법원을 전속 관할 법원으로 합니다.
                </p>
              </section>

              <section className="pt-4 border-t">
                <p className="text-gray-600 text-xs">
                  본 약관은 2025년 1월 1일부터 시행됩니다.
                </p>
              </section>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowTermsDialog(false)}>
              닫기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Privacy Policy Dialog */}
      <AlertDialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              개인정보 처리방침
            </AlertDialogTitle>
            <AlertDialogDescription>
              Wave I 개인정보 처리방침
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="overflow-y-auto max-h-[60vh] px-1">
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold text-base mb-2">1. 개인정보의 수집 및 이용 목적</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>Wave I(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
                  <p className="pt-2 font-medium">가. 회원 가입 및 관리</p>
                  <p className="pl-4">회원제 서비스 이용에 따른 본인 식별, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 목적으로 개인정보를 처리합니다.</p>
                  <p className="pt-2 font-medium">나. 서비스 제공</p>
                  <p className="pl-4">AI 대화 서비스, 일기 작성, 감정 분석 리포트 제공, 맞춤형 서비스 제공을 목적으로 개인정보를 처리합니다.</p>
                  <p className="pt-2 font-medium">다. 유료 서비스 제공</p>
                  <p className="pl-4">요금 결제·정산, 구매 및 요금 결제, 본인인증 등을 목적으로 개인정보를 처리합니다.</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">2. 수집하는 개인정보 항목</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p className="font-medium">가. 필수 항목</p>
                  <p className="pl-4">- 이메일 주소 (회원가입 시)</p>
                  <p className="pl-4">- 닉네임</p>
                  <p className="pl-4">- 생년월일</p>
                  <p className="pl-4">- 국적 정보</p>
                  <p className="pt-2 font-medium">나. 선택 항목</p>
                  <p className="pl-4">- 프로필 정보 (취미, 관심사 등)</p>
                  <p className="pl-4">- AI가 알면 좋은 정보</p>
                  <p className="pt-2 font-medium">다. 자동 수집 항목</p>
                  <p className="pl-4">- 서비스 이용 기록</p>
                  <p className="pl-4">- 접속 로그, IP 주소</p>
                  <p className="pl-4">- 대화 내용 및 일기 내용</p>
                  <p className="pl-4">- 감정 분석 데이터</p>
                  <p className="pt-2 font-medium">라. 유료 서비스 이용 시</p>
                  <p className="pl-4">- 결제 정보 (카드번호, 결제 내역 등은 결제 대행사를 통해 처리됩니다)</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">3. 개인정보의 처리 및 보유 기간</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 이용자로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
                  <p>2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:</p>
                  <p className="pl-4">- 회원 가입 정보: 회원 탈퇴 시까지</p>
                  <p className="pl-4">- 대화 및 일기 내용: 회원 탈퇴 후 즉시 삭제 (단, 관련 법령에 따라 보존이 필요한 경우 예외)</p>
                  <p className="pl-4">- 결제 정보: 전자상거래법에 따라 5년간 보관</p>
                  <p>3. 회원 탈퇴 시 모든 개인정보는 즉시 삭제되며, 복구할 수 없습니다.</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">4. 개인정보의 제3자 제공</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:</p>
                  <p className="pl-4">- 이용자가 사전에 동의한 경우</p>
                  <p className="pl-4">- 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</p>
                  <p className="pt-2">현재 회사는 다음의 업체와 개인정보를 공유합니다:</p>
                  <p className="pl-4">- 결제 대행사: 토스페이먼츠 (결제 처리 목적)</p>
                  <p className="pl-4">- AI 서비스 제공: OpenAI, Anthropic (대화 서비스 제공 목적)</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">5. 개인정보의 파기 절차 및 방법</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>1. 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
                  <p>2. 파기 절차:</p>
                  <p className="pl-4">- 이용자가 입력한 정보는 목적 달성 후 별도의 DB로 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 파기됩니다.</p>
                  <p>3. 파기 방법:</p>
                  <p className="pl-4">- 전자적 파일 형태: 복구 및 재생이 불가능한 기술적 방법을 사용하여 완전히 삭제</p>
                  <p className="pl-4">- 종이 문서: 분쇄기로 분쇄하거나 소각</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">6. 이용자의 권리와 행사 방법</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>1. 이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다:</p>
                  <p className="pl-4">- 개인정보 열람 요구</p>
                  <p className="pl-4">- 개인정보 정정·삭제 요구</p>
                  <p className="pl-4">- 개인정보 처리 정지 요구</p>
                  <p className="pl-4">- 회원 탈퇴 (동의 철회)</p>
                  <p>2. 권리 행사는 프로필 탭에서 직접 수정하거나, 고객센터를 통해 요청할 수 있습니다.</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">7. 개인정보 보호책임자</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
                  <p className="pt-2 pl-4">▶ 개인정보 보호책임자</p>
                  <p className="pl-4">- 담당부서: Wave I 운영팀</p>
                  <p className="pl-4">- 문의: 프로필 탭 {'>'} 의견 보내기</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">8. 개인정보의 안전성 확보 조치</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
                  <p className="pl-4">- 개인정보 암호화: 비밀번호, 대화 내용 등 중요 정보는 암호화되어 저장 및 관리됩니다.</p>
                  <p className="pl-4">- 해킹 등에 대비한 기술적 대책: 방화벽, 백신 프로그램 등을 이용하여 외부로부터의 무단 접근을 통제합니다.</p>
                  <p className="pl-4">- 접근 권한 관리: 개인정보에 대한 접근 권한을 최소한의 인원으로 제한합니다.</p>
                  <p className="pl-4">- 정기적인 자체 감사: 개인정보 취급 관련 안정성 확보를 위해 정기적으로 자체 감사를 실시합니다.</p>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2">9. 개인정보 처리방침의 변경</h3>
                <div className="text-gray-700 leading-relaxed space-y-1">
                  <p>1. 이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
                  <p>2. 중요한 변경사항이 있을 경우 이메일 등을 통해 개별 통지합니다.</p>
                </div>
              </section>

              <section className="pt-4 border-t">
                <p className="text-gray-600 text-xs">
                  본 개인정보 처리방침은 2025년 1월 1일부터 시행됩니다.
                </p>
              </section>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPrivacyDialog(false)}>
              닫기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pro Cancellation Dialog */}
      <ProCancellationDialog
        open={showProCancellationDialog}
        onOpenChange={setShowProCancellationDialog}
        onSuccess={loadProfileData}
      />
      </div>
    </div>
  );
}
