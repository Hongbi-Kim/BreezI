import React, { useState, useEffect } from 'react';
import { Save, Sparkles, Calendar, Smile, Frown, Angry, Zap, Heart, ThumbsUp, ThumbsDown, CheckCircle2, Circle, Trash2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input as InputComponent } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { EmotionManager } from './EmotionManager';
import { Checkbox } from './ui/checkbox';
import { DiaryDeleteDialog } from './DiaryDeleteDialog';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

interface DiaryEntry {
  userId: string;
  content: string;
  emotion: string;
  date: string;
  timestamp: string;
  title?: string;
  compliment?: string;
  regrets?: string[];
  characterMessages?: CharacterMessage[];
}

interface CharacterMessage {
  characterId: string;
  emoji: string;
  message: string;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  emotionKeywords: string[];
}

interface DiaryPageProps {
  accessToken: string;
  onEmotionUpdate?: () => void;
}

interface Emotion {
  key?: string;
  id?: string;
  label: string;
  icon?: any;
  emoji?: string;
  color: string;
  isCustom?: boolean;
  isPositive?: boolean;
}

const defaultEmotions = [
  { key: 'happy', label: '기쁨', icon: Smile, color: 'bg-yellow-100 text-yellow-700', isPositive: true },
  { key: 'sad', label: '슬픔', icon: Frown, color: 'bg-blue-100 text-blue-700', isPositive: false },
  { key: 'angry', label: '화남', icon: Angry, color: 'bg-red-100 text-red-700', isPositive: false },
  { key: 'anxious', label: '불안', icon: Zap, color: 'bg-orange-100 text-orange-700', isPositive: false },
];

