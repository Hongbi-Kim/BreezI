import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Calendar, ArrowLeft, User as UserIcon, Trash2, Check, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { apiCall } from '../utils/api';
import { useDataCache } from '../utils/dataCache';
import { toast } from 'sonner';
import { ErrorFallback } from './ErrorFallback';
import { 
  initiateGoogleCalendarAuth, 
  getCalendarAuthState,
  clearCalendarTokens,
  CalendarAuthState 
} from '../utils/googleCalendar';
import lumiAvatar from '../assets/bb838f8b452a418707049fd37137f29785a32e3b.png';
import kaiAvatar from '../assets/fd812fd1d4483c3de83fd3b6669e7dbb28ec2697.png';
import leoAvatar from '../assets/247a0132ddfa67d748af8ab8f8273ee53080b2f7.png';
import riveAvatar from '../assets/c62b5ca0dd103dd3c28b979c87d5445da9da9daf.png';
import groupAvatar from '../assets/b63574b0ffb0d2e889062b6b150de38522b3ec9b.png';

// Format timestamp to AM/PM hh:mm format (like KakaoTalk)
// Now supports ISO 8601 format and uses user's local timezone
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';
  
  try {
    // Parse ISO 8601 timestamp
    const date = new Date(timestamp);
    
    // Use user's local timezone (browser automatically handles this)
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    const period = hours < 12 ? '오전' : '오후';
    const displayHour = hours % 12 || 12; // 0시를 12시로 표시
    
    return `${period} ${displayHour}:${minutes}`;
  } catch (error) {
    console.error('Error formatting timestamp:', timestamp, error);
    return '';
  }
};

interface Character {
  id: string;
  name: string;
  role: string;
  slogan: string;
  description: string;
  avatar: string;
  color: string;
  accentColor: string;
  symbol: string;
  hasCalendar?: boolean;
  isGroup?: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601 format
  respondingCharacter?: {
    charId: string;
    charName: string;
    charEmoji: string;
  };
}

interface ChatRoomProps {
  character: Character;
  onBack: () => void;
  onProfileClick: () => void;
}

