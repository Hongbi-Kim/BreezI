import React, { useState, useEffect } from 'react';
import { Save, Sparkles, Calendar, Smile, Frown, Angry, Zap, Heart, Shell, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input as InputComponent } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { EmotionManager } from './EmotionManager';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

interface DiaryPageProps {
  accessToken: string;
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
  { key: 'angry', label: '버럭', icon: Angry, color: 'bg-red-100 text-red-700', isPositive: false },
  { key: 'irritated', label: '까칠', icon: Zap, color: 'bg-purple-100 text-purple-700', isPositive: false },
  { key: 'anxious', label: '불안', icon: Shell, color: 'bg-orange-100 text-orange-700', isPositive: false },
];

export function DiaryPage({ accessToken }: DiaryPageProps) {
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

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadTodayEntry();
    loadAllEmotions();
    loadCharacterMessages();
  }, []);

  const loadTodayEntry = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/diary/today?date=${today}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.entry) {
          const entry = data.entry;
          setContent(entry.content || '');
          setTitle(entry.title || '');
          setCompliment(entry.compliment || '');
          setRegrets(entry.regrets || '');
          setSelectedEmotion(entry.emotion || '');
        }
      }
    } catch (error) {
      console.error('Failed to load today entry:', error);
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
  };

  const generateDraft = async () => {
    setGenerating(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/diary/generate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setContent(data.draftContent);
      } else {
        console.error('Failed to generate diary draft');
      }
    } catch (error) {
      console.error('Error generating diary draft:', error);
    } finally {
      setGenerating(false);
    }
  };

  const saveDiary = async () => {
    if (!content.trim() || !selectedEmotion || !title.trim()) {
      alert('일기 제목, 내용, 감정을 모두 입력해주세요.');
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
            regrets: regrets.trim(),
            date: today,
          }),
        }
      );

      if (response.ok) {
        alert('일기가 저장되었습니다!');
        loadTodayEntry(); // Reload today's entry
        loadCharacterMessages(); // Reload character messages
      } else {
        alert('일기 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error saving diary:', error);
      alert('일기 저장 중 오류가 발생했습니다.');
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
    <div className="p-4 space-y-6">
      {/* Today's diary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            오늘의 일기
            <span className="text-sm font-normal text-gray-500">
              {new Date().toLocaleDateString('ko-KR')}
            </span>
          </CardTitle>
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
              일기 제목
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
              한 줄 일기
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
              칭찬하기
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
              아쉬운 점
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
    </div>
  );
}