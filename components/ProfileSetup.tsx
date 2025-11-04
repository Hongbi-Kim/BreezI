import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { apiCall } from '../utils/api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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
  { code: 'ZZ', name: '기타', flag: '🌏' },
];

interface ProfileSetupProps {
  onComplete: () => void;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [birthDate, setBirthDate] = useState('');
  const [nickname, setNickname] = useState('');
  const [aiInfo, setAiInfo] = useState('');
  const [countryCode, setCountryCode] = useState('KR'); // Default to Korea
  
  // Nickname validation states
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameCheckTimeout, setNicknameCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check nickname availability with debounce
  useEffect(() => {
    // Clear previous timeout
    if (nicknameCheckTimeout) {
      clearTimeout(nicknameCheckTimeout);
    }

    // Reset state if nickname is empty
    if (!nickname || nickname.trim().length === 0) {
      setNicknameAvailable(null);
      setNicknameChecking(false);
      return;
    }

    // Debounce nickname check (wait 500ms after user stops typing)
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
    }, 500);

    setNicknameCheckTimeout(timeout);

    // Cleanup
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [nickname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if nickname is available
    if (nicknameAvailable === false) {
      setError('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
      return;
    }

    if (nicknameChecking) {
      setError('닉네임 확인 중입니다. 잠시만 기다려주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get user's timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
      
      await apiCall('/profile', {
        method: 'POST',
        body: JSON.stringify({
          birthDate,
          nickname: nickname.trim(),
          aiInfo,
          countryCode,
          timezone
        })
      });

      localStorage.removeItem('needs_profile_setup');
      onComplete();
    } catch (err: any) {
      console.error('Profile setup error:', err);
      if (err.duplicateNickname || err.message?.includes('닉네임')) {
        setError('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
      } else {
        setError(err.message || '프로필 설정에 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">👋</div>
          <CardTitle>프로필 설정</CardTitle>
          <CardDescription>Wave I에 오신 것을 환영합니다!</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">생년월일</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                * 생년월일은 설정 후 수정할 수 없습니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">국적</Label>
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
              <Label htmlFor="nickname">닉네임</Label>
              <div className="relative">
                <Input
                  id="nickname"
                  type="text"
                  placeholder="예: 파도타는사람"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={
                    nickname && nicknameAvailable === false
                      ? 'border-red-500 pr-10'
                      : nickname && nicknameAvailable === true
                      ? 'border-green-500 pr-10'
                      : 'pr-10'
                  }
                  required
                />
                {nickname && (
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
              {nickname && nicknameAvailable === false && (
                <p className="text-xs text-red-500">
                  이미 사용 중인 닉네임입니다.
                </p>
              )}
              {nickname && nicknameAvailable === true && (
                <p className="text-xs text-green-500">
                  사용 가능한 닉네임입니다.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiInfo">AI가 알면 좋은 정보 (선택)</Label>
              <Textarea
                id="aiInfo"
                placeholder="예: 직장인이고, 스트레스를 많이 받아요. 운동을 좋아합니다."
                value={aiInfo}
                onChange={(e) => setAiInfo(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-gray-500">
                AI 캐릭터가 더 맞춤형 대화를 할 수 있도록 도와줍니다.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '설정 중...' : '시작하기'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