export function ChatRoom({ character, onBack, onProfileClick }: ChatRoomProps) {
  const { refreshChatList, loadChatMessages, refreshChatMessages } = useDataCache();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [calendarAuthState, setCalendarAuthState] = useState<CalendarAuthState>({
    isConnected: false,
    hasValidToken: false,
  });
  const [isCheckingCalendarAuth, setIsCheckingCalendarAuth] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    // Mark as read after a short delay to avoid simultaneous API calls
    const markReadTimeout = setTimeout(() => {
      markAsRead();
    }, 500);
    
    // Check calendar auth state if character has calendar
    if (character.hasCalendar) {
      checkCalendarAuthState();
    }
    
    return () => clearTimeout(markReadTimeout);
  }, [character.id]);

  const markAsRead = async () => {
    try {
      await apiCall(`/chat/${character.id}/read`, { method: 'POST' });
      console.log('[ChatRoom] Chat marked as read');
      // Don't refresh chat list immediately - let the cache expire naturally
      // This reduces API calls significantly
    } catch (error: any) {
      // Silently handle all errors for read status
      console.log('[ChatRoom] Failed to mark as read (silent):', error?.message);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // Use cached data - much faster!
      const data = await loadChatMessages(character.id);
      setMessages(data.messages || []);
      console.log(`[ChatRoom] Loaded ${data.messages?.length || 0} messages for ${character.name}`);
    } catch (error: any) {
      console.error('[ChatRoom] Failed to load messages:', error);
      setLoadError(error);
      // Don't clear messages - keep existing ones if available
      if (messages.length === 0) {
        // Only set empty if there were no messages before
        setMessages([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage = input.trim();
    setInput('');
    setIsSending(true);

    // Optimistically add user message
    // Format current timestamp
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const currentTimestamp = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    
    const userMessageObj: Message = {
      role: 'user',
      content: userMessage,
      timestamp: currentTimestamp
    };
    setMessages(prev => [...prev, userMessageObj]);

    try {
      // Track AI response time
      const requestStartTime = Date.now();
      
      const response = await apiCall(`/chat/${character.id}`, {
        method: 'POST',
        body: JSON.stringify({ message: userMessage })
      });

      const responseTime = Date.now() - requestStartTime;
      console.log(`AI response time for ${character.id}: ${responseTime}ms`);

      // Add AI response naturally without reloading all messages
      if (response.message) {
        setMessages(prev => [...prev, response.message]);
      }

      // Refresh cache in background (don't wait)
      refreshChatMessages(character.id).catch(err => 
        console.log('[ChatRoom] Background cache refresh failed:', err)
      );

      // Mark as read after receiving AI response
      await markAsRead();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic user message on error
      setMessages(prev => prev.filter(m => m !== userMessageObj));
      toast.error('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const checkCalendarAuthState = async () => {
    setIsCheckingCalendarAuth(true);
    try {
      const authState = await getCalendarAuthState();
      setCalendarAuthState(authState);
      
      if (authState.isConnected) {
        console.log('✅ Google Calendar connected:', authState.email);
      }
    } catch (error) {
      console.error('Failed to check calendar auth state:', error);
    } finally {
      setIsCheckingCalendarAuth(false);
    }
  };

  const connectGoogleCalendar = async () => {
    if (calendarAuthState.isConnected) {
      // Already connected, show disconnect option
      toast.info(
        `이미 구글 캘린더에 연결되어 있습니다 (${calendarAuthState.email}). 연결을 해제하려면 길게 누르세요.`,
        {
          duration: 3000,
        }
      );
      return;
    }

    try {
      toast.loading('구글 캘린더 연동 중...', { id: 'calendar-auth' });
      
      // Initiate OAuth flow
      await initiateGoogleCalendarAuth();
      
      // OAuth flow will redirect user, so this code won't run until they return
      toast.success('구글 캘린더 연동이 시작되었습니다.', { id: 'calendar-auth' });
    } catch (error: any) {
      console.error('Failed to connect Google Calendar:', error);
      toast.error(
        `구글 캘린더 연동에 실패했습니다: ${error.message}`,
        { id: 'calendar-auth' }
      );
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      clearCalendarTokens();
      setCalendarAuthState({
        isConnected: false,
        hasValidToken: false,
      });
      toast.success('구글 캘린더 연결이 해제되었습니다.');
    } catch (error: any) {
      console.error('Failed to disconnect Google Calendar:', error);
      toast.error(`연결 해제에 실패했습니다: ${error.message}`);
    }
  };

  const handleCalendarButtonLongPress = () => {
    if (calendarAuthState.isConnected) {
      // Show disconnect confirmation
      toast.info('연결을 해제하시겠습니까?', {
        action: {
          label: '해제',
          onClick: disconnectGoogleCalendar,
        },
        duration: 5000,
      });
    }
  };

  const handleDeleteChat = async () => {
    setIsDeleting(true);
    try {
      console.log('=== DELETING CHAT ===');
      console.log('Character ID:', character.id);
      
      const result = await apiCall(`/chat/${character.id}`, {
        method: 'DELETE'
      });
      
      console.log('Delete result:', result);
      
      if (result.success) {
        setMessages([]);
        // Refresh both caches immediately
        await Promise.all([
          refreshChatList(),
          refreshChatMessages(character.id)
        ]);
        toast.success('대화 내역이 삭제되었습니다.');
      }
    } catch (error: any) {
      console.error('Failed to delete chat:', error);
      toast.error(`대화 삭제에 실패했습니다: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = async () => {
    // Mark as read before leaving the chat
    await markAsRead();
    onBack();
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp); // ISO 8601 자동 파싱
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to compare dates only
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return '오늘';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    // First, sort messages by timestamp
    const sortedMessages = [...messages].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateA.getTime() - dateB.getTime();
    });

    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];

    sortedMessages.forEach((msg) => {
      const date = new Date(msg.timestamp); // ISO 8601 자동 파싱
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (dateKey !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = dateKey;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    // Push the last group
    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <button 
            onClick={onProfileClick}
            className="flex items-center gap-2 hover:bg-gray-100 p-2 rounded-lg transition-colors"
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 overflow-hidden"
              style={{ 
                backgroundColor: character.color,
                borderColor: character.accentColor 
              }}
            >
              {character.id === 'char_1' ? (
                <img 
                  src={lumiAvatar} 
                  alt={character.name} 
                  className="w-full h-full object-cover"
                />
              ) : character.id === 'char_2' ? (
                <img 
                  src={kaiAvatar} 
                  alt={character.name} 
                  className="w-full h-full object-cover"
                />
              ) : character.id === 'char_3' ? (
                <img 
                  src={leoAvatar} 
                  alt={character.name} 
                  className="w-full h-full object-cover"
                />
              ) : character.id === 'char_4' ? (
                <img 
                  src={riveAvatar} 
                  alt={character.name} 
                  className="w-full h-full object-cover"
                />
              ) : character.id === 'char_group' ? (
                <img 
                  src={groupAvatar} 
                  alt={character.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">{character.avatar}</span>
              )}
            </div>
            <div className="text-left">
              <h2 className="font-semibold">{character.name}</h2>
              <p className="text-xs text-gray-500">{character.description}</p>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {character.hasCalendar && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={connectGoogleCalendar}
              onContextMenu={(e) => {
                e.preventDefault();
                handleCalendarButtonLongPress();
              }}
              className={calendarAuthState.isConnected ? 'text-green-600 border-green-600' : ''}
              disabled={isCheckingCalendarAuth}
            >
              {isCheckingCalendarAuth ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              ) : calendarAuthState.isConnected ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  <Calendar className="w-4 h-4" />
                </>
              ) : (
                <Calendar className="w-4 h-4" />
              )}
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">대화 삭제</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>대화 내역을 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  {character.name}와의 모든 대화 내역이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteChat}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? '삭제 중...' : '삭제하기'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 bg-blue-50 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full gap-3 p-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-600 font-medium">대화를 불러오는 중...</p>
            <p className="text-sm text-gray-500">{character.name}와의 대화 내역을 가져오고 있어요</p>
          </div>
        ) : loadError ? (
          <ErrorFallback 
            error={loadError}
            onRetry={loadMessages}
            title="대화 내역을 불러올 수 없습니다"
            description={loadError.message?.includes('Too many requests') 
              ? '현재 많은 사용자가 접속하여 서버가 바쁩니다. 1-2분 후에 다시 시도해주세요.' 
              : '일시적인 문제로 대화 내역을 불러오지 못했습니다. 다시 시도해주세요.'}
          />
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">대화를 시작해보세요!</p>
          </div>
        ) : (
          <div className="p-4">
            {messageGroups.map((group, groupIndex) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-400/80 text-white text-xs px-3 py-1 rounded-full">
                    {formatDate(group.messages[0].timestamp)}
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-2">
                  {group.messages.map((msg, index) => {
                    const msgs = group.messages;
                    const showTime = index === msgs.length - 1 || 
                      msgs[index + 1]?.role !== msg.role ||
                      new Date(msgs[index + 1]?.timestamp).getTime() - new Date(msg.timestamp).getTime() > 60000;

                    return (
                      <div
                        key={`${msg.timestamp}-${index}`}
                        className={`flex items-end gap-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center mb-1 border-2 flex-shrink-0 overflow-hidden"
                            style={{ 
                              backgroundColor: msg.respondingCharacter 
                                ? (msg.respondingCharacter.charId === 'char_1' ? '#FFF5EE' : msg.respondingCharacter.charId === 'char_2' ? '#1E3A8A' : msg.respondingCharacter.charId === 'char_3' ? '#7C3AED' : msg.respondingCharacter.charId === 'char_4' ? '#6EE7B7' : '#7C3AED')
                                : character.color,
                              borderColor: msg.respondingCharacter
                                ? (msg.respondingCharacter.charId === 'char_1' ? '#FFB6A3' : msg.respondingCharacter.charId === 'char_2' ? '#60A5FA' : msg.respondingCharacter.charId === 'char_3' ? '#C4B5FD' : msg.respondingCharacter.charId === 'char_4' ? '#A7F3D0' : '#C4B5FD')
                                : character.accentColor 
                            }}
                          >
                            {(() => {
                              const charId = msg.respondingCharacter?.charId || character.id;
                              if (charId === 'char_1') {
                                return <img src={lumiAvatar} alt={msg.respondingCharacter?.charName || character.name} className="w-full h-full object-cover" />;
                              } else if (charId === 'char_2') {
                                return <img src={kaiAvatar} alt={msg.respondingCharacter?.charName || character.name} className="w-full h-full object-cover" />;
                              } else if (charId === 'char_3') {
                                return <img src={leoAvatar} alt={msg.respondingCharacter?.charName || character.name} className="w-full h-full object-cover" />;
                              } else if (charId === 'char_4') {
                                return <img src={riveAvatar} alt={msg.respondingCharacter?.charName || character.name} className="w-full h-full object-cover" />;
                              } else if (charId === 'char_group') {
                                return <img src={groupAvatar} alt={msg.respondingCharacter?.charName || character.name} className="w-full h-full object-cover" />;
                              } else {
                                return <span className="text-lg">{msg.respondingCharacter ? msg.respondingCharacter.charEmoji : character.avatar}</span>;
                              }
                            })()}
                          </div>
                        )}
                        <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          {msg.role === 'assistant' && msg.respondingCharacter && character.isGroup && (
                            <p className="text-xs text-gray-500 mb-1 px-1">
                              {msg.respondingCharacter.charName}
                            </p>
                          )}
                          <div
                            className={`w-fit max-w-[75vw] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] xl:max-w-[800px] rounded-2xl px-3 py-2 ${
                              msg.role === 'user'
                                ? 'bg-yellow-300 text-gray-900'
                                : 'bg-white text-gray-900'
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm break-words">{msg.content}</p>
                          </div>
                          {showTime && (
                            <p className="text-xs text-gray-500 mt-1 px-1">
                              {formatTimestamp(msg.timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t">
        <div className="flex gap-2 items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요"
            disabled={isSending}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={isSending || !input.trim()}
            size="icon"
            style={{ backgroundColor: character.color }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
