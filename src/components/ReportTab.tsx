import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { EmotionSticker } from './EmotionStickers';
import { useDataCache } from '../utils/dataCache';

interface EmotionData {
  emotionCounts: Record<string, number>;
  calendarData: Array<{
    date: string;
    emotion: string;
    title: string;
  }>;
  totalDiaries: number;
  chatActivity?: {
    peakHours: Array<{ hour: number; count: number }>;
    totalMessages: number;
  };
  characterInsights?: Array<{
    characterId: string;
    characterName: string;
    messageCount: number;
    insight: string;
  }>;
  frequentWords?: Array<{
    word: string;
    count: number;
  }>;
}

const emotions = [
  { value: 'happy', label: '행복', emoji: '😊', color: '#FCD34D' },
  { value: 'sad', label: '슬픔', emoji: '😢', color: '#60A5FA' },
  { value: 'anxious', label: '불안', emoji: '😰', color: '#A78BFA' },
  { value: 'calm', label: '평온', emoji: '😌', color: '#34D399' },
  { value: 'excited', label: '설렘', emoji: '🤗', color: '#F472B6' },
  { value: 'tired', label: '피곤', emoji: '😴', color: '#9CA3AF' },
  { value: 'neutral', label: '보통', emoji: '😐', color: '#D1D5DB' }
];

