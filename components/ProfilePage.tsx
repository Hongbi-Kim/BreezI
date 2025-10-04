import React, { useState, useEffect } from 'react';
import { User, Calendar, Users, Briefcase, Heart, Edit, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ProfilePageProps {
  accessToken: string;
  onClose: () => void;
}

interface UserProfile {
  nickname: string;
  birthDate: string;
  gender: string;
  occupation: string;
  interests: string;
  counselingStyle: string;
}

export function ProfilePage({ accessToken, onClose }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState({
    nickname: '',
    occupation: '',
    interests: '',
    counselingStyle: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
          occupation: data.profile.occupation || 'none',
          interests: data.profile.interests || '',
          counselingStyle: data.profile.counselingStyle || 'none',
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
          body: JSON.stringify({
            ...editData,
            occupation: editData.occupation === 'none' ? '' : editData.occupation,
            counselingStyle: editData.counselingStyle === 'none' ? '' : editData.counselingStyle,
          }),
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
        occupation: profile.occupation || 'none',
        interests: profile.interests || '',
        counselingStyle: profile.counselingStyle || 'none',
      });
    }
    setEditing(false);
    setError('');
    setSuccess('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return '남성';
      case 'female': return '여성';
      case 'other': return '기타';
      default: return gender;
    }
  };

  const getOccupationLabel = (occupation: string) => {
    switch (occupation) {
      case 'student': return '학생';
      case 'employee': return '직장인';
      case 'freelancer': return '프리랜서';
      case 'unemployed': return '구직중';
      case 'homemaker': return '주부/주부';
      case 'retired': return '은퇴';
      case 'other': return '기타';
      case 'none':
      case '':
      default: return '미설정';
    }
  };

  const getCounselingStyleLabel = (style: string) => {
    switch (style) {
      case 'empathetic': return '공감과 위로 중심';
      case 'solution-focused': return '해결책 제시 중심';
      case 'motivational': return '동기부여 중심';
      case 'analytical': return '분석적 접근';
      case 'casual': return '편안하고 자유로운 대화';
      case 'none':
      case '':
      default: return '미설정';
    }
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">내 프로필</h1>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

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
            {/* 닉네임 */}
            <div className="space-y-2">
              <Label>닉네임</Label>
              {editing ? (
                <Input
                  value={editData.nickname}
                  onChange={(e) => setEditData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="닉네임을 입력해주세요"
                />
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
              <div className="p-3 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-600">{formatDate(profile.birthDate)}</p>
                <p className="text-xs text-gray-500 mt-1">생년월일은 수정할 수 없습니다</p>
              </div>
            </div>

            {/* 성별 (수정 불가) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                성별
              </Label>
              <div className="p-3 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-600">{getGenderLabel(profile.gender)}</p>
                <p className="text-xs text-gray-500 mt-1">성별은 수정할 수 없습니다</p>
              </div>
            </div>

            {/* 직업/학업 상태 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                직업/학업 상태
              </Label>
              {editing ? (
                <Select value={editData.occupation} onValueChange={(value) => setEditData(prev => ({ ...prev, occupation: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="해당사항을 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">미설정</SelectItem>
                    <SelectItem value="student">학생</SelectItem>
                    <SelectItem value="employee">직장인</SelectItem>
                    <SelectItem value="freelancer">프리랜서</SelectItem>
                    <SelectItem value="unemployed">구직중</SelectItem>
                    <SelectItem value="homemaker">주부/주부</SelectItem>
                    <SelectItem value="retired">은퇴</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Badge variant="secondary">{getOccupationLabel(profile.occupation)}</Badge>
                </div>
              )}
            </div>

            {/* 관심사/취미 */}
            <div className="space-y-2">
              <Label>관심사/취미</Label>
              {editing ? (
                <Input
                  value={editData.interests}
                  onChange={(e) => setEditData(prev => ({ ...prev, interests: e.target.value }))}
                  placeholder="관심사나 취미를 입력해주세요"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p>{profile.interests || '미설정'}</p>
                </div>
              )}
            </div>

            {/* 선호하는 상담 스타일 */}
            <div className="space-y-2">
              <Label>선호하는 상담 스타일</Label>
              {editing ? (
                <Select value={editData.counselingStyle} onValueChange={(value) => setEditData(prev => ({ ...prev, counselingStyle: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="선호하는 스타일을 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">미설정</SelectItem>
                    <SelectItem value="empathetic">공감과 위로 중심</SelectItem>
                    <SelectItem value="solution-focused">해결책 제시 중심</SelectItem>
                    <SelectItem value="motivational">동기부여 중심</SelectItem>
                    <SelectItem value="analytical">분석적 접근</SelectItem>
                    <SelectItem value="casual">편안하고 자유로운 대화</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Badge variant="outline">{getCounselingStyleLabel(profile.counselingStyle)}</Badge>
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
                  disabled={saving}
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
      </div>
    </div>
  );
}