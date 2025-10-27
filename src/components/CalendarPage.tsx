import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Check, Trash2, Edit2, X, Eye, EyeOff, Search, Filter, Home, Tag, Smile, Frown, Angry, Zap, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';

interface CalendarPageProps {
  accessToken: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Event {
  id: string;
  date: string;
  title: string;
  description?: string;
  type: 'event' | 'todo';
  completed?: boolean;
  categoryId?: string;
}

interface DailyEmotion {
  date: string;
  emotion: string;
  diary?: string;
  title?: string;
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

const emotionColors: Record<string, string> = {
  happy: '#fbbf24',
  sad: '#60a5fa',
  angry: '#f87171',
  anxious: '#fb923c',
};

const emotionLabels: Record<string, string> = {
  happy: '기쁨',
  sad: '슬픔',
  angry: '화남',
  anxious: '불안',
};

const defaultEmotions: Emotion[] = [
  { key: 'happy', label: '기쁨', icon: Smile, color: '#fbbf24' },
  { key: 'sad', label: '슬픔', icon: Frown, color: '#60a5fa' },
  { key: 'angry', label: '화남', icon: Angry, color: '#f87171' },
  { key: 'anxious', label: '불안', icon: Zap, color: '#fb923c' },
];

const defaultCategories: Category[] = [
  { id: 'work', name: '업무', color: '#3b82f6' },
  { id: 'personal', name: '개인', color: '#10b981' },
  { id: 'health', name: '건강', color: '#f59e0b' },
  { id: 'social', name: '모임', color: '#ec4899' },
];

export function CalendarPage({ accessToken }: CalendarPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [monthlyEmotions, setMonthlyEmotions] = useState<DailyEmotion[]>([]);
  const [showEmotions, setShowEmotions] = useState(true);
  const [showDiaries, setShowDiaries] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showDiaryDialog, setShowDiaryDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [viewingDiary, setViewingDiary] = useState<DailyEmotion | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'event' | 'todo'>('all');
  const [allEmotions, setAllEmotions] = useState<Emotion[]>(defaultEmotions);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventType, setEventType] = useState<'event' | 'todo'>('event');
  const [eventCategory, setEventCategory] = useState<string>('');
  
  // Category form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#8b5cf6');
  
