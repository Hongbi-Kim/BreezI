import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { ScrollArea } from './ui/scroll-area';
import { Plus, ChevronLeft, ChevronRight, Sparkles, Trash2, Pencil, Anchor, Waves, ChevronDown, ChevronUp, BookOpen, ThumbsUp, AlertCircle } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataCache } from '../utils/dataCache';
import { apiCall } from '../utils/api';
import { logUserAction } from '../utils/logUserAction';
import { EmotionSticker } from './EmotionStickers';
import { EmotionWave } from './EmotionWave';
import { TimeCapsuleSection } from './TimeCapsuleSection';
import { TimeRippleSection, TIME_RIPPLE_QUESTIONS } from './TimeRippleSection';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { toast } from 'sonner';

interface Diary {
  id: string;
  date: string;
  title: string | null;
  emotion: string | null;
  content: string | null;
  praise?: string | null;
  regret?: string | null;
  createdAt: string;
}

const emotions = [
  { value: 'happy', label: '행복해요', color: 'bg-yellow-100' },
  { value: 'sad', label: '슬퍼요', color: 'bg-blue-100' },
  { value: 'anxious', label: '불안해요', color: 'bg-purple-100' },
  { value: 'calm', label: '평온해요', color: 'bg-green-100' },
  { value: 'excited', label: '설레요', color: 'bg-pink-100' },
  { value: 'angry', label: '화나요', color: 'bg-red-100' },
  { value: 'tired', label: '피곤해요', color: 'bg-gray-100' },
  { value: 'neutral', label: '그냥 그래요', color: 'bg-gray-50' }
];

