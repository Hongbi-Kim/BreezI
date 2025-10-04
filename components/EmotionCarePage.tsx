import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Heart, Plus, X, Play, Trash2, Sparkles } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface EmotionCarePageProps {
  accessToken: string;
}

interface EmotionKeyword {
  id: string;
  keyword: string;
  isPositive: boolean;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  emotionKeywords: string[];
}

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  description: string;
}

export function EmotionCarePage({ accessToken }: EmotionCarePageProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState('');
  const [isCustomPositive, setIsCustomPositive] = useState(true);
  const [emotionKeywords, setEmotionKeywords] = useState<EmotionKeyword[]>([
    { id: '1', keyword: '불안', isPositive: false },
    { id: '2', keyword: '슬픔', isPositive: false },
    { id: '3', keyword: '버럭', isPositive: false },
    { id: '4', keyword: '까칠', isPositive: false },
    { id: '5', keyword: '불안', isPositive: false },
    { id: '6', keyword: '무기력', isPositive: false },
    { id: '7', keyword: '기쁨', isPositive: true },
    { id: '8', keyword: '행복', isPositive: true },
    { id: '9', keyword: '희망', isPositive: true },
  ]);
  const [recommendedKeywords, setRecommendedKeywords] = useState<string[]>([]);
  const [todayMission, setTodayMission] = useState<Mission | null>(null);
  const [careContent, setCareContent] = useState<{
    breathingExercise?: string;
    videos?: YouTubeVideo[];
    tips?: string[];
  }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecommendedKeywords();
    loadTodayMission();
  }, []);

  useEffect(() => {
    if (selectedKeywords.length > 0) {
      loadCareContent();
    }
  }, [selectedKeywords]);

  const loadRecommendedKeywords = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/emotion-care/recommended-keywords`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRecommendedKeywords(data.keywords || []);
      }
    } catch (error) {
      console.error('Failed to load recommended keywords:', error);
    }
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

  const loadCareContent = async () => {
    if (selectedKeywords.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/emotion-care/content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ keywords: selectedKeywords }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCareContent(data);
      }
    } catch (error) {
      console.error('Failed to load care content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeywordSelect = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
    } else if (selectedKeywords.length < 3) {
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
  };

  const addCustomKeyword = () => {
    if (customKeyword.trim() && !emotionKeywords.some(k => k.keyword === customKeyword.trim())) {
      const newKeyword: EmotionKeyword = {
        id: Date.now().toString(),
        keyword: customKeyword.trim(),
        isPositive: isCustomPositive,
      };
      setEmotionKeywords([...emotionKeywords, newKeyword]);
      setCustomKeyword('');
    }
  };

  const removeCustomKeyword = (id: string) => {
    setEmotionKeywords(emotionKeywords.filter(k => k.id !== id));
    setSelectedKeywords(selectedKeywords.filter(k => {
      const keyword = emotionKeywords.find(ek => ek.id === id);
      return keyword ? k !== keyword.keyword : true;
    }));
  };

  const getEmotionMessage = () => {
    if (selectedKeywords.length === 0) return "오늘은 어떤 감정을 느끼고 계신가요?";
    
    const hasNegative = selectedKeywords.some(keyword => {
      const emotionKeyword = emotionKeywords.find(k => k.keyword === keyword);
      return emotionKeyword && !emotionKeyword.isPositive;
    });

    if (hasNegative) {
      return "힘든 시간을 보내고 계시는군요. 함께 마음을 돌봐보아요.";
    } else {
      return "좋은 감정을 느끼고 계시네요! 이 기분을 더 오래 유지해보세요.";
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="w-6 h-6 text-pink-500" />
          <h1 className="text-xl text-gray-800">감정 다스리기</h1>
        </div>
        <p className="text-sm text-gray-600">
          {getEmotionMessage()}
        </p>
      </div>

      {/* Today's Mission */}
      {todayMission && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-lg text-purple-800">오늘의 미션</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-base mb-2 text-gray-800">{todayMission.title}</h3>
            <p className="text-sm text-gray-600">{todayMission.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Emotion Keywords Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">감정 키워드 선택</CardTitle>
          <p className="text-sm text-gray-600">
            최대 3개까지 선택할 수 있습니다. ({selectedKeywords.length}/3)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recommended Keywords */}
          {recommendedKeywords.length > 0 && (
            <div>
              <h4 className="text-sm text-gray-700 mb-2">💡 자주 사용하는 키워드</h4>
              <div className="flex flex-wrap gap-2">
                {recommendedKeywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
                    className={`cursor-pointer ${
                      selectedKeywords.includes(keyword)
                        ? 'bg-purple-600 text-white'
                        : 'hover:bg-purple-50'
                    }`}
                    onClick={() => handleKeywordSelect(keyword)}
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* All Keywords */}
          <div>
            <h4 className="text-sm text-gray-700 mb-2">감정 키워드</h4>
            <div className="flex flex-wrap gap-2">
              {emotionKeywords.map((emotionKeyword) => (
                <div key={emotionKeyword.id} className="relative">
                  <Badge
                    variant={selectedKeywords.includes(emotionKeyword.keyword) ? "default" : "outline"}
                    className={`cursor-pointer ${
                      selectedKeywords.includes(emotionKeyword.keyword)
                        ? 'bg-purple-600 text-white'
                        : emotionKeyword.isPositive
                        ? 'hover:bg-green-50 border-green-200'
                        : 'hover:bg-red-50 border-red-200'
                    }`}
                    onClick={() => handleKeywordSelect(emotionKeyword.keyword)}
                  >
                    {emotionKeyword.keyword}
                    {!['불안', '슬픔', '분노', '외로움', '피로', '무기력', '기쁨', '행복', '희망'].includes(emotionKeyword.keyword) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomKeyword(emotionKeyword.id);
                        }}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Add Custom Keyword */}
          <div className="space-y-2">
            <h4 className="text-sm text-gray-700">나만의 키워드 추가</h4>
            <div className="flex gap-2">
              <Input
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                placeholder="키워드 입력"
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && addCustomKeyword()}
              />
              <select
                value={isCustomPositive ? 'positive' : 'negative'}
                onChange={(e) => setIsCustomPositive(e.target.value === 'positive')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="positive">긍정</option>
                <option value="negative">부정</option>
              </select>
              <Button
                onClick={addCustomKeyword}
                size="sm"
                disabled={!customKeyword.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Care Content */}
      {selectedKeywords.length > 0 && (
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">맞춤 컨텐츠를 찾고 있어요...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Breathing Exercise */}
              {careContent.breathingExercise && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">🫁 호흡법</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {careContent.breathingExercise}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Tips */}
              {careContent.tips && careContent.tips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">💡 도움되는 팁</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {careContent.tips.map((tip, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-purple-600 mt-1">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* YouTube Videos */}
              {careContent.videos && careContent.videos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">📺 추천 영상</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {careContent.videos.map((video) => (
                      <div key={video.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-20 h-14 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm text-gray-800 mb-1 line-clamp-2">
                            {video.title}
                          </h4>
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                            {video.description}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(video.url, '_blank')}
                            className="text-xs"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            시청하기
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}