  // Loading states for preventing duplicate clicks
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadEvents(), loadMonthlyEmotions(), loadCategories(), loadAllEmotions()]);
    setLoading(false);
  };

  const loadAllEmotions = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/emotions/custom`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const customEmotions = data.emotions || [];
        
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

        const formattedCustomEmotions = customEmotions.map((emotion: any) => ({
          id: emotion.id,
          label: emotion.label,
          emoji: emotion.emoji,
          color: getHexColor(emotion.color),
          isCustom: true,
        }));

        setAllEmotions([...defaultEmotions, ...formattedCustomEmotions]);
      }
    } catch (error) {
      console.error('Error loading custom emotions:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/calendar/categories`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || defaultCategories);
      } else {
        setCategories(defaultCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(defaultCategories);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim() || isAddingCategory) return;

    setIsAddingCategory(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/calendar/categories`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newCategoryName,
            color: newCategoryColor,
          }),
        }
      );

      if (response.ok) {
        await loadCategories();
        setNewCategoryName('');
        setNewCategoryColor('#8b5cf6');
      }
    } catch (error) {
      console.error('Error adding category:', error);
    } finally {
      setIsAddingCategory(false);
    }
  };

  const updateCategory = async (categoryId: string, name: string, color: string) => {
    if (isUpdatingCategory) return;

    setIsUpdatingCategory(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/calendar/categories/${categoryId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, color }),
        }
      );

      if (response.ok) {
        await loadCategories();
        setEditingCategory(null);
        setNewCategoryName('');
        setNewCategoryColor('#8b5cf6');
      }
    } catch (error) {
      console.error('Error updating category:', error);
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (isDeletingCategory) return;

    setIsDeletingCategory(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/calendar/categories/${categoryId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        await loadCategories();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color);
  };

  const loadEvents = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/calendar/events?year=${year}&month=${month}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        console.error('Failed to load events');
        setEvents([]);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
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
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMonthlyEmotions(data.emotions || []);
      } else {
        setMonthlyEmotions([]);
      }
    } catch (error) {
      console.error('Error loading monthly emotions:', error);
      setMonthlyEmotions([]);
    }
  };

  const addEvent = async () => {
    if (!eventTitle.trim() || !selectedDate || isAddingEvent) return;

    setIsAddingEvent(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/calendar/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: selectedDate,
            title: eventTitle,
            description: eventDescription,
            type: eventType,
            categoryId: eventCategory || undefined,
          }),
        }
      );

      if (response.ok) {
        await loadEvents();
        resetForm();
        toast.success('일정이 추가되었습니다.');
      } else {
        console.error('Failed to add event');
        toast.error('일정 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('일정 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAddingEvent(false);
    }
  };

  const updateEvent = async (eventId: string, updates: Partial<Event>) => {
    if (isUpdatingEvent) return;

    setIsUpdatingEvent(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/calendar/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        await loadEvents();
        setEditingEvent(null);
        resetForm();
        toast.success('일정이 수정되었습니다.');
      } else {
        console.error('Failed to update event');
        toast.error('일정 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('일정 수정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdatingEvent(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (isDeletingEvent) return;

    setIsDeletingEvent(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/calendar/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        await loadEvents();
        setShowDetailDialog(false);
        setViewingEvent(null);
        toast.success('일정이 삭제되었습니다.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete event:', errorData);
        toast.error('일정 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('일정 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const toggleTodoComplete = async (event: Event) => {
    if (event.type !== 'todo') return;
    await updateEvent(event.id, { completed: !event.completed });
  };

  const resetForm = () => {
    setEventTitle('');
    setEventDescription('');
    setEventType('event');
    setEventCategory('');
    setShowAddDialog(false);
    setEditingEvent(null);
  };

  const startEdit = (event: Event) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description || '');
    setEventType(event.type);
    setEventCategory(event.categoryId || '');
    setSelectedDate(event.date);
    setShowDetailDialog(false);
    setShowAddDialog(true);
  };

  const viewEventDetail = (event: Event) => {
    setViewingEvent(event);
    setShowDetailDialog(true);
  };

  const viewDiaryDetail = (diary: DailyEmotion) => {
    setViewingDiary(diary);
    setShowDiaryDialog(true);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDate = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startDate; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getEventsForDate = (day: number) => {
    if (!day) return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    let filteredEvents = events.filter(e => e.date === dateStr);
    
    // Apply search filter
    if (searchQuery) {
      filteredEvents = filteredEvents.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.type === filterType);
    }
    
    // Apply category filter
    if (filterCategory !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.categoryId === filterCategory);
    }
    
    return filteredEvents;
  };

  const getEmotionForDate = (day: number) => {
    if (!day) return null;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return monthlyEmotions.find(e => e.date === dateStr);
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#6b7280';
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return '미분류';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '미분류';
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const openAddDialog = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setShowAddDialog(true);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">캘린더를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-6xl mx-auto">
      {/* Search and Filter - Compact */}
      <div className="bg-white border-b border-gray-200 sticky top-[52px] z-10">
        <div className="px-2 sm:px-4 py-2">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="일정 검색..."
                className="pl-8 h-9 text-sm"
              />
            </div>
            
            <div className="flex gap-1.5">
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue placeholder="타입" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="event">일정</SelectItem>
                  <SelectItem value="todo">할 일</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowCategoryDialog(true)}
                className="h-9 w-9"
              >
                <Tag className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar - Full Width */}
      <div className="bg-white mt-3">
        {/* Calendar Header - Compact */}
        <div className="px-2 sm:px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-gray-700">
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs px-2">
              <Home className="w-3.5 h-3.5 mr-1" />
              오늘
            </Button>
            <Button variant="outline" size="sm" onClick={previousMonth} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="px-1 sm:px-2 py-1">
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-0.5">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div key={day} className={`text-center text-xs font-semibold py-1.5 ${
                idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-600'
              }`}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {getDaysInMonth(currentDate).map((day, index) => {
              const dayEvents = day ? getEventsForDate(day) : [];
              const dayEmotion = day ? getEmotionForDate(day) : null;
              const todos = dayEvents.filter(e => e.type === 'todo');
              const regularEvents = dayEvents.filter(e => e.type === 'event');
              const today = isToday(day || 0);
              const dayOfWeek = index % 7;
              
              return (
                <div key={index} className="min-h-[70px] sm:min-h-[80px] md:min-h-[90px]">
                  {day ? (
                    <div className={`relative h-full flex flex-col p-1 border transition-colors ${
                      today 
                        ? 'bg-purple-50 border-purple-500 shadow-sm' 
                        : 'hover:bg-gray-50 border-gray-300'
                    }`}>
                      <div className="flex items-center justify-center mb-0.5">
                        <span className={`text-xs sm:text-sm font-semibold leading-none text-center ${
                          today 
                            ? 'text-purple-600' 
                            : dayOfWeek === 0 
                            ? 'text-red-500' 
                            : dayOfWeek === 6 
                            ? 'text-blue-500' 
                            : 'text-gray-700'
                        }`}>
                          {day}
                        </span>
                      </div>
                      
                      <div className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                        {/* Emotion */}
                        {showEmotions && dayEmotion && (
                          <div 
                            className="w-full h-1 rounded-full mb-0.5"
                            style={{ backgroundColor: emotionColors[dayEmotion.emotion] || '#9ca3af' }}
                            title={emotionLabels[dayEmotion.emotion] || '알 수 없음'}
                          />
                        )}
                        
                        {/* Diary indicator */}
                        {showDiaries && dayEmotion?.diary && (
                          <div className="mb-0.5">
                            <button
                              onClick={() => viewDiaryDetail(dayEmotion)}
                              className="transition-all hover:shadow-sm active:scale-95"
                            >
                              <Badge variant="outline" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-0.5 sm:px-1 bg-purple-50 text-purple-600 border-purple-300 cursor-pointer hover:bg-purple-100">
                                📝
                              </Badge>
                            </button>
                          </div>
                        )}
                        
                        {/* Events */}
                        {regularEvents.slice(0, 3).map(event => (
                          <button
                            key={event.id}
                            onClick={() => viewEventDetail(event)}
                            className="w-full text-left text-[8px] sm:text-[9px] leading-tight rounded px-0.5 sm:px-1 py-0.5 transition-all hover:shadow-sm active:scale-95"
                            style={{ 
                              backgroundColor: `${getCategoryColor(event.categoryId)}30`,
                              borderLeft: `2px solid ${getCategoryColor(event.categoryId)}`
                            }}
                            title={event.title}
                          >
                            <div className="truncate">{event.title.slice(0, 6)}{event.title.length > 6 ? '...' : ''}</div>
                          </button>
                        ))}
                        
                        {/* Todos */}
                        {todos.slice(0, 3).map(todo => (
                          <div key={todo.id} className="flex items-center gap-0.5">
                            <button
                              onClick={() => toggleTodoComplete(todo)}
                              className={`flex-shrink-0 w-3 h-3 rounded border flex items-center justify-center transition-all active:scale-90 ${
                                todo.completed 
                                  ? 'bg-green-500 border-green-500' 
                                  : 'border-gray-400 hover:border-green-500'
                              }`}
                              style={{ touchAction: 'manipulation' }}
                            >
                              {todo.completed && <Check className="w-2 h-2 text-white" />}
                            </button>
                            <button
                              onClick={() => viewEventDetail(todo)}
                              className={`flex-1 text-left text-[8px] sm:text-[9px] leading-tight rounded px-0.5 sm:px-1 py-0.5 transition-all hover:shadow-sm active:scale-95 ${
                                todo.completed ? 'line-through opacity-60' : ''
                              }`}
                              style={{ 
                                backgroundColor: `${getCategoryColor(todo.categoryId)}30`,
                                borderLeft: `2px solid ${getCategoryColor(todo.categoryId)}`
                              }}
                              title={todo.title}
                            >
                              <div className="truncate">{todo.title.slice(0, 4)}{todo.title.length > 4 ? '...' : ''}</div>
                            </button>
                          </div>
                        ))}
                        
                        {/* More indicator */}
                        {(dayEvents.length > 6) && (
                          <div className="text-center">
                            <Badge variant="outline" className="text-[9px] h-4 px-1">
                              +{dayEvents.length - 6}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full bg-gray-100"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend - Compact */}
          <div className="mt-1 pt-1.5 px-2 pb-1.5 border-t border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <div className="flex flex-wrap gap-2 text-[10px]">
                {categories.slice(0, 4).map(cat => (
                  <div key={cat.id} className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: cat.color }} />
                    <span className="text-gray-600">{cat.name}</span>
                  </div>
                ))}
                {categories.length > 4 && (
                  <span className="text-gray-500">+{categories.length - 4}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Switch
                    id="show-emotions-bottom"
                    checked={showEmotions}
                    onCheckedChange={setShowEmotions}
                    className="scale-75"
                  />
                  <Label htmlFor="show-emotions-bottom" className="text-xs text-gray-600 cursor-pointer">
                    감정
                  </Label>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    id="show-diaries-bottom"
                    checked={showDiaries}
                    onCheckedChange={setShowDiaries}
                    className="scale-75"
                  />
                  <Label htmlFor="show-diaries-bottom" className="text-xs text-gray-600 cursor-pointer">
                    일기
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => {
          const today = new Date();
          const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
          setSelectedDate(dateStr);
          setShowAddDialog(true);
        }}
        className="fixed right-4 bottom-20 w-14 h-14 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95 z-20"
        style={{ touchAction: 'manipulation' }}
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Event Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent>
          {viewingEvent ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {viewingEvent.type === 'event' ? '📅 일정' : '✓ 할 일'}
                </DialogTitle>
                <DialogDescription>
                  {viewingEvent.type === 'event' ? '일정 세부 정보를 확인하세요.' : '할 일 세부 정보를 확인하세요.'}
                </DialogDescription>
              </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">날짜</p>
                <p className="font-medium">{new Date(viewingEvent.date).toLocaleDateString('ko-KR')}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">제목</p>
                <p className="font-medium">{viewingEvent.title}</p>
              </div>
              
              {viewingEvent.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">설명</p>
                  <p className="text-gray-700">{viewingEvent.description}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500 mb-1">카테고리</p>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: getCategoryColor(viewingEvent.categoryId) }} />
                  <span>{getCategoryName(viewingEvent.categoryId)}</span>
                </div>
              </div>
              
              {/* Action Buttons - Bottom Section */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                {viewingEvent.type === 'todo' && (
                  <Button
                    onClick={() => {
                      toggleTodoComplete(viewingEvent);
                      setShowDetailDialog(false);
                    }}
                    disabled={isUpdatingEvent}
                    className={`w-full ${
                      viewingEvent.completed 
                        ? 'bg-gray-500 hover:bg-gray-600' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {viewingEvent.completed ? '완료 취소' : '✓ 완료하기'}
                  </Button>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => viewingEvent && startEdit(viewingEvent)}
                    disabled={isUpdatingEvent || isDeletingEvent}
                    className="flex-1"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (viewingEvent && window.confirm('정말 삭제하시겠습니까?')) {
                        deleteEvent(viewingEvent.id);
                      }
                    }}
                    disabled={isDeletingEvent || isUpdatingEvent}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeletingEvent ? '삭제 중...' : '삭제'}
                  </Button>
                </div>
              </div>
            </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>로딩 중...</DialogTitle>
                <DialogDescription>정보를 불러오는 중입니다.</DialogDescription>
              </DialogHeader>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Event Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? '수정하기' : '추가하기'}</DialogTitle>
            <DialogDescription>
              {selectedDate ? new Date(selectedDate).toLocaleDateString('ko-KR') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-date">날짜 *</Label>
              <Input
                id="event-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={eventType === 'event' ? 'default' : 'outline'}
                className={eventType === 'event' ? 'bg-purple-600 flex-1' : 'flex-1'}
                onClick={() => setEventType('event')}
              >
                📅 일정
              </Button>
              <Button
                variant={eventType === 'todo' ? 'default' : 'outline'}
                className={eventType === 'todo' ? 'bg-purple-600 flex-1' : 'flex-1'}
                onClick={() => setEventType('todo')}
              >
                ✓ 할 일
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-title">제목 *</Label>
              <Input
                id="event-title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="제목을 입력하세요"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-category">��테고리</Label>
              <Select value={eventCategory || 'none'} onValueChange={(value) => setEventCategory(value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">미분류</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-description">설명 (선택)</Label>
              <Textarea
                id="event-description"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="설명을 입력하세요"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              {editingEvent ? (
                <Button
                  onClick={() => updateEvent(editingEvent.id, {
                    date: selectedDate,
                    title: eventTitle,
                    description: eventDescription,
                    type: eventType,
                    categoryId: eventCategory || undefined,
                  })}
                  disabled={!eventTitle.trim() || !selectedDate || isUpdatingEvent}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {isUpdatingEvent ? '수정 중...' : '수정'}
                </Button>
              ) : (
                <Button
                  onClick={addEvent}
                  disabled={!eventTitle.trim() || !selectedDate || isAddingEvent}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isAddingEvent ? '추가 중...' : '추가하기'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={(open) => {
        setShowCategoryDialog(open);
        if (!open) {
          setEditingCategory(null);
          setNewCategoryName('');
          setNewCategoryColor('#8b5cf6');
        }
      }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>카테고리 관리</DialogTitle>
            <DialogDescription>
              일정과 할 일을 구분할 카테고리를 관리하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  {editingCategory?.id === cat.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="카테고리 이름"
                        className="flex-1 h-10"
                      />
                      <Button
                        size="sm"
                        onClick={() => updateCategory(cat.id, newCategoryName, newCategoryColor)}
                        disabled={!newCategoryName.trim() || isUpdatingCategory}
                        className="bg-purple-600 hover:bg-purple-700 h-10"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(null);
                          setNewCategoryName('');
                          setNewCategoryColor('#8b5cf6');
                        }}
                        disabled={isUpdatingCategory}
                        className="h-10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }} />
                        <span>{cat.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditCategory(cat)}
                          disabled={isUpdatingCategory || isDeletingCategory}
                          className="text-purple-600 hover:text-purple-700 h-9"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?`)) {
                              deleteCategory(cat.id);
                            }
                          }}
                          disabled={isDeletingCategory || isUpdatingCategory}
                          className="text-red-600 hover:text-red-700 h-9"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            {!editingCategory && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-sm font-medium">새 카테고리 추가</p>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-14 h-10 p-1"
                  />
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="카테고리 이름"
                    className="flex-1 h-10"
                  />
                </div>
                <Button
                  onClick={addCategory}
                  disabled={!newCategoryName.trim() || isAddingCategory}
                  className="w-full bg-purple-600 hover:bg-purple-700 h-10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isAddingCategory ? '추가 중...' : '카테고리 추가'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diary Detail Dialog */}
      <Dialog open={showDiaryDialog} onOpenChange={setShowDiaryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📝 일기
            </DialogTitle>
            <DialogDescription>
              {viewingDiary?.date ? new Date(viewingDiary.date).toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              }) : ''}
            </DialogDescription>
          </DialogHeader>
          
          {viewingDiary && (() => {
            const emotion = allEmotions.find(e => (e.key || e.id) === viewingDiary.emotion);
            const EmotionIcon = emotion?.icon;
            const emotionColor = emotion?.color || '#9ca3af';
            
            return (
              <div className="space-y-4">
                {/* Emotion */}
                <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ 
                  backgroundColor: `${emotionColor}20`,
                  borderColor: emotionColor
                }}>
                  {emotion?.isCustom && emotion.emoji ? (
                    <span className="text-3xl">{emotion.emoji}</span>
                  ) : EmotionIcon ? (
                    <EmotionIcon className="w-8 h-8" style={{ color: emotionColor }} />
                  ) : null}
                  <div>
                    <p className="text-sm text-gray-600">오늘의 기분</p>
                    <p className="font-semibold">{emotion?.label || '알 수 없음'}</p>
                  </div>
                </div>

              {/* Title */}
              {viewingDiary.title && (
                <div>
                  <Label className="text-xs text-gray-600">제목</Label>
                  <p className="mt-1 font-medium text-gray-900">{viewingDiary.title}</p>
                </div>
              )}

              {/* Diary Content */}
              <div>
                <Label className="text-xs text-gray-600">일기</Label>
                <div className="mt-1 p-3 rounded-lg bg-gray-50 border border-gray-200 whitespace-pre-wrap text-sm text-gray-800">
                  {viewingDiary.diary || '일기 내용이 없습니다.'}
                </div>
              </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowDiaryDialog(false)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    닫기
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