export function DiaryPage({ accessToken, onEmotionUpdate }: DiaryPageProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [compliment, setCompliment] = useState('');
  const [regrets, setRegrets] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [characterMessages, setCharacterMessages] = useState<CharacterMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [allEmotions, setAllEmotions] = useState<Emotion[]>(defaultEmotions);
  const [todayMission, setTodayMission] = useState<Mission | null>(null);
  const [missionCompleted, setMissionCompleted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadTodayEntry();
    loadAllEmotions();
    loadCharacterMessages();
    loadTodayMission();
    loadMissionStatus();
  }, [selectedDate]);

  const loadTodayEntry = async (retryCount = 0) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/diary/today?date=${selectedDate}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.entry) {
          const entry = data.entry;
          setContent(entry.content || '');
          setTitle(entry.title || '');
          setCompliment(entry.compliment || '');
          setRegrets(Array.isArray(entry.regrets) ? entry.regrets.join(', ') : (entry.regrets || ''));
          setSelectedEmotion(entry.emotion || '');
        }
      } else if (response.status >= 500 && retryCount < 2) {
        // Server error - retry
        toast.error('서버 오류가 발생했습니다. 다시 시도합니다...');
        setTimeout(() => loadTodayEntry(retryCount + 1), 1000);
      } else if (response.status === 401) {
        toast.error('로그인이 필요합니다. 다시 로그인해주세요.');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('요청 시간이 초과되었습니다. 다시 시도해주세요.');
      } else {
        console.error('Failed to load today entry:', error);
        if (retryCount < 2) {
          toast.error('일기를 불러오는 중 오류가 발생했습니다. 다시 시도합니다...');
          setTimeout(() => loadTodayEntry(retryCount + 1), 1000);
        } else {
          toast.error('일기를 불러올 수 없습니다. 네트워크 연결을 확인해주세요.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCharacterMessages = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/diary/character-messages?date=${today}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCharacterMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load character messages:', error);
    }
  };

  const loadAllEmotions = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/emotions/custom`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const customEmotions = data.emotions || [];
        
        // Combine default emotions with custom emotions
        const combined = [
          ...defaultEmotions,
          ...customEmotions.map((emotion: any) => ({
            key: emotion.id,
            id: emotion.id,
            label: emotion.label,
            emoji: emotion.emoji,
            color: emotion.color,
            isCustom: true,
          })),
        ];
        
        setAllEmotions(combined);
      }
    } catch (error) {
      console.error('Failed to load custom emotions:', error);
    }
  };

  const handleEmotionChange = () => {
    loadAllEmotions();
    loadTodayEntry(); // Reload today's entry in case some emotions were deleted
    onEmotionUpdate?.(); // Notify parent component to refresh calendar
  };

  const loadTodayMission = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/emotion-care/today-mission`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTodayMission(data.mission);
      }
    } catch (error) {
      console.error('Failed to load today mission:', error);
    }
  };

  const loadMissionStatus = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/diary/mission-status?date=${today}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMissionCompleted(data.completed || false);
      }
    } catch (error) {
      console.error('Failed to load mission status:', error);
    }
  };

  const handleMissionToggle = async () => {
    try {
      const newCompletedState = !missionCompleted;
      setMissionCompleted(newCompletedState);

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/diary/mission-complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            date: today,
            missionId: todayMission?.id,
            completed: newCompletedState,
          }),
        }
      );
    } catch (error) {
      console.error('Failed to save mission completion:', error);
      // Revert on error
      setMissionCompleted(!missionCompleted);
    }
  };

  const generateDraft = async () => {
    setGenerating(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for AI generation
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/diary/generate?date=${selectedDate}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('Generated diary draft:', data);
        
        // Set all generated fields
        if (data.title) setTitle(data.title);
        if (data.content) setContent(data.content);
        if (data.emotion) setSelectedEmotion(data.emotion);
        if (data.compliment) setCompliment(data.compliment);
        if (data.regrets) setRegrets(data.regrets);
        
        toast.success('✨ AI가 일기 초안을 생성했습니다!\n내용을 확인하고 수정해보세요.');
      } else if (response.status === 404) {
        toast.error('오늘의 채팅 내역이 없습니다. 먼저 AI와 대화해보세요.');
      } else {
        console.error('Failed to generate diary draft:', response.status);
        toast.error('일기 초안 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error: any) {
      console.error('Error generating diary draft:', error);
      if (error.name === 'AbortError') {
        toast.error('AI 응답 시간이 초과되었습니다. 다시 시도해주세요.');
      } else {
        toast.error('일기 초안 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const deleteDiary = async () => {
    setShowDeleteDialog(false);
    setDeleting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/diary/delete`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            date: selectedDate,
          }),
        }
      );

      if (response.ok) {
        toast.success('일기가 삭제되었습니다.');
        // Reset form
        setContent('');
        setTitle('');
        setCompliment('');
        setRegrets('');
        setSelectedEmotion('');
        setCharacterMessages([]);
        if (onEmotionUpdate) {
          onEmotionUpdate();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '일기 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting diary:', error);
      toast.error('일기 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setDeleting(false);
    }
  };

  const saveDiary = async () => {
    if (!content.trim() || !selectedEmotion || !title.trim()) {
      toast.error('일기 제목, 한 줄 일기, 오늘의 기분을 모두 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/diary/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title,
            content,
            emotion: selectedEmotion,
            compliment,
            regrets: regrets ? regrets.trim() : '',
            date: selectedDate,
          }),
        }
      );

      if (response.ok) {
        toast.success('✅ 일기가 저장되었습니다!');
        loadTodayEntry(); // Reload today's entry
        loadCharacterMessages(); // Reload character messages
        if (onEmotionUpdate) {
          onEmotionUpdate();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '일기 저장에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Error saving diary:', error);
      toast.error('일기 저장 중 오류가 발생했습니다. 네트워크를 확인해주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">일기를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Today's Mission */}
      {todayMission && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-lg text-purple-800">오늘의 미션</CardTitle>
              </div>
              <button
                onClick={handleMissionToggle}
                className="flex items-center gap-2 text-purple-700 hover:text-purple-900 transition-colors"
              >
                {missionCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400" />
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className={`text-base mb-2 ${missionCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
              {todayMission.title}
            </h3>
            <p className={`text-sm ${missionCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
              {todayMission.description}
            </p>
            {missionCompleted && (
              <p className="text-sm text-green-600 mt-2">✨ 미션 완료! 정말 잘하셨어요!</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Today's diary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              일기 작성
            </CardTitle>
            {content && (
              <Button
                onClick={handleDeleteClick}
                variant="outline"
                size="sm"
                disabled={deleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                삭제
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-sm text-gray-600">
              {new Date(selectedDate).toLocaleDateString('ko-KR', { 
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Generate draft button */}
          <Button
            onClick={generateDraft}
            variant="outline"
            className="w-full"
            disabled={generating}
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                AI가 초안을 작성하는 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                오늘 채팅 기반으로 초안 생성
              </>
            )}
          </Button>

          {/* Diary title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              일기 제목 *
            </label>
            <InputComponent
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="오늘의 일기 제목을 적어주세요"
              maxLength={50}
            />
          </div>

          {/* Emotion selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">오늘의 기분 *</p>
              <EmotionManager accessToken={accessToken} onEmotionChange={handleEmotionChange} />
            </div>
            <div className="flex flex-wrap gap-2">
              {allEmotions.map((emotion) => {
                const emotionKey = emotion.key || emotion.id;
                const Icon = emotion.icon;
                
                return (
                  <button
                    key={emotionKey}
                    onClick={() => setSelectedEmotion(emotionKey!)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-colors ${
                      selectedEmotion === emotionKey
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {emotion.isCustom ? (
                      <span className="text-base">{emotion.emoji}</span>
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    {emotion.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diary content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              한 줄 일기 *
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="오늘 하루는 어떠셨나요? 짧게 한 줄로 적어보세요..."
              className="min-h-[100px] resize-none"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {content.length}/200자
            </p>
          </div>

          {/* Compliment section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ThumbsUp className="w-4 h-4 inline mr-1" />
              칭찬하기 (선택)
            </label>
            <InputComponent
              value={compliment}
              onChange={(e) => setCompliment(e.target.value)}
              placeholder="오늘 자신에게 해주고 싶은 칭찬을 적어보세요"
              maxLength={100}
            />
          </div>

          {/* Regrets section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ThumbsDown className="w-4 h-4 inline mr-1" />
              아쉬운 점 (선택)
            </label>
            <InputComponent
              value={regrets}
              onChange={(e) => setRegrets(e.target.value)}
              placeholder="오늘 아쉬웠던 점을 적어보세요"
              maxLength={100}
            />
          </div>

          {/* Character messages */}
          {characterMessages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Heart className="w-4 h-4 inline mr-1" />
                캐릭터들의 메시지
              </label>
              <div className="space-y-2">
                {characterMessages.map((message, index) => (
                  <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{message.emoji}</span>
                      <span className="text-sm font-medium text-purple-800">
                        {message.characterId === 'fox' ? '여우' : 
                         message.characterId === 'rabbit' ? '토끼' : 
                         message.characterId === 'dog' ? '강아지' : '캐릭터'}
                      </span>
                    </div>
                    <p className="text-sm text-purple-700">{message.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Save button */}
          <Button
            onClick={saveDiary}
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={saving || !content.trim() || !selectedEmotion || !title.trim()}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                일기 저장
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <DiaryDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={deleteDiary}
        diaryDate={new Date(selectedDate).toLocaleDateString('ko-KR', { 
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      />
    </div>
  );
}