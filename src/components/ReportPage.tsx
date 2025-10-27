import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Calendar, Smile, Frown, Angry, Zap, Share2, ChevronLeft, ChevronRight, BookOpen, Heart, AlertTriangle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
import { ReportPageSkeleton } from './LoadingSkeletons';
import { fetchWithCache, createCacheKey, cache } from '../utils/cache';

interface EmotionData {
  period: string;
  emotionCounts: Record<string, number>;
  totalEntries: number;
  customEmotions?: any[];
}

interface DailyEmotion {
  date: string;
  emotion: string;
  diary?: string;
  title?: string;
  compliment?: string;
  regrets?: string;
  missionTitle?: string;
  missionCompleted?: boolean;
}

interface ReportPageProps {
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
}

const defaultEmotions = [
  { key: 'happy', label: '기쁨', icon: Smile, color: '#fbbf24' },
  { key: 'sad', label: '슬픔', icon: Frown, color: '#60a5fa' },
  { key: 'angry', label: '화남', icon: Angry, color: '#f87171' },
  { key: 'anxious', label: '불안', icon: Zap, color: '#fb923c' },
];

export function ReportPage({ accessToken, onEmotionUpdate }: ReportPageProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [emotionData, setEmotionData] = useState<EmotionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyEmotions, setMonthlyEmotions] = useState<DailyEmotion[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');
  const [allEmotions, setAllEmotions] = useState<Emotion[]>(defaultEmotions);
  const [aiInsight, setAiInsight] = useState<string>('');

  useEffect(() => {
    loadAllEmotions();
    loadEmotionReport();
    loadMonthlyEmotions();
    loadAIInsight();
  }, [selectedPeriod, currentDate]);

  const loadAllEmotions = async () => {
    try {
      console.log('Loading custom emotions with token:', accessToken ? 'token exists' : 'no token');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/emotions/custom`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Custom emotions response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const customEmotions = data.emotions || [];
        
        // Combine default emotions with custom emotions
        const getHexColor = (tailwindColor: string) => {
          const colorMap: Record<string, string> = {
            'bg-yellow-100 text-yellow-700': '#fbbf24',
            'bg-blue-100 text-blue-700': '#60a5fa',
            'bg-red-100 text-red-700': '#f87171',
            'bg-green-100 text-green-700': '#4ade80',
            'bg-purple-100 text-purple-700': '#a855f7',
            'bg-pink-100 text-pink-700': '#ec4899',
            'bg-orange-100 text-orange-700': '#fb923c',
            'bg-gray-100 text-gray-700': '#9ca3af',
          };
          return colorMap[tailwindColor] || '#9ca3af';
        };

        const combined = [
          ...defaultEmotions,
          ...customEmotions.map((emotion: any) => ({
            key: emotion.id,
            id: emotion.id,
            label: emotion.label,
            emoji: emotion.emoji,
            color: getHexColor(emotion.color),
            isCustom: true,
          })),
        ];
        
        setAllEmotions(combined);
      }
    } catch (error) {
      console.error('Failed to load custom emotions:', error);
    }
  };

  const loadEmotionReport = async (retryCount = 0) => {
    setLoading(true);
    try {
      console.log('Loading emotion report with token:', accessToken ? 'token exists' : 'no token');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Reduced to 10 seconds
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/report/emotion?period=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      console.log('Emotion report response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Loaded emotion report data:', data);
        setEmotionData(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to load emotion report:', response.status, response.statusText, errorText);
        if (response.status === 401) {
          console.error('Authentication failed for emotion report');
          toast.error('로그인이 필요합니다.');
        } else if (response.status >= 500 && retryCount < 2) {
          toast.error('서버 오류가 발생했습니다. 다시 시도합니다...');
          setTimeout(() => loadEmotionReport(retryCount + 1), 1000);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Emotion report request timed out');
        toast.error('리포트를 불러오는 시간이 초과되었습니다.');
      } else {
        console.error('Error loading emotion report:', error);
        if (retryCount < 2) {
          setTimeout(() => loadEmotionReport(retryCount + 1), 1000);
        } else {
          toast.error('리포트를 불러올 수 없습니다. 네트워크를 확인해주세요.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyEmotions = async (retryCount = 0) => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      console.log('Loading monthly emotions for:', year, month);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Reduced to 10 seconds
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/report/monthly?year=${year}&month=${month}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      console.log('Monthly emotions response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Loaded monthly emotions data:', data);
        setMonthlyEmotions(data.emotions || []);
      } else {
        const errorText = await response.text();
        console.error('Failed to load monthly emotions:', response.status, response.statusText, errorText);
        if (response.status === 401) {
          console.error('Authentication failed for monthly emotions');
          toast.error('로그인이 필요합니다.');
        } else if (response.status >= 500 && retryCount < 2) {
          setTimeout(() => loadMonthlyEmotions(retryCount + 1), 1000);
        }
        setMonthlyEmotions([]);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Monthly emotions request timed out');
        toast.error('월별 감정 데이터를 불러오는 시간이 초과되었습니다.');
      } else {
        console.error('Error loading monthly emotions:', error);
        if (retryCount < 2) {
          setTimeout(() => loadMonthlyEmotions(retryCount + 1), 1000);
        }
      }
      setMonthlyEmotions([]);
    }
  };

  const loadAIInsight = async () => {
    try {
      console.log('Loading AI insight...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/report/insight?period=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('AI insight loaded:', data.insight);
        setAiInsight(data.insight || '');
      } else {
        console.error('Failed to load AI insight:', response.status);
        // Set fallback insight on error
        setAiInsight('');
      }
    } catch (error) {
      console.error('Error loading AI insight:', error);
      setAiInsight('');
    }
  };

  const shareToKakaoTalk = async () => {
    setShareLoading(true);
    setShareError('');
    setShareSuccess('');

    try {
      // 리포트 요약 생성
      const mostFrequent = getMostFrequentEmotion();
      const insight = getEmotionInsight();
      
      const shareText = `🌸 BreezI 감정 리포트 📊

📅 기간: ${selectedPeriod === 'week' ? '최근 1주일' : '최근 1개월'}
📝 총 일기 수: ${emotionData?.totalEntries || 0}개
💭 가장 많은 감정: ${mostFrequent ? mostFrequent.label : '없음'}

🔍 분석 결과:
${insight}

#BreezI #감정일기 #심리케어`;

      // 카카오톡 공유 (Web Share API 사용)
      if (navigator.share) {
        await navigator.share({
          title: 'BreezI 감정 리포트',
          text: shareText,
        });
        setShareSuccess('카카오톡으로 공유되었습니다!');
      } else {
        // Web Share API를 지원하지 않는 경우 클립보드에 복사
        await navigator.clipboard.writeText(shareText);
        setShareSuccess('리포트가 클립보드에 복사되었습니다. 카카오톡에 붙여넣기 해주세요!');
      }
    } catch (error) {
      console.error('Error sharing report:', error);
      
      // 공유나 클립보드 복사에 실패한 경우 텍스트 선택
      try {
        const mostFrequent = getMostFrequentEmotion();
        const insight = getEmotionInsight();
        
        const shareText = `🌸 BreezI 감정 리포트 📊

📅 기간: ${selectedPeriod === 'week' ? '최근 1주일' : '최근 1개월'}
📝 총 일기 수: ${emotionData?.totalEntries || 0}개
💭 가장 많은 감정: ${mostFrequent ? mostFrequent.label : '없음'}

🔍 분석 결과:
${insight}

#BreezI #감정일기 #심리케어`;

        // 임시 textarea를 만들어서 텍스트 복사
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        setShareSuccess('리포트가 클립보드에 복사되었습니다. 카카오톡에 붙여넣기 해주세요!');
      } catch (fallbackError) {
        setShareError('공유에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setShareLoading(false);
    }
  };

  const getChartData = () => {
    if (!emotionData) return [];
    
    return allEmotions
      .filter(emotion => {
        const emotionKey = emotion.key || emotion.id;
        return emotionKey && emotionData.emotionCounts[emotionKey] > 0;
      })
      .map(emotion => {
        const emotionKey = emotion.key || emotion.id;
        return {
          name: emotion.label,
          value: emotionData.emotionCounts[emotionKey!],
          color: emotion.color.startsWith('#') ? emotion.color : '#9ca3af',
        };
      });
  };

  const getBarData = () => {
    if (!emotionData) return [];
    
    return allEmotions
      .filter(emotion => {
        const emotionKey = emotion.key || emotion.id;
        return emotionKey && emotionData.emotionCounts[emotionKey] > 0;
      })
      .map(emotion => {
        const emotionKey = emotion.key || emotion.id;
        return {
          emotion: emotion.label,
          count: emotionData.emotionCounts[emotionKey!],
          fill: emotion.color.startsWith('#') ? emotion.color : '#9ca3af',
        };
      });
  };

  const getMostFrequentEmotion = () => {
    if (!emotionData) return null;
    
    const counts = emotionData.emotionCounts;
    const maxCount = Math.max(...Object.values(counts) as number[]);
    const mostFrequent = Object.entries(counts).find(([_, count]) => count === maxCount);
    
    if (!mostFrequent || maxCount === 0) return null;
    
    const emotion = allEmotions.find(e => (e.key || e.id) === mostFrequent[0]);
    return emotion ? { ...emotion, count: maxCount } : null;
  };

  const getEmotionInsight = () => {
    // Use AI insight if available
    if (aiInsight) {
      return aiInsight;
    }
    
    // Fallback to rule-based insight
    if (!emotionData || emotionData.totalEntries === 0) {
      return "아직 충분한 데이터가 없어요. 일기를 더 작성해보세요!";
    }

    const mostFrequent = getMostFrequentEmotion();
    const counts = emotionData.emotionCounts;
    const total = emotionData.totalEntries;

    if (!mostFrequent) {
      return "감정 패턴을 분석하기 위해 더 많은 일기가 필요해요.";
    }

    // Calculate positive vs negative based on default emotions
    const positiveCount = (counts.happy || 0);
    const negativeCount = (counts.sad || 0) + (counts.angry || 0) + (counts.anxious || 0);
    const positiveRatio = positiveCount / total;

    if (positiveRatio >= 0.7) {
      return `이번 ${selectedPeriod === 'week' ? '주' : '달'}에는 전반적으로 긍정적인 감정이 많았어요! 이런 좋은 상태를 유지해보세요. ✨`;
    } else if (positiveRatio >= 0.5) {
      return `감정의 균형이 잘 잡혀있어요. 힘든 순간도 있었지만 잘 극복하고 계시는 것 같아요. 🌱`;
    } else {
      return `요즘 조금 힘든 시기를 보내고 계시는 것 같아요. 혼자 견디지 마시고, 주변 사람들에게 도움을 요청해보세요. 💜`;
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDate = firstDay.getDay();

    const days = [];
    // 이전 달의 빈 칸들
    for (let i = 0; i < startDate; i++) {
      days.push(null);
    }
    // 현재 달의 날짜들
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getEmotionForDate = (day: number) => {
    if (!day) return null;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return monthlyEmotions.find(e => e.date === dateStr);
  };

  const getEmotionIcon = (emotionKey: string) => {
    const emotion = allEmotions.find(e => (e.key || e.id) === emotionKey);
    return emotion ? (emotion.icon || Calendar) : Calendar;
  };

  const getEmotionColor = (emotionKey: string) => {
    const emotion = allEmotions.find(e => (e.key || e.id) === emotionKey);
    return emotion ? (emotion.color.startsWith('#') ? emotion.color : '#9ca3af') : '#9ca3af';
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">감정 리포트를 생성하는 중...</p>
        </div>
      </div>
    );
  }

  const chartData = getChartData();
  const barData = getBarData();
  const mostFrequent = getMostFrequentEmotion();
  const insight = getEmotionInsight();

  if (loading) {
    return (
      <div className="p-4 space-y-6 pb-24">
        <ReportPageSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Period selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              감정 리포트
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  카카오톡 공유
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>감정 리포트 카카오톡 공유</DialogTitle>
                  <DialogDescription>
                    감정 분석 리포트를 카카오톡으로 공유할 수 있습니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      📱 리포트 요약본이 카카오톡으로 공유됩니다. 
                      친구나 가족과 나의 감정 상태를 공유해보세요!
                    </p>
                  </div>
                  
                  {shareError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      {shareError}
                    </div>
                  )}
                  
                  {shareSuccess && (
                    <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                      {shareSuccess}
                    </div>
                  )}

                  <Button
                    onClick={shareToKakaoTalk}
                    disabled={shareLoading || !emotionData}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900"
                  >
                    {shareLoading ? '공유 중...' : '📱 카카오톡으로 공유하기'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => setSelectedPeriod('week')}
              variant={selectedPeriod === 'week' ? 'default' : 'outline'}
              className={selectedPeriod === 'week' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              최근 1주일
            </Button>
            <Button
              onClick={() => setSelectedPeriod('month')}
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              className={selectedPeriod === 'month' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              최근 1개월
            </Button>
          </div>

          {emotionData && emotionData.totalEntries > 0 ? (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{emotionData.totalEntries}</p>
                <p className="text-sm text-gray-600">총 일기 수</p>
              </div>
              {mostFrequent && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {mostFrequent.isCustom ? (
                      <span className="text-lg">{mostFrequent.emoji}</span>
                    ) : (
                      <mostFrequent.icon className="w-5 h-5" style={{ color: mostFrequent.color }} />
                    )}
                    <span className="font-bold">{mostFrequent.count}</span>
                  </div>
                  <p className="text-sm text-gray-600">가장 많은 감정</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">아직 일기 데이터가 없어요</p>
              <p className="text-sm text-gray-500">일기를 작성하면 감정 패턴을 분석해드려요!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              월별 감정 달력
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </span>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((day, index) => {
              const dayEmotion = day ? getEmotionForDate(day) : null;
              const EmotionIcon = dayEmotion ? getEmotionIcon(dayEmotion.emotion) : null;
              
              return (
                <div key={index} className="aspect-square">
                  {day ? (
                    <div className="relative h-full flex flex-col items-center justify-center p-1 rounded-lg hover:bg-gray-50">
                      <span className="text-sm">{day}</span>
                      {dayEmotion && (
                        <div className="flex flex-col items-center gap-1 mt-1">
                          {EmotionIcon && (
                            <EmotionIcon 
                              className="w-3 h-3" 
                              style={{ color: getEmotionColor(dayEmotion.emotion) }}
                            />
                          )}
                          {dayEmotion.diary && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <button className="p-1 rounded-full hover:bg-purple-100">
                                  <BookOpen className="w-3 h-3 text-purple-600" />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 {day}일 일기
                                  </DialogTitle>
                                  <DialogDescription>
                                    해당 날짜에 작성한 일기 내용입니다.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {/* 감정 */}
                                  <div className="flex items-center gap-2">
                                    {EmotionIcon && (
                                      <EmotionIcon 
                                        className="w-5 h-5" 
                                        style={{ color: getEmotionColor(dayEmotion.emotion) }}
                                      />
                                    )}
                                    <span className="font-medium">
                                      {allEmotions.find(e => (e.key || e.id) === dayEmotion.emotion)?.label || '알 수 없음'}
                                    </span>
                                  </div>

                                  {/* 제목 */}
                                  {dayEmotion.title && (
                                    <div>
                                      <h4 className="font-medium text-gray-700 mb-2">📝 제목</h4>
                                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                        <p className="text-gray-800">{dayEmotion.title}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* 한 줄 일기 */}
                                  {dayEmotion.diary && (
                                    <div>
                                      <h4 className="font-medium text-gray-700 mb-2">💭 한 줄 일기</h4>
                                      <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-gray-800">{dayEmotion.diary}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* 잘한 점 */}
                                  {dayEmotion.compliment && (
                                    <div>
                                      <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <Heart className="w-4 h-4 text-green-500" />
                                        잘한 점
                                      </h4>
                                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                        <p className="text-gray-800">{dayEmotion.compliment}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* 아쉬운 점 */}
                                  {dayEmotion.regrets && (
                                    <div>
                                      <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                                        아쉬운 점
                                      </h4>
                                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                        <p className="text-gray-800">{dayEmotion.regrets}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* 오늘의 미션 */}
                                  {dayEmotion.missionTitle && (
                                    <div>
                                      <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <Sparkles className="w-4 h-4 text-purple-500" />
                                        오늘의 미션
                                      </h4>
                                      <div className={`p-3 rounded-lg border ${dayEmotion.missionCompleted ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'}`}>
                                        <div className="flex items-center justify-between">
                                          <p className={`text-gray-800 ${dayEmotion.missionCompleted ? 'line-through' : ''}`}>
                                            {dayEmotion.missionTitle}
                                          </p>
                                          {dayEmotion.missionCompleted && (
                                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                              완료
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full"></div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Calendar Legend */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">범례:</p>
            <div className="flex flex-wrap gap-3 text-xs">
              {allEmotions.map(emotion => {
                const emotionKey = emotion.key || emotion.id;
                return (
                  <div key={emotionKey} className="flex items-center gap-1">
                    {emotion.isCustom ? (
                      <span className="text-xs">{emotion.emoji}</span>
                    ) : (
                      <emotion.icon className="w-3 h-3" style={{ color: emotion.color }} />
                    )}
                    <span className="text-gray-600">{emotion.label}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-purple-600" />
                <span className="text-gray-600">일기</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insight */}
      {emotionData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              감정 분석 인사이트
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              {!aiInsight ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <p>AI가 감정을 분석하는 중...</p>
                </div>
              ) : (
                <p className="text-gray-800">{insight}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pie Chart */}
      {emotionData && emotionData.totalEntries > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>감정 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {chartData.filter(item => item.value > 0).map((item, index) => (
                <Badge key={`badge-${item.name}-${index}`} variant="outline" className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name} ({item.value})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}