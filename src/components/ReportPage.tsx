import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Calendar, Smile, Frown, Angry, Zap, Shell, Mail, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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
}

interface ReportPageProps {
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
  { key: 'happy', label: '기쁨', icon: Smile, color: '#fbbf24' },
  { key: 'sad', label: '슬픔', icon: Frown, color: '#60a5fa' },
  { key: 'angry', label: '버럭', icon: Angry, color: '#f87171' },
  { key: 'anxious', label: '까칠', icon: Zap, color: '#fb923c' },
  { key: 'anxious', label: '불안', icon: Shell, color: '#fb923c' },
];

export function ReportPage({ accessToken }: ReportPageProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [emotionData, setEmotionData] = useState<EmotionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyEmotions, setMonthlyEmotions] = useState<DailyEmotion[]>([]);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [allEmotions, setAllEmotions] = useState<Emotion[]>(defaultEmotions);

  useEffect(() => {
    loadAllEmotions();
    loadEmotionReport();
    loadMonthlyEmotions();
  }, [selectedPeriod, currentDate]);

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

  const loadEmotionReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/report/emotion?period=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEmotionData(data);
      } else {
        console.error('Failed to load emotion report');
      }
    } catch (error) {
      console.error('Error loading emotion report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyEmotions = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/report/monthly?year=${year}&month=${month}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMonthlyEmotions(data.emotions || []);
      } else {
        console.error('Failed to load monthly emotions');
      }
    } catch (error) {
      console.error('Error loading monthly emotions:', error);
    }
  };

  const sendEmailReport = async () => {
    if (!emailAddress.trim()) {
      setEmailError('이메일 주소를 입력해주세요.');
      return;
    }

    setEmailLoading(true);
    setEmailError('');
    setEmailSuccess('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/report/email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email: emailAddress,
            period: selectedPeriod,
          }),
        }
      );

      if (response.ok) {
        setEmailSuccess('감정 리포트가 이메일로 전송되었습니다!');
        setEmailAddress('');
      } else {
        const data = await response.json();
        setEmailError(data.error || '이메일 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error sending email report:', error);
      setEmailError('이메일 전송 중 오류가 발생했습니다.');
    } finally {
      setEmailLoading(false);
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
    const values = Object.values(counts).map(v => Number(v));
    const maxCount = Math.max(...values);
    const mostFrequent = Object.entries(counts).find(([_, count]) => count === maxCount);
    
    if (!mostFrequent || maxCount === 0) return null;
    
    const emotion = allEmotions.find(e => (e.key || e.id) === mostFrequent[0]);
    return emotion ? { ...emotion, count: maxCount } : null;
  };

  const getEmotionInsight = () => {
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
    const positiveCount = (counts.happy || 0) + (counts.neutral || 0);
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

    const days: (number | null)[] = []; // 타입 추가하고 루프 밖으로 이동
  
    // 이전 달의 빈 칸들
    for (let i = 0; i < startDate; i++) {
      days.push(null); // 루프 안의 선언 제거
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

  return (
    <div className="p-4 space-y-6">
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
                {/* <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  카카오톡 전송
                </Button> */}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>감정 리포트 카카오톡 전송</DialogTitle>
                  <DialogDescription>
                    감정 분석 리포트를 카카오톡으로 받아보실 수 있습니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이메일 주소
                    </label>
                    <Input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="리포트를 받을 이메일 주소"
                    />
                  </div>
                  
                  {emailError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      {emailError}
                    </div>
                  )}
                  
                  {emailSuccess && (
                    <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                      {emailSuccess}
                    </div>
                  )}

                  <Button
                    onClick={sendEmailReport}
                    disabled={emailLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {emailLoading ? '전송 중...' : '리포트 전송하기'}
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
              감정 달력
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
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 {day}일 일기
                                  </DialogTitle>
                                  <DialogDescription>
                                    해당 날짜에 작성한 일기 내용입니다.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
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
                                  <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-gray-800">{dayEmotion.diary}</p>
                                  </div>
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
            {/* <p className="text-sm text-gray-600 mb-2">범례:</p> */}
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
            <CardTitle>감정 분석 인사이트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-gray-800">{insight}</p>
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