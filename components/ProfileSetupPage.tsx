import React, { useState } from 'react';
import { User, Calendar, Users, Heart, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ProfileSetupPageProps {
  accessToken: string;
  onComplete: () => void;
}

export function ProfileSetupPage({ accessToken, onComplete }: ProfileSetupPageProps) {
  const [formData, setFormData] = useState({
    nickname: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    gender: '',
    characterInfo: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 80 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nickname || !formData.birthYear || !formData.birthMonth || !formData.birthDay || !formData.gender) {
      setError('필수 항목을 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/profile/setup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            nickname: formData.nickname,
            birthDate: `${formData.birthYear}-${formData.birthMonth.padStart(2, '0')}-${formData.birthDay.padStart(2, '0')}`,
            gender: formData.gender,
            characterInfo: formData.characterInfo,
          }),
        }
      );

      if (response.ok) {
        onComplete();
      } else {
        const data = await response.json();
        setError(data.error || '프로필 설정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Profile setup error:', error);
      setError('프로필 설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <User className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">프로필 설정</h1>
          <p className="text-gray-600">마음돌봄을 시작하기 위해 기본 정보를 입력해주세요</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-purple-600" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 닉네임 */}
              <div className="space-y-2">
                <Label htmlFor="nickname">닉네임 *</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="사용하실 닉네임을 입력해주세요"
                  required
                />
              </div>

              {/* 생년월일 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  생년월일 *
                </Label>
                <Alert className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    생년월일은 설정 후 수정할 수 없습니다. 신중히 입력해주세요.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={formData.birthYear} onValueChange={(value) => setFormData(prev => ({ ...prev, birthYear: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="년도" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formData.birthMonth} onValueChange={(value) => setFormData(prev => ({ ...prev, birthMonth: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="월" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(month => (
                        <SelectItem key={month} value={month.toString()}>{month}월</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formData.birthDay} onValueChange={(value) => setFormData(prev => ({ ...prev, birthDay: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="일" />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map(day => (
                        <SelectItem key={day} value={day.toString()}>{day}일</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 성별 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  성별 *
                </Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="성별을 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">남성</SelectItem>
                    <SelectItem value="female">여성</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 캐릭터가 알면 좋은 정보 (옵션) */}
              <div className="space-y-2">
                <Label htmlFor="characterInfo">캐릭터가 알면 좋은 정보 (200글자 이내)</Label>
                <Textarea
                  id="characterInfo"
                  value={formData.characterInfo}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setFormData(prev => ({ ...prev, characterInfo: e.target.value }));
                    }
                  }}
                  placeholder="캐릭터가 더 나은 대화를 위해 알면 좋을 정보를 입력해주세요 (선택사항)"
                  className="min-h-[100px] resize-none"
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 text-right">
                  {formData.characterInfo.length}/200
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading ? '설정 중...' : '프로필 설정 완료'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}