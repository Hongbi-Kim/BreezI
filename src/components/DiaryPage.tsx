import React, { useState, useEffect } from 'react';
import { Save, Sparkles, Calendar, Smile, Frown, Angry, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { EmotionManager } from './EmotionManager';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiaryEntry {
  userId: string;
  content: string;
  emotion: string;
  date: string;
  timestamp: string;
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
}

const defaultEmotions = [
  { key: 'happy', label: '기쁨', icon: Smile, color: 'bg-yellow-100 text-yellow-700' },
  { key: 'sad', label: '슬픔', icon: Frown, color: 'bg-blue-100 text-blue-700' },
  { key: 'angry', label: '화남', icon: Angry, color: 'bg-red-100 text-red-700' },
  { key: 'anxious', label: '불안', icon: Zap, color: 'bg-orange-100 text-orange-700' },
  { key: 'neutral', label: '평온', icon: Calendar, color: 'bg-gray-100 text-gray-700' },
];

export function DiaryPage({ accessToken }: DiaryPageProps) {
  const [content, setContent] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [allEmotions, setAllEmotions] = useState<Emotion[]>(defaultEmotions);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadDiaryEntries();
    loadAllEmotions();
  }, []);

  const loadDiaryEntries = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/diary/entries`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
        
        // Check if there's an entry for today
        const todayEntry = data.entries.find((entry: DiaryEntry) => entry.date === today);
        if (todayEntry) {
          setContent(todayEntry.content);
          setSelectedEmotion(todayEntry.emotion);
        }
      }
    } catch (error) {
      console.error('Failed to load diary entries:', error);
    } finally {
      setLoading(false);
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
    loadDiaryEntries(); // Reload entries in case some emotions were deleted
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
    if (!content.trim() || !selectedEmotion) {
      alert('일기 내용과 감정을 선택해주세요.');
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
            content,
            emotion: selectedEmotion,
            date: today,
          }),
        }
      );

      if (response.ok) {
        alert('일기가 저장되었습니다!');
        loadDiaryEntries(); // Reload entries
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

          {/* Emotion selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">오늘의 기분</p>
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

          {/* Save button */}
          <Button
            onClick={saveDiary}
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={saving || !content.trim() || !selectedEmotion}
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

      {/* Past entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>지난 일기들</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entries.slice(0, 10).map((entry, index) => {
                const emotion = allEmotions.find(e => (e.key || e.id) === entry.emotion);
                const Icon = emotion?.icon || Calendar;
                
                return (
                  <div
                    key={`${entry.userId}-${entry.date}-${index}`}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(entry.date).toLocaleDateString('ko-KR')}
                      </span>
                      {emotion ? (
                        <Badge className={emotion.color}>
                          {emotion.isCustom ? (
                            <span className="text-xs mr-1">{emotion.emoji}</span>
                          ) : (
                            <Icon className="w-3 h-3 mr-1" />
                          )}
                          {emotion.label}
                        </Badge>
                      ) : entry.emotion ? (
                        <Badge className="bg-gray-100 text-gray-700">
                          <Calendar className="w-3 h-3 mr-1" />
                          선택안함
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-800">{entry.content}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}