export function DiaryTab() {
  const { diariesData, loadDiaries, refreshDiaries, profileData, loadProfile, loadRippleDates } = useDataCache();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [capsuleRefreshKey, setCapsuleRefreshKey] = useState(0);
  const [currentDate, setCurrentDate] = useState<string>('');
  
  // Wave Loop states
  const [selectedDiaryRippleAnswers, setSelectedDiaryRippleAnswers] = useState<Array<{
    id: string;
    date: string;
    answer: string;
    createdAt: string;
  }>>([]);
  const [isRippleSectionOpen, setIsRippleSectionOpen] = useState(false);
  const [rippleDates, setRippleDates] = useState<Set<string>>(new Set()); // Dates with Wave Loop answers
  const [viewDialogDate, setViewDialogDate] = useState<string>(''); // Current date being viewed

  // Get today's date in user's local timezone (YYYY-MM-DD)
  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDateStr = currentDate || getTodayDate();

  // Calendar state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // Form state
  const [selectedDate, setSelectedDate] = useState(todayDateStr);
  const [title, setTitle] = useState('');
  const [emotion, setEmotion] = useState('neutral');
  const [content, setContent] = useState('');
  const [praise, setPraise] = useState('');
  const [regret, setRegret] = useState('');
  
  // Time capsule state
  const [isTimeCapsule, setIsTimeCapsule] = useState(false);
  const [capsuleOpenDate, setCapsuleOpenDate] = useState('');
  const [showSinkAnimation, setShowSinkAnimation] = useState(false);
  const [sinkingDiary, setSinkingDiary] = useState<any>(null);

  useEffect(() => {
    console.log('[DiaryTab] 🟢 Component MOUNTED');
    
    // Set initial date
    const initialDate = getTodayDate();
    setCurrentDate(initialDate);
    setSelectedDate(initialDate);

    // Load diaries from cache
    loadDiaries().then((data) => {
      if (data) {
        setDiaries(data);
      }
    }).catch((error) => {
      console.error('[DiaryTab] Failed to load diaries:', error);
    });

    // Load profile for birthday info from cache
    loadProfile().catch((error) => {
      console.error('[DiaryTab] Failed to load profile:', error);
    });

    // Load Wave Loop dates from cache
    loadRippleDates().then((dates) => {
      if (dates) {
        setRippleDates(new Set(dates));
      }
    }).catch((error) => {
      console.error('[DiaryTab] Failed to load ripple dates:', error);
    });

    // Check for date change every minute
    const intervalId = setInterval(() => {
      const newDate = getTodayDate();
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
        if (!isEditMode && !isCreateDialogOpen) {
          setSelectedDate(newDate);
        }
      }
    }, 60000); // Check every minute

    return () => {
      console.log('[DiaryTab] 🔴 Component UNMOUNTED');
      clearInterval(intervalId);
    };
    // Empty dependency array - only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setSelectedDate(todayDateStr);
    setTitle('');
    setEmotion('neutral');
    setContent('');
    setPraise('');
    setRegret('');
    setIsTimeCapsule(false);
    setCapsuleOpenDate('');
    setIsEditMode(false);
    setEditingDiaryId(null);
  };

  const handleEdit = (diary: Diary) => {
    setIsEditMode(true);
    setEditingDiaryId(diary.id);
    setSelectedDate(diary.date);
    setTitle(diary.title);
    setEmotion(diary.emotion);
    setContent(diary.content);
    setPraise(diary.praise || '');
    setRegret(diary.regret || '');
    setIsViewDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  const handleRandomCapsuleDate = () => {
    const [year, month, day] = todayDateStr.split('-').map(Number);
    const today = new Date(year, month - 1, day);
    const minDays = 30; // 랜덤 선택은 최소 한달 후
    const maxDays = 365; // 최대 1년
    const randomDays = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
    
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + randomDays);
    
    const futureYear = futureDate.getFullYear();
    const futureMonth = String(futureDate.getMonth() + 1).padStart(2, '0');
    const futureDay = String(futureDate.getDate()).padStart(2, '0');
    setCapsuleOpenDate(`${futureYear}-${futureMonth}-${futureDay}`);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }

    if (isTimeCapsule && !capsuleOpenDate) {
      toast.error('타임캡슐 오픈 날짜를 선택해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      console.log('=== SAVING DIARY ===');
      console.log('Date:', selectedDate);
      console.log('Title:', title);
      console.log('Emotion:', emotion);
      console.log('Content length:', content.length);
      console.log('Is Time Capsule:', isTimeCapsule);
      
      const result = await apiCall('/diary', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          title,
          emotion,
          content,
          praise,
          regret
        })
      });
      
      console.log('=== SAVE RESULT ===', result);

      if (result.success) {
        // If time capsule, save it separately and show animation
        if (isTimeCapsule && result.diary) {
          // Close dialog FIRST
          setIsCreateDialogOpen(false);
          
          // Then show sinking animation
          setSinkingDiary(result.diary);
          setShowSinkAnimation(true);

          // Save time capsule
          try {
            const capsuleResult = await apiCall('/timecapsule/create', {
              method: 'POST',
              body: JSON.stringify({
                diaryId: result.diary.id,
                diaryTitle: title,
                openDate: capsuleOpenDate,
              })
            });
            console.log('=== TIME CAPSULE CREATED ===', capsuleResult);
          } catch (error) {
            console.error('Failed to create time capsule:', error);
          }

          // Wait for animation
          setTimeout(async () => {
            setShowSinkAnimation(false);
            setSinkingDiary(null);
            setIsSaving(false);
            resetForm();
            const updatedDiaries = await refreshDiaries();
            if (updatedDiaries) setDiaries(updatedDiaries);
            setCapsuleRefreshKey(prev => prev + 1); // Refresh time capsule section
            toast.success('🐚 타임캡슐에 안전하게 보관되었습니다!');
          }, 3000);
        } else {
          // Normal save
          setIsCreateDialogOpen(false);
          setIsSaving(false);
          resetForm();
          const updatedDiaries = await refreshDiaries();
          if (updatedDiaries) setDiaries(updatedDiaries);
          toast.success(isEditMode ? '일기가 수정되었습니다! 🌊' : '일기가 저장되었습니다! 🌊');
          // Log diary creation
          if (!isEditMode) {
            logUserAction('create', 'diary', { emotion, hasTimeCapsule: false });
          }
        }
      } else {
        throw new Error('Save failed: no success response');
      }
    } catch (error: any) {
      console.error('=== SAVE ERROR ===', error);
      toast.error(`일기 저장에 실패했습니다: ${error.message}`);
      setIsSaving(false);
    }
  };



  const handleDelete = async () => {
    if (!selectedDiary) return;
    
    setIsDeleting(true);
    try {
      await apiCall(`/diary/${selectedDiary.id}`, {
        method: 'DELETE',
      });
      
      // Refresh cache and update local state
      const updatedDiaries = await refreshDiaries();
      if (updatedDiaries) setDiaries(updatedDiaries);
      setIsDeleteDialogOpen(false);
      setIsViewDialogOpen(false);
      setSelectedDiary(null);
      toast.success('일기가 삭제되었습니다');
    } catch (error: any) {
      console.error('Failed to delete diary:', error);
      toast.error('일기 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDateClick = async (date: string) => {
    console.log('Date clicked:', date);
    const diary = diaries.find(d => d.date === date);
    const hasRipple = rippleDates.has(date);
    console.log('Found diary:', diary, 'Has ripple:', hasRipple);
    
    // Always open view dialog for any date
    console.log('Opening view dialog for date:', date);
    setSelectedDiary(diary || null);
    setViewDialogDate(date);
    
    // Load TimeRipple answers for this date (including all years)
    try {
      const rippleData = await apiCall(`/time-ripple/${date}`);
      const allAnswers = [];
      
      // Add today's answer if exists
      if (rippleData.answer) {
        allAnswers.push(rippleData.answer);
      }
      
      // Add past answers (other years)
      if (rippleData.pastAnswers && rippleData.pastAnswers.length > 0) {
        allAnswers.push(...rippleData.pastAnswers);
      }
      
      setSelectedDiaryRippleAnswers(allAnswers);
    } catch (error) {
      console.error('Failed to load ripple answers:', error);
      setSelectedDiaryRippleAnswers([]);
    }
    
    setIsViewDialogOpen(true);
  };

  const handleNewDiary = () => {
    resetForm();
    setSelectedDate(todayDateStr);
    setIsCreateDialogOpen(true);
  };

  // Calendar functions
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const previousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // 생일인지 확인하는 함수 (월-일 비교)
  const isBirthday = (date: string): boolean => {
    if (!profileData?.data?.profile?.birthDate) return false;
    
    // date: YYYY-MM-DD, birthDate: YYYY-MM-DD
    const [, dateMonth, dateDay] = date.split('-');
    const [, birthMonth, birthDay] = profileData.data.profile.birthDate.split('-');
    
    return dateMonth === birthMonth && dateDay === birthDay;
  };

  // 가장 최근 일기의 감정을 가져오는 함수
  const getRecentEmotions = (): string[] => {
    if (diaries.length === 0) return [];
    
    // 오늘 일기가 있는지 확인
    const todayDiary = diaries.find(d => d.date === todayDateStr);
    if (todayDiary?.emotion) {
      return [todayDiary.emotion];
    }

    // 오늘 일기가 없으면 가장 최근 일기 찾기
    const sortedDiaries = [...diaries].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const recentDiary = sortedDiaries[0];
    if (recentDiary?.emotion) {
      return [recentDiary.emotion];
    }

    return [];
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    console.log('=== CALENDAR DEBUG ===');
    console.log('Rendering calendar with', diaries.length, 'diaries');
    console.log('Profile data:', profileData);
    console.log('Birth date:', profileData?.data?.profile?.birthDate);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const diary = diaries.find(d => d.date === date);
      const hasRipple = rippleDates.has(date);
      const isToday = date === todayDateStr;
      const isBirthdayDate = isBirthday(date);

      if (isBirthdayDate) {
        console.log('🎂 BIRTHDAY FOUND:', date);
      }

      // if (diary) {
      //   console.log('Found diary for date:', date, 'emotion:', diary.emotion);
      // }

      days.push(
        <div
          key={date}
          onClick={() => handleDateClick(date)}
          className={`aspect-square border border-gray-200 rounded-lg p-1 sm:p-2 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${
            isToday ? 'ring-2 ring-blue-500' : ''
          } ${diary ? 'bg-blue-50 border-blue-300' : hasRipple ? 'bg-slate-50 border-slate-300' : ''} ${
            isBirthdayDate ? 'bg-gradient-to-br from-pink-50 to-yellow-50 border-pink-300' : ''
          }`}
        >
          <span className={`text-xs sm:text-sm ${diary || isBirthdayDate || hasRipple ? 'mb-0.5' : ''} ${isToday ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
            {day}
          </span>
          {diary && (
            <EmotionSticker emotion={diary.emotion || 'neutral'} size="small" />
          )}
          {!diary && hasRipple && (
            <span className="text-sm" title="Wave Loop 답변 있음">
              🌊
            </span>
          )}
          {isBirthdayDate && (
            <span className="text-base sm:text-lg" title="생일 🎂">
              🎂
            </span>
          )}
        </div>
      );
    }

    return days;
  };

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="p-3 sm:p-4 pb-24 max-w-4xl mx-auto min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl mb-1">감정 일기</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            매일의 마음을 기록해보세요 🌊
          </p>
        </div>
        {/* <Button onClick={handleNewDiary} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">새 일기 작성</span>
          <span className="sm:hidden">작성</span>
        </Button> */}
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={previousMonth} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-base sm:text-lg">{currentYear}년 {monthNames[currentMonth]}</CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs sm:text-sm text-gray-600 font-medium">
                {day}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {renderCalendar()}
          </div>

          {/* Emotion Wave */}
          <div className="mt-4 sm:mt-6">
            <EmotionWave emotions={getRecentEmotions()} />
          </div>

          {/* Legend */}
          <div className="mt-4 sm:mt-6 pt-4 border-t">
            <p className="text-xs sm:text-sm text-gray-600 mb-3">감정 스티커</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {emotions.map(e => (
                <div key={e.value} className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8">
                    <EmotionSticker emotion={e.value} size="small" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-700 truncate">{e.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Capsule Section */}
      <div className="mt-6">
        <TimeCapsuleSection key={capsuleRefreshKey} />
      </div>

      {/* Time Ripple Section */}
      <div className="mt-6">
        <TimeRippleSection />
      </div>

      {/* Create Diary Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full">
          <DialogHeader className="pb-6">
            <DialogTitle>{isEditMode ? '일기 수정' : '새 일기 작성'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? '일기를 수정하고 저장하세요.' : '오늘 하루는 어땠나요? 마음을 편하게 적어보세요.'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 pt-2">
              <div>
                <Label>날짜</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={isEditMode}
                />
              </div>

              <div>
                <Label>오늘의 감정</Label>
                <Select value={emotion} onValueChange={setEmotion}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <EmotionSticker emotion={emotion} size="small" />
                        <span>{emotions.find(e => e.value === emotion)?.label}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {emotions.map(e => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>제목</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="일기 제목을 입력하세요"
                />
              </div>

              <div>
                <Label>오늘의 이야기</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="오늘 하루를 기록해보세요..."
                  rows={6}
                />
              </div>

              <div>
                <Label>오늘 잘한 일 (선택)</Label>
                <Textarea
                  value={praise}
                  onChange={(e) => setPraise(e.target.value)}
                  placeholder="나를 칭찬해주세요"
                  rows={2}
                />
              </div>

              <div>
                <Label>아쉬운 점 (선택)</Label>
                <Textarea
                  value={regret}
                  onChange={(e) => setRegret(e.target.value)}
                  placeholder="내일은 더 나아질 거예요"
                  rows={2}
                />
              </div>

              {/* Time Capsule Option */}
              {!isEditMode && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="timecapsule"
                      checked={isTimeCapsule}
                      onCheckedChange={(checked) => setIsTimeCapsule(checked as boolean)}
                    />
                    <label
                      htmlFor="timecapsule"
                      className="text-sm cursor-pointer flex items-center gap-2"
                    >
                      <Anchor className="w-4 h-4 text-blue-500" />
                      <span>타임캡슐에 넣기 (심해 속에 보관)</span>
                    </label>
                  </div>

                  {isTimeCapsule && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 pl-6"
                    >
                      <Label className="text-xs text-gray-600">
                        언제 열어볼까요?
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={capsuleOpenDate}
                          onChange={(e) => setCapsuleOpenDate(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRandomCapsuleDate}
                          className="gap-1 whitespace-nowrap"
                          title="최소 30일 후 랜덤 날짜"
                        >
                          <Sparkles className="w-3 h-3" />
                          랜덤
                        </Button>
                      </div>
                      <p className="text-xs text-blue-600">
                        🐚 선택한 날짜까지 깊은 바다 속에 안전하게 보관됩니다
                      </p>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? '저장 중...' : (isEditMode ? '수정 완료' : '저장하기')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Diary Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        setIsViewDialogOpen(open);
        if (!open) {
          setSelectedDiaryRippleAnswers([]);
          setIsRippleSectionOpen(false);
          setViewDialogDate('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedDiary && <EmotionSticker emotion={selectedDiary?.emotion || 'neutral'} size="normal" />}
              <div>
                <DialogTitle>{selectedDiary?.title || '기록 보기'}</DialogTitle>
                <DialogDescription>
                  {selectedDiary?.date || viewDialogDate}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {selectedDiary ? (
                <>
                  {/* 오늘의 이야기 */}
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl opacity-50 group-hover:opacity-75 transition duration-300 blur"></div>
                    <div className="relative bg-white rounded-xl border-2 border-blue-100 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <Label className="text-blue-900 font-medium">오늘의 이야기</Label>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed pl-1">{selectedDiary?.content}</p>
                    </div>
                  </div>

                  {/* 오늘 잘한 일 */}
                  {selectedDiary?.praise && (
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl opacity-50 group-hover:opacity-75 transition duration-300 blur"></div>
                      <div className="relative bg-white rounded-xl border-2 border-green-100 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 bg-green-50 rounded-lg">
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                          </div>
                          <Label className="text-green-900 font-medium">오늘 잘한 일</Label>
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed pl-1">{selectedDiary.praise}</p>
                      </div>
                    </div>
                  )}

                  {/* 아쉬운 점 */}
                  {selectedDiary?.regret && (
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl opacity-50 group-hover:opacity-75 transition duration-300 blur"></div>
                      <div className="relative bg-white rounded-xl border-2 border-amber-100 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 bg-amber-50 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                          </div>
                          <Label className="text-amber-900 font-medium">아쉬운 점</Label>
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed pl-1">{selectedDiary.regret}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  이 날의 일기가 없습니다
                </div>
              )}

              {/* Wave Loop Collapsible Section */}
              {(() => {
                const date = selectedDiary?.date || (selectedDiaryRippleAnswers.length > 0 ? selectedDiaryRippleAnswers[0].date : '');
                if (!date) return null;
                const monthDay = date.substring(5); // MM-DD
                const question = TIME_RIPPLE_QUESTIONS[monthDay];
                const hasAnswers = selectedDiaryRippleAnswers.length > 0;
                
                if (!hasAnswers) return null;
                
                return (
                  <Collapsible
                    open={isRippleSectionOpen}
                    onOpenChange={setIsRippleSectionOpen}
                    className="mt-6"
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 hover:border-sky-300 transition-all duration-300 shadow-sm hover:shadow-md p-2.5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Waves className="w-4 h-4 text-sky-600" />
                          <p className="text-sm text-sky-900">Wave Loop</p>
                        </div>
                        
                        <motion.div
                          className="relative z-10"
                          animate={{ rotate: isRippleSectionOpen ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="w-4 h-4 text-sky-600" />
                        </motion.div>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="mt-3 relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 p-5 shadow-sm"
                      >


                        <div className="relative z-10 space-y-4">
                          {/* Question Card */}
                          {question && (
                            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-sky-100">
                              <div className="flex items-start gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs text-sky-600">Q</span>
                                </div>
                                <p className="text-sm text-sky-900 leading-relaxed">{question}</p>
                              </div>
                            </div>
                          )}

                          {/* Answer Cards - All years */}
                          {selectedDiaryRippleAnswers.map((answerData, index) => (
                            <div key={answerData.id} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-sky-100">
                              <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs text-blue-600">A</span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-xs text-gray-500">{answerData.date}</p>
                                    {index === 0 && selectedDiaryRippleAnswers.length > 1 && (
                                      <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full">
                                        최신
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                    {answerData.answer}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {selectedDiaryRippleAnswers.length > 1 && (
                            <p className="text-xs text-center text-sky-600">
                              총 {selectedDiaryRippleAnswers.length}년의 답변
                            </p>
                          )}
                        </div>
                      </motion.div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })()}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            {selectedDiary ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => handleEdit(selectedDiary)}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  수정
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  if (viewDialogDate) {
                    setIsViewDialogOpen(false);
                    setSelectedDate(viewDialogDate);
                    setIsCreateDialogOpen(true);
                  }
                }}
                className="gap-2"
              >
                <Pencil className="w-4 h-4" />
                일기 작성하기
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일기를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 정말로 이 일기를 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sinking Animation Overlay */}
      <AnimatePresence>
        {showSinkAnimation && sinkingDiary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
            style={{
              background: 'linear-gradient(180deg, #1e3a8a 0%, #0f172a 40%, #1e293b 70%, #1e3a8a 100%)'
            }}
          >
            <div className="relative w-full h-full max-w-4xl">
              {/* 잔잔한 파도 효과 - 첫번째 레이어 (가장 밝고 진함) */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(96, 165, 250, 0.4) 50%, transparent 100%)',
                }}
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 18,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              
              {/* 잔잔한 파도 효과 - 두번째 레이어 */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.35) 50%, transparent 100%)',
                }}
                animate={{
                  x: ['100%', '-100%'],
                }}
                transition={{
                  duration: 23,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              
              {/* 세번째 레이어 */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(30, 58, 138, 0.25) 50%, transparent 100%)',
                }}
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 28,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              
              {/* Sinking Time Capsule */}
              <motion.div
                initial={{ y: '-50%', opacity: 1, scale: 1 }}
                animate={{
                  y: '150vh',
                  opacity: [1, 1, 0.8, 0.3],
                  scale: [1, 0.95, 0.9, 0.85],
                }}
                transition={{
                  duration: 3,
                  ease: 'easeIn',
                }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2"
              >
                <SinkingCapsule diary={sinkingDiary} />
              </motion.div>

              {/* Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  🐚
                </motion.div>
                <h3 className="text-2xl text-blue-200 mb-2">타임캡슐에 담는 중...</h3>
                <p className="text-blue-300/70">깊은 바다 속에 안전하게 보관됩니다</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

// 가라앉는 조개 컴포넌트
function SinkingCapsule({ diary }: { diary: any }) {
  return (
    <motion.div 
      className="relative"
      animate={{
        rotateZ: [0, -5, 5, -3, 3, 0],
      }}
      transition={{
        duration: 3,
        ease: "easeInOut",
      }}
    >
      <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-2xl filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
        <defs>
          {/* 조개 그라디언트 */}
          <radialGradient id="sinkingShellGrad" cx="50%" cy="30%">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="50%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#93c5fd" />
          </radialGradient>
          
          {/* 종이 그라디언트 */}
          <linearGradient id="sinkingPaper" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fefce8" />
            <stop offset="50%" stopColor="#fef9c3" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
        </defs>

        {/* 조개 하단 */}
        <ellipse
          cx="100"
          cy="125"
          rx="70"
          ry="45"
          fill="url(#sinkingShellGrad)"
          opacity="0.9"
        />
        
        {/* 조개 무늬 */}
        {[50, 70, 90, 110, 130, 150].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1="80"
            x2="100"
            y2="125"
            stroke="#3b82f6"
            strokeWidth="1.5"
            opacity="0.4"
          />
        ))}

        {/* 일기 종이 (말려있는 모양) - 더 크게 */}
        <motion.g
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* 종이 본체 */}
          <rect
            x="65"
            y="90"
            width="70"
            height="35"
            rx="4"
            fill="url(#sinkingPaper)"
            opacity="0.95"
          />
          
          {/* 종이 텍스트 라인 */}
          <line x1="70" y1="97" x2="115" y2="97" stroke="#d97706" strokeWidth="1.5" opacity="0.5" />
          <line x1="70" y1="103" x2="130" y2="103" stroke="#d97706" strokeWidth="1.5" opacity="0.5" />
          <line x1="70" y1="109" x2="120" y2="109" stroke="#d97706" strokeWidth="1.5" opacity="0.5" />
          <line x1="70" y1="115" x2="125" y2="115" stroke="#d97706" strokeWidth="1" opacity="0.4" />
          
          {/* 종이 왼쪽 말린 부분 */}
          <ellipse
            cx="65"
            cy="107"
            rx="4"
            ry="17"
            fill="#fef3c7"
            opacity="0.9"
          />
          
          {/* 종이 오른쪽 말린 부분 */}
          <ellipse
            cx="135"
            cy="107"
            rx="4"
            ry="17"
            fill="#fef3c7"
            opacity="0.9"
          />
        </motion.g>

        {/* 조개 상단 (약간 열린 상태) */}
        <motion.ellipse
          cx="100"
          cy="75"
          rx="70"
          ry="40"
          fill="url(#sinkingShellGrad)"
          opacity="0.95"
          animate={{
            cy: [75, 72, 75],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* 물방울 반짝임 */}
        <motion.circle
          cx="140"
          cy="100"
          r="3"
          fill="white"
          animate={{
            opacity: [0, 0.9, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.circle
          cx="105"
          cy="110"
          r="1.5"
          fill="white"
          animate={{
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.7,
          }}
        />
      </svg>
      
      {/* 제목 표시 */}
      {/* <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center w-32">
        <p className="text-white/80 text-sm font-medium drop-shadow-lg truncate">{diary.title}</p>
      </div> */}
    </motion.div>
  );
}