export function ReportTab() {
  const { reportData, loadReports, refreshReports } = useDataCache();
  const [weekData, setWeekData] = useState<EmotionData | null>(null);
  const [monthData, setMonthData] = useState<EmotionData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [selectedDiary, setSelectedDiary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    console.log('[ReportTab] 🟢 Component MOUNTED');
    
    setIsLoading(true);
    loadReports().then((data) => {
      if (data) {
        setWeekData(data.week);
        setMonthData(data.month);
      }
    }).catch((error) => {
      console.error('[ReportTab] Failed to load reports:', error);
    }).finally(() => {
      setIsLoading(false);
    });
    
    return () => {
      console.log('[ReportTab] 🔴 Component UNMOUNTED');
    };
    // Empty dependency array - only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const data = await refreshReports();
      if (data) {
        setWeekData(data.week);
        setMonthData(data.month);
      }
    } catch (error) {
      console.error('Failed to refresh reports:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentData = selectedPeriod === 'week' ? weekData : monthData;

  const getChartData = () => {
    if (!currentData) return [];
    
    return Object.entries(currentData.emotionCounts).map(([emotion, count]) => {
      const emotionInfo = emotions.find(e => e.value === emotion);
      return {
        name: emotionInfo?.label || emotion,
        value: count,
        emoji: emotionInfo?.emoji,
        color: emotionInfo?.color
      };
    }).sort((a, b) => b.value - a.value);
  };

  const getPieData = () => {
    return getChartData();
  };

  // Custom label renderer for pie chart - shows count inside the slice
  const renderCustomLabel = (entry: any) => {
    return entry.value;
  };

  // Custom legend renderer with emotion stickers
  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => {
          const emotionValue = emotions.find(e => e.label === entry.value)?.value || 'neutral';
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <EmotionSticker emotion={emotionValue} size="small" />
              <span className="text-sm">{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const getCalendarDays = () => {
    if (!currentData) return [];
    
    const days = [];
    const daysCount = selectedPeriod === 'week' ? 7 : 30;
    const today = new Date();
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const diaryData = currentData.calendarData.find(d => d.date === dateString);
      const emotionInfo = diaryData 
        ? emotions.find(e => e.value === diaryData.emotion)
        : null;
      
      days.push({
        date: dateString,
        dayOfMonth: date.getDate(),
        dayOfWeek: date.toLocaleDateString('ko-KR', { weekday: 'short' }),
        emotion: emotionInfo,
        diary: diaryData
      });
    }
    
    return days;
  };

  const handleDayClick = (day: any) => {
    if (day.diary) {
      setSelectedDiary(day.diary);
    }
  };

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="p-3 sm:p-6 pb-24 max-w-6xl mx-auto min-h-full">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl mb-1 sm:mb-2">감정 리포트</h2>
          <p className="text-gray-600 text-xs sm:text-sm">나의 감정 흐름을 확인해보세요</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">새로고침</span>
        </Button>
      </div>

      <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'week' | 'month')} className="mb-4 sm:mb-6">
        <TabsList>
          <TabsTrigger value="week">주간</TabsTrigger>
          <TabsTrigger value="month">월간</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-6">
          {/* Loading skeletons */}
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-40 mb-2 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-gray-100 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        </div>
      ) : !currentData || currentData.totalDiaries === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-600 mb-2">
              아직 {selectedPeriod === 'week' ? '이번 주' : '이번 달'} 일기가 없어요
            </p>
            <p className="text-sm text-gray-500">
              일기를 작성하면 감정 패턴을 분석해드릴게요!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Character Ranking */}
          {currentData.characterInsights && currentData.characterInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>자주 대화하는 캐릭터</CardTitle>
                <CardDescription>
                  {selectedPeriod === 'week' ? '이번 주' : '이번 달'} 캐릭터별 대화 빈도
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentData.characterInsights.map((char, index) => {
                    const characterEmojis: Record<string, string> = {
                      'lumi': '🌙',
                      'kai': '💡',
                      'leo': '🦁',
                      'liv': '📊',
                      'group': '💬'
                    };
                    
                    const totalMessages = currentData.characterInsights!.reduce((sum, c) => sum + c.messageCount, 0);
                    const percentage = totalMessages > 0 ? ((char.messageCount / totalMessages) * 100).toFixed(1) : '0';
                    
                    return (
                      <div 
                        key={char.characterId} 
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
                          <span className="text-2xl">{characterEmojis[char.characterId] || '✨'}</span>
                          <span className="font-semibold">{char.characterName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-blue-600">{char.messageCount}회</div>
                            <div className="text-xs text-gray-500">{percentage}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights - AI 캐릭터 인사이트 */}
          {currentData.characterInsights && currentData.characterInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>AI 캐릭터 인사이트</CardTitle>
                <CardDescription>
                  {selectedPeriod === 'week' ? '이번 주' : '이번 달'} 함께한 캐릭터들의 분석
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentData.characterInsights.map((char) => {
                    const characterEmojis: Record<string, string> = {
                      'lumi': '🌙',
                      'kai': '💡',
                      'leo': '🦁',
                      'liv': '📊',
                      'group': '💬'
                    };
                    
                    return (
                      <div 
                        key={char.characterId} 
                        className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{characterEmojis[char.characterId] || '✨'}</span>
                          <span className="font-semibold">{char.characterName}</span>
                          <span className="text-xs text-gray-500">
                            ({char.messageCount}회 대화)
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {char.insight}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>감정 비율</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={getPieData()}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPieData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend content={renderCustomLegend} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Word Cloud */}
            <Card>
              <CardHeader>
                <CardTitle>자주 쓰는 단어</CardTitle>
                <CardDescription>
                  채팅에서 자주 사용한 표현들이에요
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentData.frequentWords && currentData.frequentWords.length > 0 ? (
                  <div className="flex flex-wrap gap-2 justify-center items-center p-4 min-h-[300px]">
                    {currentData.frequentWords.map((item, index) => {
                      // Calculate font size based on count (larger count = bigger font)
                      const maxCount = currentData.frequentWords![0].count;
                      const minSize = 14;
                      const maxSize = 40;
                      const fontSize = minSize + ((item.count / maxCount) * (maxSize - minSize));
                      
                      // Generate random colors for visual variety
                      const colors = [
                        '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', 
                        '#10b981', '#06b6d4', '#6366f1', '#f97316',
                        '#14b8a6', '#a855f7', '#ef4444', '#84cc16'
                      ];
                      const color = colors[index % colors.length];

                      return (
                        <span
                          key={index}
                          className="transition-all hover:scale-110 cursor-default"
                          style={{
                            fontSize: `${fontSize}px`,
                            color: color,
                            fontWeight: fontSize > 28 ? 'bold' : fontSize > 20 ? '600' : 'normal',
                            opacity: 0.8 + (item.count / maxCount) * 0.2,
                            padding: '4px 8px'
                          }}
                          title={`${item.count}번 사용`}
                        >
                          {item.word}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <p className="text-4xl mb-3">💬</p>
                    <p className="text-sm text-gray-600 mb-1">
                      AI 캐릭터와 대화를 나눠보세요
                    </p>
                    <p className="text-xs text-gray-500">
                      자주 사용하는 단어를 분석해드려요
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Emotion Calendar */}
          {/* <Card>
            <CardHeader>
              <CardTitle>감정 달력</CardTitle>
              <CardDescription>
                날짜를 클릭하면 해당 일기를 볼 수 있어요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {getCalendarDays().map((day, index) => (
                  <div
                    key={index}
                    className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-1 sm:p-2 transition-all ${
                      day.emotion
                        ? 'cursor-pointer hover:scale-105 hover:shadow-md'
                        : 'bg-gray-50'
                    }`}
                    style={{
                      backgroundColor: day.emotion ? day.emotion.color + '20' : undefined,
                      borderColor: day.emotion ? day.emotion.color : '#E5E7EB'
                    }}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="text-xs text-gray-600">{day.dayOfWeek}</div>
                    {day.diary ? (
                      <div className="my-1">
                        <EmotionSticker emotion={day.diary.emotion} size="small" />
                      </div>
                    ) : (
                      <div className="text-lg text-gray-300">·</div>
                    )}
                    <div className="text-xs text-gray-800">{day.dayOfMonth}</div>
                  </div>
                ))}
              </div>

              {selectedDiary && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4>{selectedDiary.title}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDiary(null)}
                    >
                      ✕
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {selectedDiary.date}
                  </p>
                </div>
              )}
            </CardContent>
          </Card> */}

          {/* Chat Activity Time */}
          <Card>
            <CardHeader>
              <CardTitle>채팅 활동 시간대</CardTitle>
              {/* <CardDescription>
                {currentData.chatActivity && currentData.chatActivity.totalMessages > 0 
                  ? `AI 캐릭터와 ${currentData.chatActivity.totalMessages}번 대화했어요`
                  : 'AI 캐릭터와 대화하면 시간대 분석을 볼 수 있어요'}
              </CardDescription> */}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentData.chatActivity && currentData.chatActivity.peakHours.length > 0 ? (
                  <>
                    <p className="text-sm mb-3">
                      ⏰ 가장 자주 대화하는 시간대
                    </p>
                    <div className="grid gap-2">
                      {currentData.chatActivity.peakHours.map((peak, index) => (
                        <div key={peak.hour} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                            <div>
                              <p className="font-semibold">
                                {peak.hour}시 ~ {(peak.hour + 1) % 24}시
                              </p>
                              <p className="text-xs text-gray-600">
                                {peak.hour < 6 ? '새벽' : 
                                 peak.hour < 12 ? '오전' : 
                                 peak.hour < 18 ? '오후' : '저녁'} 시간대
                              </p>
                            </div>
                          </div>
                          {/* <span className="text-sm font-semibold text-blue-600">
                            {peak.count}회
                          </span> */}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-3">💬</p>
                    <p className="text-sm text-gray-600 mb-1">
                      AI 캐릭터와 대화를 나눠보세요
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedPeriod === 'week' ? '최근 7일' : '최근 30일'} 동안의 채팅 시간대를 분석해드려요
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
